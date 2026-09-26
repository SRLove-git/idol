import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import {
  SaveCouponDto,
  SaveMembershipDto,
  SavePlanDto,
  RedeemCouponDto,
  UpdateMembershipDto,
} from './member.dto';
import { MembersService } from './members.service';

@Controller('admin/members')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.MEMBERS_MANAGE)
export class AdminMembersController {
  constructor(private readonly members: MembersService) {}
  @Get() memberships(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.members.listMemberships(page, keyword?.trim());
  }
  @Post()
  @Audit('membership.create', 'membership')
  createMembership(@Body() dto: SaveMembershipDto) {
    return this.members.saveMembership(dto);
  }
  @Patch(':id')
  @Audit('membership.update', 'membership')
  updateMembership(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.members.saveMembership(dto, id);
  }
  @Delete(':id')
  @Audit('membership.delete', 'membership')
  removeMembership(@Param('id', ParseIntPipe) id: number) {
    return this.members.removeMembership(id);
  }
  @Get('orders') orders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.members.adminListOrders(page, keyword?.trim(), status);
  }
  @Post('orders/:id/confirm')
  @Audit('membership.order_confirm', 'order')
  confirmOrder(@Param('id', ParseIntPipe) id: number) {
    return this.members.adminConfirmOrder(id);
  }
  @Post('orders/:id/cancel')
  @Audit('membership.order_cancel', 'order')
  cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return this.members.adminCancelOrder(id);
  }
  @Get('plans') plans() {
    return this.members.listPlans(true);
  }
  @Post('plans')
  @Audit('membership.plan_create', 'plan')
  createPlan(@Body() dto: SavePlanDto) {
    return this.members.savePlan(dto);
  }
  @Patch('plans/:id')
  @Audit('membership.plan_update', 'plan')
  updatePlan(@Param('id', ParseIntPipe) id: number, @Body() dto: SavePlanDto) {
    return this.members.savePlan(dto, id);
  }
  @Patch('plans/:id/enabled')
  @Audit('membership.plan_toggle', 'plan')
  togglePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body('enabled') enabled: boolean,
  ) {
    return this.members.togglePlan(id, enabled);
  }
  @Get('coupons') coupons() {
    return this.members.listAllCoupons();
  }
  @Post('coupons')
  @Audit('membership.coupon_create', 'coupon')
  createCoupon(@Body() dto: SaveCouponDto) {
    return this.members.saveCoupon(dto);
  }
  @Patch('coupons/:id')
  @Audit('membership.coupon_update', 'coupon')
  updateCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveCouponDto,
  ) {
    return this.members.saveCoupon(dto, id);
  }
  @Patch('coupons/:id/enabled')
  @Audit('membership.coupon_toggle', 'coupon')
  toggleCoupon(
    @Param('id', ParseIntPipe) id: number,
    @Body('enabled') enabled: boolean,
  ) {
    return this.members.toggleCoupon(id, enabled);
  }
  /** 输码核销（店员代操作）：按 6 位数字+字母核销码核销 */
  @Post('coupons/redeem-code')
  @Audit('membership.coupon_redeem', 'coupon')
  redeemByCode(@Body() dto: RedeemCouponDto, @CurrentUser() user: AuthUser) {
    return this.members.redeemByCode(dto.code, user.id);
  }
  /** 按记录 ID 核销（店员代操作） */
  @Post('coupons/:id/redeem')
  @Audit('membership.coupon_redeem', 'coupon')
  redeem(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.members.adminRedeemCoupon(id, user.id);
  }
}
