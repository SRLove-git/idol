import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** 用户关注关系：followerId 关注 followeeId（双向两条即互相关注） */
@Entity('follows')
@Unique(['followerId', 'followeeId'])
@Index(['followeeId'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  /** 关注者 */
  @Column()
  followerId: number;

  /** 被关注者 */
  @Column()
  followeeId: number;

  @CreateDateColumn()
  createdAt: Date;
}
