import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';

/** 客户端：活动专区 / 会员套餐页共用 / 预约选活动 */
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list() {
    return this.activities.list();
  }

  /** 活动详情（含可约场次），预约流程用 */
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const activity = await this.activities.detail(id);
    if (!activity) throw new NotFoundException('活动不存在或已下架');
    return activity;
  }
}
