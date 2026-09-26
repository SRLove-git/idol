import type Redis from 'ioredis';

/** 跨实例事件频道：多实例部署时通过 Redis pub/sub 转发消息/已读/在线状态/强制下线 */
export const CHAT_CHANNEL = 'chat:events';

/** 强制下线事件 */
export interface KickEvent {
  /** 事件来源：固定 'admin'，保证所有实例（含本实例）都会处理 */
  source: string;
  kind: 'kick';
  toUserIds: number[];
  payload: { type: 'kicked'; reason: 'forced_offline' | 'banned' };
}

const KICK_EVENT_SOURCE = 'admin';

/**
 * 发布强制下线事件：所有实例收到后立即断开该用户的本地 WebSocket 连接。
 * 与网关自用的 publish() 不同，这里刻意不携带网关实例 ID，
 * 因为发起方（管理端接口所在实例）同样需要处理本地的连接。
 */
export function publishKickEvent(
  redis: Redis,
  userId: number,
  reason: 'forced_offline' | 'banned' = 'forced_offline',
): void {
  const ev: KickEvent = {
    source: KICK_EVENT_SOURCE,
    kind: 'kick',
    toUserIds: [userId],
    payload: { type: 'kicked', reason },
  };
  redis.publish(CHAT_CHANNEL, JSON.stringify(ev)).catch(() => {
    // pub/sub 异常不影响主流程：守卫与帧检查会在 25s 内兜底踢线
  });
}
