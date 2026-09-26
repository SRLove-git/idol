import {
  ArrayNotEmpty,
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  /** 群成员用户 ID（不含创建者本人） */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  memberIds: number[];
}

/** 群创建后拉人（成员可邀请，群主可踢人/解散） */
export class AddGroupMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  memberIds: number[];
}

/** 群主修改群名称 */
export class RenameGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;
}

export class SendGroupMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsIn(['text', 'image', 'voice', 'video'])
  contentType?: 'text' | 'image' | 'voice' | 'video';

  /** 引用消息 ID（须为同一群的消息） */
  @IsOptional()
  @IsInt()
  @Min(1)
  replyToId?: number;

  /** 是否为转发消息 */
  @IsOptional()
  @IsBoolean()
  forwarded?: boolean;
}

export class MarkGroupReadDto {
  @IsInt()
  @Min(0)
  lastMessageId: number;
}

/** 群主设置 / 取消管理员 */
export class SetGroupRoleDto {
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';
}

/** 群主转让 */
export class TransferGroupDto {
  @IsInt()
  @Min(1)
  newOwnerId: number;
}
