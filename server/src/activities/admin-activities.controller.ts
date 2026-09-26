import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import {
  SaveActivityDto,
  SaveActivitySessionDto,
  UpdateActivityDto,
  UpdateActivitySessionDto,
} from './activity.dto';
import { ActivitiesService } from './activities.service';

/** 管理端：活动管理 */
@Controller('admin/activities')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.ACTIVITIES_MANAGE)
export class AdminActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get() list() {
    return this.activities.listAll();
  }

  @Post()
  @Audit('activity.create', 'activity')
  create(@Body() dto: SaveActivityDto) {
    return this.activities.create(dto);
  }

  @Patch(':id')
  @Audit('activity.update', 'activity')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(id, dto);
  }

  @Patch(':id/enabled')
  @Audit('activity.toggle', 'activity')
  toggle(
    @Param('id', ParseIntPipe) id: number,
    @Body('enabled') enabled: boolean,
  ) {
    return this.activities.toggleEnabled(id, enabled);
  }

  @Delete(':id')
  @Audit('activity.delete', 'activity')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activities.remove(id);
  }

  // ===== 活动场次 =====

  @Post(':id/sessions')
  @Audit('activity.session_add', 'activity')
  addSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveActivitySessionDto,
  ) {
    return this.activities.addSession(id, dto);
  }

  @Patch('sessions/:sessionId')
  @Audit('activity.session_update', 'session')
  updateSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: UpdateActivitySessionDto,
  ) {
    return this.activities.updateSession(sessionId, dto);
  }

  @Delete('sessions/:sessionId')
  @Audit('activity.session_delete', 'session')
  removeSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.activities.removeSession(sessionId);
  }
}
