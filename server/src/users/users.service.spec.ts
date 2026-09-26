import { UsersService } from './users.service';

/** 仅 mock findSafeById/findById/findAll 所需的最小依赖集，其余注入空对象 */
function buildService() {
  const users = {
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
  };
  const svc = new UsersService(
    {} as never, // redis
    users as never,
    {} as never, // posts
    {} as never, // postLikes
    {} as never, // postComments
    {} as never, // collections
    {} as never, // history
    {} as never, // videos
    {} as never, // videoLikes
    {} as never, // videoComments
    {} as never, // follows
    {} as never, // notificationReads
    {} as never, // memberships
    {} as never, // userCoupons
    {} as never, // appointments
    {} as never, // appointmentTables
    {} as never, // conversations
    {} as never, // messages
    {} as never, // messageStatuses
    {} as never, // groups
    {} as never, // groupMembers
    {} as never, // groupMessages
    {} as never, // groupReads
    {} as never, // groupMessageDeletions
    {} as never, // memberOrders
    {} as never, // mediaCleanup
  );
  return { svc, users };
}

describe('UsersService.findSafeById', () => {
  it('剔除 passwordHash，且保留本人完整邮箱（/auth/me 响应不得泄露哈希）', async () => {
    const m = buildService();
    m.users.findOneBy.mockResolvedValue({
      id: 7,
      email: 'me@example.com',
      username: 'alice',
      nickname: 'Alice',
      passwordHash: 'scrypt$172343d1:deadbeef',
      isBanned: false,
      role: 'user',
    });

    const result = await m.svc.findSafeById(7);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result?.email).toBe('me@example.com');
    expect(result?.id).toBe(7);
  });

  it('用户不存在时返回 null', async () => {
    const m = buildService();
    m.users.findOneBy.mockResolvedValue(null);

    await expect(m.svc.findSafeById(99)).resolves.toBeNull();
  });
});

describe('UsersService.findById', () => {
  it('内部查询保留 passwordHash（登录/改密校验依赖）', async () => {
    const m = buildService();
    m.users.findOneBy.mockResolvedValue({
      id: 7,
      passwordHash: 'scrypt$172343d1:deadbeef',
    });

    await expect(m.svc.findById(7)).resolves.toHaveProperty(
      'passwordHash',
      'scrypt$172343d1:deadbeef',
    );
  });
});

describe('UsersService.findAll', () => {
  it('管理端列表剔除 passwordHash 并对邮箱脱敏', async () => {
    const m = buildService();
    m.users.findAndCount.mockResolvedValue([
      [
        {
          id: 7,
          email: 'me@example.com',
          username: 'alice',
          nickname: 'Alice',
          passwordHash: 'scrypt$172343d1:deadbeef',
          isBanned: false,
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      1,
    ]);

    const [rows] = await m.svc.findAll();

    expect(rows[0]).not.toHaveProperty('passwordHash');
    expect(rows[0].email).toContain('***');
    expect(rows[0].email).not.toBe('me@example.com');
  });
});
