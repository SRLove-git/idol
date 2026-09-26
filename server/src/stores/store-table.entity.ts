import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

/** 门店桌位（工位/操作台）：预约时按人数选择 */
@Entity('store_tables')
@Index('IDX_store_tables_store_enabled', ['storeId', 'enabled']) // 桌位可用性：按门店+启用过滤
export class StoreTable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Store, (s) => s.tables, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  storeId: number;

  /** 桌位名，如 A1 / B2 */
  @Column({ length: 50 })
  name: string;

  /** 可容纳人数上限 */
  @Column()
  capacity: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
