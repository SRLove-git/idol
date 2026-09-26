import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Coupon, UserCoupon } from './coupon.entity';
import { MembersService } from './members.service';

function buildService() {
  const plans = { findOneBy: jest.fn() };
  const memberships = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const coupons = {};
  const userCoupons = {};
  const experiences = {};
  const orders = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn((cb: (manager: unknown) => Promise<unknown>) =>
      cb({
        getRepository: jest.fn(() => orders),
      }),
    ),
  };
  const users = { findByKeyword: jest.fn(), findByIds: jest.fn() };
  const svc = new MembersService(
    plans as never,
    memberships as never,
    coupons as never,
    userCoupons as never,
    experiences as never,
    orders as never,
    dataSource as never,
    users as never,
  );
  return { svc, plans, memberships, orders, users };
}

describe('MembersService', () => {
  describe('purchase', () => {
    it('提交订单只生成待确认申请，不直接开通会员', async () => {
      const m = buildService();
      m.plans.findOneBy.mockResolvedValue({
        id: 1,
        name: '月卡会员',
        durationDays: 30,
        price: '19.90',
        enabled: true,
      });
      m.orders.create.mockImplementation((data: unknown) => ({
        status: 'pending',
        ...(data as object),
      }));
      m.orders.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.purchase(7, 1);

      expect(result.status).toBe('pending');
      expect(result.planName).toBe('月卡会员');
      expect(result.amount).toBe(19.9);
      expect(m.memberships.save).not.toHaveBeenCalled();
    });

    it('套餐不存在时拒绝下单', async () => {
      const m = buildService();
      m.plans.findOneBy.mockResolvedValue(null);

      await expect(m.svc.purchase(7, 999)).rejects.toThrow(NotFoundException);
    });

    it('已有待确认申请时拒绝再次提交（开通/续费同一规则）', async () => {
      const m = buildService();
      m.plans.findOneBy.mockResolvedValue({
        id: 1,
        name: '月卡会员',
        durationDays: 30,
        price: '19.90',
        enabled: true,
      });
      m.orders.findOne.mockResolvedValue({
        id: 9,
        userId: 7,
        status: 'pending',
      });

      await expect(m.svc.purchase(7, 1)).rejects.toThrow(BadRequestException);
      expect(m.orders.create).not.toHaveBeenCalled();
      expect(m.orders.save).not.toHaveBeenCalled();
    });
  });

  describe('adminConfirmOrder', () => {
    it('确认待申请：开通会员并将申请置为已开通', async () => {
      const m = buildService();
      m.orders.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        planId: 1,
        planName: '月卡会员',
        durationDays: 30,
        amount: 19.9,
        status: 'pending',
      });
      // 第一次查询（是否已有会员）返回 null；确认开通保存后，
      // myMembership 再查时应返回刚创建的会员记录。
      let saved: Record<string, unknown> | null = null;
      m.memberships.findOneBy.mockImplementation(() => saved);
      m.memberships.create.mockImplementation((data: unknown) => {
        saved = { ...(data as object) };
        return saved;
      });
      m.memberships.save.mockImplementation((x: unknown) => {
        saved = x as Record<string, unknown>;
        return x;
      });
      m.orders.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminConfirmOrder(1);

      expect(result.status).toBe('active');
      expect(m.memberships.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, memberNo: 'M00000007' }),
      );
      expect(m.orders.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' }),
      );
    });

    it('续费：从当前有效期顺延，不覆盖已有会员期', async () => {
      const m = buildService();
      const existingExpire = new Date(Date.now() + 10 * 86400000);
      m.orders.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        planId: 1,
        planName: '月卡会员',
        durationDays: 30,
        amount: 19.9,
        status: 'pending',
      });
      m.memberships.findOneBy.mockResolvedValue({
        userId: 7,
        expireAt: existingExpire,
      });
      m.memberships.save.mockImplementation((x: unknown) => Promise.resolve(x));
      m.orders.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminConfirmOrder(1);

      const expected = new Date(existingExpire.getTime() + 30 * 86400000);
      // 已确认开通必然返回有效会员记录，expireAt 为 Date（类型联合含 null，此处断言非空）
      expect(result.expireAt).toBeInstanceOf(Date);
      expect((result.expireAt as Date).getTime()).toBe(expected.getTime());
    });

    it('已确认的申请不可重复确认', async () => {
      const m = buildService();
      m.orders.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        status: 'confirmed',
      });

      await expect(m.svc.adminConfirmOrder(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adminCancelOrder', () => {
    it('待确认申请可取消', async () => {
      const m = buildService();
      m.orders.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        status: 'pending',
      });
      m.orders.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminCancelOrder(1);

      expect(result.status).toBe('cancelled');
    });

    it('已确认的申请不可取消', async () => {
      const m = buildService();
      m.orders.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        status: 'confirmed',
      });

      await expect(m.svc.adminCancelOrder(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('优惠券核销码', () => {
    function buildCouponService() {
      const memberships = {
        findOneBy: jest.fn().mockResolvedValue({
          expireAt: new Date(Date.now() + 86400000),
        }),
      };
      const coupons = {
        findOneBy: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn((x: unknown) => x),
        save: jest.fn((x: unknown) => Promise.resolve(x)),
      };
      const userCoupons = {
        findOneBy: jest.fn(),
        findOne: jest.fn(),
        existsBy: jest.fn(),
        save: jest.fn(),
      };
      const users = { findById: jest.fn() };
      const manager = {
        getRepository: jest.fn((cls: unknown) => {
          if (cls === UserCoupon) return userCoupons;
          if (cls === Coupon) return coupons;
          return {};
        }),
      };
      const dataSource = {
        transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) =>
          cb(manager),
        ),
      };
      const svc = new MembersService(
        {} as never,
        memberships as never,
        coupons as never,
        userCoupons as never,
        {} as never,
        {} as never,
        dataSource as never,
        users as never,
      );
      return { svc, coupons, userCoupons, users };
    }

    const unused = {
      id: 1,
      userId: 7,
      couponId: 2,
      code: '123456',
      status: 'unused',
      usedAt: null,
      redeemedBy: null,
      receivedAt: new Date(),
    };
    const coupon = {
      id: 2,
      title: '满100减20',
      amount: '$20',
      threshold: '满 $100',
      expireAt: new Date(Date.now() + 86400000),
    };

    it('按核销码查询：返回券与用户信息', async () => {
      const m = buildCouponService();
      m.userCoupons.findOneBy.mockResolvedValue(unused);
      m.coupons.findOneBy.mockResolvedValue(coupon);
      m.users.findById.mockResolvedValue({
        id: 7,
        nickname: 'Alice',
        email: 'a@example.com',
      });

      const result = await m.svc.findCouponByCode('123456');

      expect(result.code).toBe('123456');
      expect(result.couponTitle).toBe('满100减20');
      expect(result.userNickname).toBe('Alice');
      expect(result.userEmail).toBeDefined();
    });

    it('按核销码查询：已使用的券不可再查', async () => {
      const m = buildCouponService();
      m.userCoupons.findOneBy.mockResolvedValue({
        ...unused,
        status: 'used',
      });
      m.coupons.findOneBy.mockResolvedValue(coupon);

      await expect(m.svc.findCouponByCode('123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('按核销码查询：已过期的券不可再查', async () => {
      const m = buildCouponService();
      m.userCoupons.findOneBy.mockResolvedValue(unused);
      m.coupons.findOneBy.mockResolvedValue({
        ...coupon,
        expireAt: new Date(Date.now() - 1000),
      });

      await expect(m.svc.findCouponByCode('123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('输码核销：unused → used，记录核销人与时间', async () => {
      const m = buildCouponService();
      m.userCoupons.findOne.mockResolvedValue({ ...unused });
      m.coupons.findOneBy.mockResolvedValue(coupon);
      m.userCoupons.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.redeemByCode('123456', 99);

      expect(result.status).toBe('used');
      expect(result.redeemedBy).toBe(99);
      expect(result.usedAt).toBeInstanceOf(Date);
      expect(m.userCoupons.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'used', redeemedBy: 99 }),
      );
    });

    it('输码核销：重复核销拒绝', async () => {
      const m = buildCouponService();
      m.userCoupons.findOne.mockResolvedValue({
        ...unused,
        status: 'used',
      });
      m.coupons.findOneBy.mockResolvedValue(coupon);

      await expect(m.svc.redeemByCode('123456', 99)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('输码核销：已过期拒绝', async () => {
      const m = buildCouponService();
      m.userCoupons.findOne.mockResolvedValue({ ...unused });
      m.coupons.findOneBy.mockResolvedValue({
        ...coupon,
        expireAt: new Date(Date.now() - 1000),
      });

      await expect(m.svc.redeemByCode('123456', 99)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('管理端按记录 ID 核销', async () => {
      const m = buildCouponService();
      m.userCoupons.findOneBy.mockResolvedValue({ ...unused });
      m.userCoupons.findOne.mockResolvedValue({ ...unused });
      m.coupons.findOneBy.mockResolvedValue(coupon);
      m.userCoupons.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminRedeemCoupon(1, 5);

      expect(result.status).toBe('used');
      expect(result.redeemedBy).toBe(5);
    });

    it('保存优惠券：门槛填纯数字，0 表示无门槛', async () => {
      const m = buildCouponService();
      const base = {
        title: '满100减20',
        amount: '$20',
        expireAt: new Date(Date.now() + 86400000).toISOString(),
        stock: 10,
        membersOnly: true,
        enabled: true,
      };

      const none = await m.svc.saveCoupon({ ...base, threshold: '0' });
      expect(none.threshold).toBe('无门槛');

      const hundred = await m.svc.saveCoupon({ ...base, threshold: '100' });
      expect(hundred.threshold).toBe('满 $100 可用');
    });

    it('保存优惠券：非数字门槛直接拒绝', () => {
      const m = buildCouponService();
      const base = {
        title: '满100减20',
        amount: '$20',
        expireAt: new Date(Date.now() + 86400000).toISOString(),
        stock: 10,
        membersOnly: true,
        enabled: true,
      };

      // saveCoupon 在 normalizeCouponThreshold 内同步抛错（非 Promise），
      // 因此用 expect(fn).toThrow 而非 rejects
      expect(() =>
        m.svc.saveCoupon({ ...base, threshold: '满 $100 可用' }),
      ).toThrow(BadRequestException);
      expect(() => m.svc.saveCoupon({ ...base, threshold: '无门槛' })).toThrow(
        BadRequestException,
      );
    });
  });
});
