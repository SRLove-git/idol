import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from './audit.entity';
import { User } from '../users/user.entity';

export interface AuditInput {
  actorId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly logs: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** 写入一条审计日志（失败只告警，不阻断业务操作） */
  async record(input: AuditInput): Promise<void> {
    try {
      await this.logs.save(
        this.logs.create({
          actorId: input.actorId ?? null,
          action: input.action,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          detail: input.detail ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        }),
      );
    } catch (e) {
      this.logger.error(
        `写入审计日志失败 action=${input.action}: ${(e as Error).message}`,
      );
    }
  }

  /** 管理端：分页查询审计日志（按操作/操作人/时间范围筛选，附带操作人信息） */
  async findAll(params: {
    page: number;
    pageSize: number;
    action?: string;
    actor?: string;
    from?: string;
    to?: string;
  }): Promise<
    [
      Array<
        AuditLog & {
          actor: {
            id: number;
            username: string | null;
            nickname: string;
          } | null;
        }
      >,
      number,
    ]
  > {
    const { page, pageSize, action, actor, from, to } = params;
    const qb = this.logs
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (action?.trim())
      qb.andWhere('log.action = :action', { action: action.trim() });
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        qb.andWhere('log.createdAt >= :from', { from: fromDate });
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        qb.andWhere('log.createdAt <= :to', { to: toDate });
      }
    }
    const kw = (actor ?? '').trim();
    if (kw) {
      const sub = this.users
        .createQueryBuilder('u')
        .select('u.id')
        .where('u.username LIKE :kw OR u.nickname LIKE :kw')
        .getQuery();
      qb.andWhere(`log.actorId IN (${sub})`, { kw: `%${kw}%` });
    }

    const [rows, total] = await qb.getManyAndCount();
    const actorIds = [
      ...new Set(
        rows.map((r) => r.actorId).filter((id): id is number => id != null),
      ),
    ];
    const actorMap = new Map<number, User>();
    if (actorIds.length) {
      const actors = await this.users.find({ where: { id: In(actorIds) } });
      for (const u of actors) actorMap.set(u.id, u);
    }
    const items = rows.map((r) => ({
      ...r,
      actor:
        r.actorId != null && actorMap.has(r.actorId)
          ? {
              id: r.actorId,
              username: actorMap.get(r.actorId)!.username,
              nickname: actorMap.get(r.actorId)!.nickname,
            }
          : null,
    }));
    return [items, total];
  }

  /** 管理端：去重后的动作列表（筛选下拉用） */
  async listActions(): Promise<string[]> {
    const rows = await this.logs
      .createQueryBuilder('log')
      .select('DISTINCT log.action', 'action')
      .orderBy('action', 'ASC')
      .getRawMany<{ action: string }>();
    return rows.map((r) => r.action);
  }
}
