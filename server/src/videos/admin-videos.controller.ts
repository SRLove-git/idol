import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
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
import { UpdateVideoStatusDto } from './video.dto';
import { VideosService } from './videos.service';

/** 管理端：短视频/照片作品管理 */
@Controller('admin/videos')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.CONTENT_MODERATION)
export class AdminVideosController {
  constructor(private readonly videos: VideosService) {}

  /** 全量视频列表（可按状态筛选） */
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: string,
  ) {
    return this.videos.findAll(status, page);
  }

  /** 审核视频（通过/驳回） */
  @Patch(':id/status')
  @Audit('video.status', 'video')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoStatusDto,
  ) {
    return this.videos.updateStatus(id, dto);
  }

  /** 下架视频 */
  @Patch(':id/remove')
  @Audit('video.remove', 'video')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.videos.remove(id);
    return { removed: true };
  }

  /** 物理删除视频/照片作品（含关联互动数据） */
  @Delete(':id')
  @Audit('video.delete', 'video')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    await this.videos.hardDelete(id);
    return { deleted: true };
  }
}
