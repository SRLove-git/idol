import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Not,
  Repository,
} from 'typeorm';
import {
  centsToYuan,
  percentOffCents,
  yuanToCents,
} from '../common/money.util';
import {
  generateRedeemCode,
  normalizeRedeemCode,
} from '../common/redeem-code.util';
import { isSurchargeDate } from '../common/singapore-holidays';
import { REDIS_CLIENT } from '../redis/redis.module';
import { Activity } from '../activities/activity.entity';
import { ActivitySession } from '../activities/activity-session.entity';
import { ChatGateway } from '../chat/chat.gateway';
import { Coupon, UserCoupon } from '../members/coupon.entity';
import { Membership } from '../members/membership.entity';
import { Store } from '../stores/store.entity';
import { StoreTable } from '../stores/store-table.entity';
import { StorePackage } from '../stores/store-package.entity';
import { UsersService } from '../users/users.service';
import { Appointment } from './appointment.entity';
import { CreateAppointmentDto, WalkInDto } from './appointment.dto';
import { AppointmentTable } from './appointment-table.entity';

/** 桌位可用性响应项：桌位信息 + 当日已占用时段窗口 */
export type TableAvailabilityItem = {
  id: number;
  name: string;
  capacity: number;
  bookedWindows: Array<{ startTime: string; endTime: string; status: string }>;
};

