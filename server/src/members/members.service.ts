import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Like,
  MoreThan,
  Repository,
} from 'typeorm';
import { UsersService } from '../users/users.service';
import {
  generateRedeemCode,
  normalizeRedeemCode,
} from '../common/redeem-code.util';
import { maskEmail } from '../common/security.util';
import { Coupon, UserCoupon } from './coupon.entity';
import {
  SaveCouponDto,
  SaveMembershipDto,
  SavePlanDto,
  UpdateMembershipDto,
} from './member.dto';
import { MemberExperience } from './member-experience.entity';
import { MemberOrder } from './member-order.entity';
import { MemberPlan } from './member-plan.entity';
import { Membership } from './membership.entity';

@Injectable()
export class MembersService implements OnModuleInit {
  constructor(
    @InjectRepository(MemberPlan)
    private readonly plans: Repository<MemberPlan>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCoupons: Repository<UserCoupon>,
    @InjectRepository(MemberExperience)
    private readonly experiences: Repository<MemberExperience>,
    @InjectRepository(MemberOrder)
    private readonly orders: Repository<MemberOrder>,
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
  ) {}

  async onModuleInit() {
    if (!(await this.plans.count())) {
      await this.plans.save([
        this.plans.create({
          name: '月卡',
          durationDays: 30,
          price: '38',
          originalPrice: '58',
          benefits: ['会员专属体验价', '每月会员优惠券'],
          badge: '',
          recommended: false,
        }),
        this.plans.create({
          name: '季卡',
          durationDays: 90,
          price: '98',
          originalPrice: '174',
          benefits: ['会员专属体验价', '会员优惠券', '专属活动优先报名'],
          badge: '推荐',
          recommended: true,
        }),
        this.plans.create({
          name: '年卡',
          durationDays: 365,
          price: '328',
          originalPrice: '696',
          benefits: [
            '会员专属体验价',
            '会员优惠券',
            '专属活动优先报名',
            '每月免费饮品',
          ],
          badge: '最划算',
          recommended: false,
        }),
      ]);
    }
    if (!(await this.experiences.count())) {
      await this.experiences.save([
        this.experiences.create({
          name: '奶油胶手机壳 DIY',
          desc: '含手机壳材料一份，成品可带走',
          memberPrice: '49',
          normalPrice: '68',
          quota: 2,
          sortOrder: 1,
        }),
        this.experiences.create({
          name: '陶艺拉坯体验',
          desc: '含拉坯 + 上釉，作品烧制寄送',
          memberPrice: '59',
          normalPrice: '88',
          quota: 1,
          sortOrder: 2,
        }),
        this.experiences.create({
          name: '拼豆挂件 DIY',
          desc: '含拼豆材料包，成品可带走',
          memberPrice: '29',
          normalPrice: '39',
          quota: 3,
          sortOrder: 3,
        }),
        this.experiences.create({
          name: '香薰蜡烛手作',
          desc: '含精油与模具，成品可带走',
          memberPrice: '79',
          normalPrice: '109',
          quota: 1,
          sortOrder: 4,
        }),
      ]);
    }
  }

  listPlans(admin = false) {
    return this.plans.find({
      where: admin ? {} : { enabled: true },
      order: { durationDays: 'ASC' },
    });
  }

