import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
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
import { ChatService } from './chat.service';
import { GroupsService } from './groups.service';

/** 管理端：聊天巡查（群列表/解散 + 私聊与群消息搜索/撤回） */
@Controller('admin/chat')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.CONTENT_MODERATION)
export class AdminChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly groups: GroupsService,
  ) {}

  /** 群聊列表（关键词搜索，分页） */
  @Get('groups')
  listGroups(
    @Query('keyword') keyword?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number = 20,
  ) {
    return this.groups.adminListGroups(keyword, page, pageSize);
  }

  /** 解散群聊（删除群及全部消息） */
  @Post('groups/:id/dissolve')
  @Audit('chat.group_dissolve', 'group')
  dissolve(@Param('id', ParseIntPipe) id: number) {
    return this.groups.adminDissolve(id);
  }

  /** 消息搜索（scope=dm 私聊 | group 群聊） */
  @Get('messages')
  searchMessages(
    @Query('scope', new DefaultValuePipe('dm')) scope: string,
    @Query('keyword') keyword?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number = 20,
  ) {
    return scope === 'group'
      ? this.groups.adminSearchGroupMessages(keyword, page, pageSize)
      : this.chat.adminSearchMessages(keyword, page, pageSize);
  }

  /** 撤回消息（scope=dm 私聊 | group 群聊） */
  @Post('messages/:id/recall')
  @Audit('chat.message_recall', 'message')
  recall(
    @Param('id', ParseIntPipe) id: number,
    @Query('scope', new DefaultValuePipe('dm')) scope: string,
  ) {
    return scope === 'group'
      ? this.groups.adminRecallGroupMessage(id)
      : this.chat.adminRecallMessage(id);
  }
}
