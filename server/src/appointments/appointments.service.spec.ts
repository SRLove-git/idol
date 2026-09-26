import { BadRequestException } from '@nestjs/common';
import { Coupon, UserCoupon } from '../members/coupon.entity';
import { Appointment } from './appointment.entity';
import { AppointmentTable } from './appointment-table.entity';
import {
  AppointmentsService,
  TableAvailabilityItem,
} from './appointments.service';

function dateStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function timeStr(offsetMs: number): string {
  const d = new Date(Date.now() + offsetMs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/** 下一个周六或周日的日期（用于周末加价测试） */
function nextWeekendDate(): string {
  const d = new Date();
  while (d.getDay() !== 6 && d.getDay() !== 0) {
    d.setDate(d.getDate() + 1);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function buildService() {
  const appointments = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    findBy: jest.fn(),
  };
  appointments.findOne.mockResolvedValue(null); // 默认没有未完成的预约
  const stores = { findOneBy: jest.fn() };
  const tables = { find: jest.fn() };
  const packages = { findOneBy: jest.fn(), find: jest.fn() };
  const activities = { findOneBy: jest.fn() };
  const activitySessionsRepo = { findOneBy: jest.fn(), find: jest.fn() };
  const memberships = { findOneBy: jest.fn() };
  const users = { findByUsernameOrCreate: jest.fn() };
  const gateway = { sendAppointment: jest.fn() };
  const redis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
  };
  redis.del.mockResolvedValue(1);
  redis.set.mockResolvedValue('OK');
  redis.get.mockResolvedValue(null); // availability 缓存默认未命中
  const userCouponRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    save: jest.Mock;
  } = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn(),
  };
  const couponRepo: { findOneBy: jest.Mock } = { findOneBy: jest.fn() };
  const appointmentEmRepo = { findOne: jest.fn() };
  appointmentEmRepo.findOne.mockResolvedValue(null); // 默认没有重复绑定
  const em = {
    find: jest.fn(),
    query: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    getRepository: jest.fn((cls: unknown): unknown => {
      if (cls === Appointment) return appointmentEmRepo;
      if (cls === UserCoupon) return userCouponRepo;
      if (cls === Coupon) return couponRepo;
      return {};
    }),
  };
  em.query.mockResolvedValue([]); // 默认无时段冲突
  em.insert.mockResolvedValue({ raw: [], identifiers: [] });
  const dataSource = {
    transaction: jest.fn((cb: (manager: typeof em) => unknown) => cb(em)),
    query: jest.fn(),
  };
  dataSource.query.mockResolvedValue([]); // availability 默认无占用窗口

  const svc = new AppointmentsService(
    appointments as never,
    stores as never,
    tables as never,
    packages as never,
    activities as never,
    activitySessionsRepo as never,
    memberships as never,
    userCouponRepo as never,
    users as never,
    gateway as never,
    redis as never,
    dataSource as never,
  );

  return {
    svc,
    appointments,
    stores,
    tables,
    packages,
    activities,
    activitySessionsRepo,
    memberships,
    users,
    redis,
    userCouponRepo,
    couponRepo,
    appointmentEmRepo,
    em,
    dataSource,
  };
}

const baseDto = {
  storeId: 1,
  tableId: 1,
  peopleCount: 2,
  date: dateStr(1),
  startTime: '10:00',
  durationHours: 2,
};

