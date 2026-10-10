import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** 管理员拒绝或取消预约时填写的通知原因。 */
export class AdminCancelAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: '请选择或填写取消理由' })
  @MaxLength(200, { message: '取消理由最多 200 个字' })
  reason: string;
}

/** 创建预约：门店桌位 或 活动场次 + 人数 + 支付方式 */
export class CreateAppointmentDto {
  @IsOptional()
  @IsIn(['store', 'activity'])
  type?: 'store' | 'activity';

  /** 门店预约方式：hourly 按小时 / package 套餐 / all_day 全天不限时 */
  @IsOptional()
  @IsIn(['hourly', 'package', 'all_day'])
  bookingType?: 'hourly' | 'package' | 'all_day';

  /** 开始时间 HH:mm（hourly/package 必填，all_day 由营业时间决定） */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '开始时间格式为 HH:mm',
  })
  startTime?: string;

  /** 预约时长（小时），hourly 必填且 ≥1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  durationHours?: number;

  /** 套餐 ID（bookingType=package 时必填） */
  @IsOptional()
  @IsInt()
  packageId?: number;

  @IsOptional()
  @IsInt()
  storeId?: number;

  @IsOptional()
  @IsInt()
  tableId?: number;

  /** 多桌预约：桌位 ID 列表（不传时用 tableId 单桌） */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tableIds?: number[];

  @IsOptional()
  @IsInt()
  slotId?: number;

  @IsOptional()
  @IsInt()
  activityId?: number;

  @IsOptional()
  @IsInt()
  activitySessionId?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式为 YYYY-MM-DD' })
  date?: string;

  @IsInt()
  @Min(1, { message: '人数至少 1 人' })
  @Max(50, { message: '单次预约最多 50 人' })
  peopleCount: number;

  @IsOptional()
  @IsIn(['wechat', 'alipay'], { message: '支付方式仅支持微信/支付宝' })
  payMethod?: 'wechat' | 'alipay';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** 游客预约邮箱：未登录时用作游客账号的唯一标识（同邮箱预约归并到同一游客账号） */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  guestEmail?: string;

  /** 游客预约联系人姓名 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  guestName?: string;

  /** 使用的优惠券（用户卡包记录 ID，可空表示不使用） */
  @IsOptional()
  @IsInt()
  userCouponId?: number;
}

/** 输码核销 */
export class CheckInDto {
  /** 6 位预约码（数字+字母） */
  @Matches(/^[A-Za-z0-9]{6}$/, { message: '预约码为 6 位数字或字母' })
  code: string;
}

/** 游客查询预约：按预约邮箱查询 */
export class LookupAppointmentDto {
  @IsEmail({}, { message: '请输入正确的预约邮箱' })
  @MaxLength(255)
  email: string;
}

/** 管理端线下开台：散客免注册，创建即服务中（上钟），到点自动下钟 */
export class WalkInDto {
  @IsInt()
  storeId: number;

  /** 开台桌位（支持多桌） */
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tableIds: number[];

  @IsInt()
  @Min(1, { message: '人数至少 1 人' })
  peopleCount: number;

  /** hourly 按小时（默认）/ all_day 全天至打烊 */
  @IsOptional()
  @IsIn(['hourly', 'all_day'])
  bookingType?: 'hourly' | 'all_day';

  /** 时长（小时），hourly 必填且 ≥1 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  durationHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
