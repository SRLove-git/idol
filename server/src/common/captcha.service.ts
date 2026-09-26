import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export type CaptchaProvider = '' | 'image' | 'turnstile' | 'hcaptcha';

export interface ImageCaptcha {
  id: string;
  /** SVG data URI（可直接用于 <img src> / Image 组件） */
  image: string;
  /** SVG 原始字节的 base64（移动端无法渲染 data URI 时使用） */
  imageBase64: string;
  ttl: number;
}

const VERIFY_TIMEOUT_MS = 5000;
const IMAGE_CAPTCHA_TTL_DEFAULT = 300; // 5 分钟
const IMAGE_CAPTCHA_MAX_ATTEMPTS = 3; // 最多试 3 次，失败后需刷新
// 去除易混淆字符（0/O、1/l/I、2/Z 等），避免用户反复输错
const CAPTCHA_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXY3456789';
const CAPTCHA_LENGTH = 4;

/** 生成单字符 SVG（字符 + 旋转 + 颜色，含轻微基线抖动） */
function charSvg(
  ch: string,
  x: number,
  fontSize: number,
  fill: string,
  rotate: number,
  baseline: number,
  cls = '',
): string {
  const clsAttr = cls ? ` class="${cls}"` : '';
  return `<text${clsAttr} x="${x}" y="${baseline}" font-size="${fontSize}" font-family="sans-serif" font-weight="bold" fill="${fill}" transform="rotate(${rotate} ${x} ${baseline})" text-anchor="middle">${ch}</text>`;
}

/** 生成 4 位图形验证码 SVG（噪线 + 噪点 + 干扰字符，随机配色） */
export function buildCaptchaSvg(code: string): string {
  const width = 150;
  const height = 50;
  const noiseColors = ['#c8c8c8', '#d8d0c8', '#c8d8d0', '#d0c8d8'];
  const textColors = [
    '#1f2937',
    '#9a3412',
    '#166534',
    '#1e40af',
    '#6b21a8',
    '#9f1239',
  ];

  const bg = randomInt(240, 252);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="rgb(${bg},${bg},${bg})"/>`,
  ];

  // 噪线 4-6 条
  const lines = randomInt(4, 7);
  for (let i = 0; i < lines; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const stroke = noiseColors[randomInt(0, noiseColors.length)];
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${(randomInt(1, 18) / 10).toFixed(1)}"/>`,
    );
  }

  // 噪点 30-50 个
  const dots = randomInt(30, 51);
  for (let i = 0; i < dots; i++) {
    const r = randomInt(1, 3);
    const fill = noiseColors[randomInt(0, noiseColors.length)];
    parts.push(
      `<circle cx="${randomInt(2, width - 2)}" cy="${randomInt(2, height - 2)}" r="${r}" fill="${fill}"/>`,
    );
  }

  // 干扰字符（噪线之上、正文之下，浅色）
  const decoys = CAPTCHA_ALPHABET.length;
  const decoyCount = randomInt(3, 5);
  for (let i = 0; i < decoyCount; i++) {
    const ch = CAPTCHA_ALPHABET[randomInt(0, decoys)];
    parts.push(
      charSvg(
        ch,
        randomInt(10, width - 10),
        randomInt(16, 22),
        noiseColors[randomInt(0, noiseColors.length)],
        randomInt(-40, 40),
        randomInt(18, height - 12),
      ),
    );
  }

  // 正文 4 位字符：均匀分布 + 微抖动
  const step = width / (code.length + 1);
  const chars = code.split('');
  for (let i = 0; i < chars.length; i++) {
    const x = Math.round(step * (i + 1) + randomInt(-4, 5));
    const rotate = randomInt(-25, 26);
    const fontSize = randomInt(26, 34);
    const baseline = randomInt(34, 42);
    const fill = textColors[randomInt(0, textColors.length)];
    parts.push(charSvg(chars[i], x, fontSize, fill, rotate, baseline, 'code'));
  }

  parts.push('</svg>');
  return parts.join('');
}

