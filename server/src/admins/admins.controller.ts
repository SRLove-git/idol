import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { AdminsService } from './admins.service';
import {
  CreateAdminDto,
  ResetAdminPasswordDto,
  UpdateAdminDto,
} from './admins.dto';

/** 管理端：管理员账号管理（仅超级管理员） */
@Controller('admin/admins')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.ADMIN_MANAGE)
export class AdminAdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('keyword') keyword?: string,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
  ) {
    return this.admins.list(page, keyword?.trim(), pageSize);
  }

  @Post()
  @Audit('admin.create', 'admin')
  create(@Body() dto: CreateAdminDto) {
    return this.admins.create(dto);
  }

  @Patch(':id')
  @Audit('admin.update', 'admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.admins.update(id, dto, user.id);
  }

  @Post(':id/reset-password')
  @Audit('admin.reset_password', 'admin')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetAdminPasswordDto,
  ) {
    return this.admins.resetPassword(id, dto);
  }
}
