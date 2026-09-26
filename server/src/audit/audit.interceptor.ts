import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_ACTION, AUDIT_TARGET_TYPE } from './audit.decorator';

/** 写入审计前剔除的敏感字段（token/密码/验证码等） */
const SENSITIVE_KEYS = new Set([
  'password',
  'oldPassword',
  'newPassword',
  'refreshToken',
  'accessToken',
  'captchaToken',
  'captchaId',
  'captchaText',
  'secret',
  'token',
  'credential',
]);

function sanitize(
  value: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth > 3) return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = sanitize(val as Record<string, unknown>, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * 全局审计拦截器：仅在 handler 带 @Audit 元数据时生效，
 * 操作成功后记录 actor/action/target/请求摘要。
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(
      AUDIT_ACTION,
      context.getHandler(),
    );
    if (!action) return next.handle();

    const targetType = this.reflector.get<string>(
      AUDIT_TARGET_TYPE,
      context.getHandler(),
    );
    const req = context.switchToHttp().getRequest<Request>();
    const params = (req.params ?? {}) as Record<string, unknown>;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawTargetId: unknown =
      params.id ??
      body.id ??
      body.userId ??
      body.keyword ??
      params.keyword ??
      '';
    const targetId =
      typeof rawTargetId === 'string' || typeof rawTargetId === 'number'
        ? String(rawTargetId)
        : null;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.record({
            actorId:
              (req as unknown as { user?: { id?: number } | undefined }).user
                ?.id ?? null,
            action,
            targetType: targetType ?? null,
            targetId,
            detail: sanitize({ ...params, ...body }),
            ip: req.ip ?? null,
            userAgent: (req.headers['user-agent'] ?? '').slice(0, 255) || null,
          });
        },
      }),
    );
  }
}
