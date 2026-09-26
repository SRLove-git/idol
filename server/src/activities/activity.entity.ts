import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActivitySession } from './activity-session.entity';

/** 活动：活动专区 / 会员套餐页展示的活动数据源 */
@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  title: string;

  /** 展示时间文案，如 `08-16 14:00` / `08-22 起` */
  @Column({ length: 40 })
  date: string;

  @Column({ length: 200, default: '' })
  desc: string;

  /** 标签，如 `限会员` / `双倍积分` */
  @Column({ length: 20, default: '' })
  tag: string;

  /** 活动地址（可预约活动需要） */
  @Column({ length: 255, default: '' })
  address: string;

  /** 活动位置纬度（可预约活动需要，用于附近排序） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  lat: number | null;

  /** 活动位置经度 */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  lng: number | null;

  /** 活动预约单价（元/人/场次） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  price: number;

  /** 会员专属活动价；0 表示会员免费，null 表示无会员价 */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  memberPrice: number | null;

  /** 是否可预约（可预约的活动才进入预约流程） */
  @Column({ default: false })
  bookable: boolean;

  @Column({ default: false })
  membersOnly: boolean;

  @Column({ default: true })
  enabled: boolean;

  /** 排序权重，越小越靠前 */
  @Column({ default: 0 })
  sort: number;

  @OneToMany(() => ActivitySession, (s) => s.activity)
  sessions: ActivitySession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
