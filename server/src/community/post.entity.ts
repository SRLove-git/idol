import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 作品状态：待审核 → 已通过/已驳回 */
export type PostStatus = 'pending' | 'approved' | 'rejected';

/** 媒体项类型 */
export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  aspectRatio?: number;
  duration?: number; // 秒
}

/** 社区作品 */
@Entity('posts')
@Index(['status'])
@Index(['userId'])
@Index(['status', 'createdAt']) // 信息流：状态过滤 + 时间倒序，避免 filesort
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  /** 作品标题（抖音风格发布页使用） */
  @Column({ length: 200, default: '' })
  title: string;

  /** 文案内容 */
  @Column({ type: 'text' })
  content: string;

  /** 发布地点 */
  @Column({ length: 200, default: '' })
  location: string;

  /** 图片 URL 列表（JSON 数组），最多 9 张（兼容旧接口） */
  @Column({ type: 'json' })
  images: string[];

  /** 媒体列表（JSON 数组）：支持图片/视频混排，含宽高比和视频时长 */
  @Column({ type: 'json', nullable: true })
  medias: PostMedia[];

  /** 标签列表（JSON 数组） */
  @Column({ type: 'json' })
  tags: string[];

  /** 频道标签，如 '#芙宁娜的后花园' */
  @Column({ length: 100, default: '' })
  channelTag: string;

  /** 审核状态 */
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: PostStatus;

  /** 驳回原因 */
  @Column({ length: 500, default: '' })
  rejectReason: string;

  /** 点赞数（计数器，免 join 统计） */
  @Column({ default: 0 })
  likeCount: number;

  /** 收藏数 */
  @Column({ default: 0 })
  collectCount: number;

  /** 评论数 */
  @Column({ default: 0 })
  commentCount: number;

  /** 浏览数 */
  @Column({ default: 0 })
  viewCount: number;

  /** 分享数 */
  @Column({ default: 0 })
  shareCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
