import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetBlockDto } from './chat.dto';
import { BlocksService } from './blocks.service';

/** 客户端：用户拉黑 / 黑名单（拉黑后双方无法互发私聊消息，拉群也被拦截） */
@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  /** 我的黑名单（分页） */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.blocks.list(user.id, page, limit);
  }

  /** 与目标用户的拉黑关系状态 */
  @Get(':targetId')
  status(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.blocks.status(user.id, targetId);
  }

  /** 拉黑 / 取消拉黑（幂等），返回最新状态 */
  @Put(':targetId')
  set(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() dto: SetBlockDto,
  ) {
    return this.blocks.setBlock(user.id, targetId, dto.blocked);
  }
}
