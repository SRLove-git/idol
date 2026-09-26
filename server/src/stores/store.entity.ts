import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { StoreTable } from './store-table.entity';
import { TimeSlot } from './time-slot.entity';
import { StorePackage } from './store-package.entity';

/** decimal 列返回 number（避免字符串） */
const decimal: ValueTransformer = {
  to: (v: number) => v,
  from: (v: string) => Number(v),
};

/** 门店 */
@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  address: string;

  /** 纬度；管理端可不填，null 表示未配置（地图不展示该店） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimal,
  })
  lat: number | null;

  /** 经度；管理端可不填，null 表示未配置（地图不展示该店） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimal,
  })
  lng: number | null;

  /** 评分 0-5 */
  @Column({
    type: 'decimal',
    precision: 2,
    scale: 1,
    default: 5,
    transformer: decimal,
  })
  rating: number;

  /** 门店图片（OSS URL 列表） */
  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  /** 预约单价（元/人/次），会员价为空时等同门市价 */
  /** 按小时预约时即「元/人/小时」 */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 39.9,
    transformer: decimal,
  })
  price: number;

  /** 会员专属预约价（元/人/次）；0 表示会员免费，null 表示无会员价 */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  memberPrice: number | null;

  /** 多人同行价（元/人/小时）：同行 ≥2 人且非会员时按此价计费 */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  groupPrice: number | null;

  /** 全天不限时价格（元/人）；null 表示未配置（按营业时长 × 小时单价计算） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  allDayPrice: number | null;

  /** 全天不限时会员价（元/人） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  allDayMemberPrice: number | null;

  /** 全天不限时多人同行价（元/人） */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimal,
  })
  allDayGroupPrice: number | null;

  /** 周末/节假日加价百分比（如 10 表示加收 10%），0 表示不加价 */
  @Column({ default: 0 })
  weekendSurchargePercent: number;

  @Column({ length: 50, default: '09:00-21:00' })
  businessHours: string;

  @Column({ length: 20, default: '' })
  phone: string;

  @Column({ default: true })
  enabled: boolean;

  @OneToMany(() => StoreTable, (t) => t.store)
  tables: StoreTable[];

  @OneToMany(() => TimeSlot, (t) => t.store)
  slots: TimeSlot[];

  @OneToMany(() => StorePackage, (p) => p.store)
  packages: StorePackage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
