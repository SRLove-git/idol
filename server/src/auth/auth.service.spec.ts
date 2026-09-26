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
  const svc = new AuthService(
    redis as never,
    users as never,
    jwt as never,
    config as never,
    captcha as never,
  );
  return { svc, users, captcha };
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
  };
  const users = {
    findByUsername: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    countByDeviceId: jest.fn().mockResolvedValue(0),
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
  const svc = new AuthService(
    redis as never,
    users as never,
    jwt as never,
    config as never,
    captcha as never,
  );
  return { svc, users, redis, captcha };
}

describe('AuthService.register（设备账号数限制）', () => {
  it('未上报设备标识时正常注册', async () => {
    const m = buildRegisterService();
    const r = await m.svc.register({
      username: 'alice',
      email: 'a@example.com',
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
  });

  it('同一设备第 3 个账号仍可注册', async () => {
    const m = buildRegisterService();
    m.users.countByDeviceId.mockResolvedValue(2);

    const r = await m.svc.register({
      username: 'bob',
      email: 'b@example.com',
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
