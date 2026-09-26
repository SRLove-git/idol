import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateConversationDto {
  @IsInt()
  @Min(1)
  peerUserId: number;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  /** 消息类型：text（文本/表情，默认）| image | voice（content 为 {url,duration} JSON）| video */
  @IsOptional()
  @IsIn(['text', 'image', 'voice', 'video'])
  contentType?: 'text' | 'image' | 'voice' | 'video';

  /** 引用消息 ID（长按引用；须为同一会话的消息） */
  @IsOptional()
  @IsInt()
  @Min(1)
  replyToId?: number;

  /** 是否为转发消息（转发后消息体标记 forwarded） */
  @IsOptional()
  @IsBoolean()
  forwarded?: boolean;
}

export class PinConversationDto {
  @IsBoolean()
  pinned: boolean;
}

/** 拉黑 / 取消拉黑（PUT /blocks/:targetId） */
export class SetBlockDto {
  @IsBoolean({ message: 'blocked 必须是布尔值' })
  blocked: boolean;
}
