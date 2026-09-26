import { Transform } from 'class-transformer';
import {
  IsBoolean,
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

export const ADMIN_ROLE_VALUES = [
  'super_admin',
  'operator',
  'moderator',
  'auditor',
] as const;

/** 新增管理员账号 */
export class CreateAdminDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '用户名至少 2 位' })
  @MaxLength(30, { message: '用户名最多 30 位' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名仅支持字母、数字和下划线',
  })
  username: string;

  @Transform(lowerTrim)
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  password: string;

  @IsIn(ADMIN_ROLE_VALUES, { message: '管理角色不合法' })
  adminRole: (typeof ADMIN_ROLE_VALUES)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30, { message: '昵称最多 30 位' })
  nickname?: string;
}

/** 编辑管理员：角色 / 昵称 / 停用状态 */
export class UpdateAdminDto {
  @IsOptional()
  @IsIn(ADMIN_ROLE_VALUES, { message: '管理角色不合法' })
  adminRole?: (typeof ADMIN_ROLE_VALUES)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30, { message: '昵称最多 30 位' })
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;
}

/** 重置管理员密码 */
export class ResetAdminPasswordDto {
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32, { message: '密码最多 32 位' })
  password: string;
}
