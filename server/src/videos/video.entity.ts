import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** 短视频审核状态 */
export type VideoStatus = 'pending' | 'approved' | 'rejected';

/** 短视频（TikTok 风格信息流单条） */
@Entity('videos')
@Index(['status'])
@Index(['userId'])
@Index(['status', 'createdAt']) // 信息流：状态过滤 + 时间倒序，避免 filesort
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  /** 作者用户 ID */
  @Column()
  userId: number;

  /** 标题 / 文案（信息流展示区显示） */
  @Column({ length: 200, default: '' })
  title: string;

  /** 视频描述（发布页文案） */
  @Column({ type: 'text', nullable: true })
  content: string;

  /** 封面 URL（本地模式为相对路径 /uploads/...） */
  @Column({ length: 500, default: '' })
  cover: string;

  /** 视频文件 URL */
  @Column({ length: 500, default: '' })
  videoUrl: string;

  /** 照片作品图片列表（JSON 数组，小红书式多图；空则单图/视频） */
  @Column({ type: 'json', nullable: true })
  photos: string[];

  /** 编辑滤镜 ID（'' 原图），见移动端 PhotoFilter */
  @Column({ length: 50, default: '' })
  filter: string;

  /** 视频裁剪起点（秒，0 未裁剪） */
  @Column({ type: 'float', default: 0 })
  trimStart: number;

  /** 视频裁剪终点（秒，0 未裁剪） */
  @Column({ type: 'float', default: 0 })
  trimEnd: number;

  /** 播放倍速（0.5 ~ 2，默认 1） */
  @Column({ type: 'float', default: 1 })
  speed: number;

  /** 照片顺时针旋转 90° 次数（0/1/2/3） */
  @Column({ default: 0 })
  rotation: number;

  /** 视频时长（秒） */
  @Column({ default: 0 })
  duration: number;

  /** 展示画幅（width / height）；0 表示由播放器读取原视频尺寸 */
  @Column({ type: 'float', default: 0 })
  aspectRatio: number;

  /** 配乐名称 */
  @Column({ length: 200, default: '' })
  music: string;

  /** 话题标签列表（JSON 数组） */
  @Column({ type: 'json' })
  tags: string[];

  /** 发布地点 */
  @Column({ length: 200, default: '' })
  location: string;

  /** 审核状态：默认通过（与社区作品一致，机审后直接上架） */
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  })
  status: VideoStatus;

  /** 驳回原因 */
  @Column({ length: 500, default: '' })
  rejectReason: string;

  /** 点赞数（计数器，免 join 统计） */
  @Column({ default: 0 })
  likeCount: number;

  /** 评论数 */
  @Column({ default: 0 })
  commentCount: number;

  /** 分享数 */
  @Column({ default: 0 })
  shareCount: number;

  /** 浏览数 */
  @Column({ default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