  /** 会员专属预约 / 到店体验项目 */
  listExperiences() {
    return this.experiences.find({
      where: { enabled: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async myMembership(userId: number) {
    const item = await this.memberships.findOneBy({ userId });
    if (!item)
      return {
        memberNo: '',
        levelName: '手作会员',
        status: 'none',
        expireAt: null,
      };
    return {
      ...item,
      status: item.expireAt > new Date() ? 'active' : 'expired',
    };
  }

  async purchase(userId: number, planId: number) {
    const plan = await this.plans.findOneBy({ id: planId, enabled: true });
    if (!plan) throw new NotFoundException('套餐不存在或已下架');
    // 线上下单、到店支付：只生成待确认申请，不直接激活会员；
    // 管理端确认（收款后）才真正开通/顺延会员期。
    return this.dataSource.transaction(async (manager) => {
      const orders = manager.getRepository(MemberOrder);
      // 限制：一个用户同一时间只能有一笔待确认申请；
      // 门店确认（或取消）后没有待确认申请，才允许再次提交开通/续费。
      const pending = await orders.findOne({
        where: { userId, status: 'pending' },
        lock: { mode: 'pessimistic_write' },
      });
      if (pending) {
        throw new BadRequestException(
          '您已提交会员开通申请，待门店确认后可再次申请',
        );
      }
      const order = orders.create({
        userId,
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        amount: Number(plan.price),
      });
      return orders.save(order);
    });
  }

  /** 我的开通申请列表 */
  async myOrders(userId: number) {
    return this.orders.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 管理端：开通申请列表（分页，可按用户关键字筛选），附带用户邮箱/昵称 */
  async adminListOrders(
    page = 1,
    keyword?: string,
    status?: string,
  ): Promise<
    [Array<MemberOrder & { userEmail?: string; userNickname?: string }>, number]
  > {
    const where: FindOptionsWhere<MemberOrder> = {};
    if (status) where.status = status as MemberOrder['status'];
    if (keyword?.trim()) {
      const matched = await this.users.findByKeyword(keyword.trim());
      const userIds = matched.map((u) => u.id);
      if (!userIds.length) return [[], 0];
      where.userId = In(userIds);
    }
    const [items, total] = await this.orders.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * 20,
      take: 20,
    });
    const userIds = Array.from(new Set(items.map((i) => i.userId)));
    const users = await this.users.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));
    return [
      items.map((i) => {
        const user = userMap.get(i.userId);
        return {
          ...i,
          userEmail: user?.email
            ? (maskEmail(user.email) ?? undefined)
            : undefined,
          userNickname: user?.nickname || `用户 #${i.userId}`,
        };
      }),
      total,
    ];
  }

  /** 管理端确认开通：到店收款后按套餐时长开通/顺延会员期，申请置为已开通 */
  async adminConfirmOrder(id: number) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('开通申请不存在');
    if (order.status !== 'pending') {
      throw new BadRequestException('仅待确认的开通申请可确认');
    }
    const current = await this.memberships.findOneBy({ userId: order.userId });
    const now = new Date();
    const base =
      current?.expireAt && current.expireAt > now ? current.expireAt : now;
    const expireAt = new Date(base.getTime() + order.durationDays * 86400000);
    const member =
      current ??
      this.memberships.create({
        userId: order.userId,
        memberNo: `M${String(order.userId).padStart(8, '0')}`,
        levelName: '手作会员',
        expireAt,
      });
    member.expireAt = expireAt;
    await this.memberships.save(member);
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    await this.orders.save(order);
    return this.myMembership(order.userId);
  }

