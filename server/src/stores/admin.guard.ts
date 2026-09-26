import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import type { AdminRole } from '../common/admin-permissions';

interface AuthedRequest extends Request {
  user?: { id: number };
  adminUser?: { id: number; adminRole: AdminRole | null };
}

/**
 * 管理员校验：user.role === 'admin' 且未封禁（依赖 JwtAuthGuard 先注入 req.user）。
 * 通过后注入 req.adminUser（含 adminRole），供 AdminPermissionsGuard 做角色权限判断。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const user = req.user ? await this.users.findById(req.user.id) : null;
    if (!user || user.role !== 'admin' || user.isBanned) {
      throw new ForbiddenException('无管理权限');
    }
    req.adminUser = {
      id: user.id,
      adminRole: (user as { adminRole?: AdminRole }).adminRole ?? null,
    };
    return true;
  }
}
