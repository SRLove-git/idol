import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { AuditLog } from './audit.entity';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User]), UsersModule],
  controllers: [AdminAuditController],
  providers: [
    AuditService,
    // 全局注册：只有带 @Audit 元数据的 handler 才会写日志
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
