import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { UpdateProfileDto } from '../auth/auth.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** 编辑个人资料（昵称 / 头像） */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    await this.users.updateProfile(user.id, dto);
    return this.users.findSafeById(user.id);
  }

  /** 按用户名搜索用户（添加好友/社区找人） */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('username') username?: string) {
    return this.users.searchByUsername(username ?? '');
  }
}
