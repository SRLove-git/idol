import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('post_likes')
@Index(['userId', 'postId'], { unique: true })
export class Like {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  postId: number;

  @CreateDateColumn()
  createdAt: Date;
}
