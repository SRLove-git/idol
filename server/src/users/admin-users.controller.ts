import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS, type AdminRole } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { UsersService } from './users.service';

interface AdminRequest extends Request {
  adminUser?: { id: number; adminRole: AdminRole | null };
}

/** 管理端：用户管理 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.USERS_MANAGE)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  /** 用户列表（分页，可选用户名/邮箱/昵称搜索） */
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('search') search?: string,
  ) {
    return this.users.findAll(page, search);
  }

  /** 封禁/解封用户 */
  @Patch(':id/ban')
  @Audit('user.ban', 'user')
  async ban(
    @Req() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('isBanned') isBanned: boolean,
  ) {
    await this.assertTargetNotAdmin(req, id, '封禁');
    return this.users.toggleBan(id, isBanned);
  }

  /** 强制下线：立即使该用户现有会话失效，需重新登录 */
  @Patch(':id/offline')
  @Audit('user.offline', 'user')
  forceOffline(@Param('id', ParseIntPipe) id: number) {
    return this.users.forceOffline(id);
  }

  /** 删除用户全部作品（社区帖子 + 短视频/照片，含关联互动数据） */
  @Delete(':id/works')
  @Audit('user.delete_works', 'user')
  deleteWorks(@Param('id', ParseIntPipe) id: number) {
    return this.users.deleteWorks(id);
  }

  /** 删除用户（含作品、互动、关注、会员、预约、聊天等全部关联数据） */
  @Delete(':id')
  @Audit('user.delete', 'user')
  async remove(
    @Req() req: AdminRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.assertTargetNotAdmin(req, id, '删除');
    return this.users.remove(id);
  }

  /** 非 super_admin 不能封禁/删除管理员账号（管理员账号只能由超管停用） */
  private async assertTargetNotAdmin(
    req: AdminRequest,
    targetId: number,
    action: string,
  ): Promise<void> {
    const target = await this.users.findById(targetId);
    if (
      target?.role === 'admin' &&
      req.adminUser?.adminRole !== 'super_admin'
    ) {
      throw new ForbiddenException(`无权${action}管理员账号`);
    }
  }
}
