import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminAdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), UsersModule],
  controllers: [AdminAdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
