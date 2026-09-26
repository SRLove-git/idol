import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('post_collections')
@Index(['userId', 'postId'], { unique: true })
export class Collection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  postId: number;

  @CreateDateColumn()
  createdAt: Date;
}
