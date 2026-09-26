import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Appointment } from '../appointments/appointment.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitySession } from './activity-session.entity';
import { Activity } from './activity.entity';
import { AdminActivitiesController } from './admin-activities.controller';

/** 活动模块：活动专区 / 会员套餐页的数据源 + 可预约场次 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivitySession, Appointment]),
    UsersModule,
  ],
  controllers: [ActivitiesController, AdminActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService, TypeOrmModule],
})
export class ActivitiesModule {}
