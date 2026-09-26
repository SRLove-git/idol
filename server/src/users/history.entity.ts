import {
  Index,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('browsing_history')
@Index(['userId', 'createdAt']) // 浏览历史列表（按时间倒序）
@Index(['userId', 'postId'], { unique: true }) // 历史去重/upsert
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  postId: number;

  @CreateDateColumn()
  createdAt: Date;
}
