import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { SaveActivityDto, SaveActivitySessionDto } from './activity.dto';
import { ActivitySession } from './activity-session.entity';
import { Activity } from './activity.entity';

/** 活动数据：活动专区 / 会员套餐页共用 + 可预约场次 */
@Injectable()
export class ActivitiesService implements OnModuleInit {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectRepository(ActivitySession)
    private readonly sessions: Repository<ActivitySession>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
  ) {}

  async onModuleInit() {
    // 按标题去重逐条补种/更新，避免多个实例同时启动时重复插入
    const seeds = [
      {
        title: '周末会员沙龙「奶油胶手作日」',
        date: '08-16 14:00',
        desc: '会员免费参与，到场即送材料包一份，成品可带走。',
        tag: '限会员',
        address: '杭州市西湖区文一西路 1 号（西湖店）',
        lat: 30.25,
        lng: 120.15,
        price: 68,
        memberPrice: 0,
        bookable: true,
        membersOnly: true,
        sort: 1,
      },
      {
        title: '拼豆作品大赛',
        date: '08-22 起',
        desc: '上传拼豆作品参与评选，会员投稿双倍积分，前三名赢大奖。',
        tag: '双倍积分',
        bookable: false,
        sort: 2,
      },
      {
        title: '中秋月饼 DIY 特别场',
        date: '09-06 起',
        desc: '会员早鸟预约享 8 折，含月饼礼盒一份。',
        tag: '早鸟 8 折',
        address: '杭州市滨江区江南大道 2 号（滨江店）',
        lat: 30.3,
        lng: 120.1,
        price: 128,
        memberPrice: 99,
        bookable: true,
        sort: 3,
      },
    ];
    let inserted = 0;
    for (const seed of seeds) {
      const exists = await this.activities.findOneBy({ title: seed.title });
      if (exists) {
        // 已有旧数据：补齐可预约字段，便于演示直接可用
        await this.activities.save(
          this.activities.merge(exists, {
            address: seed.address ?? exists.address ?? '',
            lat: seed.lat ?? exists.lat ?? null,
            lng: seed.lng ?? exists.lng ?? null,
            price: seed.price ?? exists.price ?? 0,
            memberPrice:
              seed.memberPrice !== undefined
                ? seed.memberPrice
                : exists.memberPrice,
            bookable: seed.bookable ?? exists.bookable ?? false,
          }),
        );
      } else {
        await this.activities.save(this.activities.create(seed));
        inserted += 1;
      }
    }
    if (inserted) this.logger.log(`已预置 ${inserted} 条演示活动数据`);

    // 为可预约活动补种未来几天的演示场次
    const bookable = await this.activities.findBy({ bookable: true });
    for (const activity of bookable) {
      await this.seedSessions(activity);
    }
  }

  /** 为活动补种未来场次（未来 5 天内无场次才补种） */
  private async seedSessions(activity: Activity) {
    const from = new Date();
    const until = new Date(from.getTime() + 5 * 86400000);
    const existing = await this.sessions.find({
      where: { activityId: activity.id },
    });
    const hasFuture = existing.some(
      (s) => s.date >= this.dateStr(from) && s.date <= this.dateStr(until),
    );
    if (hasFuture) return;

    const templates = [
      { startTime: '14:00', endTime: '16:00' },
      { startTime: '18:00', endTime: '20:00' },
    ];
    for (let offset = 1; offset <= 3; offset++) {
      const d = new Date(from.getTime() + offset * 86400000);
      for (const t of templates) {
        const date = this.dateStr(d);
        const dup = existing.some(
          (s) =>
            s.date === date &&
            s.startTime === t.startTime &&
            s.endTime === t.endTime,
        );
        if (dup) continue;
        await this.sessions.save(
          this.sessions.create({
            activityId: activity.id,
            date,
            startTime: t.startTime,
            endTime: t.endTime,
            capacity: 12,
          }),
        );
      }
    }
  }

  private dateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** 上架中的活动（用户端） */
  list() {
    return this.activities.find({
      where: { enabled: true },
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  /** 活动详情（用户端）：含可约场次 */
  async detail(id: number): Promise<Activity | null> {
    const item = await this.activities.findOne({
      where: { id, enabled: true },
      relations: { sessions: true },
    });
    if (!item) return null;
    item.sessions = item.sessions
      .filter((s) => s.enabled)
      .sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date),
      );
    return item;
  }

  /** 全部活动（管理端） */
  listAll() {
    return this.activities.find({
      relations: { sessions: true },
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  async create(dto: SaveActivityDto) {
    const item = this.activities.create({
      title: dto.title,
      date: dto.date,
      desc: dto.desc ?? '',
      tag: dto.tag ?? '',
      address: dto.address ?? '',
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      price: dto.price ?? 0,
      memberPrice: dto.memberPrice ?? null,
      bookable: dto.bookable ?? false,
      membersOnly: dto.membersOnly ?? false,
      enabled: dto.enabled ?? true,
      sort: dto.sort ?? 0,
    });
    return this.activities.save(item);
  }

  async update(id: number, dto: Partial<SaveActivityDto>) {
    const item = await this.activities.findOneBy({ id });
    if (!item) throw new NotFoundException('活动不存在');
    Object.assign(item, {
      title: dto.title ?? item.title,
      date: dto.date ?? item.date,
      desc: dto.desc ?? item.desc,
      tag: dto.tag ?? item.tag,
      address: dto.address ?? item.address,
      lat: dto.lat ?? item.lat ?? null,
      lng: dto.lng ?? item.lng ?? null,
      price: dto.price ?? item.price ?? 0,
      memberPrice:
        dto.memberPrice !== undefined
          ? dto.memberPrice
          : (item.memberPrice ?? null),
      bookable: dto.bookable ?? item.bookable ?? false,
      membersOnly: dto.membersOnly ?? item.membersOnly,
      enabled: dto.enabled ?? item.enabled,
      sort: dto.sort ?? item.sort,
    });
    return this.activities.save(item);
  }

  async toggleEnabled(id: number, enabled: boolean) {
    const item = await this.activities.findOneBy({ id });
    if (!item) throw new NotFoundException('活动不存在');
    item.enabled = enabled;
    return this.activities.save(item);
  }

  /** 删除活动：场次随外键级联删除；已有预约记录时拒绝删除，避免历史数据悬空 */
  async remove(id: number) {
    const activity = await this.activities.findOneBy({ id });
    if (!activity) throw new NotFoundException('活动不存在');
    const bookings = await this.appointments.countBy({ activityId: id });
    if (bookings > 0) {
      throw new BadRequestException(
        `该活动已有 ${bookings} 条预约记录，无法删除，请改为下架`,
      );
    }
    await this.activities.remove(activity);
  }

  // ===== 活动场次（管理端） =====

  async addSession(activityId: number, dto: SaveActivitySessionDto) {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) throw new NotFoundException('活动不存在');
    const session = this.sessions.create({
      activityId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      capacity: dto.capacity,
      enabled: dto.enabled ?? true,
    });
    return this.sessions.save(session);
  }

  async updateSession(id: number, dto: Partial<SaveActivitySessionDto>) {
    const session = await this.sessions.findOneBy({ id });
    if (!session) throw new NotFoundException('活动场次不存在');
    Object.assign(session, {
      date: dto.date ?? session.date,
      startTime: dto.startTime ?? session.startTime,
      endTime: dto.endTime ?? session.endTime,
      capacity: dto.capacity ?? session.capacity,
      enabled: dto.enabled ?? session.enabled,
    });
    return this.sessions.save(session);
  }

  async removeSession(id: number) {
    const session = await this.sessions.findOneBy({ id });
    if (!session) throw new NotFoundException('活动场次不存在');
    await this.sessions.remove(session);
  }
}
