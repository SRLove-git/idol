import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment as PostComment } from '../community/comment.entity';
import { User } from '../users/user.entity';
import { VideoComment } from '../videos/video-comment.entity';
import { AdminGuard } from '../stores/admin.guard';
import { AdminModerationController } from './admin-moderation.controller';
import { CommentsModerationService } from './comments.service';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([PostComment, VideoComment, User]),
  ],
  controllers: [AdminModerationController],
  providers: [ModerationService, CommentsModerationService, AdminGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
