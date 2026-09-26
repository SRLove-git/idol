import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * 全局限流守卫（替代内置 ThrottlerGuard）。
 *
 * 关闭开关必须在守卫层判断：@nestjs/throttler v6 的模块级 skipIf 会被路由上的
 * `@Throttle(...)` 装饰器覆盖（登录/注册、验证码等路由都带装饰器），
 * 只设 THROTTLE_DISABLED=true 时这些路由仍会被限流。
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_DISABLED === 'true') return true;
    return super.canActivate(context);
  }
}
