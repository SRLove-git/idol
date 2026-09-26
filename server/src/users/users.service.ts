import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { In, IsNull, Like, Repository } from 'typeorm';
import { FORCE_OFFLINE_TTL, kickKey } from '../auth/session-keys';
import { publishKickEvent } from '../chat/chat-events';
import { messageMediaUrls } from '../chat/media.util';
import { maskEmail } from '../common/security.util';
import { REDIS_CLIENT } from '../redis/redis.module';
import { MediaCleanupService } from '../uploads/media-cleanup.service';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentTable } from '../appointments/appointment-table.entity';
import { Conversation } from '../chat/conversation.entity';
import { Group } from '../chat/group.entity';
import { GroupMember } from '../chat/group-member.entity';
import { GroupMessage } from '../chat/group-message.entity';
import { GroupMessageDeletion } from '../chat/group-message-deletion.entity';
import { GroupRead } from '../chat/group-read.entity';
import { Message } from '../chat/message.entity';
import { MessageStatus } from '../chat/message_status.entity';
import { Collection } from '../community/collection.entity';
import { Comment as PostComment } from '../community/comment.entity';
import { Like as PostLike } from '../community/like.entity';
import { Post } from '../community/post.entity';
import { Follow } from '../follows/follow.entity';
import { Membership } from '../members/membership.entity';
import { MemberOrder } from '../members/member-order.entity';
import { UserCoupon } from '../members/coupon.entity';
import { NotificationRead } from '../notifications/notification-read.entity';
import { Video } from '../videos/video.entity';
import { VideoComment } from '../videos/video-comment.entity';
import { VideoLike } from '../videos/video-like.entity';
import { History } from './history.entity';
import { User } from './user.entity';

