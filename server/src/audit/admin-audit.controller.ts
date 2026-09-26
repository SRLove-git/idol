import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { AuditService } from './audit.service';

/** 管理端：审计日志查询（只读） */
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.AUDIT_VIEW)
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('action') action?: string,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.audit.findAll({ page, pageSize, action, actor, from, to });
  }

  /** 已出现的操作动作列表（筛选下拉） */
  @Get('actions')
  actions() {
    return this.audit.listActions();
  }
}