  /** 管理端取消开通申请（未确认前） */
  async adminCancelOrder(id: number) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('开通申请不存在');
    if (order.status !== 'pending') {
      throw new BadRequestException('仅待确认的开通申请可取消');
    }
    order.status = 'cancelled';
    return this.orders.save(order);
  }

  async listCoupons(userId: number) {
    const [items, owned] = await Promise.all([
      this.coupons.find({
        where: { enabled: true, expireAt: MoreThan(new Date()) },
        order: { createdAt: 'DESC' },
      }),
      this.userCoupons.findBy({ userId }),
    ]);
    const ownedIds = new Set(owned.map((x) => x.couponId));
    return items.map((x) => ({ ...x, received: ownedIds.has(x.id) }));
  }

  async wallet(userId: number) {
    const rows = await this.userCoupons.find({
      where: { userId },
      order: { receivedAt: 'DESC' },
    });
    if (!rows.length) return [];
    const coupons = await this.coupons.findBy({
      id: In(rows.map((x) => x.couponId)),
    });
    const map = new Map(coupons.map((x) => [x.id, x]));
    return rows.flatMap((x) => {
      const coupon = map.get(x.couponId);
      if (!coupon) return [];
      const status =
        x.status === 'unused' && coupon.expireAt <= new Date()
          ? 'expired'
          : x.status;
      return [
        {
          ...coupon,
          userCouponId: x.id,
          status,
          receivedAt: x.receivedAt,
          code: x.code,
          usedAt: x.usedAt,
          redeemedBy: x.redeemedBy,
        },
      ];
    });
  }

  async receive(userId: number, couponId: number) {
    const active = await this.myMembership(userId);
    return this.dataSource.transaction(async (manager) => {
      const couponRepo = manager.getRepository(Coupon);
      const ownedRepo = manager.getRepository(UserCoupon);
      const coupon = await couponRepo.findOne({
        where: { id: couponId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon || !coupon.enabled || coupon.expireAt <= new Date())
        throw new NotFoundException('优惠券不存在或已过期');
      if (coupon.membersOnly && active.status !== 'active')
        throw new BadRequestException('仅限有效会员领取');
      if (await ownedRepo.existsBy({ userId, couponId }))
        throw new BadRequestException('已经领取过了');
      if (coupon.stock <= 0) throw new BadRequestException('优惠券已领完');
      coupon.stock -= 1;
      await couponRepo.save(coupon);
      return ownedRepo.save(
        ownedRepo.create({
          userId,
          couponId,
          code: await this.generateCouponCode(manager),
          status: 'unused',
          usedAt: null,
        }),
      );
    });
  }

  /**
   * 按核销码查询（核销前确认用）。
   * 核销码只在核销前有效：已使用/已过期的券不可再查询使用。
   */
  async findCouponByCode(code: string) {
    const owned = await this.userCoupons.findOneBy({
      code: normalizeRedeemCode(code),
    });
    if (!owned) throw new NotFoundException('核销码无效');
    const coupon = await this.coupons.findOneBy({ id: owned.couponId });
    if (!coupon) throw new NotFoundException('核销码无效');
    const expired = owned.status === 'expired' || coupon.expireAt <= new Date();
    if (owned.status === 'used') {
      throw new BadRequestException('该核销码已核销，不可重复使用');
    }
    if (expired) {
      throw new BadRequestException('该优惠券已过期，无法核销');
    }
    const user = await this.users.findById(owned.userId);
    return {
      ...owned,
      couponTitle: coupon.title,
      couponAmount: coupon.amount,
      couponThreshold: coupon.threshold,
      expireAt: coupon.expireAt,
      userNickname: user?.nickname || `用户 #${owned.userId}`,
      userEmail: user?.email ? (maskEmail(user.email) ?? undefined) : undefined,
    };
  }

  /** 输码核销：状态 unused → used，记录核销时间与核销人（幂等由状态机兜底） */
  async redeemByCode(code: string, operatorId?: number) {
    const normalized = normalizeRedeemCode(code);
    return this.dataSource.transaction(async (manager) => {
      const ownedRepo = manager.getRepository(UserCoupon);
      const owned = await ownedRepo.findOne({
        where: { code: normalized },
        lock: { mode: 'pessimistic_write' },
      });
      if (!owned) throw new NotFoundException('核销码无效');
      const coupon = await manager
        .getRepository(Coupon)
        .findOneBy({ id: owned.couponId });
      if (!coupon || coupon.expireAt <= new Date()) {
        throw new BadRequestException('优惠券不存在或已过期');
      }
      if (owned.status !== 'unused') {
        throw new BadRequestException('该核销码已核销，不可重复核销');
      }
      owned.status = 'used';
      owned.usedAt = new Date();
      if (operatorId) owned.redeemedBy = operatorId;
      const saved = await ownedRepo.save(owned);
      return this.couponRedeemView(saved, coupon);
    });
  }

  /** 管理端按记录 ID 核销（店员代操作） */
  async adminRedeemCoupon(id: number, operatorId?: number) {
    const owned = await this.userCoupons.findOneBy({ id });
    if (!owned) throw new NotFoundException('优惠券记录不存在');
    return this.redeemByCode(owned.code, operatorId);
  }

  /** 生成 6 位数字+字母核销码：唯一索引兜底，冲突重试 */
  private async generateCouponCode(em: EntityManager): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = generateRedeemCode();
      const exists = await em.findOne(UserCoupon, { where: { code } });
      if (!exists) return code;
    }
    throw new Error('生成核销码失败，请重试');
  }

  private couponRedeemView(owned: UserCoupon, coupon: Coupon) {
    return {
      ...owned,
      couponTitle: coupon.title,
      couponAmount: coupon.amount,
      couponThreshold: coupon.threshold,
      expireAt: coupon.expireAt,
    };
  }

  /** 管理端：会员列表（分页，可按用户ID/用户名/邮箱/昵称/会员编号搜索），附带用户显示名 */
  async listMemberships(page = 1, keyword?: string) {
    const kw = (keyword ?? '').trim();
    const where: any[] = [];
    if (kw) {
      where.push({ userId: Number(kw) || 0 }, { memberNo: Like(`%${kw}%`) });
      const matched = await this.users.findByKeyword(kw);
      if (matched.length) {
        where.push({ userId: In(matched.map((u) => u.id)) });
      }
    }
    const [items, total] = await this.memberships.findAndCount({
      where: where.length ? where : {},
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * 20,
      take: 20,
    });
    const userMap = new Map(
      (await this.users.findByIds(items.map((i) => i.userId))).map((u) => [
        u.id,
        u,
      ]),
    );
    return [
      items.map((i) => {
        const u = userMap.get(i.userId);
        return {
          ...i,
          userName: u?.username || u?.nickname || `用户 #${i.userId}`,
        };
      }),
      total,
    ];
  }

  /** 后台开通/编辑会员 */
  async saveMembership(
    dto: SaveMembershipDto | UpdateMembershipDto,
    id?: number,
  ) {
    if (id) {
      const current = await this.memberships.findOneBy({ id });
      if (!current) throw new NotFoundException('会员记录不存在');
      const expireAt = new Date(dto.expireAt);
      if (Number.isNaN(expireAt.getTime()))
        throw new BadRequestException('有效期格式不正确');
      current.levelName = dto.levelName || current.levelName;
      current.expireAt = expireAt;
      return this.memberships.save(current);
    }
    const create = dto as SaveMembershipDto;
    const user = await this.users.findByUsername(create.username.trim());
    if (!user) throw new NotFoundException('用户不存在');
    if (await this.memberships.existsBy({ userId: user.id }))
      throw new BadRequestException('该用户已是会员，请直接编辑该记录');
    const expireAt = new Date(create.expireAt);
    if (Number.isNaN(expireAt.getTime()))
      throw new BadRequestException('有效期格式不正确');
    if (expireAt <= new Date())
      throw new BadRequestException('有效期需晚于当前时间');
    return this.memberships.save(
      this.memberships.create({
        userId: user.id,
        memberNo: `M${String(user.id).padStart(8, '0')}`,
        levelName: create.levelName || '手作会员',
        expireAt,
      }),
    );
  }

  async removeMembership(id: number) {
    const item = await this.memberships.findOneBy({ id });
    if (!item) throw new NotFoundException('会员记录不存在');
    await this.memberships.remove(item);
    return { success: true };
  }

  listAllCoupons() {
    return this.coupons.find({ order: { createdAt: 'DESC' } });
  }

  savePlan(dto: SavePlanDto, id?: number) {
    return this.plans.save(
      this.plans.create({
        ...dto,
        id,
        price: String(dto.price),
        originalPrice: String(dto.originalPrice),
        badge: dto.badge ?? '',
        enabled: dto.enabled ?? true,
        recommended: dto.recommended ?? false,
      }),
    );
  }

  async togglePlan(id: number, enabled: boolean) {
    await this.plans.update(id, { enabled });
    return this.plans.findOneBy({ id });
  }

  saveCoupon(dto: SaveCouponDto, id?: number) {
    return this.coupons.save(
      this.coupons.create({
        ...dto,
        threshold: this.normalizeCouponThreshold(dto.threshold),
        id,
        expireAt: new Date(dto.expireAt),
        membersOnly: dto.membersOnly ?? true,
        enabled: dto.enabled ?? true,
      }),
    );
  }

  /** 使用门槛：管理端只需填数字，0 表示无门槛；非数字输入直接拒绝。 */
  private normalizeCouponThreshold(raw: string): string {
    const text = (raw ?? '').trim();
    if (!/^\d+(?:\.\d+)?$/.test(text)) {
      throw new BadRequestException('使用门槛请填写数字（0 表示无门槛）');
    }
    const value = parseFloat(text);
    if (value <= 0) return '无门槛';
    const shown = value % 1 === 0 ? String(Math.round(value)) : String(value);
    return `满 $${shown} 可用`;
  }

  async toggleCoupon(id: number, enabled: boolean) {
    await this.coupons.update(id, { enabled });
    return this.coupons.findOneBy({ id });
  }
}
