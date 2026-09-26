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
import {
  CreateConversationDto,
  PinConversationDto,
  SendMessageDto,
} from './chat.dto';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

/** 客户端：用户间聊天（会话/消息 REST API） */
@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  /** 会话列表：对方信息 + 最后一条预览 + 未读数 */
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.chat.listConversations(user.id, page);
  }

  /** 创建或复用与指定用户的会话 */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    return this.chat.createOrGet(user.id, dto.peerUserId);
  }

  /** 置顶/取消置顶会话 */
  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard)
  pin(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PinConversationDto,
  ) {
    return this.chat.pinConversation(user.id, id, dto.pinned);
  }

  /** 删除会话（含全部消息，对双方生效） */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.chat.deleteConversation(user.id, id);
    return { ok: true };
  }

  /** 历史消息（游标分页，升序返回） */
  @Get(':id/messages')
  @UseGuards(JwtAuthGuard)
  messages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('cursor', new DefaultValuePipe(0), ParseIntPipe) cursor: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chat.getMessages(user.id, id, cursor, limit);
  }

  /** 发消息（WebSocket 不可用时的 REST 兜底），返回落库后的消息 */
  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  async send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    const { message, peerId } = await this.chat.sendMessage(
      user.id,
      id,
      dto.contentType ?? 'text',
      dto.content,
      { replyToId: dto.replyToId, forwarded: dto.forwarded },
    );
    await this.gateway.broadcastNewMessage(message, peerId);
    return message;
  }

  /** 删除消息（仅对自己隐藏，对端不受影响） */
  @Delete(':id/messages/:messageId')
  @UseGuards(JwtAuthGuard)
  async removeMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    await this.chat.deleteMessage(user.id, id, messageId);
    return { ok: true };
  }

  /** 清空聊天记录（仅对自己隐藏本会话全部消息，对端不受影响） */
  @Delete(':id/messages')
  @UseGuards(JwtAuthGuard)
  async clearMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chat.clearMessages(user.id, id);
  }

  /** 批量标记已读 */
  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  async read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { readAt, peerId } = await this.chat.markRead(user.id, id);
    this.gateway.broadcastRead(id, peerId, user.id, readAt);
    return { readAt };
  }
}
