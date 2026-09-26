import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 会员开通申请状态：待确认 → 已开通（管理端确认后真正开通会员） */
export type MemberOrderStatus = 'pending' | 'confirmed' | 'cancelled';

/** 会员开通申请单：线上下单、到店支付，由管理端确认后开通会员 */
@Entity('member_orders')
@Index(['userId', 'createdAt']) // 我的会员订单 / 管理端按用户查订单（时间倒序）
export class MemberOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'int' })
  planId: number;

  @Column({ length: 60 })
  planName: string;

  /** 套餐时长（天），确认开通时按此顺延会员有效期 */
  @Column({ type: 'int' })
  durationDays: number;

  /** 应付金额（到店支付） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  })
  status: MemberOrderStatus;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
