import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type {
  CreateAdminDto,
  ResetAdminPasswordDto,
  UpdateAdminDto,
} from './admins.dto';

/** 管理端返回的安全字段（绝不包含 passwordHash） */
export interface AdminAccount {
  id: number;
  username: string | null;
  email: string | null;
  nickname: string;
  adminRole: User['adminRole'];
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly usersService: UsersService,
  ) {}

  /** 管理员账号列表（分页，可按用户名/昵称/邮箱搜索） */
  async list(
    page = 1,
    keyword?: string,
    pageSize = 20,
  ): Promise<[AdminAccount[], number]> {
    const qb = this.users
      .createQueryBuilder('u')
      .where("u.role = 'admin'")
      .orderBy('u.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const kw = (keyword ?? '').trim();
    if (kw) {
      qb.andWhere(
        '(u.username LIKE :kw OR u.nickname LIKE :kw OR u.email LIKE :kw)',
        { kw: `%${kw}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return [rows.map((u) => this.toSafe(u)), total];
  }

  /** 新增管理员：用户名/邮箱唯一，角色默认 operator，创建后计入审计 */
  async create(dto: CreateAdminDto): Promise<AdminAccount> {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    if (await this.usersService.findByUsername(username)) {
      throw new ConflictException('用户名已存在');
    }
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('邮箱已被使用');
    }
    const user = await this.usersService.create({
      username,
      email,
      nickname: dto.nickname?.trim() || '管理员',
      passwordHash: await hashPassword(dto.password),
      role: 'admin',
      adminRole: dto.adminRole,
    });
    return this.toSafe(user);
  }

  /** 编辑管理员：角色 / 昵称 / 停用。禁止停用或降级当前登录账号 */
  async update(
    id: number,
    dto: UpdateAdminDto,
    actorId: number,
  ): Promise<AdminAccount> {
    const admin = await this.assertAdmin(id);
    if (id === actorId) {
      if (dto.isBanned === true) {
        throw new BadRequestException('不能停用当前登录账号');
      }
      if (
        dto.adminRole &&
        dto.adminRole !== 'super_admin' &&
        admin.adminRole === 'super_admin'
      ) {
        throw new BadRequestException('不能降级当前登录账号');
      }
    }

    const patch: Partial<User> = {};
    if (dto.adminRole !== undefined) patch.adminRole = dto.adminRole;
    if (dto.nickname !== undefined) patch.nickname = dto.nickname.trim();
    if (Object.keys(patch).length) {
      await this.users.update(id, patch);
    }
    if (dto.isBanned !== undefined) {
      await this.usersService.toggleBan(id, dto.isBanned);
    }
    return this.toSafe((await this.users.findOneBy({ id })) as User);
  }

  /** 重置密码：改密后强制下线全部会话，需重新登录 */
  async resetPassword(
    id: number,
    dto: ResetAdminPasswordDto,
  ): Promise<{ ok: true }> {
    await this.assertAdmin(id);
    await this.usersService.setPasswordHash(
      id,
      await hashPassword(dto.password),
    );
    await this.usersService.forceOffline(id);
    return { ok: true };
  }

  private async assertAdmin(id: number): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user || user.role !== 'admin') {
      throw new NotFoundException('管理员账号不存在');
    }
    return user;
  }

  private toSafe(user: User): AdminAccount {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      adminRole: user.adminRole,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
