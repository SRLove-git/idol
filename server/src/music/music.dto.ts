import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** 更新曲目元数据（管理端） */
export class UpdateMusicDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  artist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cover?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  musicUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;
}

/** 曲目上传表单的文本字段（multipart，与音频文件一起提交） */
export class UploadMusicFieldsDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  artist?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration?: number;
}
