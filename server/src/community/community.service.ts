import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';

import { Post } from './post.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { Collection } from './collection.entity';
import { Follow } from '../follows/follow.entity';
import { History } from '../users/history.entity';
import { User } from '../users/user.entity';
import { Video } from '../videos/video.entity';
import { FeedCacheService } from '../common/feed-cache.service';
import { CreatePostDto, UpdatePostStatusDto } from './post.dto';
import { CreateCommentDto } from './comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ModerationService } from '../moderation/moderation.service';
import { MediaCleanupService } from '../uploads/media-cleanup.service';
import type { NotificationCategory } from '../notifications/notification.entity';

/** 作者简要信息（嵌入列表响应中，避免 N+1 查询） */
export interface AuthorInfo {
  nickname: string;
  avatar: string;
}

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Post)
    private readonly posts: Repository<Post>,
    @InjectRepository(Like)
    private readonly likes: Repository<Like>,
    @InjectRepository(Comment)
    private readonly comments: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly commentLikes: Repository<CommentLike>,
    @InjectRepository(Collection)
    private readonly collections: Repository<Collection>,
    @InjectRepository(Video)
    private readonly videos: Repository<Video>,
    @InjectRepository(Follow)
    private readonly follows: Repository<Follow>,
    @InjectRepository(History)
    private readonly histories: Repository<History>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly feedCache: FeedCacheService,
    private readonly notifications: NotificationsService,
    private readonly moderation: ModerationService,
    private readonly mediaCleanup: MediaCleanupService,
  ) {}

  /** 发送互动通知（失败不影响主流程），仅通知内容作者本人且跳过自己给自己发 */
  private async notifyInteraction(params: {
    actorId: number;
    ownerId: number;
    title: string;
    content: string;
    titleEn: string;
    contentEn: string;
    category: NotificationCategory;
    actionType: 'post' | 'video' | 'user';
    actionId: number;
  }): Promise<void> {
    const {
      actorId,
      ownerId,
      title,
      content,
      titleEn,
      contentEn,
      category,
      actionType,
      actionId,
    } = params;
    if (actorId === ownerId) return;
    try {
      await this.notifications.createAndSend({
        title,
        content,
        titleEn,
        contentEn,
        category,
        targetType: 'user',
        targetUserIds: String(ownerId),
        actionType,
        actionId,
      });
    } catch {
      // 通知失败不阻断点赞/评论/收藏等主操作
    }
  }

  // ──── Helpers ────

  /** 批量查询作者信息，返回 userId → AuthorInfo 映射 */
  private async resolveAuthors(
    userIds: number[],
  ): Promise<Map<number, AuthorInfo>> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map();
    const users = await this.users.find({
      where: { id: In(unique) },
      select: { id: true, nickname: true, avatar: true },
    });
    return new Map(
      users.map((u) => [u.id, { nickname: u.nickname, avatar: u.avatar }]),
    );
  }

  /** 将 Post 实体 + 作者信息合并为客户端友好的格式 */
  private enrichPost(post: Post, author?: AuthorInfo) {
    return {
      ...post,
      author: author ?? { nickname: `用户 #${post.userId}`, avatar: '' },
    };
  }

  /** 发布作品：内容机审 → 标记 pending，等待人工复核 */
  async create(userId: number, dto: CreatePostDto): Promise<Post> {
    const blocked = await this.moderation.findBlocked(dto.content ?? '');
    if (blocked) {
      throw new BadRequestException(
        `内容包含违规关键词「${blocked}」，请修改后发布`,
      );
    }

    const post = this.posts.create({
      userId,
      title: dto.title ?? '',
      content: dto.content,
      images: dto.images ?? [],
      medias: dto.medias ?? [],
      tags: dto.tags ?? [],
      channelTag: dto.channelTag ?? '',
      location: dto.location ?? '',
      status: 'approved',
    });
    const saved = await this.posts.save(post);
    // 新作品立即可见：版本 +1 使共享 feed 缓存立即失效
    await this.feedCache.bumpContentVersion();
    return saved;
  }

  /** 信息流：最新（按创建时间倒序），仅展示已通过作品，含作者信息 */
  async listLatest(page = 1, pageSize = 20, q = '', channel = '') {
    // 搜索词不缓存：结果因人而异且 key 随关键词无限膨胀
    const cacheable = !(q ?? '').trim();
    if (cacheable) {
      const cached = await this.feedCache.get<{
        items: Array<Record<string, unknown>>;
        total: number;
      }>('post-latest', page, pageSize, channel);
      if (cached) return [cached.items, cached.total];
    }

    const [posts, total] = await this.feedQuery(
      { createdAt: 'DESC' },
      page,
      pageSize,
      q,
      channel,
    ).getManyAndCount();

    const userIds = posts.map((p) => p.userId);
    const authors = await this.resolveAuthors(userIds);
    const items = posts.map((p) => this.enrichPost(p, authors.get(p.userId)));

    if (cacheable) {
      await this.feedCache.set('post-latest', page, pageSize, channel, {
        items,
        total,
      });
    }

    return [items, total];
  }

  /** 信息流：热门（按点赞数倒序），仅展示已通过作品，含作者信息 */
  async listHot(page = 1, pageSize = 20, q = '', channel = '') {
    const cacheable = !(q ?? '').trim();
    if (cacheable) {
      const cached = await this.feedCache.get<{
        items: Array<Record<string, unknown>>;
        total: number;
      }>('post-hot', page, pageSize, channel);
      if (cached) return [cached.items, cached.total];
    }

    const [posts, total] = await this.feedQuery(
      { likeCount: 'DESC', createdAt: 'DESC' },
      page,
      pageSize,
      q,
      channel,
    ).getManyAndCount();

    const userIds = posts.map((p) => p.userId);
    const authors = await this.resolveAuthors(userIds);
    const items = posts.map((p) => this.enrichPost(p, authors.get(p.userId)));

    if (cacheable) {
      await this.feedCache.set('post-hot', page, pageSize, channel, {
        items,
        total,
      });
    }

    return [items, total];
  }

  /**
   * 已通过作品的分页查询构造器。
   * q：按标题/文案/频道/标签模糊搜索；channel：按频道标签精确筛选。
   */
  private feedQuery(
    order: Record<string, 'ASC' | 'DESC'>,
    page: number,
    pageSize: number,
    q = '',
    channel = '',
  ) {
    const qb = this.posts
      .createQueryBuilder('post')
      .where('post.status = :status', { status: 'approved' })
      .orderBy(order)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const keyword = (q ?? '').trim();
    if (keyword) {
      qb.andWhere(
        '(post.title LIKE :kw OR post.content LIKE :kw OR post.channelTag LIKE :kw OR post.tags LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }
    const tag = (channel ?? '').trim();
    if (tag) {
      qb.andWhere('post.channelTag = :channel', { channel: tag });
    }
    return qb;
  }

  /** 关注流：我关注的人发布的已通过作品（按时间倒序） */
  async followingFeed(userId: number, page = 1, pageSize = 20) {
    const followRows = await this.follows.find({
      where: { followerId: userId },
      select: { followeeId: true },
    });
    const followeeIds = followRows.map((r) => r.followeeId);
    if (!followeeIds.length) return [[], 0];

    const [posts, total] = await this.posts.findAndCount({
      where: { userId: In(followeeIds), status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const authors = await this.resolveAuthors(followeeIds);
    return [posts.map((p) => this.enrichPost(p, authors.get(p.userId))), total];
  }

  /** 作品详情（含浏览量自增） */
  async detail(id: number) {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException('作品不存在');
    if (post.status === 'rejected') throw new NotFoundException('作品不存在');

    // 浏览量 +1（异步自增，不阻塞响应）
    const author = (await this.resolveAuthors([post.userId])).get(post.userId);

    return this.enrichPost(post, author);
  }

  /** 记录浏览（浏览量 +1） */
  async recordView(id: number): Promise<void> {
    // 直接原子自增：省掉前置 SELECT；作品不存在时 increment 影响 0 行，静默忽略
    await this.posts.increment({ id }, 'viewCount', 1);
  }

  /** 记录分享（分享数 +1） */
  async recordShare(id: number): Promise<void> {
    await this.posts.increment({ id }, 'shareCount', 1);
  }

  /** 我的作品列表（含待审核状态，排除已下架/驳回） */
  async myPosts(userId: number, page = 1, pageSize = 20) {
    const [posts, total] = await this.posts.findAndCount({
      where: { userId, status: Not('rejected') },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const authors = await this.resolveAuthors([userId]);
    return [posts.map((p) => this.enrichPost(p, authors.get(userId))), total];
  }

  /** 管理端：全量作品列表（可按状态筛选） */
  async findAll(
    status?: string,
    page = 1,
    pageSize = 20,
  ): Promise<[Post[], number]> {
    const where: FindOptionsWhere<Post> = {};
    if (status) where.status = status as Post['status'];
    return this.posts.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  /** 管理端：审核作品（通过/驳回） */
  async updateStatus(id: number, dto: UpdatePostStatusDto): Promise<Post> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException('作品不存在');
    post.status = dto.status;
    if (dto.status === 'rejected') {
      post.rejectReason = dto.rejectReason ?? '';
    } else {
      post.rejectReason = '';
    }
    // 审核通过后进入信息流，立即失效缓存
    if (dto.status === 'approved') {
      await this.feedCache.bumpContentVersion();
    }
    return this.posts.save(post);
  }

  /** 管理端：下架作品（软删除标记为 rejected） */
  async remove(id: number): Promise<void> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException('作品不存在');
    post.status = 'rejected';
    post.rejectReason = '管理员下架';
    await this.posts.save(post);
    await this.feedCache.bumpContentVersion();
  }

  /** 管理端：物理删除作品（连同点赞/评论/收藏/浏览记录） */
  async hardDelete(id: number): Promise<void> {
    const post = await this.posts.findOneBy({ id });
    if (!post) throw new NotFoundException('作品不存在');
    const urls = [
      ...(post.images ?? []),
      ...(post.medias?.map((m) => m.url) ?? []),
    ];
    await Promise.all([
      this.likes.delete({ postId: id }),
      this.comments.delete({ postId: id }),
      this.collections.delete({ postId: id }),
      this.histories.delete({ postId: id }),
    ]);
    await this.posts.delete({ id });
    await this.feedCache.bumpContentVersion();
    // 物理删除后清理存储对象并刷新 CDN 缓存（尽力而为）
    await this.mediaCleanup.deleteAndPurge(urls);
  }

  /** 用户端：删除自己的作品（校验归属后物理删除） */
  async deleteOwn(userId: number, postId: number): Promise<void> {
    const post = await this.posts.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('作品不存在');
    if (post.userId !== userId) {
      throw new ForbiddenException('只能删除自己的作品');
    }
    await this.hardDelete(postId);
  }

  // ──── Like operations ────

  async toggleLike(
    userId: number,
    postId: number,
  ): Promise<{ liked: boolean }> {
    const post = await this.posts.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('作品不存在');

    const existing = await this.likes.findOneBy({ userId, postId });
    if (existing) {
      await this.likes.delete({ userId, postId });
      await this.posts.decrement({ id: postId }, 'likeCount', 1);
      return { liked: false };
    }
    await this.likes.save(this.likes.create({ userId, postId }));
    await this.posts.increment({ id: postId }, 'likeCount', 1);
    if (post.userId !== userId) {
      const author = (await this.resolveAuthors([userId])).get(userId);
      const nickname = author?.nickname ?? `用户 #${userId}`;
      await this.notifyInteraction({
        actorId: userId,
        ownerId: post.userId,
        title: `${nickname} 赞了你的作品`,
        content: `「${post.title || post.content || '作品'}」获赞 +1`,
        titleEn: `${nickname} liked your post`,
        contentEn: `"${post.title || post.content || 'Post'}" got a like`,
        category: 'like',
        actionType: 'post',
        actionId: postId,
      });
    }
    return { liked: true };
  }

  async isLiked(userId: number, postId: number): Promise<boolean> {
    const existing = await this.likes.findOneBy({ userId, postId });
    return !!existing;
  }

  async hasUserLikedMultiple(
    userId: number,
    postIds: number[],
  ): Promise<Set<number>> {
    if (!postIds.length) return new Set();
    const likes = await this.likes.findBy({ userId, postId: In(postIds) });
    return new Set(likes.map((l) => l.postId));
  }

  async getMyLikes(userId: number, page = 1, pageSize = 20) {
    const likes = await this.likes.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await this.likes.count({ where: { userId } });
    if (!likes.length) return [[], total];

    const postIds = likes.map((item) => item.postId);
    const posts = await this.posts.findBy({ id: In(postIds) });
    const authorIds = [...new Set(posts.map((post) => post.userId))];
    const authors = await this.resolveAuthors(authorIds);
    const postMap = new Map(posts.map((post) => [post.id, post]));

    const ordered = postIds
      .map((id) => postMap.get(id))
      .filter((post): post is Post => !!post)
      .map((post) => this.enrichPost(post, authors.get(post.userId)));

    return [ordered, total];
  }

  // ──── Comment operations ────

  async addComment(userId: number, postId: number, dto: CreateCommentDto) {
    const post = await this.posts.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('作品不存在');

    // 回复统一挂在顶级评论下；回复的回复也回到顶级，避免多级嵌套
    let parentId: number | null = null;
    let replyToId = dto.replyToId ?? null;
    if (dto.parentId != null) {
      const parent = await this.comments.findOneBy({ id: dto.parentId });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('回复的评论不存在');
      }
      parentId = parent.parentId ?? parent.id;
      if (replyToId == null) replyToId = parent.userId;
    }

    const comment = this.comments.create({
      userId,
      postId,
      parentId,
      replyToId,
      content: dto.content,
    });
    const saved = await this.comments.save(comment);
    // 帖子评论总数只统计顶级评论，回复不重复累计
    if (parentId == null) {
      await this.posts.increment({ id: postId }, 'commentCount', 1);
    }

    // 互动通知：新评论通知作品作者；回复同时通知被回复人（均跳过自己）
    const authorIds = replyToId == null ? [userId] : [userId, replyToId];
    const authors = await this.resolveAuthors(authorIds);
    const nickname = authors.get(userId)?.nickname ?? `用户 #${userId}`;
    await this.notifyInteraction({
      actorId: userId,
      ownerId: post.userId,
      title: `${nickname} 评论了你`,
      content: `「${dto.content}」`,
      titleEn: `${nickname} commented on your post`,
      contentEn: `"${dto.content}"`,
      category: 'comment',
      actionType: 'post',
      actionId: postId,
    });
    if (replyToId != null && replyToId !== userId) {
      await this.notifyInteraction({
        actorId: userId,
        ownerId: replyToId,
        title: `${nickname} 回复了你`,
        content: `「${dto.content}」`,
        titleEn: `${nickname} replied to you`,
        contentEn: `"${dto.content}"`,
        category: 'reply',
        actionType: 'post',
        actionId: postId,
      });
    }

    // 与评论列表/短视频接口保持一致：发布后立即返回作者信息，
    // 客户端可直接在本地列表头部展示完整昵称与头像，无需刷新页面。
    return {
      ...saved,
      author: authors.get(userId) ?? {
        nickname: `用户 #${userId}`,
        avatar: '',
      },
      replyTo:
        replyToId != null
          ? (authors.get(replyToId) ?? {
              nickname: `用户 #${replyToId}`,
              avatar: '',
            })
          : undefined,
      replies: [],
    };
  }

  async getComments(postId: number, page = 1, pageSize = 20, userId?: number) {
    // 顶级评论分页（倒序），回复跟随顶级评论一起返回
    const [topLevel, total] = await this.comments.findAndCount({
      where: { postId, parentId: IsNull(), isHidden: false },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    if (!topLevel.length) return [[], total];

    const topIds = topLevel.map((c) => c.id);
    const replies = await this.comments.find({
      where: { parentId: In(topIds), isHidden: false },
      order: { createdAt: 'ASC' },
    });
    const all = [...topLevel, ...replies];
    const userIds = all.map((c) => c.userId);
    const replyToIds = replies
      .map((c) => c.replyToId)
      .filter((id): id is number => id != null);
    const authors = await this.resolveAuthors(userIds);
    const replyToAuthors = await this.resolveAuthors(replyToIds);

    // 当前用户对哪些评论点过赞
    let likedIds = new Set<number>();
    if (userId != null) {
      const likedRows = await this.commentLikes.findBy({
        userId,
        commentId: In(all.map((c) => c.id)),
      });
      likedIds = new Set(likedRows.map((l) => l.commentId));
    }

    const replyMap = new Map<number, Array<Record<string, unknown>>>();
    for (const r of replies) {
      const item = {
        ...r,
        author: authors.get(r.userId) ?? this.fallbackAuthor(r.userId),
        replyTo: r.replyToId
          ? (replyToAuthors.get(r.replyToId) ??
            this.fallbackAuthor(r.replyToId))
          : undefined,
        liked: likedIds.has(r.id),
        replies: [],
      };
      const list = replyMap.get(r.parentId!) ?? [];
      list.push(item);
      replyMap.set(r.parentId!, list);
    }

    const result = topLevel.map((c) => ({
      ...c,
      author: authors.get(c.userId) ?? this.fallbackAuthor(c.userId),
      liked: likedIds.has(c.id),
      replies: replyMap.get(c.id) ?? [],
    }));
    return [result, total];
  }

  /** 切换评论点赞，返回最新点赞状态 */
  async toggleCommentLike(
    userId: number,
    commentId: number,
  ): Promise<{ liked: boolean }> {
    const comment = await this.comments.findOneBy({ id: commentId });
    if (!comment) throw new NotFoundException('评论不存在');

    const existing = await this.commentLikes.findOneBy({
      userId,
      commentId,
    });
    if (existing) {
      await this.commentLikes.delete({ userId, commentId });
      await this.comments.decrement({ id: commentId }, 'likeCount', 1);
      return { liked: false };
    }
    await this.commentLikes.save(
      this.commentLikes.create({ userId, commentId }),
    );
    await this.comments.increment({ id: commentId }, 'likeCount', 1);
    return { liked: true };
  }

  /** 当前用户是否已点赞某评论 */
  async isCommentLiked(userId: number, commentId: number): Promise<boolean> {
    return this.commentLikes.existsBy({ userId, commentId });
  }

  private fallbackAuthor(userId: number): AuthorInfo {
    return { nickname: `用户 #${userId}`, avatar: '' };
  }

  // ──── Collection operations ────

  async toggleCollect(
    userId: number,
    postId: number,
  ): Promise<{ collected: boolean }> {
    const post = await this.posts.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('作品不存在');

    const existing = await this.collections.findOneBy({ userId, postId });
    if (existing) {
      await this.collections.delete({ userId, postId });
      await this.posts.decrement({ id: postId }, 'collectCount', 1);
      return { collected: false };
    }
    await this.collections.save(this.collections.create({ userId, postId }));
    await this.posts.increment({ id: postId }, 'collectCount', 1);
    if (post.userId !== userId) {
      const author = (await this.resolveAuthors([userId])).get(userId);
      const nickname = author?.nickname ?? `用户 #${userId}`;
      await this.notifyInteraction({
        actorId: userId,
        ownerId: post.userId,
        title: `${nickname} 收藏了你的作品`,
        content: `「${post.title || post.content || '作品'}」被收藏`,
        titleEn: `${nickname} saved your post`,
        contentEn: `"${post.title || post.content || 'Post'}" was saved`,
        category: 'collect',
        actionType: 'post',
        actionId: postId,
      });
    }
    return { collected: true };
  }

  async isCollected(userId: number, postId: number): Promise<boolean> {
    const existing = await this.collections.findOneBy({ userId, postId });
    return !!existing;
  }

  async getMyCollections(userId: number, page = 1, pageSize = 20) {
    const collections = await this.collections.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const total = await this.collections.count({ where: { userId } });
    if (!collections.length) return [[], total];

    const postIds = collections.map((c) => c.postId);
    const posts = await this.posts.findBy({ id: In(postIds) });

    // resolve authors for all collected posts
    const authorIds = [...new Set(posts.map((p) => p.userId))];
    const authors = await this.resolveAuthors(authorIds);

    // preserve the collection order
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const ordered = postIds
      .map((id) => postMap.get(id))
      .filter(Boolean)
      .map((p) => this.enrichPost(p!, authors.get(p!.userId)));

    return [ordered, total];
  }

  // ──── History operations ────

  async addHistory(userId: number, postId: number): Promise<void> {
    const post = await this.posts.findOneBy({ id: postId });
    if (!post) throw new NotFoundException('作品不存在');

    const existing = await this.histories.findOneBy({ userId, postId });
    if (existing) {
      await this.histories.update(
        { id: existing.id },
        { createdAt: new Date() },
      );
    } else {
      await this.histories.save(this.histories.create({ userId, postId }));
    }
  }

  /** 获取用户浏览历史，按浏览时间倒序 */
  async fetchHistory(userId: number, page = 1, pageSize = 20) {
    const [records, total] = await this.histories.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (records.length === 0) return [[], total];

    const postIds = records.map((r) => r.postId);
    const posts = await this.posts.findBy({ id: In(postIds) });

    // resolve authors
    const authorIds = [...new Set(posts.map((p) => p.userId))];
    const authors = await this.resolveAuthors(authorIds);

    // 按浏览时间排序
    const postMap = new Map(posts.map((p) => [p.id, p]));
    const ordered = postIds
      .map((id) => postMap.get(id))
      .filter((p): p is Post => !!p)
      .map((p) => this.enrichPost(p, authors.get(p.userId)));

    return [ordered, total];
  }

  // ──── User posts ────

  async userPosts(userId: number, page = 1, pageSize = 20) {
    const [posts, total] = await this.posts.findAndCount({
      where: { userId, status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const authors = await this.resolveAuthors([userId]);
    return [posts.map((p) => this.enrichPost(p, authors.get(userId))), total];
  }
}