/**
 * 人机验证服务（可插拔）：
 * - CAPTCHA_PROVIDER=image → 自托管 SVG 图形验证码（本项目实现，无需第三方密钥）
 * - CAPTCHA_PROVIDER=turnstile → Cloudflare Turnstile siteverify
 * - CAPTCHA_PROVIDER=hcaptcha → hCaptcha siteverify
 * - 未配置（默认）→ 直接放行，不影响现有客户端
 *
 * 开启后注册/登录必须携带有效验证结果（image：captchaId + captchaText；
 * turnstile/hcaptcha：captchaToken），否则拒绝。
 */
@Injectable()
export class CaptchaService {
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  get provider(): CaptchaProvider {
    const raw = (this.config.get<string>('CAPTCHA_PROVIDER', '') ?? '').trim();
    return (raw.toLowerCase() as CaptchaProvider) || '';
  }

  /**
   * 校验人机验证：
   * - image：校验 captchaId + captchaText（Redis 一次性）
   * - turnstile/hcaptcha：校验 captchaToken
   * - 未配置 provider：视为通过（功能开关）
   */
  async verify(
    token?: string,
    ip?: string,
    captchaId?: string,
    captchaText?: string,
  ): Promise<boolean> {
    const provider = this.provider;
    if (!provider) return true;
    if (provider === 'image') return this.verifyImage(captchaId, captchaText);
    if (!token) return false;
    try {
      return provider === 'turnstile'
        ? await this.verifyTurnstile(token, ip)
        : await this.verifyHcaptcha(token, ip);
    } catch {
      // 验证服务不可用时安全优先：不放行
      return false;
    }
  }

  /** 生成图形验证码：答案存 Redis，客户端仅拿到 id + SVG data URI */
  async createImageCaptcha(): Promise<ImageCaptcha> {
    const ttl = this.config.get<number>(
      'CAPTCHA_TTL',
      IMAGE_CAPTCHA_TTL_DEFAULT,
    );
    const maxAttempts = this.config.get<number>(
      'CAPTCHA_MAX_ATTEMPTS',
      IMAGE_CAPTCHA_MAX_ATTEMPTS,
    );
    const answer = Array.from(
      { length: CAPTCHA_LENGTH },
      () => CAPTCHA_ALPHABET[randomInt(0, CAPTCHA_ALPHABET.length)],
    ).join('');
    const id = randomUUID();
    const payload = JSON.stringify({
      answer,
      left: Math.max(1, Math.min(10, maxAttempts)),
    });
    try {
      await this.redis.set(
        `imgcaptcha:${id}`,
        payload,
        'EX',
        Math.max(60, ttl),
      );
    } catch {
      // Redis 不可用时生成失败，避免客户端拿到无法校验的验证码
      throw new Error('captcha storage unavailable');
    }
    const svg = buildCaptchaSvg(answer);
    return {
      id,
      image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      imageBase64: Buffer.from(svg, 'utf8').toString('base64'),
      ttl,
    };
  }

  /** 校验图形验证码（大小写不敏感、一次性、最多尝试 CAPTCHA_MAX_ATTEMPTS 次） */
  private async verifyImage(id?: string, text?: string): Promise<boolean> {
    if (!id || !text) return false;
    const answer = text.trim().toUpperCase();
    if (!answer || answer.length > CAPTCHA_LENGTH) return false;
    try {
      const result = await this.redis.eval(
        `
        local payload = redis.call('GET', KEYS[1])
        if not payload then return 0 end
        local data = cjson.decode(payload)
        local ok = (string.upper(ARGV[1]) == data.answer)
        if ok then
          redis.call('DEL', KEYS[1])
          return 1
        end
        data.left = data.left - 1
        if data.left <= 0 then
          redis.call('DEL', KEYS[1])
          return 0
        end
        redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')
        return 0
        `,
        1,
        `imgcaptcha:${id}`,
        answer,
      );
      return result === 1;
    } catch {
      // Redis 不可用时安全优先：不放行
      return false;
    }
  }

  private async verifyTurnstile(token: string, ip?: string): Promise<boolean> {
    const body = new URLSearchParams({
      secret: this.config.get<string>('TURNSTILE_SECRET', ''),
      response: token,
    });
    if (ip) body.set('remoteip', ip);
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  }

  private async verifyHcaptcha(token: string, ip?: string): Promise<boolean> {
    const body = new URLSearchParams({
      secret: this.config.get<string>('HCAPTCHA_SECRET', ''),
      response: token,
    });
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  }
}
