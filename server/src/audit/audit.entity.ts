import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 管理端敏感操作审计日志（只追加，无更新/删除接口）。
 * 记录操作人、动作、目标、请求摘要、来源 IP 与 UA，供安全追溯。
 */
@Entity('audit_logs')
@Index(['actorId'])
@Index(['action'])
@Index(['targetType', 'targetId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** 操作人用户 ID（管理端登录用户） */
  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  /** 动作标识，如 user.ban / post.status / moderation.keyword_add */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetType: string | null;

  /** 目标 ID（用户/作品/关键词等） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  targetId: string | null;

  /** 脱敏后的请求摘要（body/params 关键字段，剔除密码/token/验证码） */
  @Column({ type: 'json', nullable: true })
  detail: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
