import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SendMarketingEmailDto {
  @IsUUID('4', { message: '发送请求标识无效' })
  requestKey: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '邮件主题至少 2 个字符' })
  @MaxLength(150, { message: '邮件主题最多 150 个字符' })
  subject: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180, { message: '预览文字最多 180 个字符' })
  preheader?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '邮件标题至少 2 个字符' })
  @MaxLength(100, { message: '邮件标题最多 100 个字符' })
  heading: string;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: '邮件正文至少 2 个字符' })
  @MaxLength(4000, { message: '邮件正文最多 4000 个字符' })
  body: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50, { message: '按钮文字最多 50 个字符' })
  ctaLabel?: string;

  @ValidateIf((dto: SendMarketingEmailDto) => Boolean(dto.ctaLabel || dto.ctaUrl))
  @Transform(trim)
  @IsString()
  @Matches(/^https:\/\/[a-z0-9][^\s]*$/i, {
    message: '按钮链接必须是有效的 HTTPS 地址',
  })
  @MaxLength(500, { message: '按钮链接最多 500 个字符' })
  ctaUrl?: string;

  /** 必须由管理端明确提交，避免误调用接口直接发送。 */
  @IsIn(['SEND'], { message: '请确认本次群发操作' })
  confirmation: 'SEND';
}
