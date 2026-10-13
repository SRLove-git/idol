import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { EmailModule } from '../email/email.module';
import { AdminMarketingEmailController } from './admin-marketing-email.controller';
import { AdminNotificationsController } from './admin-notifications.controller';
import { MarketingEmailCampaign } from './marketing-email-campaign.entity';
import { MarketingEmailService } from './marketing-email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationRead } from './notification-read.entity';
import { NotificationTemplate } from './notification-template.entity';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      NotificationRead,
      User,
      MarketingEmailCampaign,
    ]),
    UsersModule,
    ChatModule,
    EmailModule,
  ],
  controllers: [
    AdminNotificationsController,
    AdminMarketingEmailController,
    NotificationsController,
  ],
  providers: [NotificationsService, MarketingEmailService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
