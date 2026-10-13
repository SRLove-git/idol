import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 官网匿名访客：同一浏览器每天只保留一条访问记录。 */
@Entity('site_visits')
@Index(['visitDate', 'visitorHash'], { unique: true })
@Index(['visitorHash'])
export class SiteVisit {
  @PrimaryGeneratedColumn()
  id: number;

  /** 浏览器生成的匿名标识只以 SHA-256 摘要落库。 */
  @Column({ length: 64 })
  visitorHash: string;

  /** 新加坡日期 YYYY-MM-DD，用于每日独立访客统计。 */
  @Column({ type: 'date' })
  visitDate: string;

  @Column({ length: 120, default: '/' })
  entryPath: string;

  @CreateDateColumn()
  createdAt: Date;
}
