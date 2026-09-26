import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class SavePlanDto {
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(1) durationDays: number;
  @IsNumber() @Min(0) price: number;
  @IsNumber() @Min(0) originalPrice: number;
  @IsArray() @IsString({ each: true }) benefits: string[];
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsBoolean() recommended?: boolean;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class SaveCouponDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() amount: string;
  @IsString() @IsNotEmpty() threshold: string;
  @IsString() @IsNotEmpty() expireAt: string;
  @IsInt() @Min(0) stock: number;
  @IsOptional() @IsBoolean() membersOnly?: boolean;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

/** 输码核销：6 位数字+字母核销码 */
export class RedeemCouponDto {
  @Matches(/^[A-Za-z0-9]{6}$/, { message: '核销码为 6 位数字或字母' })
  code: string;
}

/** 后台开通会员：按用户名查询开通 */
export class SaveMembershipDto {
  @IsString() @IsNotEmpty() @MaxLength(30) username: string;
  @IsOptional() @IsString() @MaxLength(30) levelName?: string;
  @IsString() @IsNotEmpty() expireAt: string;
}

/** 后台编辑会员：仅可调整等级与有效期 */
export class UpdateMembershipDto {
  @IsOptional() @IsString() @MaxLength(30) levelName?: string;
  @IsString() @IsNotEmpty() expireAt: string;
}
