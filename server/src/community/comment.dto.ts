import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
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
