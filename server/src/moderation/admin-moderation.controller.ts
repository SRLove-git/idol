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
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import { AddKeywordDto } from './moderation.dto';
import { ModerationService } from './moderation.service';
import { CommentsModerationService } from './comments.service';

/** 管理端：内容审核（敏感词 + 评论管理） */
@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.CONTENT_MODERATION)
export class AdminModerationController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly comments: CommentsModerationService,
  ) {}

  @Get('keywords')
  listKeywords() {
    return this.moderation.listKeywords();
  }

  @Post('keywords')
  @Audit('moderation.keyword_add', 'keyword')
  addKeyword(@Body() dto: AddKeywordDto) {
    return this.moderation.addKeyword(dto.keyword);
  }

  @Delete('keywords/:keyword')
  @Audit('moderation.keyword_remove', 'keyword')
  removeKeyword(@Param('keyword') keyword: string) {
    return this.moderation.removeKeyword(keyword);
  }

  /** 评论列表（scope=post|video，可按内容关键词/隐藏状态筛选） */
  @Get('comments')
  listComments(
    @Query('scope', new DefaultValuePipe('post')) scope: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize = 20,
    @Query('keyword') keyword?: string,
    @Query('hidden') hidden?: string,
  ) {
    return this.comments.list(scope, {
      page,
      pageSize,
      keyword,
      hidden: hidden === undefined ? undefined : hidden === 'true',
    });
  }

  /** 隐藏/取消隐藏评论（违规内容下架） */
  @Patch('comments/:id/hide')
  @Audit('comment.hide', 'comment')
  hideComment(
    @Param('id', ParseIntPipe) id: number,
    @Query('scope', new DefaultValuePipe('post')) scope: string,
    @Body('hidden') hidden: boolean,
  ) {
    return this.comments.setHidden(scope, id, hidden);
  }
}
