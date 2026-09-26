import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowsModule } from '../follows/follows.module';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { Block } from './block.entity';
import { BlocksController } from './blocks.controller';
import { BlocksService } from './blocks.service';
import { AdminChatController } from './admin-chat.controller';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Conversation } from './conversation.entity';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { GroupMessage } from './group-message.entity';
import { GroupMessageDeletion } from './group-message-deletion.entity';
import { GroupRead } from './group-read.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { Message } from './message.entity';
import { MessageStatus } from './message_status.entity';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Block,
      Message,
      MessageStatus,
      Group,
      GroupMember,
      GroupMessage,
      GroupMessageDeletion,
      GroupRead,
      User,
    ]),
    FollowsModule,
    UploadsModule,
    UsersModule,
  ],
  controllers: [
    ChatController,
    GroupsController,
    BlocksController,
    AdminChatController,
  ],
  providers: [ChatService, GroupsService, BlocksService, ChatGateway],
  exports: [ChatService, GroupsService, BlocksService, ChatGateway],
})
export class ChatModule {}
