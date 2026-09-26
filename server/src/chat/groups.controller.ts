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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import {
  AddGroupMembersDto,
  CreateGroupDto,
  MarkGroupReadDto,
  RenameGroupDto,
  SendGroupMessageDto,
  SetGroupRoleDto,
  TransferGroupDto,
} from './group.dto';
import { GroupsService } from './groups.service';

/** 客户端：群聊（建群 / 群列表 / 群消息 / 已读 / 成员） */
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(
    private readonly groups: GroupsService,
    private readonly gateway: ChatGateway,
  ) {}

  /** 创建群聊（成员仅限有效用户，本人自动加入） */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto.name, dto.memberIds);
  }

  /** 我的群列表（含最后一条预览 / 未读数 / 成员头像） */
  @Get()
  mine(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.groups.myGroups(user.id, Math.max(1, page));
  }

  /** 群成员 */
  @Get(':id/members')
  members(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groups.listMembers(id, user.id);
  }

  /** 群创建后拉人（任意成员可邀请） */
  @Post(':id/members')
  async addMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddGroupMembersDto,
  ) {
    const { memberIds } = await this.groups.addMembers(
      user.id,
      id,
      dto.memberIds,
    );
    await this.gateway.broadcastGroupEvent(id, memberIds);
    return { ok: true };
  }

  /** 退出群聊（群主不可退出，需解散） */
  @Delete(':id/members/me')
  async leave(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { memberIds } = await this.groups.leave(user.id, id);
    await this.gateway.broadcastGroupEvent(id, memberIds);
    return { ok: true };
  }

  /** 群主踢人 */
  @Delete(':id/members/:userId')
  async kick(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const { memberIds, removedUserId } = await this.groups.kickMember(
      user.id,
      id,
      userId,
    );
    await this.gateway.broadcastGroupEvent(id, memberIds);
    await this.gateway.broadcastGroupRemoved(id, [removedUserId], 'kicked');
    return { ok: true };
  }

  /** 群主设置 / 取消管理员（admin / member） */
  @Patch(':id/members/:userId/role')
  async setRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SetGroupRoleDto,
  ) {
    const { memberIds } = await this.groups.setRole(
      user.id,
      id,
      userId,
      dto.role,
    );
    await this.gateway.broadcastGroupEvent(id, memberIds);
    return { ok: true };
  }

  /** 群主转让 */
  @Patch(':id/owner')
  async transfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferGroupDto,
  ) {
    const { memberIds } = await this.groups.transferOwner(
      user.id,
      id,
      dto.newOwnerId,
    );
    await this.gateway.broadcastGroupEvent(id, memberIds);
    return { ok: true };
  }

  /** 群主解散群聊 */
  @Delete(':id')
  async dissolve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { memberIds } = await this.groups.dissolve(user.id, id);
    await this.gateway.broadcastGroupRemoved(id, memberIds);
    return { ok: true };
  }

  /** 群主修改群名称 */
  @Patch(':id')
  async rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameGroupDto,
  ) {
    const { memberIds } = await this.groups.rename(user.id, id, dto.name);
    await this.gateway.broadcastGroupEvent(id, memberIds);
    return { ok: true };
  }

  /** 群历史消息（游标分页） */
  @Get(':id/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor', new DefaultValuePipe(0), ParseIntPipe) cursor: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.groups.getMessages(user.id, id, Math.max(0, cursor), limit);
  }

  /** 发群消息（REST 兜底，实时推送由 Gateway 负责） */
  @Post(':id/messages')
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendGroupMessageDto,
  ) {
    const { message, memberIds } = await this.groups.sendMessage(
      user.id,
      id,
      dto.contentType ?? 'text',
      dto.content,
      { replyToId: dto.replyToId, forwarded: dto.forwarded },
    );
    await this.gateway.broadcastGroupMessage(
      message as unknown as Record<string, unknown>,
      memberIds,
      id,
    );
    return message;
  }

  /** 删除群消息（仅对自己隐藏，其他成员不受影响） */
  @Delete(':id/messages/:messageId')
  async removeMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    await this.groups.deleteGroupMessage(user.id, id, messageId);
    return { ok: true };
  }

  /** 标记已读 */
  @Post(':id/read')
  read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkGroupReadDto,
  ) {
    return this.groups.markRead(user.id, id, dto.lastMessageId);
  }
}
