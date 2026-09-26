import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Block } from './block.entity';

/** 两人间的拉黑关系状态（从当前用户视角） */
export interface BlockStatus {
  /** 我是否拉黑了对方 */
  blockedByMe: boolean;
  /** 对方是否拉黑了我 */
  blockedByPeer: boolean;
}

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(Block)
    private readonly blocks: Repository<Block>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** 单向拉黑判断：blocker 是否拉黑了 blocked */
  async isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
    return this.blocks.existsBy({ blockerId, blockedId });
  }

  /** 两人间是否存在拉黑（任一方向）；私聊发送/建会话/拉群时拦截用 */
  async anyBlocked(a: number, b: number): Promise<boolean> {
    if (a === b) return false;
    return this.blocks.exists({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
  }

  /** 与目标用户的拉黑关系状态 */
  async status(meId: number, targetId: number): Promise<BlockStatus> {
    const [blockedByMe, blockedByPeer] = await Promise.all([
      this.isBlocked(meId, targetId),
      this.isBlocked(targetId, meId),
    ]);
    return { blockedByMe, blockedByPeer };
  }

  /** 我的黑名单（分页）：被拉黑用户 + 昵称/头像 + 拉黑时间 */
  async list(meId: number, page = 1, pageSize = 20) {
    const [rows, total] = await this.blocks.findAndCount({
      where: { blockerId: meId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const ids = rows.map((r) => r.blockedId);
    const users = ids.length
      ? await this.users.find({ where: { id: In(ids) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      items: rows.map((r) => {
        const u = userMap.get(r.blockedId);
        return {
          id: r.blockedId,
          nickname: u?.nickname ?? `用户 #${r.blockedId}`,
          avatar: u?.avatar ?? '',
          blockedAt: r.createdAt,
        };
      }),
      total,
    };
  }

  /** 我拉黑的用户 ID 集合（会话列表批量标注） */
  async blockedByMeIds(meId: number): Promise<Set<number>> {
    const rows = await this.blocks.find({
      where: { blockerId: meId },
      select: { blockedId: true },
    });
    return new Set(rows.map((r) => r.blockedId));
  }

  /** 拉黑我的用户 ID 集合（会话列表批量标注） */
  async blockedMeIds(meId: number): Promise<Set<number>> {
    const rows = await this.blocks.find({
      where: { blockedId: meId },
      select: { blockerId: true },
    });
    return new Set(rows.map((r) => r.blockerId));
  }

  /** 批量过滤：userIds 中与我存在拉黑关系（任一方向）的用户 */
  async filterBlockedPairs(meId: number, userIds: number[]): Promise<number[]> {
    if (!userIds.length) return [];
    const rows = await this.blocks.find({
      where: [
        { blockerId: meId, blockedId: In(userIds) },
        { blockerId: In(userIds), blockedId: meId },
      ],
      select: { blockerId: true, blockedId: true },
    });
    const bad = new Set<number>();
    for (const r of rows) {
      bad.add(r.blockerId === meId ? r.blockedId : r.blockerId);
    }
    return userIds.filter((id) => bad.has(id));
  }

  /** 拉黑 / 取消拉黑（幂等），返回最新关系状态 */
  async setBlock(
    meId: number,
    targetId: number,
    blocked: boolean,
  ): Promise<BlockStatus> {
    if (meId === targetId) throw new BadRequestException('不能拉黑自己');
    const target = await this.users.findOneBy({ id: targetId });
    if (!target) throw new NotFoundException('用户不存在');

    if (blocked) {
      try {
        await this.blocks.insert({ blockerId: meId, blockedId: targetId });
      } catch {
        // 已拉黑：唯一约束兜底，忽略重复插入
      }
    } else {
      await this.blocks.delete({ blockerId: meId, blockedId: targetId });
    }
    return this.status(meId, targetId);
  }
}
