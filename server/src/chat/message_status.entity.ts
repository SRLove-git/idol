import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * 每条消息对每个参与者的已读状态（单聊固定 2 行：发送方已读、接收方待读）。
 *
 * 相比 messages.readAt 单字段，这里按 (message, user) 独立记录，
 * 是未读数 / 已读回执的单一数据源；messages.readAt 保留写入用于 API 兼容。
 */
@Entity('message_status')
@Unique('uk_message_status_msg_user', ['messageId', 'userId'])
@Index('idx_message_status_user', ['userId', 'readAt'])
export class MessageStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  /** 该状态所属的用户（发送方或接收方） */
  @Column()
  userId: number;

  /** 已读时间；空 = 未读 */
  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  /** 用户删除该消息的时间；非空 = 仅对当前用户隐藏（对端不受影响） */
  @Column({ type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
