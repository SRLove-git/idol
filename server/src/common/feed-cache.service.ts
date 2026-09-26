import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * 共享 feed 缓存：信息流是典型的高频同结果接口（首页第 1 页被千人同时请求），
 * 把「列表 + 作者信息」成品缓存到 Redis，命中时省掉全部 SQL 与作者查询。
 *
 * 失效策略双保险：
 * 1. 版本号 —— 内容新增/上线/下架时 INCR，所有共享 feed 立即失效；
 * 2. 短 TTL（30~60s 随机抖动）—— 版本更新失败或未覆盖的场景兜底，
 *    抖动避免热 key 同时过期导致请求同时打爆数据库（缓存雪崩）。
 *
 * 所有方法内部吞掉异常：Redis 不可用时调用方自然降级为直查数据库，
 * 缓存层绝不影响业务主流程。
 */
const FEED_VERSION_KEY = 'feed:content:version';
const FEED_TTL_BASE = 30;
const FEED_TTL_JITTER = 30;

@Injectable()
export class FeedCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 读取共享 feed 缓存；未命中或 Redis 异常返回 null */
  async get<T>(
    prefix: string,
    page: number,
    pageSize: number,
    channel = '',
  ): Promise<T | null> {
    try {
      const raw = await this.redis.get(
        await this.key(prefix, page, pageSize, channel),
      );
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** 写入共享 feed 缓存；TTL 带随机抖动，避免热 key 同时过期 */
  async set(
    prefix: string,
    page: number,
    pageSize: number,
    channel = '',
    value: unknown,
  ): Promise<void> {
    try {
      const ttl = FEED_TTL_BASE + Math.floor(Math.random() * FEED_TTL_JITTER);
      await this.redis.set(
        await this.key(prefix, page, pageSize, channel),
        JSON.stringify(value),
        'EX',
        ttl,
      );
    } catch {
      // 缓存失败不影响主流程
    }
  }

  /** 内容新增/上线/下架：版本 +1，所有共享 feed 缓存立即失效 */
  async bumpContentVersion(): Promise<void> {
    try {
      await this.redis.incr(FEED_VERSION_KEY);
    } catch {
      // 版本更新失败由 TTL 兜底
    }
  }

  private async key(
    prefix: string,
    page: number,
    pageSize: number,
    channel: string,
  ): Promise<string> {
    const v = await this.version();
    return `feed:${prefix}:v${v}:${page}:${pageSize}:${channel}`;
  }

  private async version(): Promise<number> {
    try {
      const raw = await this.redis.get(FEED_VERSION_KEY);
      return Number(raw) || 0;
    } catch {
      return 0;
    }
  }
}
