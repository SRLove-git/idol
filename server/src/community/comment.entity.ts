import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('post_comments')
@Index(['postId'])
@Index(['parentId'])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  postId: number;

  /** 回复的顶级评论 ID；顶级评论为 null（回复的回复也挂到顶级评论下） */
  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  /** 被回复用户 ID，用于展示「回复 @昵称」 */
  @Column({ type: 'int', nullable: true })
  replyToId: number | null;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  /** 管理端隐藏（违规评论）：隐藏后对全体用户不可见，作者侧保留 */
  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
