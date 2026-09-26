import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { resolveLocale } from '../common/i18n';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

/** 客户端：我的通知（列表 / 未读数 / 已读） */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  mine(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number,
  ) {
    const lang =
      typeof req.query.lang === 'string' ? req.query.lang : undefined;
    return this.svc.myNotifications(
      user.id,
      Math.max(1, page),
      Math.min(50, Math.max(1, pageSize)),
      resolveLocale(req.headers['accept-language'], lang),
    );
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.svc.unreadCount(user.id).then((count) => ({ count }));
  }

  @Post('read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.svc.markAllRead(user.id);
  }

  @Post(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.markRead(user.id, id);
  }
}
