import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * 群消息按用户删除记录：删除只对自己生效（对端仍可见）。
 * 每次"删除"插入一行 (groupMessageId, userId)，历史查询据此过滤。
 */
@Entity('group_message_deletions')
@Unique('uk_group_msg_deletion', ['groupId', 'messageId', 'userId'])
export class GroupMessageDeletion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  messageId: number;

  /** 删除该消息的用户 */
  @Column()
  userId: number;

  @CreateDateColumn()
  deletedAt: Date;
}
