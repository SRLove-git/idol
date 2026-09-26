import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Follow } from './follow.entity';
import { Notification } from '../notifications/notification.entity';

/** 关注关系查询结果 */
export interface FollowStatus {
  user: { id: number; nickname: string; avatar: string };
  /** 我是否关注了对方 */
  following: boolean;
  /** 对方是否关注了我 */
  followedMe: boolean;
  /** 是否互相关注 */
  mutual: boolean;
  followerCount: number;
  followingCount: number;
}

/** 关注列表条目：用户信息 + 与我的关系 */
export interface FollowListItem {
  id: number;
  nickname: string;
  avatar: string;
  /** 我是否关注了对方 */
  following: boolean;
  /** 对方是否关注了我 */
  followedMe: boolean;
  /** 是否互相关注 */
  mutual: boolean;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly follows: Repository<Follow>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    private readonly users: UsersService,
  ) {}

  /** 两人是否互相关注（聊天不受限的前置条件） */
  async isMutual(a: number, b: number): Promise<boolean> {
    if (a === b) return true;
    const rows = await this.follows.find({
      where: [
        { followerId: a, followeeId: b },
        { followerId: b, followeeId: a },
      ],
      select: { id: true },
    });
    return rows.length === 2;
  }

  /** 当前用户与目标用户的关注关系 + 目标粉丝/关注数 */
  async status(meId: number, targetId: number): Promise<FollowStatus> {
    const user = await this.users.findById(targetId);
    if (!user) throw new NotFoundException('用户不存在');

    const [following, followedMe] = await Promise.all([
      this.follows.existsBy({ followerId: meId, followeeId: targetId }),
      this.follows.existsBy({ followerId: targetId, followeeId: meId }),
    ]);
    const [followerCount, followingCount] = await Promise.all([
      this.follows.count({ where: { followeeId: targetId } }),
      this.follows.count({ where: { followerId: targetId } }),
    ]);
    return {
      user: { id: user.id, nickname: user.nickname, avatar: user.avatar },
      following,
      followedMe,
      mutual: following && followedMe,
      followerCount,
      followingCount,
    };
  }

  /** 我关注的人（发起群聊选人用） */
  async followingList(
    userId: number,
  ): Promise<Array<{ id: number; nickname: string; avatar: string }>> {
    const rows = await this.follows.find({
      where: { followerId: userId },
      order: { createdAt: 'DESC' },
    });
    const ids = rows.map((r) => r.followeeId);
    if (!ids.length) return [];
    const users = await this.users.findByIds(ids);
    return users.map((u) => ({
      id: u.id,
      nickname: u.nickname || `用户 #${u.id}`,
      avatar: u.avatar,
    }));
  }

  /** 某用户的粉丝列表（谁关注了 targetId），分页 + 我与对方的关系 */
  async followers(
    targetId: number,
    meId: number,
    page = 1,
    pageSize = 20,
  ): Promise<[FollowListItem[], number]> {
    const [rows, total] = await this.follows.findAndCount({
      where: { followeeId: targetId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const ids = rows.map((r) => r.followerId);
    const items = await this.buildItems(ids, meId);
    return [items, total];
  }

  /** 某用户的关注列表（targetId 关注了谁），分页 + 我与对方的关系 */
  async followingFor(
    targetId: number,
    meId: number,
    page = 1,
    pageSize = 20,
  ): Promise<[FollowListItem[], number]> {
    const [rows, total] = await this.follows.findAndCount({
      where: { followerId: targetId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const ids = rows.map((r) => r.followeeId);
    const items = await this.buildItems(ids, meId);
    return [items, total];
  }

  /** 组装列表条目：批量查用户 + 批量查我与各用户的关系 */
  private async buildItems(
    userIds: number[],
    meId: number,
  ): Promise<FollowListItem[]> {
    if (!userIds.length) return [];
    const users = await this.users.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const [iFollow, followMe] = await Promise.all([
      this.follows.find({
        where: { followerId: meId, followeeId: In(userIds) },
        select: { followeeId: true },
      }),
      this.follows.find({
        where: { followerId: In(userIds), followeeId: meId },
        select: { followerId: true },
      }),
    ]);
    const iFollowSet = new Set(iFollow.map((r) => r.followeeId));
    const followMeSet = new Set(followMe.map((r) => r.followerId));

    return userIds
      .map((id) => {
        const user = userMap.get(id);
        if (!user) return null;
        const following = iFollowSet.has(id);
        const followedMe = followMeSet.has(id);
        return {
          id: user.id,
          nickname: user.nickname || `用户 #${user.id}`,
          avatar: user.avatar,
          following,
          followedMe,
          mutual: following && followedMe,
        };
      })
      .filter((x): x is FollowListItem => x !== null);
  }

  /** 设置关注/取消关注（幂等），返回最新状态 */
  async setFollow(
    meId: number,
    targetId: number,
    following: boolean,
  ): Promise<FollowStatus> {
    if (meId === targetId) throw new BadRequestException('不能关注自己');
    const user = await this.users.findById(targetId);
    if (!user) throw new NotFoundException('用户不存在');

    if (following) {
      try {
        await this.follows.insert({ followerId: meId, followeeId: targetId });
        // 关注成功后通知对方（自己不能关注自己，前面已拦截）
        try {
          const me = await this.users.findById(meId);
          const nickname = me?.nickname ?? `用户 #${meId}`;
          const notification = this.notifications.create({
            title: `${nickname} 关注了你`,
            content: '快去 TA 的主页看看吧',
            titleEn: `${nickname} followed you`,
            contentEn: 'Check out their profile.',
            category: 'follow',
            targetType: 'user',
            targetUserIds: String(targetId),
            actionType: 'user',
            actionId: meId,
            channels: 'push',
            sent: true,
            sentAt: new Date(),
          });
          await this.notifications.save(notification);
        } catch {
          // 通知失败不阻断关注
        }
      } catch {
        // 已关注：唯一约束兜底，忽略重复插入
      }
    } else {
      await this.follows.delete({ followerId: meId, followeeId: targetId });
    }
    return this.status(meId, targetId);
  }
}