@Injectable()
export class AppointmentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentsService.name);
  private autoClockoutTimer: NodeJS.Timeout | null = null;
  private autoClockoutRunning = false;
  /** 同一 (storeId, date) 缓存回源计算的单飞表：并发未命中只查一次库 */
  private readonly availabilityInflight = new Map<
    string,
    Promise<TableAvailabilityItem[]>
  >();
  /** 预约变更计数：回源计算结果只在「计算期间无变更」时才写回缓存，防止旧快照覆盖新数据 */
  private availabilityEpoch = 0;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Store)
    private readonly stores: Repository<Store>,
    @InjectRepository(StoreTable)
    private readonly tables: Repository<StoreTable>,
    @InjectRepository(StorePackage)
    private readonly packages: Repository<StorePackage>,
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectRepository(ActivitySession)
    private readonly activitySessionsRepo: Repository<ActivitySession>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(UserCoupon)
    private readonly userCoupons: Repository<UserCoupon>,
    private readonly users: UsersService,
    private readonly gateway: ChatGateway,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** 预约状态变更后推送给用户端（msgpack 安全：Date 转 ISO 字符串） */
  private broadcastAppointment(appt: Appointment): void {
    this.gateway.sendAppointment(appt.userId, {
      ...appt,
      checkInTime: appt.checkInTime?.toISOString() ?? null,
      serviceStartTime: appt.serviceStartTime?.toISOString() ?? null,
      serviceEndTime: appt.serviceEndTime?.toISOString() ?? null,
      createdAt: appt.createdAt?.toISOString() ?? null,
    });
  }

  /** availability 缓存 key：某门店某日的桌位占用快照 */
  private availabilityCacheKey(storeId: number, date: string): string {
    return `availability:${storeId}:${date}`;
  }

  /** 兜底 TTL：缓存最迟到当天 23:59:59 后 1 分钟，避免跨天脏数据 */
  private availabilityCacheTtlSeconds(): number {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.max(
      60,
      Math.round((endOfDay.getTime() - now.getTime()) / 1000) + 60,
    );
  }

  /** 预约变更后失效对应门店/日期的桌位可用性缓存（Redis 不可用时静默降级） */
  private async invalidateAvailability(
    storeId: number | null,
    date: string | null,
  ): Promise<void> {
    if (storeId == null || !date) return;
    this.availabilityEpoch++;
    await this.redis
      .del(this.availabilityCacheKey(storeId, date))
      .catch(() => undefined);
  }

  /**
   * 回源计算某门店某日的桌位占用快照，并写回 Redis。
   * epoch 在计算开始时就捕获：若计算期间发生过预约变更（invalidateAvailability），
   * 说明这份快照可能已过期，跳过写回（本次请求仍可返回，下次请求自然回源）。
   */
  private async computeAvailability(
    storeId: number,
    date: string,
    epochAtStart: number,
  ): Promise<TableAvailabilityItem[]> {
    const tables = await this.tables.find({
      where: { storeId, enabled: true },
      order: { id: 'ASC' },
    });
    // 只取占用窗口所需列：关联表按 (storeId, date) 前缀收窄后回表 appointments
    // 取时段与状态；status 用 IN 枚举有效状态，避免 NOT IN 无法走索引
    const taken = (await this.dataSource.query(
      `SELECT at.tableId AS tableId, a.startTime, a.endTime, a.status
       FROM appointment_tables at
       JOIN appointments a ON a.id = at.appointmentId
       WHERE at.storeId = ? AND at.date = ?
         AND a.status IN ('pending', 'booked', 'checked_in', 'in_service')
       ORDER BY a.startTime ASC`,
      [storeId, date],
    )) as unknown as Array<{
      tableId: number;
      startTime: string;
      endTime: string;
      status: string;
    }>;
    // 按桌位聚合占用窗口（一单多桌：预约的每张桌都算占用）
    const windowByTable = new Map<
      number,
      Array<{ startTime: string; endTime: string; status: string }>
    >();
    for (const row of taken) {
      if (row.tableId == null) continue;
      const id = Number(row.tableId);
      if (!windowByTable.has(id)) windowByTable.set(id, []);
      windowByTable.get(id)!.push({
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.status,
      });
    }
    const items = tables.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      bookedWindows: windowByTable.get(t.id) ?? [],
    }));
    // 计算期间无预约变更才写回；写缓存失败只影响命中率，不影响正确性
    if (epochAtStart === this.availabilityEpoch) {
      await this.redis
        .set(
          this.availabilityCacheKey(storeId, date),
          JSON.stringify(items),
          'EX',
          this.availabilityCacheTtlSeconds(),
        )
        .catch(() => undefined);
    }
    return items;
  }

  /** 启动后周期兜底：预约时段到点后自动下钟（未在读操作中即时结束的预约） */
  onModuleInit() {
    this.autoClockoutTimer = setInterval(() => {
      if (this.autoClockoutRunning) return;
      this.autoClockoutRunning = true;
      void this.autoClockoutExpired()
        .catch((e) => {
          this.logger.warn(`自动下钟失败：${(e as Error).message}`);
        })
        .finally(() => {
          this.autoClockoutRunning = false;
        });
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.autoClockoutTimer) clearInterval(this.autoClockoutTimer);
  }

  /** 预约时段结束时刻（date + endTime，本地时区） */
  private scheduledEnd(appt: Appointment): Date {
    return new Date(`${appt.date}T${appt.endTime}:00`);
  }

  /** 解析营业时间 "09:00-21:00" → {start, end}，解析失败回退 09:00-22:00 */
  private businessHoursRange(store: Store): { start: string; end: string } {
    const m = (store.businessHours || '').match(
      /((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)/,
    );
    return m ? { start: m[1], end: m[2] } : { start: '09:00', end: '22:00' };
  }

  private minutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /** 校验核销时间：仅限预约当天、预约结束前。
   *  先到先得：可提前到店扫码开始计时；不因迟到顺延（结束时间固定为预约时段）。 */
  private assertCheckInTime(appt: Appointment): void {
    const now = new Date();
    if (now > this.scheduledEnd(appt)) {
      throw new BadRequestException(
        `预约时段（${appt.startTime}-${appt.endTime}）已结束，无法核销`,
      );
    }
  }

  /**
   * 自动下钟：将预约时段已结束但仍处于服务中的预约置为已完成，
   * 下钟时间记为预约时段结束时刻（而不是任务执行时刻）。
   */
  async autoClockoutExpired(): Promise<number> {
    const now = new Date();
    const today = this.todayStr();
    const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
    // 只查「预约日已过」或「当天且时段已结束」的服务中预约，走 (status, date, endTime) 索引
    const expired = await this.appointments
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'in_service' })
      .andWhere(
        '(a.date < :today OR (a.date = :today AND a.endTime <= :nowHM))',
        { today, nowHM },
      )
      .getMany();
    let count = 0;
    for (const appt of expired) {
      const end = this.scheduledEnd(appt);
      if (end <= now) {
        appt.status = 'completed';
        appt.serviceEndTime = end;
        await this.appointments.save(appt);
        await this.invalidateAvailability(appt.storeId, appt.date);
        count++;
      }
    }
    if (count > 0) this.logger.log(`自动下钟 ${count} 条预约`);
    return count;
  }

  /**
   * 创建预约：门店/时段/人数校验 → Redis 分布式锁 → 事务内冲突校验 + 落库。
   * 防超卖策略：同店同桌同时段仅允许 1 条未取消预约，先经 Redis 锁串行化，
   * 再由数据库唯一组合兜底（@Index 四列 + 事务内再查）。
   */
  async create(
    userId: number,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    // 防恶意预约：存在未完成的预约（待确认/待核销/服务中）时，不允许创建新预约
    await this.assertNoActiveAppointment(userId);
    const type = dto.type ?? 'store';
    const isMember = await this.isMemberActive(userId);
    if (type === 'activity') {
      return this.createActivity(userId, dto, isMember);
    }
    return this.createStore(userId, dto, isMember);
  }

  /**
   * 一个用户在同一时刻只能有一张未完成的预约单：
   * 上一单未完成（pending/booked/checked_in/in_service）前，禁止预约下一单。
   * 已取消或已完成的单不占用名额。
   */
  private async assertNoActiveAppointment(userId: number): Promise<void> {
    const active = await this.appointments.findOne({
      where: {
        userId,
        status: In(['pending', 'booked', 'checked_in', 'in_service']),
      },
      select: { id: true },
    });
    if (active) {
      throw new BadRequestException(
        '您有未完成的预约，请先完成或取消后再预约新的时段',
      );
    }
  }

  /** 是否有效会员（预约价按会员价计算） */
  private async isMemberActive(userId: number): Promise<boolean> {
    const membership = await this.memberships.findOneBy({ userId });
    return !!membership && membership.expireAt > new Date();
  }

  /**
   * 按小时预约的档位单价（元/人，含整段时长）：
   * - 时长恰好等于套餐时长 → 按套餐价计费；
   * - 时长超过套餐 → 套餐价 + 超出小时 × 小时单价；
   * - 时长小于最小套餐 → 无适用套餐，按普通小时价。
   */
  private hourlyUnitPrices(
    store: Store,
    packages: StorePackage[],
    hours: number,
  ): { normal: number; member: number; group: number } {
    const hourlyRate = yuanToCents(store.price ?? 39.9);
    const memberRate =
      store.memberPrice != null ? yuanToCents(store.memberPrice) : null;
    const groupRate =
      store.groupPrice != null ? yuanToCents(store.groupPrice) : null;
    const pkg = [...packages]
      .sort((a, b) => b.hours - a.hours)
      .find((p) => p.hours <= hours);

    if (!pkg) {
      const normal = hourlyRate * hours;
      return {
        normal: centsToYuan(normal),
        member: centsToYuan((memberRate ?? hourlyRate) * hours),
        group: centsToYuan((groupRate ?? hourlyRate) * hours),
      };
    }

    const extra = hours - pkg.hours;
    return {
      normal: centsToYuan(yuanToCents(pkg.price) + hourlyRate * extra),
      member: centsToYuan(
        yuanToCents(pkg.memberPrice ?? pkg.price) +
          (memberRate ?? hourlyRate) * extra,
      ),
      group: centsToYuan(
        yuanToCents(pkg.groupPrice ?? pkg.price) +
          (groupRate ?? hourlyRate) * extra,
      ),
    };
  }

  /**
   * 创建门店预约：门店/时段/人数校验 → Redis 分布式锁 → 事务内冲突校验 + 落库。
   * 防超卖策略：同店同桌同时段仅允许 1 条未取消预约，先经 Redis 锁串行化，
   * 再由数据库唯一组合兜底（@Index 四列 + 事务内再查）。
   */
  private async createStore(
    userId: number,
    dto: CreateAppointmentDto,
    isMember: boolean,
  ): Promise<Appointment> {
    if (dto.storeId == null) {
      throw new BadRequestException('门店预约需要选择门店、桌位和预约方式');
    }
    const store = await this.stores.findOneBy({
      id: dto.storeId,
      enabled: true,
    });
    if (!store) throw new NotFoundException('门店不存在');

    // 桌位解析：支持一单多桌（tableIds），单桌兼容 tableId
    const requestedIds =
      dto.tableIds && dto.tableIds.length
        ? [...new Set(dto.tableIds)]
        : dto.tableId != null
          ? [dto.tableId]
          : [];
    if (!requestedIds.length) {
      throw new BadRequestException('门店预约需要选择桌位');
    }
    const tableRows = await this.tables.find({
      where: { id: In(requestedIds), storeId: dto.storeId, enabled: true },
    });
    if (tableRows.length !== requestedIds.length) {
      throw new NotFoundException('部分桌位不存在或已停用');
    }
    // 按用户选择顺序排序
    tableRows.sort(
      (a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id),
    );

    // 人数校验：所选桌位总容量需 ≥ 人数
    const totalCapacity = tableRows.reduce((s, t) => s + t.capacity, 0);
    if (dto.peopleCount > totalCapacity) {
      throw new BadRequestException(
        `所选桌位最多容纳 ${totalCapacity} 人，当前 ${dto.peopleCount} 人，请增加桌位`,
      );
    }
    // 自动分配人数：按用户选择顺序依次坐满
    let remainingPeople = dto.peopleCount;
    const seats = tableRows.map((t) => {
      const people = Math.min(t.capacity, remainingPeople);
      remainingPeople -= people;
      return { id: t.id, name: t.name, capacity: t.capacity, people };
    });

    // 不能预约过去的日期
    const todayStr = this.todayStr();
    if (!dto.date) {
      throw new BadRequestException('门店预约需要选择日期');
    }
    if (dto.date < todayStr) {
      throw new BadRequestException('不能预约过去的日期');
    }

    // 预约方式：按小时（1 小时起）/ 套餐 / 全天不限时
    const bookingType = dto.bookingType ?? 'hourly';
    const range = this.businessHoursRange(store);
    const openMin = this.minutes(range.start);
    const closeMin = Math.min(this.minutes(range.end), 24 * 60 - 1);

    let startTime: string;
    let endTime: string;
    let durationHours: number;
    let packageId: number | null = null;
    let packageName = '';
    // 各档位单人价格（元/人，按整单时长折算）：门市价 / 会员价 / 多人同行价
    let normalPrice: number;
    let memberPrice: number;
    let groupPrice: number;

    if (bookingType === 'all_day') {
      // 全天不限时：营业开始 ~ 营业结束，结束时间固定
      startTime = range.start;
      endTime = range.end;
      durationHours = Math.max(1, Math.round((closeMin - openMin) / 60));
      const fallback = centsToYuan(
        yuanToCents(store.price ?? 39.9) * durationHours,
      );
      normalPrice = store.allDayPrice ?? fallback;
      memberPrice = store.allDayMemberPrice ?? normalPrice;
      groupPrice = store.allDayGroupPrice ?? normalPrice;
    } else if (bookingType === 'package') {
      // 时长套餐：选择套餐 + 开始时间
      if (dto.packageId == null) {
        throw new BadRequestException('套餐预约需要选择套餐');
      }
      if (!dto.startTime) {
        throw new BadRequestException('套餐预约需要选择开始时间');
      }
      const pkg = await this.packages.findOneBy({
        id: dto.packageId,
        storeId: dto.storeId,
        enabled: true,
      });
      if (!pkg) throw new NotFoundException('套餐不存在');
      packageId = pkg.id;
      packageName = pkg.name;
      durationHours = pkg.hours;
      startTime = dto.startTime;
      endTime = this.formatMinutes(this.minutes(startTime) + pkg.hours * 60);
      normalPrice = pkg.price;
      memberPrice = pkg.memberPrice ?? pkg.price;
      groupPrice = pkg.groupPrice ?? pkg.price;
    } else {
      // 按小时：开始时间 + 时长（1 小时起）
      if (!dto.startTime) {
        throw new BadRequestException('按小时预约需要选择开始时间');
      }
      if (dto.durationHours == null) {
        throw new BadRequestException('按小时预约需要选择时长');
      }
      durationHours = dto.durationHours;
      startTime = dto.startTime;
      endTime = this.formatMinutes(
        this.minutes(startTime) + durationHours * 60,
      );
      // 时长恰好等于套餐按套餐价，超出套餐的时长按小时单价追加
      const hourlyPackages =
        (await this.packages.find({
          where: { storeId: store.id, enabled: true },
        })) ?? [];
      const units = this.hourlyUnitPrices(store, hourlyPackages, durationHours);
      normalPrice = units.normal;
      memberPrice = units.member;
      groupPrice = units.group;
    }

    // 预约时段必须落在营业时间内且不跨天
    const startMin = this.minutes(startTime);
    const endMin = this.minutes(endTime);
    if (startMin < openMin || endMin > closeMin || endMin <= startMin) {
      throw new BadRequestException(
        `预约时段需在营业时间（${range.start}-${range.end}）内`,
      );
    }

    // 已过去的时间段不可预约（服务端兜底）：
    // 按小时/套餐：开始时间必须晚于当前；全天不限时：营业结束时间需晚于当前
    if (bookingType === 'all_day') {
      const endDateTime = new Date(`${dto.date}T${endTime}:00`);
      if (endDateTime.getTime() <= Date.now()) {
        throw new BadRequestException('该日期营业时段已结束，无法预约');
      }
    } else {
      const startDateTime = new Date(`${dto.date}T${startTime}:00`);
      if (startDateTime.getTime() <= Date.now()) {
        throw new BadRequestException('该时段已开始，无法预约');
      }
    }

    // 金额计算统一走整数分；多人同行 / 会员混合 / 周末加价在此结算
    const people = dto.peopleCount;
    const isGroup = people >= 2;
    let amountCents: number;
    if (isGroup) {
      // 同行 ≥2 人：预订人（已知会员身份）按会员价结算，其余人按多人同行价
      amountCents = isMember
        ? yuanToCents(memberPrice) + yuanToCents(groupPrice) * (people - 1)
        : yuanToCents(groupPrice) * people;
    } else {
      amountCents = yuanToCents(isMember ? memberPrice : normalPrice) * people;
    }
    let originalAmountCents = yuanToCents(normalPrice) * people;

    // 周末/节假日加价：周六/周日或新加坡公共假期统一上浮 weekendSurchargePercent%
    const surcharge = store.weekendSurchargePercent ?? 0;
    if (isSurchargeDate(dto.date) && surcharge > 0) {
      const rate = 100 + surcharge;
      amountCents = Math.round((amountCents * rate) / 100);
      originalAmountCents = Math.round((originalAmountCents * rate) / 100);
    }
    const amount = centsToYuan(amountCents);
    const originalAmount = centsToYuan(originalAmountCents);

    // 1) Redis 分布式锁：串行化同一组桌位同日的创建请求
    const lockKey = `booking:lock:${dto.storeId}:${[...requestedIds]
      .sort((a, b) => a - b)
      .join(',')}:${dto.date}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException(
        '该桌位刚被其他用户预约，请选择其他时段或桌位',
      );
    }

    try {
      // 2) 事务：冲突校验（含 DB 组合索引兜底）+ 预约码生成 + 落库
      const saved = await this.dataSource.transaction(async (em) => {
        // 冲突校验：SQL 端按桌位（含一单多桌 JSON 展开）+ 时间段重叠判断，避免整表拉取
        const conflict = await this.findOverlapConflict(
          em,
          dto.storeId!,
          dto.date!,
          requestedIds,
          startTime,
          endTime,
        );
        if (conflict) {
          const conflictTables = (
            conflict.tables?.length
              ? conflict.tables.map((t) => t.name)
              : [conflict.tableName]
          ).join('、');
          throw new BadRequestException(
            `桌位 ${conflictTables} ${conflict.startTime}-${conflict.endTime} 已被预约，请选择其他时段或桌位`,
          );
        }

        // 使用优惠券：同一事务内校验并抵扣，失败则整单不落库
        let finalAmount = amount;
        let couponDiscount = 0;
        let couponTitle = '';
        if (dto.userCouponId != null) {
          const applied = await this.applyCoupon(
            em,
            userId,
            dto.userCouponId,
            yuanToCents(amount),
          );
          couponDiscount = centsToYuan(applied.discountCents);
          couponTitle = applied.title;
          finalAmount = centsToYuan(
            yuanToCents(amount) - applied.discountCents,
          );
        }

        const appointment = em.create(Appointment, {
          userId,
          storeId: store.id,
          storeName: store.name,
          tableId: seats[0].id,
          tableName: seats[0].name,
          slotId: null,
          bookingType,
          durationHours,
          packageId,
          packageName,
          date: dto.date,
          startTime,
          endTime,
          peopleCount: dto.peopleCount,
          // 门店预约直接进入待核销，到店核销即可，无需管理端确认
          status: 'booked',
          code: await this.generateCode(em),
          note: dto.note ?? '',
          amount: finalAmount,
          originalAmount,
          userCouponId: dto.userCouponId ?? null,
          couponTitle,
          couponDiscount,
          payStatus: dto.payMethod ? ('paid' as const) : ('unpaid' as const),
          payMethod: dto.payMethod ?? '',
          paidAt: dto.payMethod ? new Date() : null,
        });
        const saved = await em.save(appointment);
        // 一单多桌关系写入关联表（availability / 冲突校验不再走 JSON_TABLE）
        await em.insert(
          AppointmentTable,
          seats.map((s) => ({
            appointmentId: saved.id,
            tableId: s.id,
            storeId: store.id,
            date: dto.date,
          })),
        );
        // 虚拟列不会在 save 后自动填充，这里按 seats 直接补上，保持响应兼容
        saved.tables = seats.map((s) => ({
          id: s.id,
          name: s.name,
          capacity: s.capacity,
          people: 0,
        }));
        return saved;
      });
      // 3) 落库后失效该店该日 availability 缓存
      await this.invalidateAvailability(saved.storeId, saved.date);
      return this.withCouponCode(saved);
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }

  /**
   * 创建活动预约：活动/场次/名额校验 → Redis 分布式锁 → 事务内名额校验 + 落库。
   * 防超卖：同一场次已预约人数 + 本次人数 ≤ 场次名额上限。
   */
  private async createActivity(
    userId: number,
    dto: CreateAppointmentDto,
    isMember: boolean,
  ): Promise<Appointment> {
    if (dto.activityId == null || dto.activitySessionId == null) {
      throw new BadRequestException('活动预约需要选择活动和场次');
    }
    const activity = await this.activities.findOneBy({
      id: dto.activityId,
      enabled: true,
      bookable: true,
    });
    if (!activity) throw new NotFoundException('活动不存在或不可预约');

    const session = await this.activitySessionsRepo.findOneBy({
      id: dto.activitySessionId,
      activityId: dto.activityId,
      enabled: true,
    });
    if (!session) throw new NotFoundException('活动场次不存在');

    if (dto.peopleCount > session.capacity) {
      throw new BadRequestException(`该场次最多容纳 ${session.capacity} 人`);
    }
    if (session.date < this.todayStr()) {
      throw new BadRequestException('不能预约过去的场次');
    }

    // 价格：会员且配置了会员价时按会员价（0 元 = 会员免费），否则按门市价
    const unitPrice = this.unitPrice(
      isMember,
      activity.price ?? 0,
      activity.memberPrice,
    );
    const originalUnit = activity.price ?? 0;
    // 金额计算统一走整数分，避免浮点误差
    const amount = centsToYuan(yuanToCents(unitPrice) * dto.peopleCount);
    const originalAmount = centsToYuan(
      yuanToCents(originalUnit) * dto.peopleCount,
    );

    const lockKey = `booking:activity:${dto.activityId}:${dto.activitySessionId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException(
        '该场次名额刚被其他用户抢走，请选择其他场次',
      );
    }

    try {
      return await this.dataSource.transaction(async (em) => {
        const booked = await em.find(Appointment, {
          where: {
            activitySessionId: dto.activitySessionId,
            status: Not(In(['cancelled', 'completed'])),
          },
        });
        const bookedCount = booked.reduce((sum, a) => sum + a.peopleCount, 0);
        if (bookedCount + dto.peopleCount > session.capacity) {
          throw new BadRequestException(
            `该场次剩余名额不足，剩余 ${session.capacity - bookedCount} 人`,
          );
        }

        // 使用优惠券：同一事务内校验并抵扣，失败则整单不落库
        let finalAmount = amount;
        let couponDiscount = 0;
        let couponTitle = '';
        if (dto.userCouponId != null) {
          const applied = await this.applyCoupon(
            em,
            userId,
            dto.userCouponId,
            yuanToCents(amount),
          );
          couponDiscount = centsToYuan(applied.discountCents);
          couponTitle = applied.title;
          finalAmount = centsToYuan(
            yuanToCents(amount) - applied.discountCents,
          );
        }

        const appointment = em.create(Appointment, {
          userId,
          type: 'activity',
          storeId: null,
          storeName: activity.title,
          tableId: null,
          tableName: '',
          slotId: null,
          activityId: activity.id,
          activitySessionId: session.id,
          activityName: activity.title,
          date: session.date,
          startTime: session.startTime,
          endTime: session.endTime,
          peopleCount: dto.peopleCount,
          status: 'pending',
          code: await this.generateCode(em),
          note: dto.note ?? '',
          amount: finalAmount,
          originalAmount,
          userCouponId: dto.userCouponId ?? null,
          couponTitle,
          couponDiscount,
          payStatus: dto.payMethod ? ('paid' as const) : ('unpaid' as const),
          payMethod: dto.payMethod ?? '',
          paidAt: dto.payMethod ? new Date() : null,
        });
        return em.save(appointment);
      });
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }

  /** 会员价计算：会员且 memberPrice 已配置（含 0 元免费）时用会员价 */
  private unitPrice(
    isMember: boolean,
    normalPrice: number,
    memberPrice: number | null | undefined,
  ): number {
    if (isMember && memberPrice != null) return memberPrice;
    return normalPrice;
  }

  /**
   * 在创建预约的事务内校验并使用优惠券：
   * 校验归属/状态/有效期/门槛 → 计算抵扣 → 将券绑定到本预约
   * （不在此核销，到店核销预约时一并核销）。
   * 对用户券行加悲观锁，防止同一张券并发重复绑定。
   */
  private async applyCoupon(
    em: EntityManager,
    userId: number,
    userCouponId: number,
    amountCents: number,
  ): Promise<{ discountCents: number; title: string }> {
    const ownedRepo = em.getRepository(UserCoupon);
    const couponRepo = em.getRepository(Coupon);
    const appointmentRepo = em.getRepository(Appointment);

    const owned = await ownedRepo.findOne({
      where: { id: userCouponId, userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!owned || owned.status !== 'unused') {
      throw new BadRequestException('优惠券不可用（未领取或已使用）');
    }

    // 同一张券不允许同时绑定到另一笔未完成预约
    const bound = await appointmentRepo.findOne({
      where: {
        userCouponId,
        status: In(['pending', 'booked', 'checked_in', 'in_service']),
      },
    });
    if (bound) {
      throw new BadRequestException('该优惠券已用于其他预约');
    }

    const coupon = await couponRepo.findOneBy({ id: owned.couponId });
    if (!coupon || !coupon.enabled || coupon.expireAt <= new Date()) {
      throw new BadRequestException('优惠券不存在或已过期');
    }

    const threshold = this.parseCouponThreshold(coupon.threshold);
    if (amountCents < yuanToCents(threshold)) {
      throw new BadRequestException(
        `订单金额未满足优惠券使用门槛（${coupon.threshold}）`,
      );
    }

    const parsed = this.parseCouponAmount(coupon.amount);
    const discountCents =
      parsed.kind === 'percent'
        ? percentOffCents(amountCents, parsed.value)
        : Math.min(yuanToCents(parsed.value), amountCents);

    return { discountCents, title: coupon.title };
  }

  /**
   * 到店核销预约时，一并核销绑定的优惠券（幂等：已核销/已过期则跳过）。
   * 必须在核销预约的同一事务内调用，保证预约上钟与优惠券核销原子完成。
   */
  private async redeemBoundCoupon(
    em: EntityManager,
    userCouponId: number,
    operatorId?: number,
  ): Promise<void> {
    const ownedRepo = em.getRepository(UserCoupon);
    const owned = await ownedRepo.findOne({
      where: { id: userCouponId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!owned || owned.status !== 'unused') return;
    const coupon = await em
      .getRepository(Coupon)
      .findOneBy({ id: owned.couponId });
    if (!coupon || coupon.expireAt <= new Date()) return;
    owned.status = 'used';
    owned.usedAt = new Date();
    if (operatorId) owned.redeemedBy = operatorId;
    await ownedRepo.save(owned);
  }

  /** 附加优惠券核销码（预约码与券码同页展示用），未用券返回 null */
  private async withCouponCode<T extends Appointment>(
    appt: T,
  ): Promise<T & { couponCode: string | null }> {
    if (!appt.userCouponId) return { ...appt, couponCode: null };
    const owned = await this.userCoupons.findOneBy({ id: appt.userCouponId });
    // 券码仅在核销前有效：已核销的券不再展示（历史订单下单即核销的数据自动隐藏）
    return {
      ...appt,
      couponCode: owned?.status === 'unused' ? owned.code : null,
    };
  }

  /** 批量附加优惠券核销码（列表接口用，避免 N+1 查询） */
  private async withCouponCodes(
    items: Appointment[],
  ): Promise<Array<Appointment & { couponCode: string | null }>> {
    const ids = Array.from(
      new Set(
        items.map((a) => a.userCouponId).filter((x): x is number => x != null),
      ),
    );
    if (!ids.length) {
      return items.map((a) => ({ ...a, couponCode: null }));
    }
    const owned = await this.userCoupons.findBy({ id: In(ids) });
    const map = new Map(owned.map((o) => [o.id, o]));
    return items.map((a) => ({
      ...a,
      couponCode:
        a.userCouponId != null && map.get(a.userCouponId)?.status === 'unused'
          ? (map.get(a.userCouponId)?.code ?? null)
          : null,
    }));
  }

  /** 解析券额：`$20` → 现金 20；`8.8 折` → 88% 支付 */
  private parseCouponAmount(raw: string): {
    kind: 'cash' | 'percent';
    value: number;
  } {
    const percent = raw.match(/(\d+(?:\.\d+)?)\s*折/);
    if (percent) return { kind: 'percent', value: parseFloat(percent[1]) };
    const cash = raw.match(/(\d+(?:\.\d+)?)/);
    return { kind: 'cash', value: cash ? parseFloat(cash[1]) : 0 };
  }

  /** 解析使用门槛：`无门槛` → 0；`满 $100 可用` → 100 */
  private parseCouponThreshold(raw: string): number {
    if (/无门槛/.test(raw)) return 0;
    const m = raw.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
  }

  /** 活动场次列表（含剩余名额），预约流程选场次用 */
  async activitySessions(activityId: number) {
    const activity = await this.activities.findOneBy({
      id: activityId,
      enabled: true,
      bookable: true,
    });
    if (!activity) throw new NotFoundException('活动不存在或不可预约');
    const sessions = await this.activitySessionsRepo.find({
      where: { activityId, enabled: true },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    if (!sessions.length) return [];
    const ids = sessions.map((s) => s.id);
    const booked = await this.appointments.find({
      where: {
        activitySessionId: In(ids),
        status: Not(In(['cancelled', 'completed'])),
      },
    });
    const bookedMap = new Map<number, number>();
    for (const a of booked) {
      bookedMap.set(
        a.activitySessionId!,
        (bookedMap.get(a.activitySessionId!) ?? 0) + a.peopleCount,
      );
    }
    return sessions.map((s) => {
      const bookedCount = bookedMap.get(s.id) ?? 0;
      return {
        ...s,
        bookedCount,
        remaining: Math.max(0, s.capacity - bookedCount),
      };
    });
  }

  /** 我的预约列表（分页，按时间倒序） */
  async myList(
    userId: number,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: Appointment[]; total: number }> {
    const [items, total] = await this.appointments.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: await this.withCouponCodes(items), total };
  }

  /** 预约详情（仅本人或核销人） */
  async detail(userId: number, id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');
    if (appt.userId !== userId && appt.checkedInBy !== userId) {
      throw new ForbiddenException('无权查看该预约单');
    }
    // 自动下钟：预约时段到点后，读详情时即时结束服务，无需等定时任务
    if (appt.status === 'in_service' && this.scheduledEnd(appt) <= new Date()) {
      appt.status = 'completed';
      appt.serviceEndTime = this.scheduledEnd(appt);
      await this.appointments.save(appt);
      // 读详情时触发的即时下钟同样会释放桌位，需同步失效 availability 缓存
      await this.invalidateAvailability(appt.storeId, appt.date);
    }
    return this.withCouponCode(appt);
  }

  /**
   * 取消预约（待确认/待核销状态）。
   * 幂等：已取消的预约直接返回成功，客户端超时后重试不再报 4xx，
   * 避免「取消已生效但响应超时 → 重试报错 → 残留 booked 单」的连锁问题。
   */
  async cancel(userId: number, id: number): Promise<Appointment> {
    const appt = await this.detail(userId, id);
    if (appt.status === 'cancelled') return appt;
    if (appt.status !== 'pending' && appt.status !== 'booked') {
      throw new BadRequestException('仅待确认或待核销状态的预约可取消');
    }
    appt.status = 'cancelled';
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /**
   * 扫码/输码核销：顾客到店核销即上钟，状态 booked → in_service
   * （上钟时间以扫码时刻为准）。预约绑定了优惠券时，在同一事务内一并核销。
   */
  async checkIn(code: string, operatorId?: number): Promise<Appointment> {
    const normalized = normalizeRedeemCode(code);
    const saved = await this.dataSource.transaction(async (em) => {
      const apptRepo = em.getRepository(Appointment);
      const appt = await apptRepo.findOne({
        where: { code: normalized },
        lock: { mode: 'pessimistic_write' },
      });
      if (!appt) throw new NotFoundException('预约码无效');
      if (appt.status !== 'booked') {
        throw new BadRequestException(
          appt.status === 'cancelled'
            ? '该预约已取消'
            : appt.status === 'pending'
              ? '该预约待门店确认，确认后方可到店核销'
              : '该预约码已核销，不可重复核销',
        );
      }

      // 校验预约日期：仅可当天核销
      const today = this.todayStr();
      if (appt.date !== today) {
        throw new BadRequestException(
          `预约日期为 ${appt.date}，仅可在预约当天核销`,
        );
      }
      // 校验核销时间：仅可在预约时段内核销
      this.assertCheckInTime(appt);

      // 核销即上钟：无需用户端再手动启动，计时从扫码时刻开始
      const now = new Date();
      appt.status = 'in_service';
      appt.checkInTime = now;
      appt.serviceStartTime = now;
      // 结束时间固定为预约时段（不因迟到顺延），计时剩余 = 结束时间 - 扫码时间
      appt.serviceEndTime = this.scheduledEnd(appt);
      if (operatorId) appt.checkedInBy = operatorId;
      const savedAppt = await apptRepo.save(appt);
      // 预约带优惠券：核销预约时一并核销优惠券
      if (savedAppt.userCouponId != null) {
        await this.redeemBoundCoupon(em, savedAppt.userCouponId, operatorId);
      }
      return savedAppt;
    });
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 上钟：checked_in → in_service（兼容路径：历史数据/管理端核销后单独上钟） */
  async clockIn(userId: number, id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');

    // 用户本人或门店店员（checkedInBy）可操作
    if (appt.userId !== userId && appt.checkedInBy !== userId) {
      throw new ForbiddenException('无权操作该预约单');
    }

    if (appt.status !== 'checked_in') {
      throw new BadRequestException('仅已核销状态的预约可上钟');
    }

    appt.status = 'in_service';
    appt.serviceStartTime = new Date();
    appt.serviceEndTime = this.scheduledEnd(appt);
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 下钟：状态 in_service → completed，记录结束时间 */
  async clockOut(userId: number, id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');

    if (appt.userId !== userId && appt.checkedInBy !== userId) {
      throw new ForbiddenException('无权操作该预约单');
    }

    if (appt.status !== 'in_service') {
      throw new BadRequestException('仅服务中状态的预约可下钟');
    }

    appt.status = 'completed';
    appt.serviceEndTime = new Date();
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 按预约码查询（运营/核销用） */
  /**
   * 按预约码查询（核销前确认用）。
   * 核销码只在核销前有效：核销完成后立即失效（in_service/completed 均不可再查询），
   * 已取消的单同样不可再查询使用。
   */
  async findByCode(code: string): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({
      code: normalizeRedeemCode(code),
    });
    if (!appt) throw new NotFoundException('预约码无效');
    if (appt.status === 'cancelled') {
      throw new BadRequestException('该预约已取消');
    }
    if (appt.status !== 'pending' && appt.status !== 'booked') {
      throw new BadRequestException('该预约码已核销，不可重复使用');
    }
    return this.withCouponCode(appt);
  }

  /** 管理端：预约列表（分页，可按状态/门店/日期筛选），附带用户邮箱/昵称 */
  async adminFindAll(
    filters?: {
      status?: string;
      storeId?: string;
      date?: string;
      keyword?: string;
      code?: string;
    },
    page = 1,
    pageSize = 20,
  ): Promise<
    [Array<Appointment & { userEmail?: string; userNickname?: string }>, number]
  > {
    const where: FindOptionsWhere<Appointment> = {};
    if (filters?.status) where.status = filters.status as Appointment['status'];
    if (filters?.storeId) where.storeId = parseInt(filters.storeId, 10);
    if (filters?.date) where.date = filters.date;
    if (filters?.code?.trim()) {
      where.code = normalizeRedeemCode(filters.code);
    }
    if (filters?.keyword?.trim()) {
      const matched = await this.users.findByKeyword(filters.keyword);
      const userIds = matched.map((u) => u.id);
      if (!userIds.length) return [[], 0];
      where.userId = In(userIds);
    }
    const [items, total] = await this.appointments.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const userIds = Array.from(new Set(items.map((i) => i.userId)));
    const users = await this.users.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));
    return [
      items.map((i) => {
        const user = userMap.get(i.userId);
        return {
          ...i,
          userEmail: user?.email ?? undefined,
          userNickname: user?.nickname || `用户 #${i.userId}`,
        };
      }),
      total,
    ];
  }

  /** 管理端确认预约：pending → booked（确认后才可到店核销） */
  async adminConfirm(id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');
    if (appt.status !== 'pending') {
      throw new BadRequestException('仅待确认状态的预约可确认');
    }
    if (appt.date < this.todayStr()) {
      throw new BadRequestException('预约日期已过，无法确认');
    }
    appt.status = 'booked';
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /**
   * 管理端取消预约（待确认/待核销/已核销状态，服务开始前）。
   * 幂等：已取消的预约直接返回成功，店员重复操作/超时重试不报 4xx。
   */
  async adminCancel(id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');
    if (appt.status === 'cancelled') return appt;
    if (
      appt.status !== 'pending' &&
      appt.status !== 'booked' &&
      appt.status !== 'checked_in'
    ) {
      throw new BadRequestException('仅待确认、待核销或已核销状态的预约可取消');
    }
    appt.status = 'cancelled';
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 管理端核销（按 ID，店员代操作）：核销即上钟，扫码/输码即开始计时 */
  async adminCheckIn(id: number, operatorId?: number): Promise<Appointment> {
    const saved = await this.dataSource.transaction(async (em) => {
      const apptRepo = em.getRepository(Appointment);
      const appt = await apptRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!appt) throw new NotFoundException('预约单不存在');
      if (appt.status !== 'booked') {
        throw new BadRequestException(
          appt.status === 'cancelled'
            ? '该预约已取消'
            : '该预约码已核销，不可重复核销',
        );
      }
      // 校验核销日期/时间：仅可在预约当天且预约时段内核销
      if (appt.date !== this.todayStr()) {
        throw new BadRequestException(
          `预约日期为 ${appt.date}，仅可在预约当天核销`,
        );
      }
      this.assertCheckInTime(appt);
      const now = new Date();
      appt.status = 'in_service';
      appt.checkInTime = now;
      appt.serviceStartTime = now;
      appt.serviceEndTime = this.scheduledEnd(appt);
      if (operatorId) appt.checkedInBy = operatorId;
      const savedAppt = await apptRepo.save(appt);
      // 预约带优惠券：核销预约时一并核销优惠券
      if (savedAppt.userCouponId != null) {
        await this.redeemBoundCoupon(em, savedAppt.userCouponId, operatorId);
      }
      return savedAppt;
    });
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 管理端上钟 */
  async adminClockIn(id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');
    if (appt.status !== 'checked_in') {
      throw new BadRequestException('仅已核销状态的预约可上钟');
    }
    appt.status = 'in_service';
    appt.serviceStartTime = new Date();
    appt.serviceEndTime = this.scheduledEnd(appt);
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 管理端下钟 */
  async adminClockOut(id: number): Promise<Appointment> {
    const appt = await this.appointments.findOneBy({ id });
    if (!appt) throw new NotFoundException('预约单不存在');
    if (appt.status !== 'in_service') {
      throw new BadRequestException('仅服务中状态的预约可下钟');
    }
    appt.status = 'completed';
    appt.serviceEndTime = new Date();
    const saved = await this.appointments.save(appt);
    this.broadcastAppointment(saved);
    await this.invalidateAvailability(saved.storeId, saved.date);
    return saved;
  }

  /** 线下散客占位账号：开台单挂在该用户下（无密码无法登录，仅作归属与展示） */
  private static readonly WALK_IN_USER = {
    username: 'walkin',
    email: 'walkin@local',
    nickname: '线下散客',
    avatar: '',
  };

  /**
   * 管理端：线下散客直接开台上钟（顾客无需注册）。
   * 创建即服务中：开始 = 当前时刻，结束 = 当前 + 时长（全天 = 营业结束），
   * 结束时间固定不顺延，到点由自动下钟任务完成；金额按门市/多人同行价计算（线下收款，payStatus=unpaid）。
   */
  async adminWalkIn(dto: WalkInDto, operatorId: number): Promise<Appointment> {
    const store = await this.stores.findOneBy({
      id: dto.storeId,
      enabled: true,
    });
    if (!store) throw new NotFoundException('门店不存在');

    // 桌位解析与人数校验：与线上预约同一套规则（一单可多桌，按顺序坐满）
    const requestedIds = [...new Set(dto.tableIds)];
    if (!requestedIds.length) {
      throw new BadRequestException('开台需要选择桌位');
    }
    const tableRows = await this.tables.find({
      where: { id: In(requestedIds), storeId: store.id, enabled: true },
    });
    if (tableRows.length !== requestedIds.length) {
      throw new NotFoundException('部分桌位不存在或已停用');
    }
    tableRows.sort(
      (a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id),
    );
    const totalCapacity = tableRows.reduce((s, t) => s + t.capacity, 0);
    if (dto.peopleCount > totalCapacity) {
      throw new BadRequestException(
        `所选桌位最多容纳 ${totalCapacity} 人，当前 ${dto.peopleCount} 人，请增加桌位`,
      );
    }
    let remainingPeople = dto.peopleCount;
    const seats = tableRows.map((t) => {
      const people = Math.min(t.capacity, remainingPeople);
      remainingPeople -= people;
      return { id: t.id, name: t.name, capacity: t.capacity, people };
    });

    // 时段：开始 = 当前时刻；hourly 按小时顺延，all_day 到营业结束；结束不得超出营业时间
    const now = new Date();
    const date = this.todayStr();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startTime = this.formatMinutes(nowMin);
    const range = this.businessHoursRange(store);
    const closeMin = Math.min(this.minutes(range.end), 24 * 60 - 1);
    const bookingType = dto.bookingType ?? 'hourly';

    let endTime: string;
    let durationHours: number;
    let normalPrice: number;
    let groupPrice: number;
    if (bookingType === 'all_day') {
      if (closeMin <= nowMin) {
        throw new BadRequestException('今日营业时间已结束，无法开台');
      }
      endTime = range.end;
      durationHours = Math.max(1, Math.ceil((closeMin - nowMin) / 60));
      const fallback = centsToYuan(
        yuanToCents(store.price ?? 39.9) * durationHours,
      );
      normalPrice = store.allDayPrice ?? fallback;
      groupPrice = store.allDayGroupPrice ?? normalPrice;
    } else {
      if (!dto.durationHours || dto.durationHours < 1) {
        throw new BadRequestException('按小时开台需要选择时长');
      }
      durationHours = dto.durationHours;
      if (nowMin + durationHours * 60 > closeMin) {
        throw new BadRequestException(
          `超出营业时间（营业至 ${range.end}），请缩短时长`,
        );
      }
      endTime = this.formatMinutes(nowMin + durationHours * 60);
      // 与线上预约同一套规则：时长恰等套餐按套餐价，超出部分按小时单价
      const hourlyPackages =
        (await this.packages.find({
          where: { storeId: store.id, enabled: true },
        })) ?? [];
      const units = this.hourlyUnitPrices(store, hourlyPackages, durationHours);
      normalPrice = units.normal;
      groupPrice = units.group;
    }

    // 金额：散客无会员身份，≥2 人走多人同行价；周末加价规则与线上一致
    const people = dto.peopleCount;
    let amountCents =
      people >= 2
        ? yuanToCents(groupPrice) * people
        : yuanToCents(normalPrice) * people;
    let originalAmountCents = yuanToCents(normalPrice) * people;
    const surcharge = store.weekendSurchargePercent ?? 0;
    if (isSurchargeDate(date) && surcharge > 0) {
      const rate = 100 + surcharge;
      amountCents = Math.round((amountCents * rate) / 100);
      originalAmountCents = Math.round((originalAmountCents * rate) / 100);
    }

    // 线下散客占位账号（首次开台时自动创建）
    const walkIn = await this.users.findByUsernameOrCreate(
      AppointmentsService.WALK_IN_USER,
    );

    // 与线上预约同一套防超卖：桌位分布式锁 + 事务内时间段重叠校验
    const lockKey = `booking:lock:${store.id}:${[...requestedIds]
      .sort((a, b) => a - b)
      .join(',')}:${date}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException('该桌位正在开台，请稍后重试');
    }

    try {
      const saved = await this.dataSource.transaction(async (em) => {
        // 冲突校验：SQL 端按桌位（含一单多桌 JSON 展开）+ 时间段重叠判断
        const conflict = await this.findOverlapConflict(
          em,
          store.id,
          date,
          requestedIds,
          startTime,
          endTime,
        );
        if (conflict) {
          const conflictTables = (
            conflict.tables?.length
              ? conflict.tables.map((t) => t.name)
              : [conflict.tableName]
          ).join('、');
          throw new BadRequestException(
            `桌位 ${conflictTables} ${conflict.startTime}-${conflict.endTime} 已有预约，请缩短时长或更换桌位`,
          );
        }

        const appointment = em.create(Appointment, {
          userId: walkIn.id,
          storeId: store.id,
          storeName: store.name,
          tableId: seats[0].id,
          tableName: seats[0].name,
          slotId: null,
          bookingType,
          durationHours,
          packageId: null,
          packageName: '',
          date,
          startTime,
          endTime,
          peopleCount: dto.peopleCount,
          // 开台即上钟：直接服务中，到点自动下钟
          status: 'in_service' as const,
          code: await this.generateCode(em),
          note: dto.note ?? '',
          amount: centsToYuan(amountCents),
          originalAmount: centsToYuan(originalAmountCents),
          payStatus: 'unpaid' as const,
          checkInTime: now,
          serviceStartTime: now,
          serviceEndTime: new Date(`${date}T${endTime}:00`),
          checkedInBy: operatorId,
        });
        const saved = await em.save(appointment);
        // 开台同样落关联表，availability / 冲突校验才能看到这单的桌位占用
        await em.insert(
          AppointmentTable,
          seats.map((s) => ({
            appointmentId: saved.id,
            tableId: s.id,
            storeId: store.id,
            date,
          })),
        );
        saved.tables = seats.map((s) => ({
          id: s.id,
          name: s.name,
          capacity: s.capacity,
          people: 0,
        }));
        return saved;
      });
      this.broadcastAppointment(saved);
      await this.invalidateAvailability(saved.storeId, saved.date);
      return saved;
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }

  /**
   * 查询某门店某日桌位可用性：返回每个桌位已占用时段窗口，客户端按预约时段重叠判断。
   * - 缓存：Redis cache-aside，key = availability:{storeId}:{date}，TTL 兜底至当日结束；
   *   预约创建/取消/核销/下钟等变更时按 (storeId, date) 显式失效；
   * - 分页：传 page/pageSize 时返回 { items, total, page, pageSize }，
   *   不传保持原数组格式（兼容现有客户端），分页在内存切片（快照已整份缓存）。
   */
  async availability(
    storeId: number,
    date: string,
    page?: number,
    pageSize?: number,
  ) {
    const store = await this.stores.findOneBy({ id: storeId, enabled: true });
    if (!store) throw new NotFoundException('门店不存在');

    const cacheKey = this.availabilityCacheKey(storeId, date);
    let items: TableAvailabilityItem[] | null = null;

    // 1) 缓存命中直接返回；未命中回源计算并写回
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached != null) {
      try {
        const parsed = JSON.parse(cached) as unknown;
        if (Array.isArray(parsed)) items = parsed as TableAvailabilityItem[];
      } catch {
        items = null; // 缓存内容损坏时回源计算
      }
    }

    if (items == null) {
      // 单飞：同一 key 已有在途回源计算则复用，避免并发未命中把 DB 打满
      const epochAtStart = this.availabilityEpoch;
      let inflight = this.availabilityInflight.get(cacheKey);
      if (!inflight) {
        inflight = this.computeAvailability(
          storeId,
          date,
          epochAtStart,
        ).finally(() => {
          if (this.availabilityInflight.get(cacheKey) === inflight) {
            this.availabilityInflight.delete(cacheKey);
          }
        });
        this.availabilityInflight.set(cacheKey, inflight);
      }
      items = await inflight;
    }

    if (page != null || pageSize != null) {
      const p = Math.max(1, page ?? 1);
      const size = Math.min(100, Math.max(1, pageSize ?? 20));
      const start = (p - 1) * size;
      return {
        items: items.slice(start, start + size),
        total: items.length,
        page: p,
        pageSize: size,
      };
    }
    return items;
  }

  /**
   * SQL 端时间段重叠冲突检查（一单多桌走 appointment_tables 关联表）。
   * 相比把当日全部预约拉进内存再 JS 判断，这里只返回命中的一行：
   * (storeId, date, tableId) 复合索引先按「该店该日 + 目标桌位」收窄，
   * 再回表 appointments 过滤状态与时段。
   * 重叠判定：existing.start < new.end && existing.end > new.start
   * 命中后再查一次该单的关联桌位名，用于错误提示（原 tables JSON 已删除）。
   */
  private async findOverlapConflict(
    em: EntityManager,
    storeId: number,
    date: string,
    tableIds: number[],
    startTime: string,
    endTime: string,
  ): Promise<{
    tables: Array<{ id: number; name: string }>;
    tableId: number | null;
    tableName: string;
    startTime: string;
    endTime: string;
  } | null> {
    if (!tableIds.length) return null;
    const placeholders = tableIds.map(() => '?').join(',');
    const rows = (await em.query(
      `SELECT a.id AS id, a.tableId, a.tableName, a.startTime, a.endTime
       FROM appointment_tables at
       JOIN appointments a ON a.id = at.appointmentId
       WHERE at.storeId = ? AND at.date = ?
         AND at.tableId IN (${placeholders})
         AND a.status IN ('pending', 'booked', 'checked_in', 'in_service')
         AND a.startTime < ? AND a.endTime > ?
       LIMIT 1`,
      [storeId, date, ...tableIds, endTime, startTime],
    )) as unknown as Array<{
      id: number;
      tableId: number;
      tableName: string;
      startTime: string;
      endTime: string;
    }>;
    if (!rows.length) return null;
    const row = rows[0];
    // 取该预约的全部桌位名（一单多桌提示，如「A1、B2」）
    const tableRows = (await em.query(
      `SELECT at.tableId, COALESCE(st.name, '') AS name
       FROM appointment_tables at
       LEFT JOIN store_tables st ON st.id = at.tableId
       WHERE at.appointmentId = ?
       ORDER BY at.tableId`,
      [row.id],
    )) as unknown as Array<{ tableId: number; name: string }>;
    return {
      tableId: row.tableId != null ? Number(row.tableId) : null,
      tableName: row.tableName ?? '',
      tables: tableRows.map((t) => ({ id: Number(t.tableId), name: t.name })),
      startTime: row.startTime,
      endTime: row.endTime,
    };
  }

  /** 生成唯一 6 位数字+字母预约码（重试兜底） */
  private async generateCode(em: EntityManager): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const code = generateRedeemCode();
      const exists = await em.findOne(Appointment, { where: { code } });
      if (!exists) return code;
    }
    throw new Error('预约码生成失败，请重试');
  }

  private todayStr(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
