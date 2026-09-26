import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('messages')
@Index('idx_message_conversation', ['conversationId', 'id'])
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  /** 消息类型：text 文本/表情；image 图片；voice 语音（content 为 {url,duration} JSON）；video 视频（content 为 /uploads/video/... 相对路径） */
  @Column({
    type: 'enum',
    enum: ['text', 'image', 'voice', 'video'],
    default: 'text',
  })
  contentType: 'text' | 'image' | 'voice' | 'video';

  @Column({ type: 'text' })
  content: string;

  /** 引用消息 ID（长按引用其他消息时填写，须为同一会话的消息） */
  @Column({ type: 'int', nullable: true })
  replyToId: number | null;

  /** 被引用消息的快照预览（text:xxx / image: / voice: / video:），用于引用气泡展示 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  replyPreview: string | null;

  /** 是否为转发消息 */
  @Column({ type: 'boolean', default: false })
  forwarded: boolean;

  /** 撤回时间；非空 = 已撤回（发送后 2 分钟内可撤回） */
  @Column({ type: 'datetime', nullable: true })
  recalledAt: Date | null;

  /** 对方已读时间；空 = 未读 */
  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
