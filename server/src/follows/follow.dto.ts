import { IsBoolean } from 'class-validator';

/** 设置关注状态（PUT /follows/:targetId） */
export class SetFollowDto {
  @IsBoolean({ message: 'following 必须是布尔值' })
  following: boolean;
}
