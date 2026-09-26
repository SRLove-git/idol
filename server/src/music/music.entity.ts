import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** 曲库音乐（拍摄页「选择音乐」数据源） */
@Entity('music')
@Index(['title', 'artist'], { unique: true })
export class Music {
  @PrimaryGeneratedColumn()
  id: number;

  /** 歌名 */
  @Column({ length: 200 })
  title: string;

  /** 歌手 / 作者 */
  @Column({ length: 100, default: '' })
  artist: string;

  /** 封面 URL（本地模式为相对路径 /uploads/...） */
  @Column({ length: 500, default: '' })
  cover: string;

  /** 音频文件 URL（预留，客户端接入播放后可试听） */
  @Column({ length: 500, default: '' })
  musicUrl: string;

  /** 时长（秒） */
  @Column({ default: 0 })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
