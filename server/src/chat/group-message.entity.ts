import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('group_messages')
@Index('idx_group_message', ['groupId', 'id'])
export class GroupMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  senderId: number;

  @Column({
    type: 'enum',
    enum: ['text', 'image', 'voice', 'video'],
    default: 'text',
  })
  contentType: 'text' | 'image' | 'voice' | 'video';

  @Column({ type: 'text' })
  content: string;

  /** 引用消息 ID（须为同一群的消息） */
  @Column({ type: 'int', nullable: true })
  replyToId: number | null;

  /** 被引用消息快照预览（text:xxx / image: / voice: / video:） */
  @Column({ type: 'varchar', length: 255, nullable: true })
  replyPreview: string | null;

  /** 是否为转发消息 */
  @Column({ type: 'boolean', default: false })
  forwarded: boolean;

  /** 撤回时间；非空 = 已撤回（发送后 2 分钟内可撤回） */
  @Column({ type: 'datetime', nullable: true })
  recalledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
