import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { createHash, createHmac, randomInt, randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { CaptchaService } from '../common/captcha.service';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { hashPassword, verifyPassword } from './password.util';
import { verifyJwtWithRotation } from './jwt-secrets';
import { kickKey } from './session-keys';

export interface JwtPayload {
  sub: number;
  type: 'access' | 'refresh';
  jti?: string;
}

const REFRESH_TTL = 30 * 24 * 3600; // 刷新令牌 30 天
const PASSWORD_ATTEMPT_MAX_DEFAULT = 8;
const PASSWORD_ATTEMPT_WINDOW_DEFAULT = 600;
const PASSWORD_LOCK_TTL_DEFAULT = 300;

/** 同一 IP 24 小时内最大注册数（REGISTER_IP_MAX 可覆盖） */
const REGISTER_IP_MAX_DEFAULT = 5;
/** IP 注册计数窗口（小时，REGISTER_IP_WINDOW_H 可覆盖） */
const REGISTER_IP_WINDOW_H_DEFAULT = 24;
const EMAIL_CODE_TTL_DEFAULT = 10 * 60;
const EMAIL_CODE_COOLDOWN_DEFAULT = 60;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
    private readonly email: EmailService,
  ) {}

  /** 发送 6 位注册验证码；同一邮箱默认 60 秒内不可重复发送。 */
  async sendRegistrationCode(
    dto: {
      email: string;
      captchaToken?: string;
      captchaId?: string;
      captchaText?: string;
    },
    ip?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    if (
      !(await this.captcha.verify(
        dto.captchaToken,
        ip,
        dto.captchaId,
        dto.captchaText,
      ))
    ) {
      throw new BadRequestException('请完成人机验证');
    }

    const existing = await this.users.findByEmail(email);
    // 游客预约创建的无密码账号允许继续注册；正式账号则拒绝重复注册。
    if (existing && (existing.passwordHash || existing.username)) {
      throw new ConflictException('该邮箱已注册');
    }

    const ttl = Math.max(
      300,
      Math.min(
        1800,
        this.config.get<number>('EMAIL_CODE_TTL', EMAIL_CODE_TTL_DEFAULT),
      ),
    );
    const cooldown = Math.max(
      30,
      Math.min(
        300,
        this.config.get<number>(
          'EMAIL_CODE_COOLDOWN',
          EMAIL_CODE_COOLDOWN_DEFAULT,
        ),
      ),
    );
    const key = this.registrationCodeKey(email);
    const cooldownKey = `${key}:cooldown`;

    try {
      const acquired = await this.redis.set(
        cooldownKey,
        '1',
        'EX',
        cooldown,
        'NX',
      );
      if (!acquired) {
        throw new BadRequestException(`验证码发送过于频繁，请 ${cooldown} 秒后再试`);
      }

      const code = String(randomInt(100000, 1000000));
      await this.redis.set(
        key,
        JSON.stringify({
          digest: this.registrationCodeDigest(email, code),
          left: EMAIL_CODE_MAX_ATTEMPTS,
        }),
        'EX',
        ttl,
      );
      try {
        await this.email.send(
          email,
          'IDOL BEADS 注册验证码',
          `您的注册验证码是：${code}\n\n验证码 ${Math.ceil(ttl / 60)} 分钟内有效，请勿转发给他人。若非本人操作，请忽略本邮件。`,
        );
      } catch {
        await this.redis.del(key, cooldownKey).catch(() => undefined);
        throw new ServiceUnavailableException('验证码发送失败，请稍后再试');
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException('验证码服务暂不可用，请稍后再试');
    }

    return { sent: true, expiresIn: ttl, retryAfter: cooldown };
  }

  /** 注册：邮箱验证码通过后建号并自动登录。 */
  async register(dto: {
    username: string;
    email: string;
    emailCode: string;
    password: string;
    deviceId?: string;
    captchaToken?: string;
    captchaId?: string;
    captchaText?: string;
  }) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();

    if (await this.users.findByUsername(username)) {
      throw new ConflictException('用户名已被占用');
    }
    const existing = await this.users.findByEmail(email);
    if (existing && (existing.passwordHash || existing.username)) {
      throw new ConflictException('该邮箱已注册');
    }
    await this.verifyRegistrationCode(email, dto.emailCode);

    const user = await this.createUser(
      username,
      email,
      dto.password,
      dto.deviceId?.trim() || null,
      existing,
    );
    const tokens = await this.signTokens(user.id);
    return { userId: user.id, isNewUser: true, ...tokens };
  }

  /**
   * 建号并自动登录：同一设备（MAC/安装ID）最多注册 3 个账号。
   * Redis 锁串行化"查重 + 建号"，避免并发注册同时通过校验导致超限。
   */
  private async createUser(
    username: string,
    email: string,
    password: string,
    deviceId: string | null,
    existingGuest: User | null,
  ): Promise<User> {
    const passwordHash = await hashPassword(password);
    const persist = () =>
      existingGuest
        ? this.users.activateGuestAccount(existingGuest.id, {
            username,
            passwordHash,
            deviceId,
            nickname:
              existingGuest.nickname && existingGuest.nickname !== '游客'
                ? existingGuest.nickname
                : username,
          })
        : this.users.create({
            username,
            email,
            passwordHash,
            nickname: username,
            deviceId,
          });
    if (!deviceId) {
      return persist();
    }

    const lockKey = `device:register:lock:${deviceId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired) {
      throw new BadRequestException('注册请求过于频繁，请稍后再试');
    }
    try {
      const used = await this.users.countByDeviceId(deviceId);
      if (used >= 3) {
        throw new BadRequestException('同一设备最多注册 3 个账号');
      }
      return await persist();
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }

  private registrationCodeKey(email: string): string {
    const emailHash = createHash('sha256').update(email).digest('hex');
    return `register:email-code:${emailHash}`;
  }

  private registrationCodeDigest(email: string, code: string): string {
    const secret = this.config.get<string>(
      'EMAIL_CODE_SECRET',
      this.config.get<string>('JWT_SECRET', 'dev-email-code-secret'),
    );
    return createHmac('sha256', secret)
      .update(`${email}:${code}`)
      .digest('hex');
  }

  /** 原子校验并消费验证码；错误最多尝试 5 次，成功后立即失效。 */
  private async verifyRegistrationCode(
    email: string,
    code: string,
  ): Promise<void> {
    const key = this.registrationCodeKey(email);
    const digest = this.registrationCodeDigest(email, code.trim());
    try {
      const result = Number(
        await this.redis.eval(
          `
          local payload = redis.call('GET', KEYS[1])
          if not payload then return -1 end
          local data = cjson.decode(payload)
          if data.digest == ARGV[1] then
            redis.call('DEL', KEYS[1])
            return 1
          end
          data.left = tonumber(data.left or 1) - 1
          if data.left <= 0 then
            redis.call('DEL', KEYS[1])
          else
            redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')
          end
          return 0
          `,
          1,
          key,
          digest,
        ),
      );
      if (result === 1) return;
      if (result === -1) {
        throw new BadRequestException('邮箱验证码已过期，请重新获取');
      }
      throw new BadRequestException('邮箱验证码不正确');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('验证码服务暂不可用，请稍后再试');
    }
  }

  /** 用户名 / 邮箱 + 密码登录 */
  async login(
    account: string,
    password: string,
    captchaToken?: string,
    captchaId?: string,
    captchaText?: string,
  ) {
    if (
      !(await this.captcha.verify(
        captchaToken,
        undefined,
        captchaId,
        captchaText,
      ))
    ) {
      throw new BadRequestException('请完成人机验证');
    }
    const normalized = account.trim();
    const lockKey = `acct:${normalized.toLowerCase()}`;
    await this.checkLoginLock(lockKey);
    const user = await this.users.findByUsernameOrEmail(normalized);
    if (!user || !user.passwordHash) {
      await this.recordLoginFailure(lockKey);
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      await this.recordLoginFailure(lockKey);
      throw new UnauthorizedException('用户名或密码错误');
    }
    await this.clearLoginFailures(lockKey);
    if (user.isBanned) throw new ForbiddenException('账号已被禁用');
    // 强制下线/封禁的旧会话标记随重新登录清除
    await this.redis.del(kickKey(user.id));

    const tokens = await this.signTokens(user.id);
    return { userId: user.id, ...tokens };
  }

  /**
   * IP 维度注册限制：同一 IP 24 小时内最多注册 REGISTER_IP_MAX 个账号。
   * Redis 异常时降级放行（避免注册链路被缓存故障阻断）。
   */
  async assertIpRegisterAllowed(ip?: string): Promise<void> {
    if (!ip) return;
    try {
      const max = this.config.get<number>(
        'REGISTER_IP_MAX',
        REGISTER_IP_MAX_DEFAULT,
      );
      const windowH = this.config.get<number>(
        'REGISTER_IP_WINDOW_H',
        REGISTER_IP_WINDOW_H_DEFAULT,
      );
      const key = `register:ip:${ip}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, Math.max(1, windowH) * 3600);
      }
      if (count > max) {
        throw new BadRequestException('该网络注册过于频繁，请稍后再试');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // Redis 不可用时降级放行
    }
  }

  /** 修改登录密码（登录态下）：校验原密码后写入新密码 */
  async changePassword(
    userId: number,
    oldPassword: string | undefined,
    newPassword: string,
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (user.isBanned) throw new ForbiddenException('账号已被禁用');
    if (user.passwordHash) {
      if (!oldPassword) {
        throw new BadRequestException('请输入原密码');
      }
      if (!(await verifyPassword(oldPassword, user.passwordHash))) {
        throw new BadRequestException('原密码不正确');
      }
    }
    await this.users.setPasswordHash(user.id, await hashPassword(newPassword));
    return { sent: true };
  }

  /**
   * 注销账号（登录态下）：校验登录密码后删除账号及全部关联数据。
   * 管理员账号不走自助注销，避免误删运营账号（管理端另有删除流程）。
   */
  async deactivateAccount(userId: number, password: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('用户不存在');
    if (user.role === 'admin') {
      throw new ForbiddenException('管理员账号请通过运营渠道处理');
    }
    if (user.passwordHash) {
      if (!(await verifyPassword(password, user.passwordHash))) {
        throw new BadRequestException('登录密码不正确');
      }
    }
    // remove() 会先踢线（旧 access/refresh token 立即失效），再删除全部关联数据
    await this.users.remove(userId);
    return { deleted: true };
  }

  /** 密码登录锁检查：锁定期间直接拒绝 */
  private async checkLoginLock(key: string) {
    const ttl = await this.redis.ttl(`login:lock:${key}`);
    if (ttl > 0) {
      throw new UnauthorizedException(
        `尝试次数过多，请 ${Math.max(1, Math.ceil(ttl / 60))} 分钟后再试`,
      );
    }
  }

  /** 记录一次密码登录失败，连续失败达到上限后锁定 */
  private async recordLoginFailure(key: string) {
    const maxAttempts = this.config.get<number>(
      'LOGIN_ATTEMPT_MAX',
      PASSWORD_ATTEMPT_MAX_DEFAULT,
    );
    const attemptWindow = this.config.get<number>(
      'LOGIN_ATTEMPT_WINDOW_SEC',
      PASSWORD_ATTEMPT_WINDOW_DEFAULT,
    );
    const lockTtl = this.config.get<number>(
      'LOGIN_LOCK_SEC',
      PASSWORD_LOCK_TTL_DEFAULT,
    );
    const attemptKey = `login:attempt:${key}`;
    const attempts = await this.redis.incr(attemptKey);
    if (attempts === 1) {
      await this.redis.expire(attemptKey, Math.max(1, attemptWindow));
    }
    if (attempts >= Math.max(1, maxAttempts)) {
      await this.redis.set(
        `login:lock:${key}`,
        '1',
        'EX',
        Math.max(1, lockTtl),
      );
      await this.redis.del(attemptKey);
      throw new UnauthorizedException(
        `尝试次数过多，请 ${Math.max(1, Math.ceil(lockTtl / 60))} 分钟后再试`,
      );
    }
  }

  /** 登录成功后清除失败计数与锁定 */
  private async clearLoginFailures(key: string) {
    await this.redis.del(`login:attempt:${key}`, `login:lock:${key}`);
  }

  /** 刷新令牌（轮换制：旧 refresh 立即失效） */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await verifyJwtWithRotation<JwtPayload>(
        this.jwt,
        refreshToken,
        this.config,
        'JWT_REFRESH_SECRET',
      );
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
    const key = `refresh:${payload.sub}:${payload.jti}`;
    const exists = await this.redis.exists(key);
    if (!exists) throw new UnauthorizedException('登录已过期，请重新登录');

    // 账号已删除/被禁用：禁止续期（封禁在登录处拦截，此处兜底已登录会话）
    const user = await this.users.findById(payload.sub);
    if (!user || user.isBanned) {
      throw new UnauthorizedException('账号已被禁用，请重新登录');
    }
    // 强制下线：禁止用旧 refresh token 续期
    if (await this.redis.exists(kickKey(payload.sub))) {
      throw new UnauthorizedException('账号已被强制下线，请重新登录');
    }

    await this.redis.del(key);
    return this.signTokens(payload.sub);
  }

  private async signTokens(userId: number) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, type: 'access' },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        // access token 有效期默认 2h，可用环境变量 JWT_ACCESS_TTL 覆盖
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_TTL',
          '2h',
        ) as JwtSignOptions['expiresIn'],
      },
    );
    const jti = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, type: 'refresh', jti },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );
    await this.redis.set(`refresh:${userId}:${jti}`, '1', 'EX', REFRESH_TTL);
    return { accessToken, refreshToken };
  }
}
