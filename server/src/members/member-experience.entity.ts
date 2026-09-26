import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 会员专属预约 / 到店体验项目（会员专属体验价） */
@Entity('member_experiences')
export class MemberExperience {
  @PrimaryGeneratedColumn()
  id: number;

  /** 体验项目名 */
  @Column({ length: 60 })
  name: string;

  /** 项目描述 */
  @Column({ length: 200, default: '' })
  desc: string;

  /** 会员专属价（元） */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  memberPrice: string;

  /** 门市价（元，划线对比） */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  normalPrice: string;

  /** 每月专属次数 */
  @Column({ default: 1 })
  quota: number;

  /** 展示排序（小在前） */
  @Column({ default: 0 })
  sortOrder: number;

  /** 是否上架 */
  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
