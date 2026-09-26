import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { runMigrationsWithLock } from './run-migrations';

/**
 * 数据库迁移执行器（MySQL 命名锁版）。
 *
 * 真正的建表/升级迁移由 main.ts 在应用初始化之前执行（见 run-migrations.ts），
 * 这里在 onApplicationBootstrap 兜底再查一次：多副本同时启动时各副本都会检查，
 * 通过 MySQL 命名锁串行化，拿到锁后无待执行迁移则直接跳过。
 */
@Injectable()
export class MigrationsService implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('DB_MIGRATIONS_RUN') !== 'true') return;
    await runMigrationsWithLock(this.dataSource);
  }
}
