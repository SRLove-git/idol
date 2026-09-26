import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/activity.entity';
import { ActivitySession } from '../activities/activity-session.entity';
import { Coupon, UserCoupon } from '../members/coupon.entity';
import { Membership } from '../members/membership.entity';
import { Store } from '../stores/store.entity';
import { StoreTable } from '../stores/store-table.entity';
import { TimeSlot } from '../stores/time-slot.entity';
import { StorePackage } from '../stores/store-package.entity';
import { UsersModule } from '../users/users.module';
import { ChatModule } from '../chat/chat.module';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { Appointment } from './appointment.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentTable } from './appointment-table.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      AppointmentTable,
      Store,
      StoreTable,
      TimeSlot,
      StorePackage,
      Activity,
      ActivitySession,
      Membership,
      Coupon,
      UserCoupon,
    ]),
    UsersModule,
    ChatModule,
  ],
  controllers: [AppointmentsController, AdminAppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
