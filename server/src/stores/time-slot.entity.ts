import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

/** 门店可约时段模板（如 09:00-10:30）。容量/剩余名额在预约时基于桌位实时计算 */
@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Store, (s) => s.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  storeId: number;

  /** HH:mm */
  @Column({ length: 5 })
  startTime: string;

  @Column({ length: 5 })
  endTime: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
