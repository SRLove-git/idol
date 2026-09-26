import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 短视频评论点赞记录 */
@Entity('video_comment_likes')
@Index(['userId', 'commentId'], { unique: true })
export class VideoCommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  commentId: number;

  @CreateDateColumn()
  createdAt: Date;
}
