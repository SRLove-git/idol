import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 短视频点赞关系 */
@Entity('video_likes')
@Index(['userId', 'videoId'], { unique: true })
export class VideoLike {
  @PrimaryGeneratedColumn()
  id: number;

  /** 点赞用户 */
  @Column()
  userId: number;

  /** 被点赞视频 */
  @Column()
  videoId: number;

  @CreateDateColumn()
  createdAt: Date;
}
