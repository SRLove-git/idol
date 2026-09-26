import { Controller, Get, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    let db = 'up';
    let redis = 'up';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      db = 'down';
    }
    try {
      await this.redis.ping();
    } catch {
      redis = 'down';
    }
    return {
      status: db === 'up' && redis === 'up' ? 'ok' : 'degraded',
      db,
      redis,
    };
  }
}
