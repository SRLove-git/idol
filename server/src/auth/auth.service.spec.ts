import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashPassword } from './password.util';

function buildService() {
  const redis = {};
  const users = {
    findById: jest.fn(),
    setPasswordHash: jest.fn(),
    remove: jest.fn().mockResolvedValue({ posts: 0, videos: 0 }),
  };
  const jwt = {};
  const config = {};
  const captcha = { verify: jest.fn().mockResolvedValue(true) };
  const email = { send: jest.fn().mockResolvedValue(undefined) };
  const svc = new AuthService(
    redis as never,
    users as never,
    jwt as never,
    config as never,
    captcha as never,
    email as never,
  );
  return { svc, users, captcha, email };
}

describe('AuthService.changePassword', () => {
  it('原密码正确时写入新密码（scrypt 哈希）', async () => {
    const m = buildService();
    const current = await hashPassword('old-pass');
    m.users.findById.mockResolvedValue({ id: 7, passwordHash: current });
    m.users.setPasswordHash.mockResolvedValue(undefined);

    const result = await m.svc.changePassword(7, 'old-pass', 'new-pass-123');

    expect(result).toEqual({ sent: true });
    expect(m.users.setPasswordHash).toHaveBeenCalledWith(
      7,
      expect.stringMatching(/^scrypt\$/),
    );
  });

  it('原密码不正确时拒绝修改', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue({
      id: 7,
      passwordHash: await hashPassword('real-pass'),
    });

    await expect(
      m.svc.changePassword(7, 'wrong-pass', 'new-pass-123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('未设置密码的老账号可直接设置新密码（无需原密码）', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue({ id: 7, passwordHash: null });

    await m.svc.changePassword(7, undefined, 'new-pass-123');

    expect(m.users.setPasswordHash).toHaveBeenCalledWith(
      7,
      expect.stringMatching(/^scrypt\$/),
    );
  });

  it('用户不存在时返回 404', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue(null);

    await expect(
      m.svc.changePassword(999, 'old-pass', 'new-pass-123'),
    ).rejects.toThrow(NotFoundException);
  });
});

function buildRegisterService() {
  const redis = {
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
  };
  const users = {
    findByUsername: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    countByDeviceId: jest.fn().mockResolvedValue(0),
    activateGuestAccount: jest.fn(),
    create: jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: 1, ...data }),
      ),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
  const config = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const captcha = { verify: jest.fn().mockResolvedValue(true) };
  const email = { send: jest.fn().mockResolvedValue(undefined) };
  const svc = new AuthService(
    redis as never,
    users as never,
    jwt as never,
    config as never,
    captcha as never,
    email as never,
  );
  return { svc, users, redis, captcha, email };
}

describe('AuthService.register（设备账号数限制）', () => {
  it('发送 6 位邮箱验证码并写入有时效的 Redis 记录', async () => {
    const m = buildRegisterService();

    const result = await m.svc.sendRegistrationCode({
      email: 'USER@example.com',
    });

    expect(result).toEqual({ sent: true, expiresIn: 300, retryAfter: 60 });
    expect(m.email.send).toHaveBeenCalledWith(
      'user@example.com',
      'IDOL BEADS 注册验证码',
      expect.stringMatching(/\d{6}/),
    );
    expect(m.redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^register:email-code:[a-f0-9]{64}$/),
      expect.stringContaining('"digest"'),
      'EX',
      300,
    );
  });

  it('未上报设备标识时正常注册', async () => {
    const m = buildRegisterService();
    const r = await m.svc.register({
      username: 'alice',
      email: 'a@example.com',
      emailCode: '123456',
      password: 'pass123',
    });

    expect(r.userId).toBe(1);
    expect(m.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: null }),
    );
    expect(m.redis.set).not.toHaveBeenCalledWith(
      expect.stringContaining('device:register:lock:'),
      '1',
      'EX',
      10,
      'NX',
    );
    expect(m.redis.eval).toHaveBeenCalled();
  });

  it('游客邮箱账号注册时原地升级，保留原用户 ID', async () => {
    const m = buildRegisterService();
    const guest = {
      id: 88,
      email: 'guest@example.com',
      username: null,
      passwordHash: null,
      nickname: '预约客人',
    };
    m.users.findByEmail.mockResolvedValue(guest);
    m.users.activateGuestAccount.mockResolvedValue({
      ...guest,
      username: 'guest88',
      passwordHash: 'hash',
    });

    const result = await m.svc.register({
      username: 'guest88',
      email: 'guest@example.com',
      emailCode: '123456',
      password: 'pass123',
    });

    expect(result.userId).toBe(88);
    expect(m.users.activateGuestAccount).toHaveBeenCalledWith(
      88,
      expect.objectContaining({
        username: 'guest88',
        nickname: '预约客人',
        deviceId: null,
      }),
    );
    expect(m.users.create).not.toHaveBeenCalled();
  });

  it('同一设备第 3 个账号仍可注册', async () => {
    const m = buildRegisterService();
    m.users.countByDeviceId.mockResolvedValue(2);

    const r = await m.svc.register({
      username: 'bob',
      email: 'b@example.com',
      emailCode: '123456',
      password: 'pass123',
      deviceId: 'dev-1',
    });

    expect(r.userId).toBe(1);
    expect(m.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'dev-1' }),
    );
  });

  it('同一设备超过 3 个账号时拒绝注册', async () => {
    const m = buildRegisterService();
    m.users.countByDeviceId.mockResolvedValue(3);

    await expect(
      m.svc.register({
        username: 'carol',
        email: 'c@example.com',
        emailCode: '123456',
        password: 'pass123',
        deviceId: 'dev-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(m.users.create).not.toHaveBeenCalled();
  });

  it('同一设备并发注册由 Redis 锁串行化，锁冲突时提示稍后再试', async () => {
    const m = buildRegisterService();
    m.redis.set.mockResolvedValue(null);

    await expect(
      m.svc.register({
        username: 'dave',
        email: 'd@example.com',
        emailCode: '123456',
        password: 'pass123',
        deviceId: 'dev-1',
      }),
    ).rejects.toThrow('注册请求过于频繁');
  });
});

describe('AuthService.deactivateAccount', () => {
  it('密码正确时删除账号并返回 deleted', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue({
      id: 7,
      role: 'user',
      passwordHash: await hashPassword('correct-pass'),
    });

    const result = await m.svc.deactivateAccount(7, 'correct-pass');

    expect(result).toEqual({ deleted: true });
    expect(m.users.remove).toHaveBeenCalledWith(7);
  });

  it('密码错误时拒绝注销且不删除账号', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue({
      id: 7,
      role: 'user',
      passwordHash: await hashPassword('real-pass'),
    });

    await expect(m.svc.deactivateAccount(7, 'wrong-pass')).rejects.toThrow(
      BadRequestException,
    );
    expect(m.users.remove).not.toHaveBeenCalled();
  });

  it('管理员账号不允许自助注销', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue({
      id: 1,
      role: 'admin',
      passwordHash: await hashPassword('admin-pass'),
    });

    await expect(m.svc.deactivateAccount(1, 'admin-pass')).rejects.toThrow(
      ForbiddenException,
    );
    expect(m.users.remove).not.toHaveBeenCalled();
  });

  it('用户不存在时返回 404', async () => {
    const m = buildService();
    m.users.findById.mockResolvedValue(null);

    await expect(m.svc.deactivateAccount(999, 'whatever-pass')).rejects.toThrow(
      NotFoundException,
    );
  });
});
