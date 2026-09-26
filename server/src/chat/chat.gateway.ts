import {
  ForbiddenException,
  HttpException,
  Inject,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from '@nestjs/websockets';
import { decode, encode } from '@msgpack/msgpack';
import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
import type Redis from 'ioredis';
import { WebSocket } from 'ws';
import type { JwtPayload } from '../auth/auth.service';
import { verifyJwtWithRotationSync } from '../auth/jwt-secrets';
import { kickKey } from '../auth/session-keys';
import { REDIS_CLIENT } from '../redis/redis.module';
import { CHAT_CHANNEL } from './chat-events';
import { ChatService, type MessageContentType } from './chat.service';
import { GroupsService } from './groups.service';
import type { Message } from './message.entity';
import type { GroupMessage } from './group-message.entity';

interface ChatFrame {
  type?: string;
  [key: string]: unknown;
}

/** ws 底层 socket 的最小接口（禁用 Nagle 算法用，该属性不随 ws 公共类型暴露） */
interface WsSocketLike {
  setNoDelay?(noDelay?: boolean): void;
}

/** Redis 在线状态 TTL（秒）：客户端 25s 心跳续期，60s 未续期视为离线 */
const PRESENCE_TTL = 60;

/** 单用户最大连接数（多设备支持，防单账号异常刷连接） */
const MAX_CONNECTIONS_PER_USER = 5;

/** 单实例最大连接数：超出时拒绝新连接（多实例扩容时各实例共享此上限） */
const MAX_TOTAL_CONNECTIONS = 20000;

/** 发送缓冲阈值：超过说明对方消费不过来，断开让其重连（背压保护） */
const MAX_BUFFERED_AMOUNT = 1024 * 1024;

/** 单帧最大载荷（聊天帧都是小对象，1MB 已远大于合法帧） */
const MAX_FRAME_PAYLOAD = 1024 * 1024;

/** 跨实例转发事件 */
interface RemoteEvent {
  /** 发布实例 ID（接收端据此跳过自己，避免重复推送） */
  source: string;
  kind:
    | 'newMessage'
    | 'groupNewMessage'
    | 'messageRecalled'
    | 'groupMessageRecalled'
    | 'read'
    | 'presence'
    | 'notification'
    | 'appointment'
    | 'groupEvent'
    | 'kick';
  /** 目标用户（各实例按本地连接表判断是否推送） */
  toUserIds: number[];
  payload: Record<string, unknown>;
}

/**
 * 用户间聊天 WebSocket 网关。
 *
 * 连接：ws(s)://<host>/ws?token=<accessToken>，握手时用 JWT_SECRET 校验。
 * 帧协议（msgpack 二进制帧）：
 *   客户端 → { type:'ping' } / { type:'send', conversationId, clientMsgId, contentType, content }
 *            / { type:'read', conversationId }
 *   服务端 → { type:'pong' } / { type:'sent', clientMsgId, message } / { type:'newMessage', message }
 *            / { type:'read', conversationId, readerId, readAt }
 *            / { type:'presence', userId, online } / { type:'error', code, message }
 *            / { type:'notification' }（平台通知已发送，客户端刷新未读角标）
 *
 * 在线状态：连接建立时 Redis 计数 +1 并向其会话对端广播上线；心跳刷新 TTL；
 * 断开时计数 -1（归零删键）并广播下线。推送前用 Redis 判断对端是否在线，
 * 离线消息不实时推送（已落库，下次上线拉取历史可见）。
 */
@WebSocketGateway({ path: '/ws', maxPayload: MAX_FRAME_PAYLOAD })
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  /** 在线连接表：userId -> 该用户的全部连接（支持多设备） */
  private readonly clients = new Map<number, Set<WebSocket>>();

  /** 实例唯一标识：跨实例转发事件时用于去重（source 相同则跳过） */
  private readonly instanceId = randomUUID();

  /** 本实例连接总数（含所有用户），连接保护用 */
  private connectionCount = 0;

  /** 独立 pub/sub 连接（ioredis 的 subscribe 会独占该连接） */
  private readonly pubsub: Redis;

  constructor(
    private readonly chat: ChatService,
    private readonly groups: GroupsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    this.pubsub = this.redis.duplicate();
  }

  async onModuleInit(): Promise<void> {
    this.pubsub.on('message', (channel, raw) => {
      if (channel !== CHAT_CHANNEL) return;
      this.onRemoteEvent(raw);
    });
    await this.trySubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pubsub.unsubscribe(CHAT_CHANNEL);
    await this.pubsub.quit();
  }

  /** 订阅跨实例频道（等待连接就绪后订阅，失败仅告警） */
  private async trySubscribe(): Promise<void> {
    try {
      // duplicate() 连接可能在 onModuleInit 时尚未就绪，等待 status 变为 ready
      if (this.pubsub.status !== 'ready') {
        await new Promise<void>((resolve, reject) => {
          this.pubsub.once('ready', resolve);
          this.pubsub.once('error', reject);
        });
      }
      await this.pubsub.subscribe(CHAT_CHANNEL);
    } catch (e) {
      console.warn('[ChatGateway] pub/sub subscribe failed:', e);
    }
  }

  handleConnection(client: WebSocket, request?: IncomingMessage): void {
    let userId: number;
    try {
      // 服务端 ws 实例的 client.url 为 undefined，需从握手请求中取 query
      const token = new URL(
        request?.url ?? '',
        'ws://localhost',
      ).searchParams.get('token');
      if (!token) throw new Error('缺少 token');
      const payload = verifyJwtWithRotationSync<JwtPayload>(
        this.jwt,
        token,
        this.config,
        'JWT_SECRET',
      );
      if (payload.type !== 'access' || !payload.sub)
        throw new Error('token 类型错误');
      userId = payload.sub;
    } catch {
      client.close(4001, 'unauthorized');
      return;
    }

    // 强制下线/封禁：新连接立即拒绝（Redis 异常时降级放行，靠帧检查兜底）
    void this.isKicked(userId).then((kicked) => {
      if (kicked) client.close(4002, 'forced offline');
    });

    let set = this.clients.get(userId);
    // 连接保护：单用户多设备上限 + 单实例总连接上限（超限直接拒绝握手后的新连接）
    if (set && set.size >= MAX_CONNECTIONS_PER_USER) {
      client.close(4005, 'too many connections');
      return;
    }
    if (this.connectionCount >= MAX_TOTAL_CONNECTIONS) {
      client.close(4006, 'server busy');
      return;
    }
    if (!set) {
      set = new Set();
      this.clients.set(userId, set);
    }
    set.add(client);
    this.connectionCount++;

    // 禁用 Nagle 算法：聊天帧都是小数据包，应立即发送不做合并缓冲
    const sock = (client as WebSocket & { _socket?: WsSocketLike })._socket;
    if (sock?.setNoDelay) {
      sock.setNoDelay(true);
    }

    // Redis 在线计数 +1 并广播上线（异步，不影响握手）
    void this.onUserConnected(userId);

    // 手动挂消息监听：ws adapter 的 @SubscribeMessage 回调拿不到 client，无法定向回复
    client.on('message', (buffer: Buffer) => {
      void this.handleFrame(userId, client, buffer);
    });
    client.on('error', () => {
      /* 避免未捕获错误告警 */
    });
  }

  /** 是否处于强制下线/封禁状态（Redis 异常时视为未下线，避免误踢） */
  private async isKicked(userId: number): Promise<boolean> {
    try {
      return !!(await this.redis.exists(kickKey(userId)));
    } catch {
      return false;
    }
  }

  handleDisconnect(client: WebSocket): void {
    for (const [uid, set] of this.clients) {
      if (!set.delete(client)) continue;
      this.connectionCount--;
      if (set.size === 0) {
        this.clients.delete(uid);
        // Redis 在线计数 -1 并广播下线（异步）
        void this.onUserDisconnected(uid);
      }
      return; // 每个连接只属于一个用户
    }
  }

  /** 用户接入：在线计数 +1 + 续期，并向其会话对端广播"上线" */
  private async onUserConnected(userId: number): Promise<void> {
    try {
      const key = `chat:online:${userId}`;
      await this.redis.incr(key);
      await this.redis.expire(key, PRESENCE_TTL);
      await this.broadcastPresence(userId, true);
    } catch {
      // Redis 异常不影响连接
    }
  }

  /** 用户断开：在线计数 -1（归零删键），并向其会话对端广播"下线" */
  private async onUserDisconnected(userId: number): Promise<void> {
    try {
      const key = `chat:online:${userId}`;
      const left = await this.redis.decr(key);
      if (left <= 0) await this.redis.del(key);
      await this.broadcastPresence(userId, false);
    } catch {
      // Redis 异常忽略
    }
  }

  /** 向该用户所有会话对端广播在线状态变化（本实例直推 + 跨实例转发） */
  private async broadcastPresence(userId: number, online: boolean) {
    try {
      const peerIds = await this.chat.conversationPeerIds(userId);
      if (peerIds.length === 0) return;
      const payload = { type: 'presence', userId, online };
      for (const pid of peerIds) this.sendToUser(pid, payload);
      this.publish({ kind: 'presence', toUserIds: peerIds, payload });
    } catch {
      // 广播失败忽略
    }
  }

  private async handleFrame(
    userId: number,
    client: WebSocket,
    buffer: Buffer,
  ): Promise<void> {
    // 已建立的长连接：下一帧（心跳 25s 内）检测到强制下线/封禁即断开
    if (await this.isKicked(userId)) {
      client.close(4003, 'forced offline');
      return;
    }
    let frame: ChatFrame;
    try {
      frame = decode(buffer) as ChatFrame;
    } catch {
      return;
    }
    switch (frame?.type) {
      case 'ping':
        // 心跳应答 + 刷新 Redis 在线 TTL
        this.reply(client, { type: 'pong' });
        void this.redis
          .expire(`chat:online:${userId}`, PRESENCE_TTL)
          .catch(() => {});
        break;
      case 'send':
        void this.onSend(userId, client, frame);
        break;
      case 'read':
        void this.onRead(userId, client, frame);
        break;
      case 'groupSend':
        void this.onGroupSend(userId, client, frame);
        break;
    }
  }

  private async onSend(
    userId: number,
    client: WebSocket,
    frame: ChatFrame,
  ): Promise<void> {
    const { conversationId, clientMsgId, content } = frame;
    const contentType = frame.contentType as MessageContentType | undefined;
    if (!conversationId || typeof content !== 'string' || !content.trim()) {
      this.reply(client, {
        type: 'error',
        code: 'bad_request',
        message: '参数不合法',
      });
      return;
    }
    try {
      const type: MessageContentType =
        contentType === 'image'
          ? 'image'
          : contentType === 'voice'
            ? 'voice'
            : 'text';
      const { message, peerId } = await this.chat.sendMessage(
        userId,
        Number(conversationId),
        type,
        content,
        {
          replyToId: Number(frame.replyToId) || undefined,
          forwarded: frame.forwarded === true,
        },
      );
      // 通过 sendToUser 发给发送方自己的所有连接（比 reply(client) 更可靠，后者可能因单连接状态异常丢帧）
      this.sendToUser(userId, {
        type: 'sent',
        clientMsgId: clientMsgId ?? null,
        message: this.serializeMessage(message),
      });
      // Redis 判断在线：在线才实时推送；离线走"离线消息"（已落库，下次上线拉历史可见）
      if (await this.chat.isUserOnline(peerId)) {
        const payload = {
          type: 'newMessage',
          message: this.serializeMessage(message),
        };
        // 本实例直推对端 + 跨实例转发（对端连接在其他实例时由该实例推送）
        this.sendToUser(peerId, payload);
        this.publish({ kind: 'newMessage', toUserIds: [peerId], payload });
      }
    } catch (e) {
      const msg = e instanceof HttpException ? e.message : '发送失败';
      // 拉黑用专用错误码（客户端据此移除气泡并提示原因）；
      // 聊天受限（未互关超 3 条）同样专用，客户端据此提示用户去关注对方
      const code =
        e instanceof ForbiddenException && msg.includes('拉黑')
          ? 'blocked'
          : e instanceof ForbiddenException
            ? 'chat_limited'
            : 'send_failed';
      this.reply(client, {
        type: 'error',
        code,
        clientMsgId: clientMsgId ?? null,
        message: msg,
      });
    }
  }

  private async onRead(
    userId: number,
    client: WebSocket,
    frame: ChatFrame,
  ): Promise<void> {
    const conversationId = Number(frame.conversationId);
    if (!conversationId) return;
    try {
      const { readAt, peerId } = await this.chat.markRead(
        userId,
        conversationId,
      );
      const payload = {
        type: 'read',
        conversationId,
        readerId: userId,
        readAt: readAt?.toISOString?.() ?? readAt,
      };
      this.sendToUser(peerId, payload);
      this.publish({ kind: 'read', toUserIds: [peerId], payload });
    } catch {
      // 无权访问或会话不存在：静默忽略
    }
  }

  private async onGroupSend(
    userId: number,
    client: WebSocket,
    frame: ChatFrame,
  ): Promise<void> {
    const groupId = Number(frame.groupId);
    const clientMsgId = frame.clientMsgId;
    const content = frame.content;
    if (!groupId || typeof content !== 'string' || !content.trim()) {
      this.reply(client, {
        type: 'error',
        code: 'bad_request',
        message: '参数不合法',
      });
      return;
    }
    const contentType: MessageContentType =
      frame.contentType === 'image'
        ? 'image'
        : frame.contentType === 'voice'
          ? 'voice'
          : 'text';
    try {
      const { message, memberIds } = await this.groups.sendMessage(
        userId,
        groupId,
        contentType,
        content,
        {
          replyToId: Number(frame.replyToId) || undefined,
          forwarded: frame.forwarded === true,
        },
      );
      this.sendToUser(userId, {
        type: 'groupSent',
        clientMsgId: clientMsgId ?? null,
        message: this.serializeGroupMessage(message),
      });
      const payload = {
        type: 'groupNewMessage',
        groupId,
        message: this.serializeGroupMessage(message),
      };
      await this.pushToOnlineMembers(
        memberIds,
        [userId],
        'groupNewMessage',
        payload,
      );
    } catch (e) {
      this.reply(client, {
        type: 'error',
        code: 'send_failed',
        clientMsgId: clientMsgId ?? null,
        message: e instanceof HttpException ? e.message : '发送失败',
      });
    }
  }

  /** REST 发消息后的实时转发（同样以 Redis 在线状态判断是否推送） */
  async broadcastNewMessage(message: Message, peerId: number): Promise<void> {
    if (await this.chat.isUserOnline(peerId)) {
      const payload = {
        type: 'newMessage',
        message: this.serializeMessage(message),
      };
      this.sendToUser(peerId, payload);
      this.publish({ kind: 'newMessage', toUserIds: [peerId], payload });
    }
  }

  /** REST 发群消息后的实时转发（推给在线成员，不含发送者） */
  async broadcastGroupMessage(
    message: Record<string, unknown>,
    memberIds: number[],
    groupId: number,
  ): Promise<void> {
    const senderId = Number(message.senderId) || 0;
    const payload = {
      type: 'groupNewMessage',
      groupId,
      message: this.serializeGroupMessage(message),
    };
    await this.pushToOnlineMembers(
      memberIds,
      [senderId],
      'groupNewMessage',
      payload,
    );
  }

  /**
   * 群成员变化（拉人/退出/踢人后通知群内成员）：
   * 客户端收到后刷新群列表与成员缓存。
   */
  async broadcastGroupEvent(
    groupId: number,
    memberIds: number[],
  ): Promise<void> {
    const payload = { type: 'groupEvent', groupId, kind: 'memberChanged' };
    await this.pushToOnlineMembers(memberIds, [], 'groupEvent', payload);
  }

  /**
   * 群被解散 / 成员被移出：通知相关用户移除本地群缓存。
   * 若目标用户正打开该群聊页，客户端据此提示并退出页面。
   */
  async broadcastGroupRemoved(
    groupId: number,
    userIds: number[],
    reason: 'dissolved' | 'kicked' = 'dissolved',
  ): Promise<void> {
    const payload = { type: 'groupEvent', groupId, kind: 'removed', reason };
    await this.pushToOnlineMembers(userIds, [], 'groupEvent', payload);
  }

  /**
   * 群聊推送统一入口：一次批量在线判断（mget），本实例直推 + 单次跨实例发布。
   * excludeIds 为不需要推送的成员（如发送者本人，发送方由 sent 回执确认）。
   */
  private async pushToOnlineMembers(
    memberIds: number[],
    excludeIds: number[],
    kind: RemoteEvent['kind'],
    payload: Record<string, unknown>,
  ): Promise<void> {
    const online = await this.chat.onlineUserIds(memberIds);
    const excluded = new Set(excludeIds);
    const targets = memberIds.filter(
      (uid) => !excluded.has(uid) && online.has(uid),
    );
    if (!targets.length) return;
    for (const uid of targets) this.sendToUser(uid, payload);
    this.publish({ kind, toUserIds: targets, payload });
  }

  /** REST 标记已读后的实时转发 */
  broadcastRead(
    conversationId: number,
    peerId: number,
    readerId: number,
    readAt: Date,
  ): void {
    const payload = {
      type: 'read',
      conversationId,
      readerId,
      readAt: readAt?.toISOString?.() ?? readAt,
    };
    this.sendToUser(peerId, payload);
    this.publish({ kind: 'read', toUserIds: [peerId], payload });
  }

  /**
   * 平台通知已创建后广播给目标用户：通知在线客户端刷新未读角标。
   * 与预约事件一致直接以 JSON 文本发送（区别于聊天 msgpack），并跨实例转发。
   * 离线用户无需实时推送，下次进入首页拉取未读数即可。
   */
  broadcastNotification(userIds: number[]): void {
    if (!userIds?.length) return;
    const payload = { type: 'notification' };
    for (const uid of userIds) this.sendJsonToUser(uid, payload);
    this.publish({ kind: 'notification', toUserIds: userIds, payload });
  }

  /** 应用客户端直推：JSON 文本发送（与聊天 msgpack 分开），预约/通知事件共用 */
  private sendJsonToUser(
    userId: number,
    payload: Record<string, unknown>,
  ): void {
    const set = this.clients.get(userId);
    if (!set) return;
    const data = Buffer.from(JSON.stringify(payload));
    for (const client of set) {
      if (client.readyState !== WebSocket.OPEN) continue;
      client.send(data, (err) => {
        if (err) console.warn('[ChatGateway] json send error:', err.message);
      });
    }
  }

  /** 将 Message 实体转为可安全 msgpack 编码的纯对象（Date → ISO 字符串） */
  private serializeMessage(message: Message): Record<string, unknown> {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      contentType: message.contentType,
      content: message.content,
      replyToId: message.replyToId ?? null,
      replyPreview: message.replyPreview ?? null,
      forwarded: message.forwarded ?? false,
      recalledAt:
        message.recalledAt?.toISOString?.() ?? message.recalledAt ?? null,
      readAt: message.readAt?.toISOString?.() ?? message.readAt ?? null,
      createdAt:
        message.createdAt?.toISOString?.() ?? message.createdAt ?? null,
    };
  }

  /** 群消息转 msgpack 安全的纯对象（Date → ISO 字符串） */
  private serializeGroupMessage(
    message: Record<string, unknown> | GroupMessage,
  ): Record<string, unknown> {
    const raw = message as Record<string, unknown>;
    return {
      id: raw.id,
      groupId: raw.groupId,
      senderId: raw.senderId,
      contentType: raw.contentType,
      content: raw.content,
      replyToId: raw.replyToId ?? null,
      replyPreview: raw.replyPreview ?? null,
      forwarded: raw.forwarded ?? false,
      recalledAt:
        (raw.recalledAt as Date)?.toISOString?.() ?? raw.recalledAt ?? null,
      createdAt:
        (raw.createdAt as Date)?.toISOString?.() ?? raw.createdAt ?? null,
      author: raw.author ?? null,
    };
  }

  private reply(client: WebSocket, payload: unknown): void {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(Buffer.from(encode(payload)), (err) => {
      if (err) console.warn('[ChatGateway] reply send error:', err.message);
    });
  }

  /** 预约状态变更推送（核销 / 上钟 / 下钟等）：客户端实时刷新首页订单。
   *  与聊天帧不同，直接以 JSON 文本发送；同时跨实例转发，
   *  保证处理请求的实例与用户连接所在实例不同时也能收到。 */
  sendAppointment(userId: number, appointment: unknown): void {
    const payload = { type: 'appointment', appointment };
    this.sendJsonToUser(userId, payload);
    this.publish({ kind: 'appointment', toUserIds: [userId], payload });
  }

  private sendToUser(userId: number, payload: unknown): void {
    const set = this.clients.get(userId);
    if (!set) return;
    const data = Buffer.from(encode(payload));
    for (const client of set) {
      if (client.readyState !== WebSocket.OPEN) continue;
      // 背压保护：发送缓冲堆积说明对方网络/消费慢，断开让其重连，
      // 避免单条慢连接拖住实例内存（消息已落库，重连后可拉取）
      if (client.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        client.close(4007, 'slow consumer');
        continue;
      }
      client.send(data, (err) => {
        if (err)
          console.warn(
            `[ChatGateway] sendToUser ${userId} error:`,
            err.message,
          );
      });
    }
  }

  /**
   * 强制下线：关闭该用户在本实例的全部 WebSocket 连接。
   * 关闭前复核下线标记，避免管理端踢人瞬间用户恰好重新登录而误踢新会话。
   */
  private async kickLocalUser(
    userId: number,
    reason: 'forced_offline' | 'banned',
  ): Promise<void> {
    try {
      if (!(await this.redis.exists(kickKey(userId)))) return;
    } catch {
      // Redis 异常时仍直接关闭，保证强制下线及时生效
    }
    const set = this.clients.get(userId);
    if (!set) return;
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) {
        client.close(4004, reason === 'banned' ? 'banned' : 'forced offline');
      }
    }
  }

  /** 发布跨实例事件：携带本实例 ID，接收端据此跳过自己避免重复推送 */
  private publish(ev: Omit<RemoteEvent, 'source'>): void {
    this.pubsub
      .publish(CHAT_CHANNEL, JSON.stringify({ source: this.instanceId, ...ev }))
      .catch(() => {
        // pub/sub 异常不影响本实例内的直推
      });
  }

  /** 接收其他实例转发的事件：目标用户在本实例有连接时推送 */
  private onRemoteEvent(raw: string): void {
    let ev: RemoteEvent;
    try {
      ev = JSON.parse(raw) as RemoteEvent;
    } catch {
      return;
    }
    if (!ev || ev.source === this.instanceId) return;
    if (ev.kind === 'kick') {
      // 强制下线：所有实例立即断开该用户的本地连接（来源为 'admin'，本实例也会收到）
      const reason =
        (ev.payload as { reason?: string } | undefined)?.reason === 'banned'
          ? 'banned'
          : 'forced_offline';
      for (const uid of ev.toUserIds) {
        void this.kickLocalUser(uid, reason);
      }
      return;
    }
    for (const uid of ev.toUserIds) {
      if (ev.kind === 'notification' || ev.kind === 'appointment') {
        this.sendJsonToUser(uid, ev.payload);
      } else {
        this.sendToUser(uid, ev.payload);
      }
    }
  }
}
