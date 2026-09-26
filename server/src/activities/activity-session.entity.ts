import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

/** 活动场次：可预约活动的日期/时间/名额（容量） */
@Entity('activity_sessions')
export class ActivitySession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Activity, (a) => a.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity;

  @Column()
  activityId: number;

  /** 场次日期 YYYY-MM-DD */
  @Column({ length: 10 })
  date: string;

  /** HH:mm */
  @Column({ length: 5 })
  startTime: string;

  /** HH:mm */
  @Column({ length: 5 })
  endTime: string;

  /** 名额上限 */
  @Column()
  capacity: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
