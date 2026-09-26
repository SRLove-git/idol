import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import type { NotificationCategory } from './notification.entity';
import { NotificationsService } from './notifications.service';

/** 管理端：通知管理 + 模板管理（需 admin 角色） */
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.NOTIFICATIONS_MANAGE)
export class AdminNotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // ─── 通知发送 ───

  @Post()
  @Audit('notification.send', 'notification')
  send(
    @Body()
    body: {
      title: string;
      content: string;
      titleEn?: string;
      contentEn?: string;
      category?: NotificationCategory;
      targetType: 'all' | 'role' | 'user';
      targetRole?: 'user' | 'admin';
      targetUserIds?: string;
      channels?: string;
    },
  ) {
    return this.svc.createAndSend(body);
  }

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.findAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Delete(':id')
  @Audit('notification.delete', 'notification')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  // ─── 模板管理 ───

  @Get('templates')
  listTemplates() {
    return this.svc.findAllTemplates();
  }

  @Post('templates')
  @Audit('notification.template_create', 'template')
  createTemplate(
    @Body()
    body: {
      name: string;
      titleTemplate: string;
      contentTemplate: string;
      category: 'system' | 'booking' | 'community' | 'activity';
    },
  ) {
    return this.svc.createTemplate(body);
  }

  @Patch('templates/:id')
  @Audit('notification.template_update', 'template')
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.svc.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Audit('notification.template_delete', 'template')
  removeTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.svc.removeTemplate(id);
  }

  // ─── 目标用户预览 ───

  @Post('target-users')
  getTargetUsers(
    @Body()
    body: {
      targetType: 'all' | 'role' | 'user';
      targetRole?: string;
      targetUserIds?: string;
    },
  ) {
    return this.svc.getTargetUsers(
      body.targetType,
      body.targetRole,
      body.targetUserIds,
    );
  }
}
