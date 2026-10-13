import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type MarketingEmailCampaignStatus =
  | 'sending'
  | 'completed'
  | 'partial'
  | 'failed';

/** 管理后台发起的营销邮件群发记录。 */
@Entity('marketing_email_campaigns')
@Index(['requestKey'], { unique: true })
export class MarketingEmailCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  /** 前端每次发送生成的唯一键，防止网络重试造成重复群发。 */
  @Column({ length: 36 })
  requestKey: string;

  @Column({ length: 150 })
  subject: string;

  @Column({ length: 180, default: '' })
  preheader: string;

  @Column({ length: 100 })
  heading: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ length: 50, default: '' })
  ctaLabel: string;

  @Column({ length: 500, default: '' })
  ctaUrl: string;

  @Column({
    type: 'enum',
    enum: ['sending', 'completed', 'partial', 'failed'],
    default: 'sending',
  })
  status: MarketingEmailCampaignStatus;

  @Column({ type: 'int', default: 0 })
  recipientCount: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'int' })
  createdBy: number;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
