import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityService } from './community.service';
import { PostsController } from './posts.controller';
import { AdminPostsController } from './admin-posts.controller';
import { Post } from './post.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { Collection } from './collection.entity';
import { Follow } from '../follows/follow.entity';
import { History } from '../users/history.entity';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { Video } from '../videos/video.entity';
import { FeedCacheService } from '../common/feed-cache.service';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Like,
      Comment,
      CommentLike,
      Collection,
      Follow,
      History,
      User,
      Video,
    ]),
    UsersModule,
    NotificationsModule,
    ModerationModule,
    UploadsModule,
  ],
  controllers: [PostsController, AdminPostsController],
  providers: [CommunityService, FeedCacheService],
  exports: [CommunityService],
})
export class CommunityModule {}
