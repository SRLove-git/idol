import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ArrayMaxSize,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 媒体项 */
export class PostMediaDto {
  @IsIn(['image', 'video'])
  type: 'image' | 'video';

  @IsString()
  url: string;

  @IsOptional()
  aspectRatio?: number;

  @IsOptional()
  duration?: number;
}

/** 发布作品 */
export class CreatePostDto {
  @IsString()
  @MaxLength(200, { message: '标题不能超过 200 字' })
  @IsOptional()
  title: string;

  @IsString()
  @MaxLength(5000, { message: '文案不能超过 5000 字' })
  content: string;

  @IsArray()
  @ArrayMaxSize(9, { message: '最多上传 9 张图片' })
  @IsOptional()
  images: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaDto)
  @ArrayMaxSize(9, { message: '最多上传 9 个媒体' })
  @IsOptional()
  medias: PostMediaDto[];

  @IsArray()
  @IsOptional()
  tags: string[];

  @IsString()
  @MaxLength(100)
  @IsOptional()
  channelTag: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  location: string;
}

/** 审核作品：通过或驳回 */
export class UpdatePostStatusDto {
  @IsIn(['approved', 'rejected'], {
    message: '状态仅可为 approved 或 rejected',
  })
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}
