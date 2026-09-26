import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 帖子评论点赞记录 */
@Entity('post_comment_likes')
@Index(['userId', 'commentId'], { unique: true })
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  commentId: number;

  @CreateDateColumn()
  createdAt: Date;
}
