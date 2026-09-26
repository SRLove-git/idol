import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('groups')
@Index('idx_group_last_at', ['lastMessageAt'])
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  /** 群名称 */
  @Column({ length: 60 })
  name: string;

  /** 群主用户 ID */
  @Column()
  ownerId: number;

  /** 最后一条消息 ID（冗余，列表免 JOIN） */
  @Column({ type: 'bigint', nullable: true })
  lastMessageId: string | null;

  /** 最后一条消息预览：text:xxx */
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMessagePreview: string | null;

  /** 最后一条消息时间（列表排序键） */
  @Column({ type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
