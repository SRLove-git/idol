import { IsString, Matches, MaxLength } from 'class-validator';

export class RecordSiteVisitDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,80}$/, { message: '访客标识格式无效' })
  visitorId: string;

  @IsString()
  @MaxLength(120)
  path: string;
}
