import {
  Index,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('video_browsing_history')
@Index(['userId', 'createdAt']) // 浏览历史列表（按时间倒序）
@Index(['userId', 'videoId'], { unique: true }) // 历史去重/upsert
export class VideoHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  videoId: number;

  @CreateDateColumn()
  createdAt: Date;
}
