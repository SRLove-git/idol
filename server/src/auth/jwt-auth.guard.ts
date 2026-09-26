import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import type { Request } from 'express';
import { REDIS_CLIENT } from '../redis/redis.module';
import { JwtPayload } from './auth.service';
import { verifyJwtWithRotation } from './jwt-secrets';
import { kickKey } from './session-keys';

interface AuthedRequest extends Request {
  user?: { id: number };
}

/** 校验 Authorization: Bearer <accessToken>，通过后注入 req.user = { id } */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      throw new UnauthorizedException('未登录');

    try {
      const payload = await verifyJwtWithRotation<JwtPayload>(
        this.jwt,
        header.slice(7),
        this.config,
        'JWT_SECRET',
      );
      if (payload.type !== 'access') throw new Error('wrong token type');

      // 强制下线/封禁后立即拒绝所有旧 access token
      let kicked = false;
      try {
        kicked = !!(await this.redis.exists(kickKey(payload.sub)));
      } catch {
        // Redis 异常时降级放行，避免全站接口不可用（封禁仍拦截登录与刷新）
      }
      if (kicked)
        throw new UnauthorizedException('账号已被强制下线，请重新登录');

      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期');
    }
  }
}
