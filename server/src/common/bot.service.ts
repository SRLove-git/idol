import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 常见脚本/爬虫 UA 特征（刻意排除 Dart/Flutter 与 okhttp——客户端正常请求）。
 * 命中仅代表可疑，是否拦截由 BLOCK_BOT_UA 开关决定。
 */
const BOT_UA_PATTERNS = [
  /python[-_ ]?requests/i,
  /python-urllib/i,
  /curl\/?/i,
  /wget/i,
  /go-http-client/i,
  /libwww-perl/i,
  /scrapy/i,
  /node-fetch/i,
  /axios\//i,
  /phantomjs/i,
  /headlesschrome/i,
  /puppeteer/i,
  /selenium/i,
  /^java\//i,
  /apache-httpclient/i,
];

@Injectable()
export class BotService {
  constructor(private readonly config: ConfigService) {}

  /** 是否开启 UA 拦截（生产建议 BLOCK_BOT_UA=true，开发保持 false 便于 curl 联调） */
  get enabled(): boolean {
    return this.config.get<string>('BLOCK_BOT_UA') === 'true';
  }

  /** UA 是否命中已知爬虫/脚本特征 */
  isBot(userAgent?: string): boolean {
    const ua = (userAgent ?? '').trim().toLowerCase();
    if (!ua) return false; // 空 UA 不直接拦截（部分 App 不发），交给限流兜底
    return BOT_UA_PATTERNS.some((re) => re.test(ua));
  }

  /** 综合开关判断是否应拦截 */
  shouldBlock(userAgent?: string): boolean {
    return this.enabled && this.isBot(userAgent);
  }
}
