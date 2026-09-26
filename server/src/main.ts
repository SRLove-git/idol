import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { runMigrationsWithLock } from './bootstrap/run-migrations';
import { buildDataSourceOptions } from './typeorm.options';

async function bootstrap() {
  // 迁移必须在 Nest 生命周期之前执行：多个服务在 onModuleInit 里做种子数据，
  // 若等到 onApplicationBootstrap 才跑迁移，首次空库启动会因表不存在而崩溃。
  // 这里用独立连接在应用创建前建表/升级（MySQL 命名锁保证多副本并发安全），
  // 框架内的 MigrationsService 启动后兜底再查一次（此时无待执行迁移）。
  if (process.env.DB_MIGRATIONS_RUN === 'true') {
    const migrationDataSource = new DataSource(buildDataSourceOptions());
    await migrationDataSource.initialize();
    try {
      await runMigrationsWithLock(migrationDataSource);
    } finally {
      await migrationDataSource.destroy();
    }
  }

  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // 优雅关停：滚动发布/停机时先停止接收新连接，再等待进行中的请求结束
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
