import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Audit } from '../audit/audit.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { AdminGuard } from '../stores/admin.guard';
import { SendMarketingEmailDto } from './marketing-email.dto';
import { MarketingEmailService } from './marketing-email.service';

@Controller('admin/marketing-email')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.NOTIFICATIONS_MANAGE)
export class AdminMarketingEmailController {
  constructor(private readonly marketingEmail: MarketingEmailService) {}

  @Get('summary')
  summary() {
    return this.marketingEmail.summary();
  }

  @Get('campaigns')
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number,
  ) {
    return this.marketingEmail.list(page, pageSize);
  }

  @Post('campaigns')
  @Audit('marketing_email.send', 'marketing_email_campaign')
  send(
    @Body() dto: SendMarketingEmailDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketingEmail.send(dto, user.id);
  }
}