/** 管理端展示用安全用户：不含密码哈希 */
export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  /** 用户名一年内只能修改一次 */
  private static readonly USERNAME_CHANGE_INTERVAL_MS =
    365 * 24 * 60 * 60 * 1000;

  /** FULLTEXT 索引可用性（迁移建立；dev synchronize 会忽略/删除，需探测后回退 LIKE） */
  private fulltextReady: boolean | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly postLikes: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly postComments: Repository<PostComment>,
    @InjectRepository(Collection)
    private readonly collections: Repository<Collection>,
    @InjectRepository(History) private readonly history: Repository<History>,
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(VideoLike)
    private readonly videoLikes: Repository<VideoLike>,
    @InjectRepository(VideoComment)
    private readonly videoComments: Repository<VideoComment>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(NotificationRead)
    private readonly notificationReads: Repository<NotificationRead>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(UserCoupon)
    private readonly userCoupons: Repository<UserCoupon>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(AppointmentTable)
    private readonly appointmentTables: Repository<AppointmentTable>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(MessageStatus)
    private readonly messageStatuses: Repository<MessageStatus>,
    @InjectRepository(Group) private readonly groups: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMembers: Repository<GroupMember>,
    @InjectRepository(GroupMessage)
    private readonly groupMessages: Repository<GroupMessage>,
    @InjectRepository(GroupRead)
    private readonly groupReads: Repository<GroupRead>,
    @InjectRepository(GroupMessageDeletion)
    private readonly groupMessageDeletions: Repository<GroupMessageDeletion>,
    @InjectRepository(MemberOrder)
    private readonly memberOrders: Repository<MemberOrder>,
    private readonly mediaCleanup: MediaCleanupService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }

  /** 旧版手机号体系遗留的管理员（无用户名），迁移时补全用户名用 */
  findLegacyAdmin(): Promise<User | null> {
    return this.users.findOne({
      where: { role: 'admin', username: IsNull() },
      order: { id: 'ASC' },
    });
  }

  /** 按用户名或邮箱查找（登录用），两者均可登录 */
  async findByUsernameOrEmail(account: string): Promise<User | null> {
    const keyword = (account ?? '').trim();
    if (!keyword) return null;
    return this.users.findOne({
      where: [{ username: keyword }, { email: keyword.toLowerCase() }],
    });
  }

  /** 按用户名查用户，不存在则创建（预置演示作者用，并发下靠唯一约束兜底） */
  async findByUsernameOrCreate(data: {
    username: string;
    email: string;
    nickname: string;
    avatar: string;
  }): Promise<User> {
    const existing = await this.findByUsername(data.username);
    if (existing) return existing;
    try {
      return await this.create(data);
    } catch {
      const again = await this.findByUsername(data.username);
      if (again) return again;
      throw new Error('用户创建失败');
    }
  }

  /** 按用户名搜索用户（添加好友/社区找人用）：精确匹配，排除被封禁账号 */
  async searchByUsername(username: string): Promise<
    Array<{
      id: number;
      nickname: string;
      avatar: string;
      username: string;
      email: string;
    }>
  > {
    const keyword = (username ?? '').trim();
    if (!keyword) return [];
    const user = await this.users.findOneBy({
      username: keyword,
      isBanned: false,
    });
    if (!user) return [];
    return [
      {
        id: user.id,
        nickname: user.nickname || `用户 #${user.id}`,
        avatar: user.avatar,
        username: user.username ?? '',
        email: maskEmail(user.email) ?? '',
      },
    ];
  }

  /** 管理端：按用户名/邮箱/昵称模糊搜索用户（订单按用户筛选用） */
  async findByKeyword(keyword: string): Promise<SafeUser[]> {
    const kw = (keyword ?? '').trim();
    if (!kw) return [];
    // 中文搜索走 FULLTEXT（ngram 分词，最小单元为 2，单字无法命中）；
    // 英文/单字回退 LIKE：username/email 前缀匹配可命中唯一索引，nickname 子串兜底
    if (
      /[\u4e00-\u9fff]/.test(kw) &&
      kw.length >= 2 &&
      (await this.isFulltextReady())
    ) {
      const rows = await this.users
        .createQueryBuilder('u')
        .where(
          'MATCH(u.username, u.email, u.nickname) AGAINST (:kw IN BOOLEAN MODE)',
          { kw },
        )
        .take(200)
        .getMany();
      if (rows.length) return rows;
    }
    const rows = await this.users.find({
      where: [
        { username: Like(`${kw}%`) },
        { email: Like(`${kw}%`) },
        { nickname: Like(`${kw}%`) },
      ],
      take: 200,
    });
    // 脱敏：管理端列表/搜索不暴露完整邮箱与密码哈希
    return rows.map((u) => UsersService.toSafeUser(u));
  }

  /** 探测 ft_users_search 全文索引是否存在（结果进程内缓存） */
  private async isFulltextReady(): Promise<boolean> {
    if (this.fulltextReady == null) {
      try {
        const rows = await this.users.manager.query<Array<unknown>>(
          `SELECT 1 FROM information_schema.statistics
           WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'ft_users_search'
           LIMIT 1`,
        );
        this.fulltextReady = rows.length > 0;
      } catch {
        this.fulltextReady = false;
      }
    }
    return this.fulltextReady;
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /**
   * 当前登录用户本人资料：剔除密码哈希，保留完整邮箱（本人可见）。
   * 与 findById 的区别：findById 返回完整实体（含 passwordHash），仅供内部校验使用，
   * 任何对外响应都必须走本方法或 toSafeUser。
   */
  findSafeById(id: number): Promise<SafeUser | null> {
    return this.users
      .findOneBy({ id })
      .then((u) => (u ? UsersService.toSafeSelf(u) : null));
  }

  /** 批量按 ID 查用户 */
  findByIds(ids: number[]): Promise<User[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.users.find({ where: { id: In(ids) } });
  }

  /** 同一设备（MAC/安装ID）已注册账号数：限制单设备最多 3 个账号 */
  countByDeviceId(deviceId: string): Promise<number> {
    return this.users.countBy({ deviceId });
  }

  create(data: Partial<User>): Promise<User> {
    return this.users.save(this.users.create(data));
  }

  /** 更新个人资料：昵称 / 用户名 / 头像 / 简介 / 性别 / 生日 / 所在地。
   *  用户名去空格并做唯一校验，空串视为未设置；其他文本字段统一 trim。 */
  async updateProfile(
    id: number,
    patch: {
      nickname?: string;
      username?: string;
      avatar?: string;
      bio?: string;
      gender?: 'male' | 'female' | 'secret';
      birthday?: string;
      location?: string;
    },
  ) {
    const user = await this.users.findOneBy({ id });
    const oldAvatar = user?.avatar ?? '';
    const data: Record<string, unknown> = {};
    if (patch.nickname !== undefined) data.nickname = patch.nickname.trim();
    if (patch.avatar !== undefined) data.avatar = patch.avatar;
    if (patch.bio !== undefined) data.bio = patch.bio.trim();
    if (patch.gender !== undefined) data.gender = patch.gender;
    if (patch.birthday !== undefined) data.birthday = patch.birthday || null;
    if (patch.location !== undefined) data.location = patch.location.trim();
    if (patch.username !== undefined) {
      const username = patch.username.trim();
      if (username && username.length < 2) {
        throw new BadRequestException('用户名至少 2 位');
      }
      const next = username || null;
      if (next) {
        const taken = await this.users.findOneBy({ username: next });
        if (taken && taken.id !== id) {
          throw new ConflictException('用户名已被占用');
        }
      }
      const current = user?.username ?? null;
      if (next !== current) {
        data.username = next;
        data.usernameUpdatedAt = this.resolveUsernameChange(
          user,
          current,
          next,
        );
      }
    }
    const updated = await this.users.update({ id }, data);
    // 头像替换成功后删除旧头像并刷新 CDN 缓存（尽力而为）
    if (patch.avatar !== undefined && oldAvatar && oldAvatar !== patch.avatar) {
      await this.mediaCleanup.deleteAndPurge([oldAvatar]);
    }
    return updated;
  }

  setPasswordHash(id: number, hash: string) {
    return this.users.update({ id }, { passwordHash: hash });
  }

  /** 管理端展示用安全副本：剔除密码哈希，邮箱脱敏 */
  private static toSafeUser(u: User) {
    const safe = { ...UsersService.toSafeSelf(u) };
    safe.email = maskEmail(u.email);
    return safe;
  }

  /** 本人资料安全副本：仅剔除密码哈希，邮箱保持原样 */
  private static toSafeSelf(u: User): SafeUser {
    const safe: SafeUser = { ...u };
    // SafeUser 类型上不存在 passwordHash，先以可选形状供 delete 移除
    delete (safe as { passwordHash?: string | null }).passwordHash;
    return safe;
  }

  /** 设置用户名（首次设置不限；修改需距上次修改满一年，用于设置密码时一并写入） */
  async setUsername(id: number, username: string) {
    const user = await this.users.findOneBy({ id });
    const next = (username ?? '').trim() || null;
    const current = user?.username ?? null;
    const data: Record<string, unknown> = { username: next };
    if (next !== current) {
      data.usernameUpdatedAt = this.resolveUsernameChange(user, current, next);
    }
    return this.users.update({ id }, data);
  }

  /**
   * 校验“用户名一年内只能修改一次”：首次设置不受限；
   * 与当前值相同返回 null（不刷新修改时间），否则返回本次修改时间。
   */
  private resolveUsernameChange(
    user: User | null,
    current: string | null,
    next: string | null,
  ): Date | null {
    if (next === current) return null;
    const lastChangedAt = user?.usernameUpdatedAt;
    if (lastChangedAt) {
      const elapsed = Date.now() - new Date(lastChangedAt).getTime();
      if (elapsed < UsersService.USERNAME_CHANGE_INTERVAL_MS) {
        throw new BadRequestException('用户名一年内只能修改一次');
      }
    }
    return new Date();
  }

  setRole(id: number, role: 'admin' | 'user') {
    return this.users.update({ id }, { role });
  }

  /** 设置管理端角色（仅 role=admin 的管理员账号有意义） */
  async setAdminRole(id: number, adminRole: User['adminRole']): Promise<void> {
    await this.users.update({ id }, { adminRole });
  }

  /** 管理端：用户列表（分页，可选用户名/邮箱/昵称搜索） */
  async findAll(
    page = 1,
    search?: string,
    pageSize = 20,
  ): Promise<[SafeUser[], number]> {
    const keyword = (search ?? '').trim();
    if (keyword) {
      // 与会员/预约管理端一致：走 findByKeyword（中文 FULLTEXT / 英文前缀 LIKE）
      const matched = await this.findByKeyword(keyword);
      if (!matched.length) return [[], 0];
      const [rows, total] = await this.users.findAndCount({
        where: { id: In(matched.map((u) => u.id)) },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return [rows.map((u) => UsersService.toSafeUser(u)), total];
    }
    const [rows, total] = await this.users.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return [rows.map((u) => UsersService.toSafeUser(u)), total];
  }

  /** 管理端：封禁/解封用户（封禁时同时强制下线，解封时清除下线标记） */
  async toggleBan(id: number, isBanned: boolean): Promise<SafeUser> {
    await this.users.update({ id }, { isBanned });
    if (isBanned) {
      await this.redis.set(kickKey(id), '1', 'EX', FORCE_OFFLINE_TTL);
      publishKickEvent(this.redis, id, 'banned');
    } else {
      await this.redis.del(kickKey(id));
    }
    const user = await this.users.findOneBy({ id });
    return user ? UsersService.toSafeUser(user) : (null as unknown as SafeUser);
  }

  /** 管理端：强制下线（立即使该用户全部现有会话失效，用户可重新登录） */
  async forceOffline(userId: number): Promise<void> {
    await this.redis.set(kickKey(userId), '1', 'EX', FORCE_OFFLINE_TTL);
    publishKickEvent(this.redis, userId, 'forced_offline');
  }

  /** 管理端：物理删除某用户的全部作品（社区帖子 + 短视频/照片，含关联互动数据） */
  async deleteWorks(
    userId: number,
  ): Promise<{ posts: number; videos: number }> {
    const posts = await this.posts.find({
      where: { userId },
      select: { id: true, images: true, medias: true },
    });
    const videos = await this.videos.find({
      where: { userId },
      select: { id: true, videoUrl: true, cover: true, photos: true },
    });
    const postIds = posts.map((p) => p.id);
    const videoIds = videos.map((v) => v.id);

    if (postIds.length) {
      await Promise.all([
        this.postLikes.delete({ postId: In(postIds) }),
        this.postComments.delete({ postId: In(postIds) }),
        this.collections.delete({ postId: In(postIds) }),
        this.history.delete({ postId: In(postIds) }),
      ]);
      await this.posts.delete(postIds);
    }
    if (videoIds.length) {
      await Promise.all([
        this.videoLikes.delete({ videoId: In(videoIds) }),
        this.videoComments.delete({ videoId: In(videoIds) }),
      ]);
      await this.videos.delete(videoIds);
    }
    // 作品删除后清理存储对象并刷新 CDN 缓存（尽力而为）
    const urls = [
      ...posts.flatMap((p) => [
        ...(p.images ?? []),
        ...(p.medias?.map((m) => m.url) ?? []),
      ]),
      ...videos.flatMap((v) => [v.videoUrl, v.cover, ...(v.photos ?? [])]),
    ];
    await this.mediaCleanup.deleteAndPurge(urls);
    return { posts: postIds.length, videos: videoIds.length };
  }

  /** 管理端：物理删除用户（含作品、互动、关注、会员、预约、聊天等全部关联数据） */
  async remove(userId: number): Promise<{ posts: number; videos: number }> {
    // 删除账号前先令其现有会话失效并踢线，避免旧 token 继续访问
    await this.redis.set(kickKey(userId), '1', 'EX', FORCE_OFFLINE_TTL);
    publishKickEvent(this.redis, userId, 'forced_offline');

    // 1. 先删除该用户发布的全部作品及互动数据
    const { posts, videos } = await this.deleteWorks(userId);

    // 2. 预约桌位关联（一单多桌）需先取预约单 ID，避免删预约后留孤儿行
    const appointmentIds = (
      await this.appointments.find({
        where: { userId },
        select: { id: true },
      })
    ).map((a) => a.id);

    // 3. 用户产生的互动/浏览/预约/会员/关注等记录
    await Promise.all([
      this.postLikes.delete({ userId }),
      this.postComments.delete({ userId }),
      this.collections.delete({ userId }),
      this.history.delete({ userId }),
      this.videoLikes.delete({ userId }),
      this.videoComments.delete({ userId }),
      this.follows.delete([{ followerId: userId }, { followeeId: userId }]),
      this.memberships.delete({ userId }),
      this.memberOrders.delete({ userId }),
      this.userCoupons.delete({ userId }),
      this.notificationReads.delete({ userId }),
      ...(appointmentIds.length
        ? [
            this.appointmentTables.delete({
              appointmentId: In(appointmentIds),
            }),
          ]
        : []),
      this.appointments.delete({ userId }),
    ]);

    // 3. 聊天数据：用户参与的私聊、发送的消息，以及其创建的群聊
    const conversationIds = (
      await this.conversations.find({
        where: [{ userAId: userId }, { userBId: userId }],
        select: { id: true },
      })
    ).map((c) => c.id);
    const groupIds = (
      await this.groups.find({
        where: { ownerId: userId },
        select: { id: true },
      })
    ).map((g) => g.id);

    // 聊天媒体文件：删库前先取出内容，删除后统一清理存储对象
    const chatMediaMessages = await this.messages.find({
      where: [
        { senderId: userId },
        ...(conversationIds.length
          ? [{ conversationId: In(conversationIds) }]
          : []),
      ],
      select: { id: true, contentType: true, content: true },
    });
    const groupMediaMessages = await this.groupMessages.find({
      where: [
        { senderId: userId },
        ...(groupIds.length ? [{ groupId: In(groupIds) }] : []),
      ],
      select: { id: true, contentType: true, content: true },
    });

    if (conversationIds.length) {
      const messageIds = (
        await this.messages.find({
          where: { conversationId: In(conversationIds) },
          select: { id: true },
        })
      ).map((m) => m.id);
      await Promise.all([
        this.messageStatuses.delete([
          { userId },
          ...(messageIds.length ? [{ messageId: In(messageIds) }] : []),
        ]),
        this.messages.delete({ senderId: userId }),
        this.messages.delete({ conversationId: In(conversationIds) }),
        this.conversations.delete(conversationIds),
      ]);
    } else {
      await Promise.all([
        this.messageStatuses.delete({ userId }),
        this.messages.delete({ senderId: userId }),
      ]);
    }

    if (groupIds.length) {
      await Promise.all([
        this.groupMessageDeletions.delete({ groupId: In(groupIds) }),
        this.groupReads.delete({ groupId: In(groupIds) }),
        this.groupMessages.delete({ groupId: In(groupIds) }),
        this.groupMembers.delete({ groupId: In(groupIds) }),
        this.groups.delete(groupIds),
      ]);
    }
    await Promise.all([
      this.groupMembers.delete({ userId }),
      this.groupReads.delete({ userId }),
      this.groupMessageDeletions.delete({ userId }),
      this.groupMessages.delete({ senderId: userId }),
    ]);

    // 4. 清理聊天媒体文件（尽力而为）
    const chatUrls = [...chatMediaMessages, ...groupMediaMessages].flatMap(
      (m) => messageMediaUrls(m.contentType, m.content),
    );
    await this.mediaCleanup.deleteAndPurge(chatUrls);

    // 5. 删除用户账号
    await this.users.delete({ id: userId });
    return { posts, videos };
  }
}
