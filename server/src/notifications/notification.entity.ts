import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type NotificationTarget = 'all' | 'role' | 'user';

export type NotificationCategory =
  | 'system'
  | 'like'
  | 'comment'
  | 'reply'
  | 'collect'
  | 'follow'
  | 'booking'
  | 'activity'
  | 'member';

@Entity('notifications')
@Index(['sent', 'createdAt']) // 通知列表/未读数（按时间倒序过滤已发送）
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  /** 标题 */
  @Column({ length: 200 })
  title: string;

  /** 正文内容 */
  @Column({ type: 'text' })
  content: string;

  /** 英文标题（可选；缺省时展示中文标题） */
  @Column({ type: 'varchar', length: 200, nullable: true })
  titleEn: string | null;

  /** 英文正文（可选；缺省时展示中文正文） */
  @Column({ type: 'text', nullable: true })
  contentEn: string | null;

  /** 通知分类：用于客户端稳定分组/选图标，不依赖文案关键词 */
  @Column({ type: 'varchar', length: 20, default: 'system' })
  category: NotificationCategory;

  /** 发送目标类型：all=全体 / role=按角色 / user=指定用户 */
  @Column({ type: 'enum', enum: ['all', 'role', 'user'], default: 'all' })
  targetType: NotificationTarget;

  /** 点击通知后跳转的动作类型：post=作品 / video=短视频 / user=用户主页 */
  @Column({ type: 'varchar', length: 16, nullable: true })
  actionType: 'post' | 'video' | 'user' | null;

  /** 跳转目标 ID（与 actionType 配套） */
  @Column({ type: 'int', nullable: true })
  actionId: number | null;

  /** 当 targetType=role 时指定角色 */
  @Column({ type: 'enum', enum: ['user', 'admin'], nullable: true })
  targetRole: 'user' | 'admin' | null;

  /** 当 targetType=user 时指定用户ID（逗号分隔） */
  @Column({ type: 'text', nullable: true })
  targetUserIds: string;

  /** 发送渠道：push=推送 / email=邮件，多选用逗号分隔 */
  @Column({ default: 'push' })
  channels: string;

  /** 是否已发送 */
  @Column({ default: false })
  sent: boolean;

  /** 发送时间 */
  @Column({ type: 'datetime', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
