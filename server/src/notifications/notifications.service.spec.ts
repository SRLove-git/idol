import { NotificationsService } from './notifications.service';

function buildService() {
  const notificationRepo = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const templateRepo = {
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const readRepo = {
    find: jest.fn(),
    count: jest.fn(),
    existsBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { query: jest.fn() },
  };
  const userRepo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
  };
  const gateway = {};
  const svc = new NotificationsService(
    notificationRepo as never,
    templateRepo as never,
    readRepo as never,
    userRepo as never,
    gateway as never,
  );
  return { svc, notificationRepo, readRepo, userRepo };
}

describe('NotificationsService.myNotifications', () => {
  it('英文请求返回英文文案与稳定分类', async () => {
    const m = buildService();
    m.userRepo.findOneBy.mockResolvedValue({ role: 'user' });
    const row = {
      id: 1,
      title: '珠珠 赞了你的作品',
      titleEn: '珠珠 liked your post',
      content: '「作品」获赞 +1',
      contentEn: '"作品" got a like',
      category: 'like',
      channels: 'push',
      createdAt: new Date('2026-08-11T00:00:00Z'),
      sentAt: new Date('2026-08-11T00:00:00Z'),
      targetType: 'user',
      targetUserIds: '1',
      targetRole: null,
      actionType: 'post',
      actionId: 10,
      sent: true,
    };
    m.notificationRepo.findAndCount.mockResolvedValue([[row], 1]);
    m.notificationRepo.find.mockResolvedValue([row]);
    m.readRepo.find.mockResolvedValue([]);
    m.readRepo.count.mockResolvedValue(0);

    const result = await m.svc.myNotifications(1, 1, 20, 'en');

    expect(result.items[0]).toMatchObject({
      title: '珠珠 liked your post',
      content: '"作品" got a like',
      category: 'like',
    });
  });

  it('缺省英文文案时回退中文', async () => {
    const m = buildService();
    m.userRepo.findOneBy.mockResolvedValue({ role: 'user' });
    const row = {
      id: 2,
      title: '系统通知',
      titleEn: null,
      content: '内容',
      contentEn: null,
      category: 'system',
      channels: 'push',
      createdAt: new Date('2026-08-11T00:00:00Z'),
      sentAt: new Date('2026-08-11T00:00:00Z'),
      targetType: 'all',
      targetUserIds: null,
      targetRole: null,
      actionType: null,
      actionId: null,
      sent: true,
    };
    m.notificationRepo.findAndCount.mockResolvedValue([[row], 1]);
    m.notificationRepo.find.mockResolvedValue([row]);
    m.readRepo.find.mockResolvedValue([]);
    m.readRepo.count.mockResolvedValue(0);

    const result = await m.svc.myNotifications(1, 1, 20, 'en');

    expect(result.items[0]).toMatchObject({
      title: '系统通知',
      content: '内容',
      category: 'system',
    });
  });

  it('markAllRead 使用批量写入', async () => {
    const m = buildService();
    m.userRepo.findOneBy.mockResolvedValue({ role: 'user' });
    m.notificationRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    m.readRepo.manager.query.mockResolvedValue({});

    const result = await m.svc.markAllRead(1);

    expect(result).toEqual({ ok: true });
    expect(m.readRepo.manager.query).toHaveBeenCalledWith(
      'INSERT IGNORE INTO notification_reads (userId, notificationId) VALUES ?',
      [
        [
          [1, 1],
          [1, 2],
        ],
      ],
    );
    expect(m.readRepo.save).not.toHaveBeenCalled();
  });

  it('未读数 = 可见通知总数 - 已读数量', async () => {
    const m = buildService();
    m.userRepo.findOneBy.mockResolvedValue({ role: 'user' });
    m.notificationRepo.find.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    m.readRepo.count.mockResolvedValue(1);

    const result = await m.svc.unreadCount(1);

    expect(result).toBe(2);
  });
});
