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
  ResetPasswordDto,
  SendPasswordResetCodeDto,
  SendRegistrationCodeDto,
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

  /** 发送注册邮箱验证码 */
  @Post('register-code')
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 60000 } })
  sendRegistrationCode(
    @Req() req: Request,
    @Body() dto: SendRegistrationCodeDto,
  ) {
    return this.auth.sendRegistrationCode(dto, req.ip);
  }

  /** 发送找回密码验证码；无论邮箱是否存在都返回相同结果，避免泄露账号信息 */
  @Post('password-reset-code')
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 60000 } })
  sendPasswordResetCode(
    @Req() req: Request,
    @Body() dto: SendPasswordResetCodeDto,
  ) {
    return this.auth.sendPasswordResetCode(dto, req.ip);
  }

  /** 使用邮箱验证码重置密码 */
  @Post('reset-password')
  @Throttle({ auth: { limit: 5, ttl: 60000, blockDuration: 300000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.emailCode, dto.newPassword);
  }

  /** 注册：用户名 + 密码 + 邮箱验证码；游客邮箱账号会原地升级并保留预约 */
  @Post('register')
  @Throttle({ auth: { limit: 10, ttl: 60000, blockDuration: 60000 } })
  register(@Req() req: Request, @Body() dto: RegisterDto) {
    const deviceId = dto.deviceId?.trim() || null;
    const fingerprintHeader = (
      (req.headers['x-device-fingerprint'] as string | undefined) ?? ''
    ).trim();
    // 仅对客户端明确上报的安装/设备标识执行设备账号上限。
    // 不能用 UA + IP 兜底：共享网络下的不同访客会被误判为同一设备。
    const identifier =
      deviceId || fingerprintHeader
        ? requestFingerprint(req, deviceId)
        : undefined;
    return this.auth.register({ ...dto, deviceId: identifier });
  }

  /** 用户名 / 邮箱 + 密码登录 */
  @Post('login')
  @Throttle({ auth: { limit: 10, ttl: 60000, blockDuration: 60000 } })
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
