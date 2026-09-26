import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  /** 模板名称 */
  @Column({ length: 100 })
  name: string;

  /** 模板标题（支持变量占位：{nickname}、{store} 等） */
  @Column({ length: 200 })
  titleTemplate: string;

  /** 模板正文（支持变量占位） */
  @Column({ type: 'text' })
  contentTemplate: string;

  /** 模板分类：system=系统通知 / booking=预约 / community=社区互动 / activity=活动 */
  @Column({
    type: 'enum',
    enum: ['system', 'booking', 'community', 'activity'],
    default: 'system',
  })
  category: 'system' | 'booking' | 'community' | 'activity';

  /** 是否启用 */
  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
