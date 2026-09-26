import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Follow } from './follow.entity';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { Notification } from '../notifications/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, Notification]), UsersModule],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
