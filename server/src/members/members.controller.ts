import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedeemCouponDto } from './member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.members.myMembership(user.id);
  }
  @Get('plans')
  @UseGuards(JwtAuthGuard)
  plans() {
    return this.members.listPlans();
  }
  @Get('experiences')
  @UseGuards(JwtAuthGuard)
  experiences() {
    return this.members.listExperiences();
  }
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  purchase(
    @CurrentUser() user: AuthUser,
    @Body('planId', ParseIntPipe) planId: number,
  ) {
    return this.members.purchase(user.id, planId);
  }
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  orders(@CurrentUser() user: AuthUser) {
    return this.members.myOrders(user.id);
  }
  @Get('coupons')
  @UseGuards(JwtAuthGuard)
  coupons(@CurrentUser() user: AuthUser) {
    return this.members.listCoupons(user.id);
  }
  @Post('coupons/:id/receive')
  @UseGuards(JwtAuthGuard)
  receive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.members.receive(user.id, id);
  }
  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  wallet(@CurrentUser() user: AuthUser) {
    return this.members.wallet(user.id);
  }

  /** 按核销码查询（公开，用于核销前确认） */
  @Get('coupons/code/:code')
  findByCouponCode(@Param('code') code: string) {
    return this.members.findCouponByCode(code);
  }

  /** 输码核销：用户或店员通过核销码核销 */
  @Post('coupons/redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemCouponDto) {
    return this.members.redeemByCode(dto.code, user.id);
  }
}
