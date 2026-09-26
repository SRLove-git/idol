import { ModerationService } from './moderation.service';

const redis = {
  lrange: jest.fn(),
  llen: jest.fn(),
  rpush: jest.fn(),
  sadd: jest.fn(),
  sismember: jest.fn(),
  lrem: jest.fn(),
  srem: jest.fn(),
};

function newService(): ModerationService {
  return new ModerationService(redis as never);
}

describe('ModerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis.lrange.mockResolvedValue([]);
    redis.llen.mockResolvedValue(0);
    redis.rpush.mockResolvedValue(1);
    redis.sadd.mockResolvedValue(1);
    redis.sismember.mockResolvedValue(0);
    redis.lrem.mockResolvedValue(1);
    redis.srem.mockResolvedValue(1);
  });

  it('Redis 无配置时回退到默认关键词', async () => {
    const svc = newService();
    const list = await svc.listKeywords();
    expect(list).toContain('赌博');
  });

  it('命中违规关键词返回命中的词', async () => {
    const svc = newService();
    await expect(svc.findBlocked('一起赌博被抓')).resolves.toBe('赌博');
  });

  it('干净内容返回 null', async () => {
    const svc = newService();
    await expect(svc.findBlocked('今天做了一个漂亮的手工')).resolves.toBeNull();
  });

  it('新增关键词时先把默认列表写入 Redis，再追加新词', async () => {
    const svc = newService();
    redis.lrange.mockResolvedValue([
      '违禁',
      '色情',
      '赌博',
      '诈骗',
      '枪支',
      '毒品',
      '暴力',
    ]);
    const result = await svc.addKeyword('暴力');
    expect(redis.rpush).toHaveBeenCalledWith(
      'moderation:keywords',
      '违禁',
      '色情',
      '赌博',
      '诈骗',
      '枪支',
      '毒品',
    );
    expect(redis.sadd).toHaveBeenCalled();
    expect(result.keywords).toContain('暴力');
  });

  it('删除关键词调用 lrem 并返回剩余列表', async () => {
    const svc = newService();
    redis.lrange.mockResolvedValue(['赌博', '枪支']);
    const result = await svc.removeKeyword('枪支');
    expect(redis.lrem).toHaveBeenCalledWith('moderation:keywords', 0, '枪支');
    expect(result.removed).toBe(true);
    expect(result.keywords).toEqual(['赌博', '枪支']);
  });
});
