import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateStoreDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  memberPrice?: number;

  /** 多人同行价（元/人/小时） */
  @IsOptional()
  @IsNumber()
  @Min(0)
  groupPrice?: number;

  /** 全天不限时价格（元/人）；不填时按营业时长 × 小时单价计算 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  allDayPrice?: number;

  /** 全天不限时会员价（元/人） */
  @IsOptional()
  @IsNumber()
  @Min(0)
  allDayMemberPrice?: number;

  /** 全天不限时多人同行价（元/人） */
  @IsOptional()
  @IsNumber()
  @Min(0)
  allDayGroupPrice?: number;

  /** 周末/节假日加价百分比（0-100），0 表示不加价 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weekendSurchargePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  businessHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  enabled?: boolean;
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}

export class CreateTableDto {
  /** 桌位名：留空时按容量规则自动生成（A=1人桌 / B=2人桌 / C=4人桌 + 序号） */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  /** 容纳人数：仅支持 1 / 2 / 4（对应桌位名前缀 A / B / C） */
  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  enabled?: boolean;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateSlotDto {
  @Matches(TIME_RE, { message: '开始时间格式为 HH:mm' })
  startTime: string;

  @Matches(TIME_RE, { message: '结束时间格式为 HH:mm' })
  endTime: string;

  @IsOptional()
  enabled?: boolean;
}

export class UpdateSlotDto extends PartialType(CreateSlotDto) {}

export class CreatePackageDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsInt()
  @Min(1)
  hours: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  memberPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  groupPrice?: number;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}
