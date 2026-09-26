import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AdminMembersController } from './admin-members.controller';
import { Coupon, UserCoupon } from './coupon.entity';
import { MemberExperience } from './member-experience.entity';
import { MemberOrder } from './member-order.entity';
import { MemberPlan } from './member-plan.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Membership } from './membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberPlan,
      Membership,
      Coupon,
      UserCoupon,
      MemberExperience,
      MemberOrder,
    ]),
    UsersModule,
  ],
  controllers: [MembersController, AdminMembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
