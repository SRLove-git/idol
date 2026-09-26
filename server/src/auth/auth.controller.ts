import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { BotGuard } from '../common/bot.guard';
import { requestFingerprint } from '../common/security.util';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { Audit } from '../audit/audit.decorator';
import {
  ChangePasswordDto,
  DeactivateAccountDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
} from './auth.dto';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
@UseGuards(BotGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  /** 注册：用户名 + 密码 + 邮箱绑定 */
  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  async register(@Req() req: Request, @Body() dto: RegisterDto) {
    await this.auth.assertIpRegisterAllowed(req.ip);
    const deviceId = dto.deviceId?.trim() || null;
    // 未上报设备标识时用服务端指纹兜底（防批量注册），上报时保持原值不变
    const identifier = deviceId || requestFingerprint(req, null);
    return this.auth.register({ ...dto, deviceId: identifier });
  }

  /** 用户名 / 邮箱 + 密码登录 */
  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.auth.login(
      dto.account,
      dto.password,
      dto.captchaToken,
      dto.captchaId,
      dto.captchaText,
    );
  }

  /** 修改登录密码（登录态下）：原密码 + 新密码 */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }

  /** 注销账号（登录态下）：校验登录密码后删除账号及全部关联数据 */
  @Post('deactivate-account')
  @UseGuards(JwtAuthGuard)
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  @Audit('user.self_delete', 'user')
  deactivateAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeactivateAccountDto,
  ) {
    return this.auth.deactivateAccount(user.id, dto.password);
  }

  /** 刷新令牌（轮换制） */
  @Post('refresh')
  @Throttle({ auth: { limit: 10, ttl: 60000, blockDuration: 300000 } })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** 当前登录用户 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.users.findSafeById(user.id);
  }
}
