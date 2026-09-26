import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from '../follows/follow.entity';
import { Music } from '../music/music.entity';
import { User } from '../users/user.entity';
import { AudioMixService } from './audio-mix.service';
import { Video } from './video.entity';
import { VideoComment } from './video-comment.entity';
import { VideoCommentLike } from './video-comment-like.entity';
import { VideoHistory } from './video-history.entity';
import { VideoLike } from './video-like.entity';
import { VideosController } from './videos.controller';
import { AdminVideosController } from './admin-videos.controller';
import { VideosService } from './videos.service';
import { UsersModule } from '../users/users.module';
import { FeedCacheService } from '../common/feed-cache.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video,
      VideoLike,
      VideoComment,
      VideoCommentLike,
      VideoHistory,
      Follow,
      User,
      Music,
    ]),
    UsersModule,
    NotificationsModule,
    UploadsModule,
  ],
  controllers: [VideosController, AdminVideosController],
  providers: [VideosService, AudioMixService, FeedCacheService],
  exports: [VideosService],
})
export class VideosModule {}
