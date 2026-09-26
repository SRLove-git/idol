import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/** 默认机审关键词（未配置 CONTENT_KEYWORDS 且 Redis 无覆盖时使用） */
const DEFAULT_KEYWORDS = ['违禁', '色情', '赌博', '诈骗', '枪支', '毒品'];

const KEYWORDS_KEY = 'moderation:keywords';
/** 关键词列表内存缓存 TTL：管理端修改后立即失效，最多 30s 内生效 */
const CACHE_TTL_MS = 30_000;

/**
 * 内容机审：关键词列表可配置。
 *
 * 优先级：管理端写入的 Redis 列表 > 环境变量 CONTENT_KEYWORDS（逗号分隔）> 内置默认。
 * 生产 Redis 已开启 AOF 持久化，管理端配置可跨重启保留；开发环境重启后回退到环境变量/默认。
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private cache: string[] | null = null;
  private cacheAt = 0;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 当前生效的关键词列表 */
  async listKeywords(): Promise<string[]> {
    const cached = this.cached();
    if (cached) return cached;
    try {
      const fromRedis = await this.redis.lrange(KEYWORDS_KEY, 0, -1);
      const list =
        fromRedis.length > 0
          ? fromRedis
          : (this.envKeywords() ?? DEFAULT_KEYWORDS);
      this.cache = list;
      this.cacheAt = Date.now();
      return list;
    } catch {
      // Redis 异常时回退到环境变量/默认，保证发布流程不被审核依赖阻断
      return this.envKeywords() ?? DEFAULT_KEYWORDS;
    }
  }

  /** 内容是否命中违规关键词，命中返回关键词 */
  async findBlocked(content: string): Promise<string | null> {
    const text = (content ?? '').toLowerCase();
    if (!text) return null;
    const keywords = await this.listKeywords();
    return keywords.find((kw) => kw && text.includes(kw.toLowerCase())) ?? null;
  }

  /** 管理端：新增关键词（幂等，重复返回 false） */
  async addKeyword(
    raw: string,
  ): Promise<{ added: boolean; keywords: string[] }> {
    const keyword = raw.trim();
    if (!keyword) return { added: false, keywords: await this.listKeywords() };
    this.cache = null;
    try {
      await this.seedIfEmpty();
      const existed = await this.redis.sismember(this.setKey(), keyword);
      if (existed) return { added: false, keywords: await this.listKeywords() };
      await this.redis.sadd(this.setKey(), keyword);
      await this.redis.rpush(KEYWORDS_KEY, keyword);
      return { added: true, keywords: await this.listKeywords() };
    } catch (e) {
      this.logger.error(`新增审核关键词失败：${(e as Error).message}`);
      throw e;
    }
  }

  /** 管理端：删除关键词 */
  async removeKeyword(raw: string): Promise<{
    removed: boolean;
    keywords: string[];
  }> {
    const keyword = raw.trim();
    this.cache = null;
    try {
      await this.seedIfEmpty();
      const removedCount = await this.redis.lrem(KEYWORDS_KEY, 0, keyword);
      await this.redis.srem(this.setKey(), keyword);
      return { removed: removedCount > 0, keywords: await this.listKeywords() };
    } catch (e) {
      this.logger.error(`删除审核关键词失败：${(e as Error).message}`);
      throw e;
    }
  }

  /** Redis 集合用于幂等去重（list 自身无法 O(1) 判断存在） */
  private setKey(): string {
    return `${KEYWORDS_KEY}:set`;
  }

  /** 首次管理端写入时，先把环境变量/默认关键词落进 Redis，避免列表被整体遮蔽 */
  private async seedIfEmpty(): Promise<void> {
    const len = await this.redis.llen(KEYWORDS_KEY);
    if (len > 0) return;
    const seeds = this.envKeywords() ?? DEFAULT_KEYWORDS;
    if (!seeds.length) return;
    await this.redis.rpush(KEYWORDS_KEY, ...seeds);
    if (seeds.length > 0) await this.redis.sadd(this.setKey(), ...seeds);
  }

  private cached(): string[] | null {
    if (this.cache && Date.now() - this.cacheAt < CACHE_TTL_MS) {
      return this.cache;
    }
    return null;
  }

  private envKeywords(): string[] | null {
    const raw = process.env.CONTENT_KEYWORDS ?? '';
    const list = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }
}
