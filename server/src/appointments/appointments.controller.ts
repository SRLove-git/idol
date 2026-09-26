import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CreateAppointmentDto, CheckInDto } from './appointment.dto';
import { AppointmentsService } from './appointments.service';

/** 客户端：预约流程（选店 → 日期 → 时段 → 人数 → 桌位 → 确认 → 生成预约单） */
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  /** 生成预约单 */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user.id, dto);
  }

  /** 我的预约列表 */
  @Get()
  @UseGuards(JwtAuthGuard)
  myList(
    @CurrentUser() user: AuthUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.appointments.myList(user.id, page ?? 1, pageSize ?? 20);
  }

  /**
   * 桌位可用性（预约选桌位前查询，返回每桌已占用时段）。
   * 可选分页：传 page/pageSize 时返回 { items, total, page, pageSize }；
   * 不传保持原数组格式（全部桌位，兼容现有客户端）。
   */
  @Get('availability')
  availability(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Query('date') date: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.appointments.availability(storeId, date, page, pageSize);
  }

  /** 活动场次列表（含剩余名额，预约选场次前查询） */
  @Get('activity-sessions')
  activitySessions(@Query('activityId', ParseIntPipe) activityId: number) {
    return this.appointments.activitySessions(activityId);
  }

  /** 按预约码查询（公开，用于核销前确认） */
  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.appointments.findByCode(code);
  }

  /** 预约详情 */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  detail(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.appointments.detail(user.id, id);
  }

  /** 取消预约（待核销状态） */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.appointments.cancel(user.id, id);
  }

  /** 输码核销：用户或店员通过预约码核销 */
  @Post('checkin')
  @UseGuards(JwtAuthGuard)
  checkIn(@CurrentUser() user: AuthUser, @Body() dto: CheckInDto) {
    return this.appointments.checkIn(dto.code, user.id);
  }

  /** 上钟：开始体验 */
  @Post(':id/clockin')
  @UseGuards(JwtAuthGuard)
  clockIn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointments.clockIn(user.id, id);
  }

  /** 下钟：结束体验 */
  @Post(':id/clockout')
  @UseGuards(JwtAuthGuard)
  clockOut(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointments.clockOut(user.id, id);
  }
}
