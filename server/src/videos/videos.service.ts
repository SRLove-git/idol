import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Like, Not, Repository } from 'typeorm';

import { Follow } from '../follows/follow.entity';
import { User } from '../users/user.entity';
import { AudioMixService } from './audio-mix.service';
import { FeedCacheService } from '../common/feed-cache.service';
import { MediaCleanupService } from '../uploads/media-cleanup.service';
import { Video } from './video.entity';
import { VideoComment } from './video-comment.entity';
import { VideoCommentLike } from './video-comment-like.entity';
import { VideoHistory } from './video-history.entity';
import { VideoLike } from './video-like.entity';
import {
  CreateVideoCommentDto,
  CreateVideoDto,
  UpdateVideoStatusDto,
} from './video.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { NotificationCategory } from '../notifications/notification.entity';

/** 作者简要信息 + 粉丝数（嵌入列表响应，避免 N+1） */
export interface VideoAuthor {
  id: number;
  nickname: string;
  avatar: string;
  /** 作者粉丝数（来自关注表统计） */
  followCount: number;
}

/** 客户端短视频条目（feed / 详情） */
export interface VideoItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  cover: string;
  videoUrl: string;
  duration: number;
  aspectRatio: number;
  music: string;
  tags: string[];
  location: string;
  photos: string[];
  filter: string;
  trimStart: number;
  trimEnd: number;
  speed: number;
  rotation: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  createdAt: Date;
  author: VideoAuthor;
  /** 当前用户是否已点赞 */
  liked: boolean;
}

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videos: Repository<Video>,
    @InjectRepository(VideoLike)
    private readonly likes: Repository<VideoLike>,
    @InjectRepository(VideoComment)
    private readonly comments: Repository<VideoComment>,
    @InjectRepository(VideoCommentLike)
    private readonly commentLikes: Repository<VideoCommentLike>,
    @InjectRepository(VideoHistory)
    private readonly histories: Repository<VideoHistory>,
    @InjectRepository(Follow)
    private readonly follows: Repository<Follow>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly mixer: AudioMixService,
    private readonly feedCache: FeedCacheService,
    private readonly notifications: NotificationsService,
    private readonly mediaCleanup: MediaCleanupService,
  ) {}

  /** 发送短视频互动通知（失败不影响主流程），跳过自己给自己发 */
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
      // 通知失败不阻断点赞/评论等主操作
    }
  }

  // ──── Helpers ────

  /** 批量查询作者信息 + 粉丝数，返回 userId → VideoAuthor 映射 */
  private async resolveAuthors(
    userIds: number[],
  ): Promise<Map<number, VideoAuthor>> {
    const unique = [...new Set(userIds)];
    if (!unique.length) return new Map();

    const [users, followerRows] = await Promise.all([
      this.users.find({
        where: { id: In(unique) },
        select: { id: true, nickname: true, avatar: true },
      }),
      this.follows
        .createQueryBuilder('f')
        .select('f.followeeId', 'followeeId')
        .addSelect('COUNT(*)', 'cnt')
        .where('f.followeeId IN (:...ids)', { ids: unique })
        .groupBy('f.followeeId')
        .getRawMany<{ followeeId: number; cnt: number }>(),
    ]);

    const followerCounts = new Map<number, number>();
    for (const row of followerRows) {
      followerCounts.set(Number(row.followeeId), Number(row.cnt));
    }

    return new Map(
      users.map((u) => [
        u.id,
        {
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
          followCount: followerCounts.get(u.id) ?? 0,
        },
      ]),
    );
  }

  /** 当前用户已点赞的视频 id 集合（未登录返回空集合） */
  private async likedSet(
    userId: number | undefined,
    videoIds: number[],
  ): Promise<Set<number>> {
    if (!userId || !videoIds.length) return new Set();
    const rows = await this.likes.findBy({ userId, videoId: In(videoIds) });
    return new Set(rows.map((l) => l.videoId));
  }

  private fallbackAuthor(userId: number): VideoAuthor {
    return {
      id: userId,
      nickname: `用户 #${userId}`,
      avatar: '',
      followCount: 0,
    };
  }

  /** 将视频实体合并作者信息 / 点赞状态为客户端格式 */
  private enrich(
    list: Video[],
    authors: Map<number, VideoAuthor>,
    liked: Set<number>,
  ): VideoItem[] {
    return list.map((v) => ({
      ...v,
      author: authors.get(v.userId) ?? this.fallbackAuthor(v.userId),
      liked: liked.has(v.id),
    }));
  }

  // ──── Feed ────

  /**
   * 推荐信息流：全部已通过视频，按创建时间倒序。
   * q：按标题 / 文案 / 配乐 / 地点 / 标签模糊搜索。
   */
  async recommendFeed(
    userId: number | undefined,
    page = 1,
    pageSize = 20,
    q = '',
  ) {
    const keyword = (q ?? '').trim();
    // 搜索词不缓存：结果因人而异且 key 随关键词无限膨胀
    const cacheable = !keyword;

    let items: VideoItem[];
    let total: number;
    if (cacheable) {
      const cached = await this.feedCache.get<{
        items: VideoItem[];
        total: number;
      }>('video', page, pageSize);
      if (cached) {
        items = cached.items;
        total = cached.total;
      } else {
        const [list, count] = await this.queryRecommendFeed(page, pageSize);
        total = count;
        const authors = await this.resolveAuthors(list.map((v) => v.userId));
        // 缓存中立形态：不带任何用户维度的点赞状态
        items = this.enrich(list, authors, new Set<number>());
        await this.feedCache.set('video', page, pageSize, '', { items, total });
      }
    } else {
      const [list, count] = await this.queryRecommendFeed(
        page,
        pageSize,
        keyword,
      );
      total = count;
      const authors = await this.resolveAuthors(list.map((v) => v.userId));
      items = this.enrich(list, authors, new Set<number>());
    }

    // 点赞状态是用户维度的，不能进共享缓存：单独回查后覆盖
    if (userId != null) {
      const liked = await this.likedSet(
        userId,
        items.map((v) => v.id),
      );
      if (liked.size > 0) {
        items = items.map((v) => (liked.has(v.id) ? { ...v, liked: true } : v));
      }
    }
    return [items, total];
  }

  /** 推荐信息流查询（缓存未命中 / 搜索时直查数据库） */
  private async queryRecommendFeed(
    page: number,
    pageSize: number,
    keyword = '',
  ) {
    const qb = this.videos
      .createQueryBuilder('video')
      .where('video.status = :status', { status: 'approved' })
      .orderBy('video.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    if (keyword) {
      qb.andWhere(
        '(video.title LIKE :kw OR video.content LIKE :kw OR video.music LIKE :kw OR video.location LIKE :kw OR video.tags LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }
    return qb.getManyAndCount();
  }

  /** 关注信息流：已关注作者发布的视频 */
  async followingFeed(userId: number, page = 1, pageSize = 20) {
    const followees = await this.follows.find({
      where: { followerId: userId },
      select: { followeeId: true },
    });
    const followeeIds = followees.map((f) => f.followeeId);
    if (!followeeIds.length) return [[], 0];

    const [list, total] = await this.videos.findAndCount({
      where: { status: 'approved', userId: In(followeeIds) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const [authors, liked] = await Promise.all([
      this.resolveAuthors(list.map((v) => v.userId)),
      this.likedSet(
        userId,
        list.map((v) => v.id),
      ),
    ]);
    return [this.enrich(list, authors, liked), total];
  }

  /** 我的发布列表（含待审核状态，排除已下架/驳回，供个人页展示） */
  async myVideos(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.videos.findAndCount({
      where: { userId, status: Not('rejected') },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const [authors, liked] = await Promise.all([
      this.resolveAuthors([userId]),
      this.likedSet(
        userId,
        list.map((v) => v.id),
      ),
    ]);
    return [this.enrich(list, authors, liked), total];
  }

  /** 我点赞过的视频列表（按点赞时间倒序） */
  async myLikedVideos(userId: number, page = 1, pageSize = 20) {
    const [likeRows, total] = await this.likes.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const videoIds = likeRows.map((l) => l.videoId);
    if (!videoIds.length) return [[], total];

    // 保持点赞时间倒序；已下架/驳回的视频不再返回
    const videos = await this.videos.find({
      where: { id: In(videoIds), status: Not('rejected') },
    });
    const orderMap = new Map(videoIds.map((id, index) => [id, index]));
    videos.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    const authors = await this.resolveAuthors(videos.map((v) => v.userId));
    return [
      this.enrich(videos, authors, new Set(videos.map((v) => v.id))),
      total,
    ];
  }

  // ──── History operations ────

  /** 记录视频浏览历史（重复浏览刷新时间，保持最近浏览在前） */
  async addHistory(userId: number, videoId: number): Promise<void> {
    const video = await this.videos.findOneBy({ id: videoId });
    if (!video || video.status === 'rejected') {
      throw new NotFoundException('视频不存在');
    }

    const existing = await this.histories.findOneBy({ userId, videoId });
    if (existing) {
      await this.histories.update(
        { id: existing.id },
        { createdAt: new Date() },
      );
    } else {
      await this.histories.save(this.histories.create({ userId, videoId }));
    }
  }

  /** 获取用户视频浏览历史，按浏览时间倒序（已下架/驳回不再展示） */
  async fetchHistory(userId: number, page = 1, pageSize = 20) {
    const [records, total] = await this.histories.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    if (records.length === 0) return [[], total];

    const videoIds = records.map((r) => r.videoId);
    const videos = await this.videos.find({
      where: { id: In(videoIds), status: Not('rejected') },
    });
    const orderMap = new Map(videoIds.map((id, index) => [id, index]));
    videos.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );

    const [authors, liked] = await Promise.all([
      this.resolveAuthors(videos.map((v) => v.userId)),
      this.likedSet(
        userId,
        videos.map((v) => v.id),
      ),
    ]);
    return [this.enrich(videos, authors, liked), total];
  }

  /** 指定作者的视频列表 */
  async userVideos(authorId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.videos.findAndCount({
      where: { userId: authorId, status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const authors = await this.resolveAuthors([authorId]);
    return [this.enrich(list, authors, new Set<number>()), total];
  }

  /** 管理端：全量视频列表（可按状态筛选） */
  async findAll(status?: string, page = 1, pageSize = 20) {
    const where: FindOptionsWhere<Video> = {};
    if (status) where.status = status as Video['status'];
    return this.videos.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  /** 管理端：审核视频（通过/驳回） */
  async updateStatus(id: number, dto: UpdateVideoStatusDto): Promise<Video> {
    const video = await this.videos.findOneBy({ id });
    if (!video) throw new NotFoundException('视频不存在');
    video.status = dto.status;
    if (dto.status === 'rejected') {
      video.rejectReason = dto.rejectReason ?? '';
    } else {
      video.rejectReason = '';
    }
    // 审核通过后进入信息流，立即失效缓存
    if (dto.status === 'approved') {
      await this.feedCache.bumpContentVersion();
    }
    return this.videos.save(video);
  }

  /** 管理端：下架视频（软删除标记为 rejected） */
  async remove(id: number): Promise<void> {
    const video = await this.videos.findOneBy({ id });
    if (!video) throw new NotFoundException('视频不存在');
    video.status = 'rejected';
    video.rejectReason = '管理员下架';
    await this.videos.save(video);
    await this.feedCache.bumpContentVersion();
  }

  /** 管理端：物理删除视频/照片作品（连同点赞/评论/浏览历史） */
  async hardDelete(id: number): Promise<void> {
    const video = await this.videos.findOneBy({ id });
    if (!video) throw new NotFoundException('视频不存在');
    const urls = [video.videoUrl, video.cover, ...(video.photos ?? [])];
    await Promise.all([
      this.likes.delete({ videoId: id }),
      this.comments.delete({ videoId: id }),
      this.histories.delete({ videoId: id }),
    ]);
    await this.videos.delete({ id });
    await this.feedCache.bumpContentVersion();
    // 物理删除后清理存储对象并刷新 CDN 缓存（尽力而为）
    await this.mediaCleanup.deleteAndPurge(urls);
  }

  /** 用户端：删除自己的视频/照片作品（校验归属后物理删除） */
  async deleteOwn(userId: number, videoId: number): Promise<void> {
    const video = await this.videos.findOneBy({ id: videoId });
    if (!video) throw new NotFoundException('作品不存在');
    if (video.userId !== userId) {
      throw new ForbiddenException('只能删除自己的作品');
    }
    await this.hardDelete(videoId);
  }

  // ──── Detail ────

  /** 视频详情（已下架/驳回视为不存在） */
  async detail(id: number, userId?: number): Promise<VideoItem> {
    const video = await this.videos.findOneBy({ id });
    if (!video || video.status === 'rejected') {
      throw new NotFoundException('视频不存在');
    }
    const [authors, liked] = await Promise.all([
      this.resolveAuthors([video.userId]),
      this.likedSet(userId, [id]),
    ]);
    return this.enrich([video], authors, liked)[0];
  }

  // ──── Publish ────

  /** 视频总数（开发环境种子数据判断用） */
  async countVideos(): Promise<number> {
    return this.videos.count();
  }

  /**
   * 修复开发期种子数据：把「封面图片当视频流」的旧演示行
   * 替换为真实演示视频。按 id 顺序轮换分配演示视频，
   * 兼容历史库里封面重复的脏种子行；仅命中 videoUrl 仍是
   * picsum 占位图、或已被本逻辑改到 /assets/demo/ 的种子行，
   * 不影响用户上传的真实视频。
   */
  async repairImageVideos(
    demoVideos: { videoUrl: string; duration: number }[],
  ): Promise<number> {
    const rows = await this.videos.find({
      where: [
        { videoUrl: Like('%picsum.photos%') },
        { videoUrl: Like('/assets/demo/%') },
      ],
      order: { id: 'ASC' },
    });
    if (!rows.length || !demoVideos.length) return 0;
    let repaired = 0;
    for (let i = 0; i < rows.length; i++) {
      const demo = demoVideos[i % demoVideos.length];
      if (rows[i].videoUrl === demo.videoUrl) continue;
      rows[i].videoUrl = demo.videoUrl;
      rows[i].duration = demo.duration;
      repaired++;
    }
    if (repaired) await this.videos.save(rows);
    return repaired;
  }

  async create(userId: number, dto: CreateVideoDto): Promise<VideoItem> {
    let videoUrl = dto.videoUrl ?? '';
    let duration = dto.duration ?? 15;
    // 视频作品 + 曲库配乐：服务端用 ffmpeg 把配乐混入视频音轨
    if (videoUrl && dto.musicId) {
      this.logger.log(
        `发布配乐混音：musicId=${dto.musicId}，源视频=${videoUrl}`,
      );
      videoUrl = await this.mixer.mix(dto.musicId, videoUrl);
      this.logger.log(`配乐混音完成：${videoUrl}`);
    } else if (!videoUrl && dto.photos?.length && dto.musicId) {
      // 照片作品 + 曲库配乐：把照片列表合成幻灯片视频，配乐作为音轨
      this.logger.log(
        `照片作品配乐合成：musicId=${dto.musicId}，照片 ${dto.photos.length} 张`,
      );
      const result = await this.mixer.makePhotoSlideshow(
        dto.musicId,
        dto.photos,
        dto.cover ?? '',
      );
      videoUrl = result.url;
      duration = result.duration;
      this.logger.log(`照片配乐合成完成：${videoUrl}（${duration}s）`);
    } else if (dto.music && !dto.musicId) {
      // 客户端旧版本只传歌名不传曲库 ID，混音不会执行
      this.logger.warn(
        `发布带歌名但缺少 musicId（疑似客户端旧版本）：${dto.music}`,
      );
    }
    const video = this.videos.create({
      userId,
      title: dto.title ?? '',
      content: dto.content ?? '',
      cover: dto.cover ?? '',
      videoUrl,
      photos: dto.photos ?? [],
      filter: dto.filter ?? '',
      trimStart: dto.trimStart ?? 0,
      trimEnd: dto.trimEnd ?? 0,
      speed: dto.speed ?? 1,
      rotation: dto.rotation ?? 0,
      duration,
      aspectRatio: dto.aspectRatio ?? 0,
      music: dto.music ?? '',
      tags: dto.tags ?? [],
      location: dto.location ?? '',
      status: 'approved',
    });
    const saved = await this.videos.save(video);
    // 新作品立即可见：版本 +1 使共享 feed 缓存立即失效
    await this.feedCache.bumpContentVersion();
    const authors = await this.resolveAuthors([userId]);
    return this.enrich([saved], authors, new Set<number>())[0];
  }

  // ──── Like operations ────

  async toggleLike(
    userId: number,
    videoId: number,
  ): Promise<{ liked: boolean }> {
    const video = await this.videos.findOneBy({ id: videoId });
    if (!video) throw new NotFoundException('视频不存在');

    const existing = await this.likes.findOneBy({ userId, videoId });
    if (existing) {
      await this.likes.delete({ userId, videoId });
      await this.videos.decrement({ id: videoId }, 'likeCount', 1);
      return { liked: false };
    }
    await this.likes.save(this.likes.create({ userId, videoId }));
    await this.videos.increment({ id: videoId }, 'likeCount', 1);
    if (video.userId !== userId) {
      const author = (await this.resolveAuthors([userId])).get(userId);
      const nickname = author?.nickname ?? `用户 #${userId}`;
      await this.notifyInteraction({
        actorId: userId,
        ownerId: video.userId,
        title: `${nickname} 赞了你的作品`,
        content: `「${video.title || video.content || '作品'}」获赞 +1`,
        titleEn: `${nickname} liked your work`,
        contentEn: `"${video.title || video.content || 'Work'}" got a like`,
        category: 'like',
        actionType: 'video',
        actionId: videoId,
      });
    }
    return { liked: true };
  }

  async isLiked(userId: number, videoId: number): Promise<boolean> {
    return this.likes.existsBy({ userId, videoId });
  }

  /** 批量查询当前用户点赞状态（信息流预取用） */
  async hasUserLikedMultiple(
    userId: number,
    videoIds: number[],
  ): Promise<Set<number>> {
    return this.likedSet(userId, videoIds);
  }

  // ──── Comment operations ────

  async getComments(videoId: number, page = 1, pageSize = 50, userId?: number) {
    const [topLevel, total] = await this.comments.findAndCount({
      where: { videoId, parentId: IsNull(), isHidden: false },
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

  async addComment(
    userId: number,
    videoId: number,
    dto: CreateVideoCommentDto,
  ) {
    const video = await this.videos.findOneBy({ id: videoId });
    if (!video) throw new NotFoundException('视频不存在');

    let parentId: number | null = null;
    let replyToId = dto.replyToId ?? null;
    if (dto.parentId != null) {
      const parent = await this.comments.findOneBy({ id: dto.parentId });
      if (!parent || parent.videoId !== videoId) {
        throw new BadRequestException('回复的评论不存在');
      }
      parentId = parent.parentId ?? parent.id;
      if (replyToId == null) replyToId = parent.userId;
    }

    const saved = await this.comments.save(
      this.comments.create({
        userId,
        videoId,
        parentId,
        replyToId,
        content: dto.content,
      }),
    );
    if (parentId == null) {
      await this.videos.increment({ id: videoId }, 'commentCount', 1);
    }

    const authorIds = replyToId == null ? [userId] : [userId, replyToId];
    const authors = await this.resolveAuthors(authorIds);
    const nickname = authors.get(userId)?.nickname ?? `用户 #${userId}`;
    await this.notifyInteraction({
      actorId: userId,
      ownerId: video.userId,
      title: `${nickname} 评论了你`,
      content: `「${dto.content}」`,
      titleEn: `${nickname} commented on your work`,
      contentEn: `"${dto.content}"`,
      category: 'comment',
      actionType: 'video',
      actionId: videoId,
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
        actionType: 'video',
        actionId: videoId,
      });
    }
    return {
      ...saved,
      author: authors.get(userId) ?? this.fallbackAuthor(userId),
      replyTo:
        replyToId != null
          ? (authors.get(replyToId) ?? this.fallbackAuthor(replyToId))
          : undefined,
      replies: [],
    };
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

  // ──── View / Share ────

  /** 记录浏览（浏览量 +1） */
  async recordView(id: number): Promise<void> {
    // 直接原子自增：省掉前置 SELECT；视频不存在时 increment 影响 0 行，静默忽略
    await this.videos.increment({ id }, 'viewCount', 1);
  }

  /** 记录分享（分享数 +1） */
  async recordShare(id: number): Promise<void> {
    await this.videos.increment({ id }, 'shareCount', 1);
  }
}
