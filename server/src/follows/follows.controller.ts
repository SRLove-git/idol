import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  DefaultValuePipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetFollowDto } from './follow.dto';
import { FollowsService } from './follows.service';

/** 客户端：用户关注（关注/取关/关系查询） */
@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  /** 我关注的人（发起群聊选人用，需在 :targetId 前声明） */
  @Get('following')
  following(@CurrentUser() user: AuthUser) {
    return this.follows.followingList(user.id);
  }

  /** 当前用户与目标用户的关注关系 + 目标粉丝/关注数 */
  @Get(':targetId')
  status(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.follows.status(user.id, targetId);
  }

  /** 某用户的粉丝列表（分页） */
  @Get(':targetId/followers')
  followers(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.follows.followers(targetId, user.id, page, limit);
  }

  /** 某用户的关注列表（分页） */
  @Get(':targetId/following')
  followingFor(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.follows.followingFor(targetId, user.id, page, limit);
  }

  /** 关注/取消关注目标用户（幂等），返回最新状态 */
  @Put(':targetId')
  set(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() dto: SetFollowDto,
  ) {
    return this.follows.setFollow(user.id, targetId, dto.following);
  }
}
