import { Body, Controller, Post } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RecordSiteVisitDto } from './site-visit.dto';

/** 官网公开埋点：仅记录匿名浏览器的每日首次访问。 */
@Controller('analytics')
export class SiteVisitController {
  constructor(private readonly dashboard: DashboardService) {}

  @Post('visit')
  async visit(@Body() dto: RecordSiteVisitDto) {
    await this.dashboard.recordVisit(dto.visitorId, dto.path);
    return { recorded: true };
  }
}
