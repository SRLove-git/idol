import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  title: string;

  @Column({ length: 20 })
  amount: string;

  @Column({ length: 60, default: '无门槛' })
  threshold: string;

  @Column({ type: 'datetime' })
  expireAt: Date;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: true })
  membersOnly: boolean;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_coupons')
@Index(['userId', 'couponId'], { unique: true })
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  couponId: number;

  /** 核销码：到店核销凭证（6 位数字+字母，领取时生成） */
  @Column({ length: 10, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: ['unused', 'used', 'expired'],
    default: 'unused',
  })
  status: 'unused' | 'used' | 'expired';

  @Column({ type: 'datetime', nullable: true })
  usedAt: Date | null;

  /** 核销人 ID（店员代操作时记录） */
  @Column({ type: 'int', nullable: true })
  redeemedBy: number | null;

  @CreateDateColumn()
  receivedAt: Date;
}
