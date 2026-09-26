import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Redis 客户端即 provider 本身（extends Redis），应用关闭时优雅断开，避免测试/停机时进程挂起 */
@Injectable()
class RedisClientProvider extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      host: config.get<string>('REDIS_HOST', '127.0.0.1'),
      port: config.get<number>('REDIS_PORT', 6379),
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      // P2：单命令执行超时 1500ms，Redis 无响应时快速失败而非挂起主流程
      commandTimeout: 1500,
      // 连接失败退避重连：200ms 起步，指数退避，上限 5s
      retryStrategy: (times) => Math.min(times * 200, 5000),
      // 断线期间命令立即失败而非无限排队，配合各调用点 try/catch 降级
      enableOfflineQueue: false,
    });
  }

  async onModuleDestroy() {
    try {
      await this.quit();
    } catch {
      // 连接已断开等情况忽略
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useClass: RedisClientProvider,
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
