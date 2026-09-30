import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * CDN 缓存刷新抽象：删除/替换媒体后调用 refresh() 主动 purge，
 * 避免 CDN 继续返回旧内容。新增 CDN 服务商只需实现并注册此接口。
 */
export interface CdnRefresher {
  readonly name: string;
  refresh(urls: string[]): Promise<void>;
}

/** CDN 刷新提供者 DI token */
export const CDN_REFRESHER = 'CDN_REFRESHER';

/** 未配置 CDN 时默认实现：什么都不做 */
export class NoopCdnRefresher implements CdnRefresher {
  readonly name = 'none';
  refresh(): Promise<void> {
    /* no-op */
    return Promise.resolve();
  }
}

/** 阿里云 RPC 签名专用百分号编码（区别于 encodeURIComponent） */
function aliyunPercentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/gi, '~');
}

/** 阿里云 RPC（HMAC-SHA1）签名：对排序后的参数做规范化字符串后签名 */
export function aliyunSign(
  secret: string,
  params: Record<string, string>,
): string {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${aliyunPercentEncode(k)}=${aliyunPercentEncode(params[k])}`)
    .join('&');
  const stringToSign = `GET&%2F&${aliyunPercentEncode(canonical)}`;
  return createHmac('sha1', `${secret}&`)
    .update(stringToSign, 'utf8')
    .digest('base64');
}

/** 阿里云 CDN 刷新：RefreshObjectCaches（单次最多 1000 个 URL，按换行分隔） */
export class AliyunCdnRefresher implements CdnRefresher {
  readonly name = 'aliyun';
  private readonly logger = new Logger(AliyunCdnRefresher.name);
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;

  constructor(config: ConfigService) {
    this.accessKeyId = config.get<string>('ALIYUN_CDN_ACCESS_KEY_ID', '');
    this.accessKeySecret = config.get<string>(
      'ALIYUN_CDN_ACCESS_KEY_SECRET',
      '',
    );
    if (!this.accessKeyId || !this.accessKeySecret) {
      throw new Error(
        'CDN_PROVIDER=aliyun 时需配置 ALIYUN_CDN_ACCESS_KEY_ID / ALIYUN_CDN_ACCESS_KEY_SECRET',
      );
    }
  }

  async refresh(urls: string[]): Promise<void> {
    const targets = urls.filter((u) => /^https?:\/\//i.test(u.trim()));
    if (!targets.length) return;
    for (let i = 0; i < targets.length; i += 1000) {
      const params: Record<string, string> = {
        Action: 'RefreshObjectCaches',
        AccessKeyId: this.accessKeyId,
        Format: 'JSON',
        ObjectPath: targets.slice(i, i + 1000).join('\n'),
        ObjectType: 'File',
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: randomUUID(),
        SignatureVersion: '1.0',
        // ISO8601 UTC：2026-08-12T06:00:00Z
        Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        Version: '2018-05-10',
      };
      const canonical = Object.keys(params)
        .sort()
        .map(
          (k) => `${aliyunPercentEncode(k)}=${aliyunPercentEncode(params[k])}`,
        )
        .join('&');
      const signature = aliyunSign(this.accessKeySecret, params);
      const url = `https://cdn.aliyuncs.com/?${canonical}&Signature=${aliyunPercentEncode(signature)}`;
      await this.request(url);
    }
  }

  private async request(url: string): Promise<void> {
    try {
      const res = await fetch(url, { method: 'GET' });
      const body = (await res.json()) as {
        Code?: string;
        Message?: string;
      };
      if (!res.ok || (body.Code && body.Code !== '200')) {
        this.logger.warn(
          `阿里云 CDN 刷新失败: ${body.Code ?? res.status} ${body.Message ?? res.statusText}`,
        );
      }
    } catch (err) {
      this.logger.warn(`阿里云 CDN 刷新异常: ${(err as Error).message}`);
    }
  }
}

/** 依据环境变量创建 CDN 刷新提供者（默认 none 不刷新） */
export function createCdnRefresher(config: ConfigService): CdnRefresher {
  const kind = (
    config.get<string>('CDN_PROVIDER', 'none') ?? 'none'
  ).toLowerCase();
  switch (kind) {
    case 'none':
      return new NoopCdnRefresher();
    case 'aliyun':
      return new AliyunCdnRefresher(config);
    default:
      throw new Error(`未知 CDN_PROVIDER: ${kind}`);
  }
}
