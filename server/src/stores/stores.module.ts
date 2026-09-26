import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { AdminStoresController } from './admin-stores.controller';
import { Store } from './store.entity';
import { StoreTable } from './store-table.entity';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { TimeSlot } from './time-slot.entity';
import { StorePackage } from './store-package.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreTable, TimeSlot, StorePackage]),
    UsersModule,
  ],
  controllers: [StoresController, AdminStoresController],
  providers: [StoresService, AdminGuard],
  exports: [StoresService, AdminGuard],
})
export class StoresModule {}
