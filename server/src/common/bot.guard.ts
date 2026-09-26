import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { BotService } from './bot.service';

/**
 * 爬虫 UA 拦截守卫（BLOCK_BOT_UA=true 时生效）。
 * 应用在注册/登录/上传等易被脚本批量打点的接口上。
 */
@Injectable()
export class BotGuard implements CanActivate {
  constructor(private readonly bots: BotService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (this.bots.shouldBlock(req.headers['user-agent'])) {
      throw new ForbiddenException('请求被拒绝');
    }
    return true;
  }
}
