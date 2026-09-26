import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { History } from './history.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentTable } from '../appointments/appointment-table.entity';
import { Conversation } from '../chat/conversation.entity';
import { Group } from '../chat/group.entity';
import { GroupMember } from '../chat/group-member.entity';
import { GroupMessage } from '../chat/group-message.entity';
import { GroupMessageDeletion } from '../chat/group-message-deletion.entity';
import { GroupRead } from '../chat/group-read.entity';
import { Message } from '../chat/message.entity';
import { MessageStatus } from '../chat/message_status.entity';
import { Post } from '../community/post.entity';
import { Like } from '../community/like.entity';
import { Comment } from '../community/comment.entity';
import { Collection } from '../community/collection.entity';
import { Follow } from '../follows/follow.entity';
import { Membership } from '../members/membership.entity';
import { MemberOrder } from '../members/member-order.entity';
import { UserCoupon } from '../members/coupon.entity';
import { NotificationRead } from '../notifications/notification-read.entity';
import { Video } from '../videos/video.entity';
import { VideoLike } from '../videos/video-like.entity';
import { VideoComment } from '../videos/video-comment.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      History,
      Post,
      Like,
      Comment,
      Collection,
      Video,
      VideoLike,
      VideoComment,
      Follow,
      NotificationRead,
      Membership,
      MemberOrder,
      UserCoupon,
      Appointment,
      AppointmentTable,
      Conversation,
      Message,
      MessageStatus,
      Group,
      GroupMember,
      GroupMessage,
      GroupRead,
      GroupMessageDeletion,
    ]),
    JwtModule.register({}),
    UploadsModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
