import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type Redis from 'ioredis';
import { CaptchaService } from '../common/captcha.service';
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
const PASSWORD_ATTEMPT_MAX = 5; // 密码登录 10 分钟内最多失败 5 次
const PASSWORD_LOCK_TTL = 600; // 连续失败后锁定 10 分钟

/** 同一 IP 24 小时内最大注册数（REGISTER_IP_MAX 可覆盖） */
const REGISTER_IP_MAX_DEFAULT = 5;
/** IP 注册计数窗口（小时，REGISTER_IP_WINDOW_H 可覆盖） */
const REGISTER_IP_WINDOW_H_DEFAULT = 24;

@Injectable()
export class AuthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
  ) {}

  /** 注册：用户名 + 密码 + 邮箱绑定（建号并自动登录） */
  async register(dto: {
    username: string;
    email: string;
    password: string;
    deviceId?: string;
    captchaToken?: string;
    captchaId?: string;
    captchaText?: string;
  }) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();

    if (
      !(await this.captcha.verify(
        dto.captchaToken,
        undefined,
        dto.captchaId,
        dto.captchaText,
      ))
    ) {
      throw new BadRequestException('请完成人机验证');
    }
    if (await this.users.findByUsername(username)) {
      throw new ConflictException('用户名已被占用');
    }
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('该邮箱已注册');
    }

    const user = await this.createUser(
      username,
      email,
      dto.password,
      dto.deviceId?.trim() || null,
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
  ): Promise<User> {
    const passwordHash = await hashPassword(password);
    if (!deviceId) {
      return this.users.create({
        username,
        email,
        passwordHash,
        nickname: username,
        deviceId: null,
      });
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
      return await this.users.create({
        username,
        email,
        passwordHash,
        nickname: username,
        deviceId,
      });
    } finally {
      await this.redis.del(lockKey).catch(() => undefined);
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
    if (await this.redis.exists(`login:lock:${key}`)) {
      throw new UnauthorizedException('尝试次数过多，请 10 分钟后再试');
    }
  }

  /** 记录一次密码登录失败，连续失败达到上限后锁定 */
  private async recordLoginFailure(key: string) {
    const attemptKey = `login:attempt:${key}`;
    const attempts = await this.redis.incr(attemptKey);
    if (attempts === 1) await this.redis.expire(attemptKey, 600);
    if (attempts >= PASSWORD_ATTEMPT_MAX) {
      await this.redis.set(`login:lock:${key}`, '1', 'EX', PASSWORD_LOCK_TTL);
      await this.redis.del(attemptKey);
      throw new UnauthorizedException('尝试次数过多，请 10 分钟后再试');
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
