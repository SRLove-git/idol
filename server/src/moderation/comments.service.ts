import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Comment as PostComment } from '../community/comment.entity';
import { User } from '../users/user.entity';
import { VideoComment } from '../videos/video-comment.entity';

export type CommentScope = 'post' | 'video';

/** 管理端返回的评论（附作者摘要） */
export interface ModerationComment {
  id: number;
  targetId: number;
  userId: number;
  content: string;
  likeCount: number;
  isHidden: boolean;
  createdAt: Date;
  author: { id: number; username: string | null; nickname: string } | null;
}

/** 评论审核：帖子评论 / 短视频评论的列表与隐藏 */
@Injectable()
export class CommentsModerationService {
  constructor(
    @InjectRepository(PostComment)
    private readonly postComments: Repository<PostComment>,
    @InjectRepository(VideoComment)
    private readonly videoComments: Repository<VideoComment>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async list(
    rawScope: string,
    params: {
      page: number;
      pageSize: number;
      keyword?: string;
      hidden?: boolean;
    },
  ): Promise<[ModerationComment[], number]> {
    const scope = rawScope === 'video' ? 'video' : 'post';
    const repo = scope === 'video' ? this.videoComments : this.postComments;
    const kw = (params.keyword ?? '').trim();
    const where: Record<string, unknown> = {};
    if (kw) where.content = Like(`%${kw}%`);
    if (params.hidden !== undefined) where.isHidden = params.hidden;
    const select =
      scope === 'video'
        ? {
            id: true,
            videoId: true,
            userId: true,
            content: true,
            likeCount: true,
            isHidden: true,
            createdAt: true,
          }
        : {
            id: true,
            postId: true,
            userId: true,
            content: true,
            likeCount: true,
            isHidden: true,
            createdAt: true,
          };
    const [rows, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select,
    });
    const typedRows = rows as unknown as Array<{
      id: number;
      videoId?: number;
      postId?: number;
      userId: number;
      content: string;
      likeCount: number;
      isHidden: boolean;
      createdAt: Date;
    }>;
    const userIds = [
      ...new Set(
        typedRows.map((r) => r.userId).filter((id): id is number => id != null),
      ),
    ];
    const authorMap = new Map<number, User>();
    if (userIds.length) {
      const authors = await this.users.find({ where: { id: In(userIds) } });
      for (const u of authors) authorMap.set(u.id, u);
    }

    const items: ModerationComment[] = typedRows.map((entity) => ({
      id: entity.id,
      targetId: entity.videoId ?? entity.postId ?? 0,
      userId: entity.userId,
      content: entity.content,
      likeCount: entity.likeCount,
      isHidden: entity.isHidden,
      createdAt: entity.createdAt,
      author: authorMap.has(entity.userId)
        ? {
            id: entity.userId,
            username: authorMap.get(entity.userId)!.username,
            nickname: authorMap.get(entity.userId)!.nickname,
          }
        : null,
    }));
    return [items, total];
  }

  async setHidden(
    rawScope: string,
    id: number,
    hidden: boolean,
  ): Promise<{ hidden: boolean }> {
    const scope = rawScope === 'video' ? 'video' : 'post';
    const repo = scope === 'video' ? this.videoComments : this.postComments;
    const comment = await repo.findOneBy({ id });
    if (!comment) throw new NotFoundException('评论不存在');
    await repo.update(id, { isHidden: hidden });
    return { hidden };
  }
}
