import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { hasAdminPermission, type AdminRole } from './admin-permissions';

export const ADMIN_PERMISSIONS_KEY = 'admin:permissions';

/**
 * 声明接口所需权限：@Permissions('orders.manage', ...)
 * 需先经过 AdminGuard（注入 req.adminUser）再使用。
 */
export const Permissions = (
  ...permissions: string[]
): MethodDecorator & ClassDecorator =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);

interface AuthedRequest extends Request {
  adminUser?: { id: number; adminRole: AdminRole | null };
}

/** 基于角色-权限矩阵的授权守卫：读取 @Permissions 元数据并校验当前管理员角色 */
@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const role = req.adminUser?.adminRole ?? null;
    if (!role || !required.some((p) => hasAdminPermission(role, p))) {
      throw new ForbiddenException('当前管理员角色无权执行此操作');
    }
    return true;
  }
}
