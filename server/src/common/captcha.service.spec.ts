import { CaptchaService, buildCaptchaSvg } from './captcha.service';

function buildService(overrides: Record<string, unknown> = {}) {
  const store = new Map<string, { payload: string; ttl?: number }>();
  const redis = {
    set: jest.fn((key: string, payload: string, _ex: string, ttl: number) => {
      store.set(key, { payload, ttl });
      return Promise.resolve('OK');
    }),
    eval: jest.fn(
      (_script: string, _count: number, key: string, answer: string) => {
        const entry = store.get(key);
        if (!entry) return 0;
        const data = JSON.parse(entry.payload) as {
          answer: string;
          left: number;
        };
        if (answer.toUpperCase() === data.answer) {
          store.delete(key);
          return 1;
        }
        data.left -= 1;
        if (data.left <= 0) {
          store.delete(key);
          return 0;
        }
        store.set(key, { payload: JSON.stringify(data) });
        return 0;
      },
    ),
  };
  const config = {
    get: jest.fn(
      (key: string, fallback: unknown) => overrides[key] ?? fallback,
    ),
  };
  return {
    svc: new CaptchaService(config as never, redis as never),
    redis,
    config,
  };
}

describe('CaptchaService（图形验证码）', () => {
  it('provider=image 时创建验证码并正确校验', async () => {
    const m = buildService({ CAPTCHA_PROVIDER: 'image' });
    const captcha = await m.svc.createImageCaptcha();

    expect(captcha.id).toBeTruthy();
    expect(captcha.image.startsWith('data:image/svg+xml')).toBe(true);
    expect(captcha.ttl).toBe(300);

    const text = decodeURIComponent(
      captcha.image.slice(captcha.image.indexOf(',') + 1),
    );
    const chars = [
      ...text.matchAll(/<text[^>]*class="code"[^>]*>([A-Z0-9])<\/text>/g),
    ].map((m) => m[1]);
    expect(chars).toHaveLength(4);

    await expect(
      m.svc.verify(undefined, undefined, captcha.id, ''),
    ).resolves.toBe(false);
    await expect(
      m.svc.verify(
        undefined,
        undefined,
        captcha.id,
        chars.join('').toLowerCase(),
      ),
    ).resolves.toBe(true);
    // 一次性：再次使用同一验证码失败
    await expect(
      m.svc.verify(undefined, undefined, captcha.id, chars.join('')),
    ).resolves.toBe(false);
  });

  it('错误次数超限后验证码失效', async () => {
    const m = buildService({
      CAPTCHA_PROVIDER: 'image',
      CAPTCHA_MAX_ATTEMPTS: 2,
    });
    const captcha = await m.svc.createImageCaptcha();

    await expect(
      m.svc.verify(undefined, undefined, captcha.id, 'WRNG'),
    ).resolves.toBe(false);
    await expect(
      m.svc.verify(undefined, undefined, captcha.id, 'WRNG'),
    ).resolves.toBe(false);
    // 超限后即使输入正确也失败（已被清除）
    const text = decodeURIComponent(
      captcha.image.slice(captcha.image.indexOf(',') + 1),
    );
    const chars = [
      ...text.matchAll(/<text[^>]*class="code"[^>]*>([A-Z0-9])<\/text>/g),
    ].map((m) => m[1]);
    await expect(
      m.svc.verify(undefined, undefined, captcha.id, chars.join('')),
    ).resolves.toBe(false);
  });

  it('未配置 provider 时放行（功能开关）', async () => {
    const m = buildService();
    await expect(m.svc.verify()).resolves.toBe(true);
  });

  it('provider=turnstile 且缺 token 时拒绝', async () => {
    const m = buildService({ CAPTCHA_PROVIDER: 'turnstile' });
    await expect(m.svc.verify()).resolves.toBe(false);
  });

  it('SVG 生成结果包含预期的 4 位正文', () => {
    const svg = buildCaptchaSvg('A9KD');
    expect(svg).toContain('<svg');
    expect(svg).toContain('>A</text>');
    expect(svg).toContain('>9</text>');
    expect(svg).toContain('>K</text>');
    expect(svg).toContain('>D</text>');
  });
});
