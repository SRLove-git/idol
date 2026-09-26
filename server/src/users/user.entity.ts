import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Index(['deviceId']) // 防刷号：同一设备（MAC/安装ID）最多注册 3 个账号
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  /** 邮箱：注册时绑定（唯一，未绑定为 null） */
  @Column({ type: 'varchar', unique: true, length: 255, nullable: true })
  email: string | null;

  /** 用户名：账号主键，注册必填（唯一），支持用户名+密码登录 */
  @Column({ type: 'varchar', unique: true, length: 30, nullable: true })
  username: string | null;

  /** 用户名最近一次修改时间（一年内只能修改一次，首次设置不限制），null 表示从未修改 */
  @Column({ type: 'datetime', nullable: true })
  usernameUpdatedAt: Date | null;

  @Column({ default: '' })
  nickname: string;

  /** 头像地址（OSS），空串表示未设置 */
  @Column({ default: '' })
  avatar: string;

  /** 个人简介，空串表示未设置 */
  @Column({ type: 'varchar', length: 200, default: '' })
  bio: string;

  /** 性别：male 男 / female 女 / secret 保密 */
  @Column({
    type: 'enum',
    enum: ['male', 'female', 'secret'],
    default: 'secret',
  })
  gender: 'male' | 'female' | 'secret';

  /** 生日（YYYY-MM-DD），null 表示未设置 */
  @Column({
    type: 'date',
    nullable: true,
    // mysql2 默认把 DATE 读成 JS Date（序列化会变成 ISO 字符串甚至偏移一天），
    // 统一转换成 YYYY-MM-DD 字符串返回给客户端
    transformer: {
      to: (value: string | null) => value,
      from: (value: unknown): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value.slice(0, 10);
        const date = value as Date;
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
      },
    },
  })
  birthday: string | null;

  /** 设备标识（MAC/安装ID）：注册时由客户端上报，同一设备最多可注册 3 个账号 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  deviceId: string | null;

  /** 所在地，空串表示未设置 */
  @Column({ type: 'varchar', length: 60, default: '' })
  location: string;

  /** 密码哈希（scrypt），格式 scrypt$<salt>:<hash> 共 168 字符；null 表示未设置密码 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ default: false })
  isBanned: boolean;

  /** 角色：admin 可访问管理端接口 */
  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: 'user' | 'admin';

  /** 管理端角色（仅 role=admin 时有效）：super_admin / operator / moderator / auditor */
  @Column({
    type: 'enum',
    enum: ['super_admin', 'operator', 'moderator', 'auditor'],
    nullable: true,
  })
  adminRole: 'super_admin' | 'operator' | 'moderator' | 'auditor' | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
