import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 用户已读记录（每用户每通知一条） */
@Entity('notification_reads')
@Index(['userId', 'notificationId'], { unique: true })
export class NotificationRead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  notificationId: number;

  @CreateDateColumn()
  readAt: Date;
}
