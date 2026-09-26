import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: number;
}

/** 获取 JwtAuthGuard 注入的当前用户 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);

/** 获取 OptionalJwtAuthGuard 注入的当前用户；未登录时为 undefined */
export const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user,
);
