import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import {
  CreateSlotDto,
  CreateStoreDto,
  CreateTableDto,
  CreatePackageDto,
  UpdateSlotDto,
  UpdateStoreDto,
  UpdateTableDto,
  UpdatePackageDto,
} from './store.dto';
import { StoresService } from './stores.service';

/** 管理端：门店 / 桌位 / 时段配置（需 admin 角色） */
@Controller('admin/stores')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.STORES_MANAGE)
export class AdminStoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list() {
    return this.stores.adminList();
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.stores.adminDetail(id);
  }

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.stores.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoreDto) {
    return this.stores.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stores.remove(id);
  }

  @Post(':id/tables')
  addTable(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateTableDto) {
    return this.stores.addTable(id, dto);
  }

  @Patch('tables/:id')
  updateTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    return this.stores.updateTable(id, dto);
  }

  @Delete('tables/:id')
  removeTable(@Param('id', ParseIntPipe) id: number) {
    return this.stores.removeTable(id);
  }

  @Post(':id/slots')
  addSlot(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateSlotDto) {
    return this.stores.addSlot(id, dto);
  }

  @Patch('slots/:id')
  updateSlot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.stores.updateSlot(id, dto);
  }

  @Delete('slots/:id')
  removeSlot(@Param('id', ParseIntPipe) id: number) {
    return this.stores.removeSlot(id);
  }

  @Post(':id/packages')
  addPackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePackageDto,
  ) {
    return this.stores.addPackage(id, dto);
  }

  @Patch('packages/:id')
  updatePackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.stores.updatePackage(id, dto);
  }

  @Delete('packages/:id')
  removePackage(@Param('id', ParseIntPipe) id: number) {
    return this.stores.removePackage(id);
  }
}
