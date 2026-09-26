import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('conversations')
@Unique('uk_conversation_users', ['userAId', 'userBId'])
@Index('idx_conversation_last_at', ['lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  /** 参与者之一：始终存较小的用户 ID */
  @Column()
  userAId: number;

  /** 参与者之一：始终存较大的用户 ID */
  @Column()
  userBId: number;

  /** 最后一条消息 ID（冗余，列表免 JOIN） */
  @Column({ type: 'bigint', nullable: true })
  lastMessageId: string | null;

  /** 最后一条消息预览：text:xxx */
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  /** 最后一条消息时间（会话列表排序键） */
  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  /** 置顶时间：非空=已置顶（会话列表置顶排序键） */
  @Column({ type: 'datetime', nullable: true })
  pinnedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
