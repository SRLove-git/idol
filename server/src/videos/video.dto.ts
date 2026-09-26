import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** 管理端：审核短视频（通过/驳回） */
export class UpdateVideoStatusDto {
  @IsIn(['approved', 'rejected'], {
    message: '状态仅可为 approved 或 rejected',
  })
  status: 'approved' | 'rejected';

  @IsString()
  @MaxLength(500)
  @IsOptional()
  rejectReason?: string;
}

/** 发布短视频 */
export class CreateVideoDto {
  /** 标题 / 文案（信息流展示区显示） */
  @IsString()
  @MaxLength(200, { message: '标题不能超过 200 字' })
  @IsOptional()
  title?: string;

  /** 视频描述（发布页文案） */
  @IsString()
  @MaxLength(5000, { message: '文案不能超过 5000 字' })
  @IsOptional()
  content?: string;

  /** 封面 URL（可空：无封面时客户端展示占位图） */
  @IsString()
  @MaxLength(500)
  @IsOptional()
  cover?: string;

  /** 视频文件 URL（可空：纯照片作品配背景音乐时以封面承载，无视频流） */
  @IsString()
  @MaxLength(500)
  @IsOptional()
  videoUrl?: string;

  /** 照片作品图片列表（小红书式多图；空则按单图/视频处理） */
  @IsArray()
  @IsOptional()
  photos?: string[];

  /** 编辑滤镜 ID（'' 原图） */
  @IsString()
  @MaxLength(50)
  @IsOptional()
  filter?: string;

  /** 视频裁剪起点（秒，0 未裁剪） */
  @IsOptional()
  trimStart?: number;

  /** 视频裁剪终点（秒，0 未裁剪） */
  @IsOptional()
  trimEnd?: number;

  /** 播放倍速（0.5 ~ 2，默认 1） */
  @IsOptional()
  speed?: number;

  /** 照片顺时针旋转 90° 次数 */
  @IsInt()
  @Min(0)
  @IsOptional()
  rotation?: number;

  /** 视频时长（秒，缺省默认 15，客户端未解析出真实时长时用） */
  @IsInt()
  @Min(1, { message: '时长必须大于 0 秒' })
  @IsOptional()
  duration?: number;

  /** 视频展示画幅（width / height，例如 9/16、1、16/9） */
  @IsOptional()
  @Min(0.35)
  aspectRatio?: number;

  /** 配乐名称 */
  @IsString()
  @MaxLength(200)
  @IsOptional()
  music?: string;

  /** 配乐 ID（曲库音乐；非空且为视频作品时，服务端把配乐混入视频音轨） */
  @IsInt()
  @Min(1)
  @IsOptional()
  musicId?: number;

  /** 话题标签列表 */
  @IsArray()
  @IsOptional()
  tags?: string[];

  /** 发布地点 */
  @IsString()
  @MaxLength(200)
  @IsOptional()
  location?: string;
}

/** 添加视频评论 */
export class CreateVideoCommentDto {
  @IsString()
  @MaxLength(500, { message: '评论不能超过 500 字' })
  content: string;

  /** 回复的顶级评论 ID（发表顶级评论时缺省） */
  @IsInt()
  @IsOptional()
  parentId?: number;

  /** 被回复用户 ID（展示「回复 @昵称」用，缺省时指向父评论作者） */
  @IsInt()
  @IsOptional()
  replyToId?: number;
}
