import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/** 用户拉黑关系：blockerId 拉黑 blockedId（单向）。
 * 任一方向存在拉黑即拦截双方私聊（发消息/发起会话/拉入群聊）。 */
@Entity('chat_blocks')
@Unique(['blockerId', 'blockedId'])
@Index(['blockedId'])
export class Block {
  @PrimaryGeneratedColumn()
  id: number;

  /** 拉黑者 */
  @Column()
  blockerId: number;

  /** 被拉黑者 */
  @Column()
  blockedId: number;

  @CreateDateColumn()
  createdAt: Date;
}
