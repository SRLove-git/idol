import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('member_plans')
export class MemberPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  name: string;

  @Column()
  durationDays: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: string;

  @Column({ type: 'json' })
  benefits: string[];

  @Column({ length: 20, default: '' })
  badge: string;

  @Column({ default: false })
  recommended: boolean;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
