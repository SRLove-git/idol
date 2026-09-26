import { join } from 'path';

/**
 * 启动迁移用的独立连接配置。
 *
 * 默认值与 app.module 的 TypeOrmModule（以及 CLI 用的 data-source.ts）保持一致，
 * 仅供 main.ts 在 Nest 应用创建前初始化 DataSource 执行迁移使用。
 */
export function buildDataSourceOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    type: 'mysql' as const,
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    username: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? 'root',
    database: env.DB_NAME ?? 'diy',
    entities: [join(__dirname, '**/*.entity.js')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    // 迁移由 runMigrationsWithLock 显式执行，不依赖框架自动迁移
    migrationsRun: false,
    synchronize: false,
  };
}
