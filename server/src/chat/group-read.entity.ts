import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('group_reads')
@Index(['groupId', 'userId'], { unique: true })
export class GroupRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  userId: number;

  /** 已读到的最后一条消息 ID */
  @Column({ type: 'bigint', default: 0 })
  lastReadMessageId: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
