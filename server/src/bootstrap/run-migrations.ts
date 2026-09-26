import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

const LOCK_NAME = 'diy_migrations';
/** 等待迁移锁的最长秒数：正常迁移在数分钟内完成，300s 足够兜底 */
const LOCK_TIMEOUT_SECONDS = 300;

/**
 * 在 MySQL 命名锁下执行全部未跑迁移。
 *
 * 独立成函数供两处调用：
 * - main.ts 在应用初始化（Nest 生命周期）之前调用：首次部署/升级时先建表，
 *   避免 onModuleInit 里的种子数据在空库上查询报错；
 * - MigrationsService 在 onApplicationBootstrap 兜底再查一次（无待执行迁移时直接跳过）。
 *
 * 多副本并发安全：锁由独立连接持有，迁移本身走连接池，互不冲突。
 */
export async function runMigrationsWithLock(
  dataSource: DataSource,
): Promise<void> {
  const logger = new Logger('Migrations');
  const queryRunner = dataSource.createQueryRunner();
  try {
    await queryRunner.connect();
    const rows = (await queryRunner.query('SELECT GET_LOCK(?, ?) AS acquired', [
      LOCK_NAME,
      LOCK_TIMEOUT_SECONDS,
    ])) as Array<{ acquired: number }>;
    const acquired = Number(rows?.[0]?.acquired);
    if (acquired !== 1) {
      throw new Error(
        `获取数据库迁移锁失败（acquired=${acquired}）：可能是另一副本迁移超时或 MySQL 异常`,
      );
    }

    logger.log('开始执行数据库迁移（MySQL 命名锁已获取）');
    const executed = await dataSource.runMigrations();
    logger.log(
      executed.length > 0
        ? `数据库迁移完成，共执行 ${executed.length} 个迁移`
        : '数据库迁移检查完成，无待执行迁移',
    );
  } finally {
    await queryRunner
      .query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
      .catch((e: unknown) =>
        logger.warn(`释放迁移锁失败（连接关闭后自动释放）: ${String(e)}`),
      );
    await queryRunner.release().catch(() => undefined);
  }
}
