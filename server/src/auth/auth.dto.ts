import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** 注册：用户名 + 密码 + 邮箱绑定 */
export class RegisterDto {
  @Transform(lowerTrim)
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  /** 人机验证 token（开启 CAPTCHA_PROVIDER 后必填） */
  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: '验证参数过长' })
  captchaToken?: string;

  /** 图形验证码 ID（CAPTCHA_PROVIDER=image 时与 captchaText 一起必填） */
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: '验证参数过长' })
  captchaId?: string;

  /** 图形验证码输入（CAPTCHA_PROVIDER=image 时必填） */
  @IsOptional()
  @IsString()
  @MaxLength(8, { message: '验证码格式不正确' })
  captchaText?: string;

  /** 设备标识（MAC/安装ID）：同一设备最多注册 3 个账号，App 端安装后生成并持久化 */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64, { message: '设备标识过长' })
  deviceId?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '用户名至少 2 位' })
  @MaxLength(30, { message: '用户名最多 30 位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名仅支持字母、数字和下划线',
  })
  username: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  password: string;
}

/** 用户名 / 邮箱 + 密码登录 */
export class LoginDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '用户名或邮箱至少 2 位' })
  @MaxLength(255, { message: '用户名或邮箱过长' })
  account: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  password: string;

  /** 人机验证 token（开启 CAPTCHA_PROVIDER 后必填） */
  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: '验证参数过长' })
  captchaToken?: string;

  /** 图形验证码 ID（CAPTCHA_PROVIDER=image 时与 captchaText 一起必填） */
  @IsOptional()
  @IsString()
  @MaxLength(64, { message: '验证参数过长' })
  captchaId?: string;

  /** 图形验证码输入（CAPTCHA_PROVIDER=image 时必填） */
  @IsOptional()
  @IsString()
  @MaxLength(8, { message: '验证码格式不正确' })
  captchaText?: string;
}

/** 修改登录密码（登录态下）：需校验原密码 */
export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  newPassword: string;
}

/** 注销账号（登录态下）：需校验登录密码 */
export class DeactivateAccountDto {
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: '昵称最长 30 个字符' })
  nickname?: string;

  /** 用户名：2-30 位字母/数字/下划线，用于用户名+密码登录 */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30, { message: '用户名最多 30 位' })
  @Matches(/^[a-zA-Z0-9_]*$/, { message: '用户名仅支持字母、数字和下划线' })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '简介最长 200 个字符' })
  bio?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'secret'], { message: '性别取值不合法' })
  gender?: 'male' | 'female' | 'secret';

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? null
        : value.trim()
      : value,
  )
  @IsDateString({}, { message: '生日格式应为 YYYY-MM-DD' })
  birthday?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: '所在地最长 60 个字符' })
  location?: string;
}
