import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** 新增审核关键词 */
export class AddKeywordDto {
  @IsString()
  @MinLength(1, { message: '关键词不能为空' })
  @MaxLength(30, { message: '关键词最长 30 个字符' })
  @Matches(/^\S+$/, { message: '关键词不能包含空格' })
  keyword: string;
}
