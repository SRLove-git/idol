import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 可选登录守卫：携带有效 token 时注入 req.user，
 * 未登录或 token 失效时不拦截（评论列表等公开接口展示「我是否已点赞」用）。
 */
@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  override async canActivate(ctx: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(ctx);
    } catch {
      return true;
    }
  }
}
