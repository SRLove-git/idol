import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('group_members')
@Index(['groupId', 'userId'], { unique: true })
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  userId: number;

  /** 群内角色：owner（群主）/ admin（管理员）/ member（普通成员） */
  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  })
  role: 'owner' | 'admin' | 'member';

  @CreateDateColumn()
  joinedAt: Date;
}
