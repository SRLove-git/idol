import type Redis from 'ioredis';
import { ThrottlerStorage } from '@nestjs/throttler';

/** @nestjs/throttler v6 未从主包导出记录类型，此处对齐其接口 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * 基于 Redis 的限流存储（@nestjs/throttler v6 将 Redis 存储拆出，这里自行实现）：
 * - 窗口内计数键 throttle:{key}（INCR + 首击设置 TTL）
 * - 超限后写入 throttle:block:{key}，锁定期间直接拒绝
 * 多副本共享同一 Redis，配额天然全局生效。
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    const ttlSec = Math.max(1, Math.ceil(ttl / 1000));
    const blockSec = Math.max(1, Math.ceil(blockDuration / 1000));
    const blockKey = `throttle:block:${key}`;

    const blockedTtl = await this.redis.ttl(blockKey);
    if (blockedTtl > 0) {
      return {
        totalHits: limit,
        timeToExpire: blockedTtl,
        isBlocked: true,
        timeToBlockExpire: blockedTtl,
      };
    }

    const hitKey = `throttle:${key}`;
    const totalHits = await this.redis.incr(hitKey);
    if (totalHits === 1) await this.redis.expire(hitKey, ttlSec);
    const hitTtl = Math.max(0, await this.redis.ttl(hitKey));

    if (totalHits > limit) {
      await this.redis.set(blockKey, '1', 'EX', blockSec);
      return {
        totalHits,
        timeToExpire: hitTtl,
        isBlocked: true,
        timeToBlockExpire: blockSec,
      };
    }
    return {
      totalHits,
      timeToExpire: hitTtl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
