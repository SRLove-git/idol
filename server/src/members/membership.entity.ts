import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number;

  @Column({ unique: true, length: 24 })
  memberNo: string;

  @Column({ length: 30, default: '手作会员' })
  levelName: string;

  @Column({ type: 'datetime' })
  expireAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