describe('AppointmentsService', () => {
  describe('createStore', () => {
    it('存在未完成的预约时拒绝再次预约（上一单完成/取消前不能再下单）', async () => {
      const m = buildService();
      m.appointments.findOne.mockResolvedValue({ id: 9 });

      await expect(m.svc.create(7, baseDto)).rejects.toThrow(
        '您有未完成的预约，请先完成或取消后再预约新的时段',
      );
    });

    it('无冲突时创建预约：金额按整数分计算、生成预约码、释放锁', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-21:00',
        price: 39.9,
        memberPrice: null,
        allDayPrice: null,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 4 }]);
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null);
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({
          status: 'booked',
          ...data,
        }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.create(7, baseDto);

      expect(result.status).toBe('booked');
      expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
      // 39.9 元/人/小时 × 2 人 × 2 小时 = 159.6
      expect(result.amount).toBe(159.6);
      expect(result.originalAmount).toBe(159.6);
      expect(m.em.save).toHaveBeenCalled();
      // 一单多桌关系写入 appointment_tables 关联表（availability/冲突校验用）
      expect(m.em.insert).toHaveBeenCalledWith(
        AppointmentTable,
        expect.arrayContaining([
          expect.objectContaining({
            tableId: 1,
            storeId: 1,
            date: baseDto.date,
          }),
        ]),
      );
      expect(m.redis.del).toHaveBeenCalled(); // 无论成败释放分布式锁
    });

    it('同店同桌同时段重叠时拒绝创建（防超卖）', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-21:00',
        price: 39.9,
        memberPrice: null,
        allDayPrice: null,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 4 }]);
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.query
        .mockResolvedValueOnce([
          {
            id: 9,
            tableId: 1,
            tableName: 'A1',
            startTime: '09:30',
            endTime: '11:00',
          },
        ])
        .mockResolvedValueOnce([{ tableId: 1, name: 'A1' }]);

      await expect(
        m.svc.create(7, {
          ...baseDto,
          startTime: '10:00',
          durationHours: 1,
        }),
      ).rejects.toThrow(BadRequestException);
      // 冲突校验走 appointment_tables 关联表，不再 JSON_TABLE 展开
      expect(m.em.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM appointment_tables'),
        expect.any(Array),
      );
    });

    it('拒绝预约已过去的时段（服务端兜底）', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-21:00',
        price: 39.9,
        memberPrice: null,
        allDayPrice: null,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 4 }]);
      m.memberships.findOneBy.mockResolvedValue(null);

      await expect(
        m.svc.create(7, {
          ...baseDto,
          date: dateStr(0),
          startTime: '00:00',
          durationHours: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('使用优惠券：抵扣后金额与券状态正确', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-21:00',
        price: 39.9,
        memberPrice: null,
        allDayPrice: null,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 4 }]);
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null);
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({
          status: 'booked',
          ...data,
        }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));
      m.userCouponRepo.findOne.mockResolvedValue({
        id: 9,
        userId: 7,
        couponId: 5,
        code: '888001',
        status: 'unused',
      });
      m.userCouponRepo.findOneBy.mockResolvedValue({
        id: 9,
        userId: 7,
        couponId: 5,
        code: '888001',
        status: 'unused',
      });
      m.couponRepo.findOneBy.mockResolvedValue({
        id: 5,
        title: '满100减20',
        amount: '$20',
        threshold: '无门槛',
        enabled: true,
        expireAt: new Date(Date.now() + 86400_000),
      });

      const result = await m.svc.create(7, {
        ...baseDto,
        userCouponId: 9,
      });

      expect(result.amount).toBe(139.6); // 159.6 - 20
      expect(result.couponDiscount).toBe(20);
      expect(result.couponTitle).toBe('满100减20');
      expect(result.couponCode).toBe('888001');
      // 优惠券不在下单时核销，仅绑定到预约，到店核销预约时一并核销
      expect(m.userCouponRepo.save).not.toHaveBeenCalled();
      expect(result.userCouponId).toBe(9);
    });
  });

  describe('checkIn', () => {
    it('booked → in_service：记录上钟/下钟时间', async () => {
      const m = buildService();
      const endTime = timeStr(2 * 3600_000);
      m.appointmentEmRepo.findOne.mockResolvedValue({
        id: 1,
        code: '123456',
        userId: 7,
        userCouponId: null,
        status: 'booked',
        date: dateStr(0),
        startTime: '09:00',
        endTime,
        scheduledEnd: () => new Date(`${dateStr(0)}T${endTime}:00`),
      });
      m.appointmentEmRepo.save = jest.fn((x: unknown) => Promise.resolve(x));

      const result = await m.svc.checkIn('123456', 7);

      expect(result.status).toBe('in_service');
      expect(result.checkInTime).toBeInstanceOf(Date);
      expect(result.serviceStartTime).toBeInstanceOf(Date);
      expect(result.checkedInBy).toBe(7);
      expect(m.appointmentEmRepo.save).toHaveBeenCalled();
    });

    it('预约带优惠券：核销预约时一并核销优惠券', async () => {
      const m = buildService();
      const endTime = timeStr(2 * 3600_000);
      m.appointmentEmRepo.findOne.mockResolvedValue({
        id: 1,
        code: '123456',
        userId: 7,
        userCouponId: 9,
        status: 'booked',
        date: dateStr(0),
        startTime: '09:00',
        endTime,
        scheduledEnd: () => new Date(`${dateStr(0)}T${endTime}:00`),
      });
      m.appointmentEmRepo.save = jest.fn((x: unknown) => Promise.resolve(x));
      m.userCouponRepo.findOne.mockResolvedValue({
        id: 9,
        userId: 7,
        couponId: 5,
        code: '888001',
        status: 'unused',
      });
      m.couponRepo.findOneBy.mockResolvedValue({
        id: 5,
        title: '满100减20',
        amount: '$20',
        threshold: '无门槛',
        enabled: true,
        expireAt: new Date(Date.now() + 86400_000),
      });
      m.userCouponRepo.save.mockImplementation((x: unknown) =>
        Promise.resolve(x),
      );

      await m.svc.checkIn('123456', 7);

      expect(m.userCouponRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'used',
          redeemedBy: 7,
        }),
      );
    });

    it('已核销的预约不可重复核销', async () => {
      const m = buildService();
      m.appointmentEmRepo.findOne.mockResolvedValue({
        id: 1,
        code: '123456',
        status: 'in_service',
      });

      await expect(m.svc.checkIn('123456', 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('待确认的预约不可核销，提示等待门店确认', async () => {
      const m = buildService();
      m.appointmentEmRepo.findOne.mockResolvedValue({
        id: 1,
        code: '123456',
        status: 'pending',
      });

      await expect(m.svc.checkIn('123456', 7)).rejects.toThrow(
        '该预约待门店确认，确认后方可到店核销',
      );
    });
  });

  describe('cancel', () => {
    it('待确认状态可取消（下单后未确认前）', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        storeId: 3,
        date: '2026-08-12',
        status: 'pending',
      });
      m.appointments.save.mockImplementation((x: unknown) =>
        Promise.resolve(x),
      );

      const result = await m.svc.cancel(7, 1);

      expect(result.status).toBe('cancelled');
      // 取消后失效该店该日 availability 缓存
      expect(m.redis.del).toHaveBeenCalledWith('availability:3:2026-08-12');
    });

    it('服务中状态不可取消', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        status: 'in_service',
      });

      await expect(m.svc.cancel(7, 1)).rejects.toThrow(BadRequestException);
    });

    it('已取消的预约重复取消幂等成功（客户端超时重试场景）', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        userId: 7,
        storeId: 3,
        date: '2026-08-12',
        status: 'cancelled',
      });

      const result = await m.svc.cancel(7, 1);

      expect(result.status).toBe('cancelled');
      expect(m.appointments.save).not.toHaveBeenCalled();
      expect(m.redis.del).not.toHaveBeenCalled();
    });

    it('管理端重复取消已取消的预约幂等成功', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'cancelled',
      });

      const result = await m.svc.adminCancel(1);

      expect(result.status).toBe('cancelled');
      expect(m.appointments.save).not.toHaveBeenCalled();
    });
  });

  describe('availability', () => {
    it('缓存未命中时查库计算，并写入 Redis（TTL 至当日结束）', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({ id: 1, enabled: true });
      m.tables.find.mockResolvedValue([
        { id: 1, name: 'A1', capacity: 2 },
        { id: 2, name: 'A2', capacity: 4 },
      ]);
      m.dataSource.query.mockResolvedValue([
        {
          tableId: 1,
          startTime: '10:00',
          endTime: '12:00',
          status: 'booked',
        },
        {
          tableId: 2,
          startTime: '14:00',
          endTime: '15:00',
          status: 'in_service',
        },
      ]);

      const result = (await m.svc.availability(
        1,
        '2026-08-12',
      )) as unknown as TableAvailabilityItem[];

      expect(result).toHaveLength(2);
      expect(result[0].bookedWindows).toEqual([
        { startTime: '10:00', endTime: '12:00', status: 'booked' },
      ]);
      expect(m.redis.set).toHaveBeenCalledWith(
        'availability:1:2026-08-12',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
      // 占用窗口查询走 appointment_tables 关联表，不再 JSON_TABLE 展开
      expect(m.dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM appointment_tables'),
        [1, '2026-08-12'],
      );
    });

    it('缓存命中时直接返回，不查库', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({ id: 1, enabled: true });
      m.redis.get.mockResolvedValue(
        JSON.stringify([{ id: 1, name: 'A1', capacity: 2, bookedWindows: [] }]),
      );

      const result = await m.svc.availability(1, '2026-08-12');

      expect(result).toHaveLength(1);
      expect(m.tables.find).not.toHaveBeenCalled();
      expect(m.dataSource.query).not.toHaveBeenCalled();
    });

    it('传 page/pageSize 返回分页结构，不传保持原数组格式', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({ id: 1, enabled: true });
      m.tables.find.mockResolvedValue([
        { id: 1, name: 'A1', capacity: 2 },
        { id: 2, name: 'A2', capacity: 4 },
        { id: 3, name: 'A3', capacity: 6 },
      ]);

      const page = await m.svc.availability(1, '2026-08-12', 2, 2);
      expect(page).toEqual({
        items: [{ id: 3, name: 'A3', capacity: 6, bookedWindows: [] }],
        total: 3,
        page: 2,
        pageSize: 2,
      });

      const all = await m.svc.availability(1, '2026-08-12');
      expect(Array.isArray(all)).toBe(true);
      expect(all).toHaveLength(3);
    });

    it('并发缓存未命中时单飞：同一门店/日期只回源计算一次', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({ id: 1, enabled: true });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 2 }]);
      m.dataSource.query.mockResolvedValue([]);

      const [r1, r2] = await Promise.all([
        m.svc.availability(1, '2026-08-12'),
        m.svc.availability(1, '2026-08-12'),
      ]);

      expect(r1).toEqual(r2);
      expect(m.tables.find).toHaveBeenCalledTimes(1);
      expect(m.dataSource.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByCode', () => {
    it('待核销（booked）的预约码可查询', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({ id: 1, status: 'booked' });

      const result = await m.svc.findByCode('123456');

      expect(result.id).toBe(1);
    });

    it('核销后（in_service）预约码立即失效，不可再查询', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'in_service',
      });

      await expect(m.svc.findByCode('123456')).rejects.toThrow(
        '该预约码已核销，不可重复使用',
      );
    });

    it('已完成（completed）的预约码不可再查询', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'completed',
      });

      await expect(m.svc.findByCode('123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('已取消（cancelled）的预约码不可再查询', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'cancelled',
      });

      await expect(m.svc.findByCode('123456')).rejects.toThrow('该预约已取消');
    });
  });

  describe('adminConfirm', () => {
    it('pending → booked：确认后才可到店核销', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        date: dateStr(1),
      });
      m.appointments.save.mockImplementation((x: unknown) =>
        Promise.resolve(x),
      );

      const result = await m.svc.adminConfirm(1);

      expect(result.status).toBe('booked');
    });

    it('已确认（booked）的预约不可重复确认', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'booked',
        date: dateStr(1),
      });

      await expect(m.svc.adminConfirm(1)).rejects.toThrow(
        '仅待确认状态的预约可确认',
      );
    });

    it('预约日期已过不可确认', async () => {
      const m = buildService();
      m.appointments.findOneBy.mockResolvedValue({
        id: 1,
        status: 'pending',
        date: dateStr(-2),
      });

      await expect(m.svc.adminConfirm(1)).rejects.toThrow(
        '预约日期已过，无法确认',
      );
    });
  });

  describe('adminWalkIn', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-13T10:00:00+08:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('散客开台：直接服务中，开始=当前、结束=当前+时长，挂在占位账号下', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-23:00',
        price: 30,
        groupPrice: 25,
        memberPrice: null,
        allDayPrice: null,
        weekendSurchargePercent: 0,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'B1', capacity: 2 }]);
      m.users.findByUsernameOrCreate.mockResolvedValue({ id: 999 });
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null); // generateCode 查重
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({ ...data }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminWalkIn(
        {
          storeId: 1,
          tableIds: [1],
          peopleCount: 2,
          bookingType: 'hourly',
          durationHours: 2,
        },
        5,
      );

      expect(result.status).toBe('in_service');
      expect(result.userId).toBe(999);
      expect(result.checkedInBy).toBe(5);
      expect(result.payStatus).toBe('unpaid');
      expect(result.serviceStartTime).toBeInstanceOf(Date);
      expect(result.serviceEndTime).toBeInstanceOf(Date);
      // 散客无会员身份：多人同行价 25 元/人/小时 × 2 小时 × 2 人 = 100
      expect(result.amount).toBe(100);
      // 开台也写入关联表，availability/冲突校验才能看到这单的桌位占用
      expect(m.em.insert).toHaveBeenCalledWith(
        AppointmentTable,
        expect.arrayContaining([
          expect.objectContaining({ tableId: 1, storeId: 1 }),
        ]),
      );
      expect(m.redis.del).toHaveBeenCalled(); // 无论成败释放分布式锁
      // 开台后失效当天该店 availability 缓存
      expect(m.redis.del).toHaveBeenCalledWith(
        expect.stringMatching(/^availability:1:/),
      );
    });

    it('与当日已有预约时段重叠时拒绝开台', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-23:00',
        price: 30,
        groupPrice: 25,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'B1', capacity: 2 }]);
      m.users.findByUsernameOrCreate.mockResolvedValue({ id: 999 });
      // 全天占用的有效预约：任何开台时段都会与之重叠
      m.em.query
        .mockResolvedValueOnce([
          {
            id: 9,
            tableId: 1,
            tableName: 'B1',
            startTime: '00:00',
            endTime: '23:59',
          },
        ])
        .mockResolvedValueOnce([{ tableId: 1, name: 'B1' }]);

      await expect(
        m.svc.adminWalkIn(
          { storeId: 1, tableIds: [1], peopleCount: 1, durationHours: 1 },
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('人数超过桌位容量时拒绝开台', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-23:00',
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'B1', capacity: 2 }]);

      await expect(
        m.svc.adminWalkIn(
          { storeId: 1, tableIds: [1], peopleCount: 3, durationHours: 1 },
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('时长超出营业时间时拒绝开台', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-21:00',
        price: 30,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'B1', capacity: 2 }]);

      await expect(
        m.svc.adminWalkIn(
          { storeId: 1, tableIds: [1], peopleCount: 1, durationHours: 24 },
          5,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createActivity', () => {
    it('活动场次预约保持待确认（pending），门店预约才直接待核销', async () => {
      const m = buildService();
      m.activities.findOneBy.mockResolvedValue({
        id: 1,
        title: '拼豆沙龙',
        price: 39.9,
        memberPrice: null,
        enabled: true,
        bookable: true,
      });
      m.activitySessionsRepo.findOneBy.mockResolvedValue({
        id: 2,
        activityId: 1,
        date: dateStr(1),
        startTime: '10:00',
        endTime: '12:00',
        capacity: 20,
        enabled: true,
      });
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.find.mockResolvedValue([]);
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({
          status: 'pending',
          ...data,
        }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = (await m.svc.create(7, {
        type: 'activity',
        activityId: 1,
        activitySessionId: 2,
        peopleCount: 2,
        date: dateStr(1),
        startTime: '10:00',
        endTime: '12:00',
      } as never)) as { type: string; status: string };

      expect(result.type).toBe('activity');
      expect(result.status).toBe('pending');
    });
  });

  describe('autoClockoutExpired', () => {
    it('只把已过结束时刻的服务中预约置为 completed', async () => {
      const m = buildService();
      const expired = {
        id: 1,
        date: dateStr(-1),
        startTime: '09:00',
        endTime: '18:00',
        status: 'in_service',
      };
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([expired]),
      };
      m.appointments.createQueryBuilder.mockReturnValue(qb);
      m.appointments.save.mockImplementation((x: unknown) =>
        Promise.resolve(x),
      );

      const count = await m.svc.autoClockoutExpired();

      expect(count).toBe(1);
      expect(expired.status).toBe('completed');
      expect(m.appointments.save).toHaveBeenCalledWith(expired);
    });
  });

  describe('createStore 计价规则（多人/会员/周末加价）', () => {
    function setup(store: Record<string, unknown>) {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '10:00-21:00',
        price: 9.9,
        memberPrice: 8,
        groupPrice: 9,
        allDayPrice: 49.9,
        allDayMemberPrice: 39.9,
        allDayGroupPrice: 45,
        weekendSurchargePercent: 10,
        ...store,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 8 }]);
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null);
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({
          status: 'booked',
          ...data,
        }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));
      return m;
    }

    it('同行 2 人按小时：非会员按多人同行价结算', async () => {
      const m = setup({});
      const result = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 1,
      })) as { amount: number; originalAmount: number };

      // 9 × 2 = 18；原价 9.9 × 2 = 19.8
      expect(result.amount).toBe(18);
      expect(result.originalAmount).toBe(19.8);
    });

    it('同行含会员：预订人按会员价，其余人按多人同行价', async () => {
      const m = setup({});
      m.memberships.findOneBy.mockResolvedValue({
        expireAt: new Date(Date.now() + 86400_000),
      });
      const result = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 1,
      })) as { amount: number };

      // 会员 8 + 同行 9 = 17
      expect(result.amount).toBe(17);
    });

    it('周末加价：周六所有档位上浮 10%', async () => {
      const m = setup({});
      const result = (await m.svc.create(7, {
        ...baseDto,
        date: nextWeekendDate(),
        peopleCount: 1,
        startTime: '10:00',
        durationHours: 1,
      })) as { amount: number; originalAmount: number };

      // 单人门市 9.9 × 1.1 = 10.89
      expect(result.amount).toBe(10.89);
      expect(result.originalAmount).toBe(10.89);
    });

    it('套餐：多人按套餐同行价，会员按套餐会员价', async () => {
      const m = setup({});
      m.packages.findOneBy.mockResolvedValue({
        id: 1,
        storeId: 1,
        name: '6小时畅玩套餐',
        hours: 6,
        price: 39.9,
        memberPrice: 32,
        groupPrice: 36,
        enabled: true,
      });
      m.em.findOne.mockResolvedValue(null);

      const group = (await m.svc.create(7, {
        ...baseDto,
        bookingType: 'package',
        packageId: 1,
        peopleCount: 2,
        startTime: '10:00',
      } as never)) as { amount: number };
      expect(group.amount).toBe(72); // 36 × 2

      m.memberships.findOneBy.mockResolvedValue({
        expireAt: new Date(Date.now() + 86400_000),
      });
      const member = (await m.svc.create(7, {
        ...baseDto,
        bookingType: 'package',
        packageId: 1,
        peopleCount: 1,
        startTime: '11:00',
      } as never)) as { amount: number };
      expect(member.amount).toBe(32);
    });

    it('全天不限时：多人按全天多人价，会员按全天会员价', async () => {
      const m = setup({});
      const group = (await m.svc.create(7, {
        ...baseDto,
        bookingType: 'all_day',
        peopleCount: 2,
      } as never)) as { amount: number };
      expect(group.amount).toBe(90); // 45 × 2

      m.memberships.findOneBy.mockResolvedValue({
        expireAt: new Date(Date.now() + 86400_000),
      });
      const member = (await m.svc.create(7, {
        ...baseDto,
        bookingType: 'all_day',
        peopleCount: 1,
      } as never)) as { amount: number };
      expect(member.amount).toBe(39.9);
    });
  });

  describe('createStore 按小时套餐计价', () => {
    function setup(packages: Record<string, unknown>[]) {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '10:00-21:00',
        price: 9.9,
        memberPrice: 8,
        groupPrice: 9,
        allDayPrice: null,
        weekendSurchargePercent: 0,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'A1', capacity: 8 }]);
      m.packages.find.mockResolvedValue(packages);
      m.memberships.findOneBy.mockResolvedValue(null);
      m.redis.set.mockResolvedValue('OK');
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null);
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({
          status: 'booked',
          ...data,
        }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));
      return m;
    }

    it('时长恰好等于套餐：按套餐价计费', async () => {
      const m = setup([
        {
          id: 1,
          storeId: 1,
          name: '2小时套餐',
          hours: 2,
          price: 18,
          memberPrice: 15,
          groupPrice: 16,
          enabled: true,
        },
      ]);

      const group = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 2,
      })) as { amount: number; originalAmount: number };
      // 套餐同行价 16 × 2 = 32；原价 18 × 2 = 36
      expect(group.amount).toBe(32);
      expect(group.originalAmount).toBe(36);

      m.memberships.findOneBy.mockResolvedValue({
        expireAt: new Date(Date.now() + 86400_000),
      });
      const member = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 1,
        startTime: '12:00',
        durationHours: 2,
      })) as { amount: number };
      expect(member.amount).toBe(15);
    });

    it('时长超过套餐：套餐价 + 超出小时按小时单价', async () => {
      const m = setup([
        {
          id: 1,
          storeId: 1,
          name: '2小时套餐',
          hours: 2,
          price: 18,
          memberPrice: 15,
          groupPrice: 16,
          enabled: true,
        },
      ]);

      const group = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 3,
      })) as { amount: number; originalAmount: number };
      // 同行：套餐 16 + 超出 1 小时 × 9 = 25/人，× 2 = 50；原价 18 + 9.9 = 27.9/人，× 2 = 55.8
      expect(group.amount).toBe(50);
      expect(group.originalAmount).toBe(55.8);

      m.memberships.findOneBy.mockResolvedValue({
        expireAt: new Date(Date.now() + 86400_000),
      });
      const member = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 1,
        startTime: '12:00',
        durationHours: 3,
      })) as { amount: number };
      // 会员：套餐 15 + 超出 1 小时 × 8 = 23
      expect(member.amount).toBe(23);
    });

    it('时长小于最小套餐：无适用套餐，按普通小时价', async () => {
      const m = setup([
        {
          id: 1,
          storeId: 1,
          name: '2小时套餐',
          hours: 2,
          price: 18,
          memberPrice: 15,
          groupPrice: 16,
          enabled: true,
        },
      ]);

      const result = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 1,
      })) as { amount: number; originalAmount: number };
      // 9 × 2 = 18；原价 9.9 × 2 = 19.8
      expect(result.amount).toBe(18);
      expect(result.originalAmount).toBe(19.8);
    });

    it('时长超过最大套餐：按最大套餐 + 超出小时计费', async () => {
      const m = setup([
        {
          id: 1,
          storeId: 1,
          name: '2小时套餐',
          hours: 2,
          price: 18,
          memberPrice: 15,
          groupPrice: 16,
          enabled: true,
        },
        {
          id: 2,
          storeId: 1,
          name: '4小时套餐',
          hours: 4,
          price: 30,
          memberPrice: 26,
          groupPrice: 27,
          enabled: true,
        },
      ]);

      const group = (await m.svc.create(7, {
        ...baseDto,
        peopleCount: 2,
        startTime: '10:00',
        durationHours: 5,
      })) as { amount: number };
      // 4 小时套餐同行 27 + 超出 1 小时 × 9 = 36/人，× 2 = 72
      expect(group.amount).toBe(72);
    });
  });

  describe('adminWalkIn 按小时套餐计价', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-13T10:00:00+08:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('时长超过套餐：套餐价 + 超出小时按小时单价', async () => {
      const m = buildService();
      m.stores.findOneBy.mockResolvedValue({
        id: 1,
        name: '门店A',
        businessHours: '09:00-23:00',
        price: 30,
        groupPrice: 25,
        memberPrice: null,
        allDayPrice: null,
        weekendSurchargePercent: 0,
      });
      m.tables.find.mockResolvedValue([{ id: 1, name: 'B1', capacity: 2 }]);
      m.packages.find.mockResolvedValue([
        {
          id: 1,
          storeId: 1,
          name: '2小时套餐',
          hours: 2,
          price: 50,
          memberPrice: null,
          groupPrice: 45,
          enabled: true,
        },
      ]);
      m.users.findByUsernameOrCreate.mockResolvedValue({ id: 999 });
      m.em.find.mockResolvedValue([]);
      m.em.findOne.mockResolvedValue(null); // generateCode 查重
      m.em.create.mockImplementation(
        (_cls: unknown, data: Record<string, unknown>) => ({ ...data }),
      );
      m.em.save.mockImplementation((x: unknown) => Promise.resolve(x));

      const result = await m.svc.adminWalkIn(
        {
          storeId: 1,
          tableIds: [1],
          peopleCount: 2,
          bookingType: 'hourly',
          durationHours: 3,
        },
        5,
      );

      // 套餐同行 45 + 超出 1 小时 × 25 = 70/人，× 2 = 140
      expect(result.amount).toBe(140);
    });
  });
});
