import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/throttler.guard';
import { join } from 'path';
import type Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { AdminsModule } from './admins/admins.module';
import { ActivitiesModule } from './activities/activities.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CommunityModule } from './community/community.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { FollowsModule } from './follows/follows.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import { MigrationsService } from './bootstrap/migrations.service';
import { GlobalJwtModule } from './common/global-jwt.module';
import { HealthController } from './health/health.controller';
import { MusicModule } from './music/music.module';
import { MembersModule } from './members/members.module';
import { ModerationModule } from './moderation/moderation.module';
import { RedisModule } from './redis/redis.module';
import { StoresModule } from './stores/stores.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';
import { SecurityModule } from './common/security.module';
import { REDIS_CLIENT } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GlobalJwtModule,
    // 全局限流：默认按 IP 全站配额（THROTTLE_LIMIT 次/分钟），
    // 超限后封锁 THROTTLE_BLOCK_MS；auth 命名限流只作用于 AuthController，
    // 注册/登录/刷新在路由上再用 @Throttle 收紧。测试与显式关闭时不生效。
    ThrottlerModule.forRootAsync({
      inject: [REDIS_CLIENT, ConfigService],
      useFactory: (redis: Redis, config: ConfigService) => ({
        errorMessage: '请求过于频繁，请稍后再试',
        storage: new RedisThrottlerStorage(redis),
        // 统一 key：default:<ip> / auth:<ip>（跨路由共享配额，防爬虫轮换路径）
        generateKey: (_context, tracker, name) => `${name}:${tracker}`,
        skipIf: () =>
          process.env.NODE_ENV === 'test' ||
          process.env.THROTTLE_DISABLED === 'true',
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL_MS', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 300),
            blockDuration: config.get<number>('THROTTLE_BLOCK_MS', 300000),
          },
          {
            name: 'auth',
            ttl: 60000,
            limit: config.get<number>('AUTH_THROTTLE_LIMIT', 10),
            blockDuration: 600000,
            // 只对 AuthController 生效，其他路由不受 auth 配额影响
            skipIf: (ctx) => ctx.getClass().name !== 'AuthController',
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'root'),
        password: config.get<string>('DB_PASSWORD', 'root'),
        database: config.get<string>('DB_NAME', 'diy'),
        autoLoadEntities: true,
        // 连接池：mysql2 默认 10 个连接，并发上来后是明显瓶颈；
        // DB_POOL_SIZE 按服务器内存/实例数调整，并保证 MySQL max_connections 匹配
        extra: {
          connectionLimit: config.get<number>('DB_POOL_SIZE', 20),
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          queueLimit: 0,
        },
        // 超过 2s 的查询打印警告日志（配合慢查询定位问题）
        maxQueryExecutionTime: 2000,
        // 迁移文件：生产通过 migration:run（或 DB_MIGRATIONS_RUN=true 启动时执行）管理 schema
        migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
        // 迁移由 MigrationsService 在 MySQL 命名锁下执行（多副本并发安全），
        // 关闭框架自带的 migrationsRun 以避免绕过锁并发执行
        migrationsRun: false,
        // 开发环境自动建表；生产默认关闭（首次部署可设 DB_SYNC=true 建表一次，建完改回 false 重启）
        synchronize:
          config.get<string>('NODE_ENV') !== 'production' ||
          config.get<string>('DB_SYNC') === 'true',
      }),
    }),
    RedisModule,
    SecurityModule,
    AuditModule,
    UsersModule,
    AdminsModule,
    AuthModule,
    StoresModule,
    AppointmentsModule,
    ActivitiesModule,
    CommunityModule,
    ChatModule,
    FollowsModule,
    UploadsModule,
    NotificationsModule,
    DashboardModule,
    VideosModule,
    MusicModule,
    MembersModule,
    ModerationModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    BootstrapService,
    MigrationsService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
