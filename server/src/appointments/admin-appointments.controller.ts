import {
  Body,
  Controller,
  Get,
  DefaultValuePipe,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { CheckInDto, WalkInDto } from './appointment.dto';
import { AppointmentsService } from './appointments.service';

/** 管理端：预约订单管理（需 admin 角色） */
@Controller('admin/appointments')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.ORDERS_MANAGE)
export class AdminAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  /** 所有预约列表（分页，可按状态/门店/日期筛选） */
  @Get()
  list(
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
    @Query('keyword') keyword?: string,
    @Query('code') code?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.appointments.adminFindAll(
      { status, storeId, date, keyword, code },
      page,
      limit,
    );
  }

  /** 核销（店员代操作） */
  @Post(':id/checkin')
  checkIn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.adminCheckIn(id, user.id);
  }

  /** 确认预约（店员代操作）：待确认 → 待核销 */
  @Post(':id/confirm')
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.adminConfirm(id);
  }

  /** 输入核销码核销（店员代操作）：核销即上钟 */
  @Post('checkin-code')
  checkInByCode(@Body() dto: CheckInDto, @CurrentUser() user: AuthUser) {
    return this.appointments.checkIn(dto.code, user.id);
  }

  /** 线下散客开台（无需注册）：创建即服务中开始计时，到点自动下钟 */
  @Post('walkin')
  walkIn(@Body() dto: WalkInDto, @CurrentUser() user: AuthUser) {
    return this.appointments.adminWalkIn(dto, user.id);
  }

  /** 取消预约（店员代操作） */
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.adminCancel(id);
  }

  /** 上钟（店员代操作） */
  @Post(':id/clockin')
  clockIn(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.adminClockIn(id);
  }

  /** 下钟（店员代操作） */
  @Post(':id/clockout')
  clockOut(@Param('id', ParseIntPipe) id: number) {
    return this.appointments.adminClockOut(id);
  }
}
