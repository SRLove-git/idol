import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveActivityDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() date: string;
  @IsOptional() @IsString() desc?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) lat?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) lng?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) memberPrice?: number;
  @IsOptional() @IsBoolean() bookable?: boolean;
  @IsOptional() @IsBoolean() membersOnly?: boolean;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsInt() @Min(0) sort?: number;
}

/** 部分更新：PATCH 时只校验传入的字段 */
export class UpdateActivityDto extends PartialType(SaveActivityDto) {}

/** 活动场次（新增/更新） */
export class SaveActivitySessionDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '场次日期格式为 YYYY-MM-DD' })
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '开始时间格式为 HH:mm' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: '结束时间格式为 HH:mm' })
  endTime: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateActivitySessionDto extends PartialType(
  SaveActivitySessionDto,
) {}
