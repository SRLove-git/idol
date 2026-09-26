import { FeedCacheService } from './feed-cache.service';

describe('FeedCacheService', () => {
  function buildService(redis: Record<string, jest.Mock>) {
    return new FeedCacheService(redis as never);
  }

  it('按版本 key 写入，TTL 带随机值', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
    };
    const service = buildService(redis);

    await service.set('post-hot', 1, 20, '', {
      items: [{ id: 1 }],
      total: 1,
    });

    expect(redis.set).toHaveBeenCalledWith(
      'feed:post-hot:v0:1:20:',
      JSON.stringify({ items: [{ id: 1 }], total: 1 }),
      'EX',
      expect.any(Number),
    );
  });

  it('版本 +1 后旧缓存 key 不再命中（新内容立即可见）', async () => {
    let version = '0';
    const redis = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'feed:content:version') return version;
        return null;
      }),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockImplementation(() => {
        version = String(Number(version) + 1);
        return Number(version);
      }),
    };
    const service = buildService(redis);

    await service.set('video', 1, 20, '', { items: [], total: 0 });
    await service.bumpContentVersion();
    const hit = await service.get('video', 1, 20);

    expect(hit).toBeNull();
    expect(redis.get).toHaveBeenCalledWith('feed:video:v1:1:20:');
  });

  it('Redis 异常时读取返回 null，写入与版本更新不抛出', async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error('redis down')),
      set: jest.fn().mockRejectedValue(new Error('redis down')),
      incr: jest.fn().mockRejectedValue(new Error('redis down')),
    };
    const service = buildService(redis);

    await expect(service.get('video', 1, 20)).resolves.toBeNull();
    await expect(
      service.set('video', 1, 20, '', { items: [], total: 0 }),
    ).resolves.toBeUndefined();
    await expect(service.bumpContentVersion()).resolves.toBeUndefined();
  });
});
