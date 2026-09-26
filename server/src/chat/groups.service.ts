import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Group } from './group.entity';
import { GroupMessageDeletion } from './group-message-deletion.entity';
import { GroupMember } from './group-member.entity';
import { GroupMessage } from './group-message.entity';
import { GroupRead } from './group-read.entity';
import { BlocksService } from './blocks.service';
import {
  isValidChatContent,
  messageMediaUrls,
  type MessageContentType,
} from './media.util';
import { MediaCleanupService } from '../uploads/media-cleanup.service';

/** 群聊消息类型归一化 */
function normalizeType(t: string): MessageContentType {
  return t === 'image'
    ? 'image'
    : t === 'voice'
      ? 'voice'
      : t === 'video'
        ? 'video'
        : 'text';
}

/** 群聊服务：建群 / 群列表 / 群消息 / 已读 / 成员 */
@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(GroupMessage)
    private readonly messages: Repository<GroupMessage>,
    @InjectRepository(GroupMessageDeletion)
    private readonly deletions: Repository<GroupMessageDeletion>,
    @InjectRepository(GroupRead)
    private readonly reads: Repository<GroupRead>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly blocks: BlocksService,
    private readonly mediaCleanup: MediaCleanupService,
  ) {}

  // ──── 建群 ────

  async create(ownerId: number, name: string, memberIds: number[]) {
    const unique = [...new Set(memberIds)].filter((id) => id !== ownerId);
    if (unique.length === 0) {
      throw new BadRequestException('请至少选择一名群成员');
    }
    const users = await this.users.findBy({ id: In(unique) });
    if (users.length !== unique.length) {
      throw new BadRequestException('存在无效的群成员');
    }
    if (users.some((u) => u.isBanned)) {
      throw new BadRequestException('存在已被禁用的用户');
    }
    if ((await this.blocks.filterBlockedPairs(ownerId, unique)).length) {
      throw new BadRequestException('存在与你存在拉黑关系的用户，无法创建群聊');
    }

    const group = await this.groups.save(
      this.groups.create({ name: name.trim(), ownerId }),
    );
    await this.members.save(
      this.members.create({
        groupId: group.id,
        userId: ownerId,
        role: 'owner',
      }),
    );
    for (const uid of unique) {
      await this.members.save(
        this.members.create({ groupId: group.id, userId: uid, role: 'member' }),
      );
    }
    return this.formatGroup(group, ownerId, users.length + 1, []);
  }

  // ──── 我的群列表 ────

  async myGroups(userId: number, page = 1, pageSize = 50) {
    const rows = await this.members.findBy({ userId });
    if (!rows.length) return { items: [], total: 0 };
    const groupIds = rows.map((r) => r.groupId);
    const groups = await this.groups.find({
      where: { id: In(groupIds) },
      order: { lastMessageAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const pageIds = groups.map((g) => g.id);
    const [allMembers, allReads] = await Promise.all([
      this.members.find({ where: { groupId: In(pageIds) } }),
      this.reads.find({ where: { groupId: In(pageIds), userId } }),
    ]);
    const memberMap = new Map<number, GroupMember[]>();
    for (const m of allMembers) {
      const list = memberMap.get(m.groupId) ?? [];
      list.push(m);
      memberMap.set(m.groupId, list);
    }
    const readMap = new Map(allReads.map((r) => [r.groupId, r]));

    // 群成员头像（取前 3 位，不含自己）
    const memberIds = [
      ...new Set(allMembers.map((m) => m.userId).filter((id) => id !== userId)),
    ];
    const userMap = new Map(
      (await this.users.find({ where: { id: In(memberIds) } })).map((u) => [
        u.id,
        u,
      ]),
    );

    const items = await Promise.all(
      groups.map(async (g) => {
        const members = memberMap.get(g.id) ?? [];
        const lastRead = readMap.get(g.id);
        const last = Number(lastRead?.lastReadMessageId ?? 0);
        // 未读只统计他人消息：自己发的消息等同已读（与单聊 message_status 语义一致）
        const unread = await this.messages.countBy({
          groupId: g.id,
          senderId: Not(userId),
          ...(last > 0 ? { id: MoreThan(last) } : {}),
        });
        const avatars = members
          .filter((m) => m.userId !== userId)
          .slice(0, 3)
          .map((m) => userMap.get(m.userId)?.avatar ?? '');
        return this.formatGroup(g, userId, members.length, avatars, unread);
      }),
    );
    return { items, total: groupIds.length };
  }

  // ──── 消息 ────

  async getMessages(userId: number, groupId: number, cursor = 0, limit = 50) {
    await this.assertMember(groupId, userId);
    const take = Math.min(Math.max(limit, 1), 100);
    const qb = this.messages
      .createQueryBuilder('m')
      // 已删除（仅对自己隐藏）的群消息不返回
      .leftJoin(
        GroupMessageDeletion,
        'gd',
        'gd.messageId = m.id AND gd.userId = :uid',
        { uid: userId },
      )
      .where('m.groupId = :groupId', { groupId })
      .andWhere('gd.id IS NULL')
      .orderBy('m.id', 'DESC')
      .take(take);
    if (cursor > 0) qb.andWhere('m.id < :cursor', { cursor });
    const rows = await qb.getMany();
    rows.reverse();
    const total = await this.messages.countBy({ groupId });
    const items = rows;
    const nextCursor = rows.length >= take ? (rows[0]?.id ?? null) : null;
    const enriched = await this.enrichMessages(items);
    return { items: enriched, total, nextCursor };
  }

  /** 发群消息：落库 + 更新群预览，返回消息与需要推送的成员 ID */
  async sendMessage(
    userId: number,
    groupId: number,
    contentType: MessageContentType,
    content: string,
    options: { replyToId?: number; forwarded?: boolean } = {},
  ) {
    await this.assertMember(groupId, userId);
    const type = normalizeType(contentType);
    if (!isValidChatContent(type, content)) {
      throw new BadRequestException('消息内容不合法');
    }
    // 引用校验：被引用消息必须属于同一群，并生成快照预览
    let replyPreview: string | null = null;
    if (options.replyToId) {
      const reply = await this.messages.findOneBy({
        id: options.replyToId,
        groupId,
      });
      if (!reply) throw new BadRequestException('被引用的消息不存在');
      replyPreview = GroupsService.previewOf(reply);
    }
    const message = await this.messages.save(
      this.messages.create({
        groupId,
        senderId: userId,
        contentType: type,
        content,
        replyToId: options.replyToId ?? null,
        replyPreview,
        forwarded: options.forwarded ?? false,
      }),
    );
    const preview = GroupsService.previewOf(message);
    await this.groups.update(groupId, {
      lastMessageId: String(message.id),
      lastMessagePreview: preview,
      lastMessageAt: message.createdAt,
    });
    const memberIds = await this.groupMemberIds(groupId);
    const [author] = await this.enrichMessages([message]);
    return {
      message: author,
      memberIds,
      groupId,
    };
  }

  /** 群消息快照预览（引用气泡 / 群列表预览共用） */
  static previewOf(message: GroupMessage): string {
    if (message.recalledAt) return 'recalled:';
    switch (message.contentType) {
      case 'image':
        return 'image:';
      case 'voice':
        return 'voice:';
      case 'video':
        return 'video:';
      default:
        return `text:${message.content.slice(0, 50)}`;
    }
  }

  /** 删除群消息（仅对自己隐藏，对端/群内其他成员不受影响） */
  async deleteGroupMessage(userId: number, groupId: number, messageId: number) {
    await this.assertMember(groupId, userId);
    const message = await this.messages.findOneBy({ id: messageId, groupId });
    if (!message) throw new NotFoundException('消息不存在');
    try {
      await this.deletions.insert({ groupId, messageId, userId });
    } catch {
      // 已删除过（唯一约束冲突）视为成功
    }
    return { ok: true };
  }

  /** 标记已读（游标为群内最大已读消息 id） */
  async markRead(userId: number, groupId: number, lastMessageId: number) {
    await this.assertMember(groupId, userId);
    const existing = await this.reads.findOneBy({ groupId, userId });
    if (existing) {
      if (Number(existing.lastReadMessageId) < lastMessageId) {
        existing.lastReadMessageId = String(lastMessageId);
        await this.reads.save(existing);
      }
    } else {
      await this.reads.save(
        this.reads.create({
          groupId,
          userId,
          lastReadMessageId: String(lastMessageId),
        }),
      );
    }
    return { ok: true };
  }

  // ──── 成员 ────

  /** 群创建后拉人：任意成员均可邀请有效用户入群（跳过已在群内的用户） */
  async addMembers(userId: number, groupId: number, memberIds: number[]) {
    await this.assertMember(groupId, userId);
    const unique = [...new Set(memberIds)].filter((id) => id !== userId);
    if (unique.length === 0) {
      throw new BadRequestException('请选择需要邀请的成员');
    }
    const users = await this.users.findBy({ id: In(unique) });
    if (users.length !== unique.length) {
      throw new BadRequestException('存在无效的群成员');
    }
    if (users.some((u) => u.isBanned)) {
      throw new BadRequestException('存在已被禁用的用户');
    }
    if ((await this.blocks.filterBlockedPairs(userId, unique)).length) {
      throw new BadRequestException('存在与你存在拉黑关系的用户，无法邀请进群');
    }

    const existing = new Set(
      (await this.members.findBy({ groupId })).map((m) => m.userId),
    );
    const fresh = unique.filter((id) => !existing.has(id));
    if (!fresh.length) {
      throw new BadRequestException('所选成员均已在群内');
    }
    for (const uid of fresh) {
      await this.members.save(
        this.members.create({ groupId, userId: uid, role: 'member' }),
      );
    }
    const memberIdsAll = [...existing, ...fresh];
    return { addedCount: fresh.length, memberIds: memberIdsAll };
  }

  /** 退出群聊（群主不能直接退出，需解散群聊） */
  async leave(userId: number, groupId: number) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    if (group.ownerId === userId) {
      throw new BadRequestException(
        '群主不能退出群聊，如需解散请使用「解散群聊」',
      );
    }
    if (!(await this.isMember(groupId, userId))) {
      throw new ForbiddenException('你不是该群成员');
    }
    await this.members.delete({ groupId, userId });
    await this.reads.delete({ groupId, userId });
    return { memberIds: await this.groupMemberIds(groupId) };
  }

  /** 踢人：群主可移出任意成员，管理员可移出普通成员 */
  async kickMember(actorId: number, groupId: number, targetUserId: number) {
    await this.assertManager(groupId, actorId);
    if (targetUserId === actorId) {
      throw new BadRequestException('不能移出自己');
    }
    const target = await this.members.findOneBy({
      groupId,
      userId: targetUserId,
    });
    if (!target) {
      throw new BadRequestException('该用户不是群成员');
    }
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    if (targetUserId === group.ownerId) {
      throw new ForbiddenException('不能移出群主');
    }
    if (target.role === 'admin' && group.ownerId !== actorId) {
      throw new ForbiddenException('不能移出其他管理员');
    }
    await this.members.delete({ groupId, userId: targetUserId });
    await this.reads.delete({ groupId, userId: targetUserId });
    return {
      removedUserId: targetUserId,
      memberIds: await this.groupMemberIds(groupId),
    };
  }

  /** 群主解散群聊（删除群及全部成员/消息/已读记录） */
  async dissolve(ownerId: number, groupId: number) {
    await this.assertOwner(groupId, ownerId);
    return this.dissolveInternal(groupId);
  }

  private async dissolveInternal(groupId: number) {
    const memberIds = await this.groupMemberIds(groupId);
    const messages = await this.messages.find({
      where: { groupId },
      select: { id: true, contentType: true, content: true },
    });
    await this.messages.delete({ groupId });
    await this.reads.delete({ groupId });
    await this.members.delete({ groupId });
    await this.groups.delete({ id: groupId });
    // 群解散后清理媒体文件并刷新 CDN 缓存（尽力而为）
    await this.mediaCleanup.deleteAndPurge(
      messages.flatMap((m) => messageMediaUrls(m.contentType, m.content)),
    );
    return { memberIds };
  }

  // ──── 管理端巡查 ────

  /** 管理端：群聊列表（关键词倒序分页，附带成员数与群主信息） */
  async adminListGroups(
    keyword?: string,
    page = 1,
    pageSize = 20,
  ): Promise<[Array<Record<string, unknown>>, number]> {
    const qb = this.groups
      .createQueryBuilder('g')
      .orderBy('g.lastMessageAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const kw = (keyword ?? '').trim();
    if (kw) qb.andWhere('g.name LIKE :kw', { kw: `%${kw}%` });
    const [groups, total] = await qb.getManyAndCount();
    if (!groups.length) return [[], total];

    const ids = groups.map((g) => g.id);
    const counts = await this.members
      .createQueryBuilder('gm')
      .select('gm.groupId', 'groupId')
      .addSelect('COUNT(*)', 'cnt')
      .where('gm.groupId IN (:...ids)', { ids })
      .groupBy('gm.groupId')
      .getRawMany<{ groupId: string; cnt: string }>();
    const countMap = new Map(
      counts.map((c) => [Number(c.groupId), Number(c.cnt)]),
    );

    const ownerIds = [...new Set(groups.map((g) => g.ownerId))];
    const owners = await this.users.find({ where: { id: In(ownerIds) } });
    const ownerMap = new Map(owners.map((u) => [u.id, u]));

    return [
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        ownerId: g.ownerId,
        owner: ownerMap.has(g.ownerId)
          ? {
              id: g.ownerId,
              username: ownerMap.get(g.ownerId)!.username,
              nickname: ownerMap.get(g.ownerId)!.nickname,
            }
          : null,
        memberCount: countMap.get(g.id) ?? 0,
        lastMessagePreview: g.lastMessagePreview,
        lastMessageAt: g.lastMessageAt,
        createdAt: g.createdAt,
      })),
      total,
    ];
  }

  /** 管理端：解散任意群聊（无需群主身份） */
  async adminDissolve(groupId: number): Promise<{ memberIds: number[] }> {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    return this.dissolveInternal(groupId);
  }

  /** 管理端：搜索群消息（关键词倒序分页，附带发送人信息） */
  async adminSearchGroupMessages(
    keyword?: string,
    page = 1,
    pageSize = 20,
  ): Promise<
    [
      Array<
        GroupMessage & {
          sender: { id: number; username: string | null; nickname: string };
        }
      >,
      number,
    ]
  > {
    const qb = this.messages
      .createQueryBuilder('m')
      .orderBy('m.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const kw = (keyword ?? '').trim();
    if (kw) qb.andWhere('m.content LIKE :kw', { kw: `%${kw}%` });
    const [rows, total] = await qb.getManyAndCount();
    const senderIds = [
      ...new Set(
        rows.map((m) => m.senderId).filter((id): id is number => id != null),
      ),
    ];
    const senders = await this.users.find({ where: { id: In(senderIds) } });
    const map = new Map(senders.map((u) => [u.id, u]));
    const items = rows.map((m) => ({
      ...m,
      sender: map.has(m.senderId)
        ? {
            id: m.senderId,
            username: map.get(m.senderId)!.username,
            nickname: map.get(m.senderId)!.nickname,
          }
        : { id: m.senderId, username: null, nickname: `用户 #${m.senderId}` },
    }));
    return [items, total];
  }

  /** 管理端：撤回群消息（对全体成员立即不可见） */
  async adminRecallGroupMessage(messageId: number): Promise<{ ok: true }> {
    const message = await this.messages.findOneBy({ id: messageId });
    if (!message) throw new NotFoundException('消息不存在');
    await this.messages.update(messageId, { recalledAt: new Date() });
    return { ok: true };
  }

  /** 群主修改群名称 */
  async rename(ownerId: number, groupId: number, name: string) {
    await this.assertOwner(groupId, ownerId);
    await this.groups.update(groupId, { name: name.trim() });
    return { memberIds: await this.groupMemberIds(groupId) };
  }

  /** 群主设置 / 取消管理员 */
  async setRole(
    ownerId: number,
    groupId: number,
    targetUserId: number,
    role: 'admin' | 'member',
  ) {
    await this.assertOwner(groupId, ownerId);
    if (targetUserId === ownerId) {
      throw new BadRequestException('不能修改群主的角色');
    }
    const member = await this.members.findOneBy({
      groupId,
      userId: targetUserId,
    });
    if (!member) {
      throw new BadRequestException('该用户不是群成员');
    }
    if (member.role === 'owner') {
      throw new BadRequestException('不能修改群主的角色');
    }
    member.role = role;
    await this.members.save(member);
    return { memberIds: await this.groupMemberIds(groupId) };
  }

  /** 群主转让：原群主转为普通成员 */
  async transferOwner(ownerId: number, groupId: number, newOwnerId: number) {
    await this.assertOwner(groupId, ownerId);
    if (newOwnerId === ownerId) {
      throw new BadRequestException('不能转让给自己');
    }
    const target = await this.members.findOneBy({
      groupId,
      userId: newOwnerId,
    });
    if (!target) {
      throw new BadRequestException('该用户不是群成员');
    }
    await this.groups.update(groupId, { ownerId: newOwnerId });
    const current = await this.members.findOneBy({ groupId, userId: ownerId });
    if (current) {
      current.role = 'member';
      await this.members.save(current);
    }
    target.role = 'owner';
    await this.members.save(target);
    return { memberIds: await this.groupMemberIds(groupId) };
  }

  async listMembers(groupId: number, viewerId?: number) {
    if (viewerId != null) await this.assertMember(groupId, viewerId);
    const rows = await this.members.findBy({ groupId });
    const ids = rows.map((r) => r.userId);
    if (!ids.length) return [];
    const group = await this.groups.findOneBy({ id: groupId });
    const roleByUser = new Map<number, string>();
    for (const r of rows) {
      roleByUser.set(r.userId, r.role ?? 'member');
    }
    // 兼容历史数据：群主行即使未写入角色也标记为 owner
    if (group) roleByUser.set(group.ownerId, 'owner');
    const users = await this.users.find({ where: { id: In(ids) } });
    const map = new Map(users.map((u) => [u.id, u]));
    return ids
      .filter((id) => map.has(id))
      .map((id) => {
        const u = map.get(id)!;
        return {
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          role: roleByUser.get(u.id) ?? 'member',
        };
      });
  }

  async groupMemberIds(groupId: number): Promise<number[]> {
    const rows = await this.members.find({
      where: { groupId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async isMember(groupId: number, userId: number): Promise<boolean> {
    return this.members.existsBy({ groupId, userId });
  }

  private async assertMember(groupId: number, userId: number) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    if (!(await this.isMember(groupId, userId))) {
      throw new ForbiddenException('你不是该群成员');
    }
  }

  private async assertOwner(groupId: number, userId: number) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    if (group.ownerId !== userId) {
      throw new ForbiddenException('仅群主可执行该操作');
    }
  }

  private async assertManager(groupId: number, userId: number) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('群聊不存在');
    if (group.ownerId === userId) return;
    const member = await this.members.findOneBy({ groupId, userId });
    if (!member) throw new ForbiddenException('你不是该群成员');
    if (member.role !== 'admin') {
      throw new ForbiddenException('仅群主和管理员可执行该操作');
    }
  }

  // ──── 组装 ────

  private formatGroup(
    group: Group,
    viewerId: number,
    memberCount: number,
    memberAvatars: string[],
    unreadCount = 0,
  ) {
    return {
      id: group.id,
      name: group.name,
      ownerId: group.ownerId,
      memberCount,
      memberAvatars,
      lastMessagePreview: group.lastMessagePreview,
      lastMessageAt: group.lastMessageAt,
      unreadCount,
      isOwner: group.ownerId === viewerId,
      createdAt: group.createdAt,
    };
  }

  /** 群消息附加发送者信息 */
  private async enrichMessages(items: GroupMessage[]) {
    if (!items.length) return items;
    const ids = [...new Set(items.map((m) => m.senderId))];
    const users = await this.users.find({
      where: { id: In(ids) },
      select: { id: true, nickname: true, avatar: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return items.map((m) => ({
      ...m,
      author: map.get(m.senderId)
        ? {
            id: m.senderId,
            nickname: map.get(m.senderId)!.nickname,
            avatar: map.get(m.senderId)!.avatar,
          }
        : { id: m.senderId, nickname: `用户 #${m.senderId}`, avatar: '' },
    }));
  }
}
