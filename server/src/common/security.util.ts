import { createHash } from 'crypto';
import type { Request } from 'express';

/**
 * 邮箱脱敏：abc@example.com → ab***@example.com。
 * 管理端列表、搜索、审计等非本人场景使用；本人信息接口不脱敏。
 */
export function maskEmail(email?: string | null): string | null {
  if (!email) return email ?? null;
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const name = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = name.length <= 2 ? name : name.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * 基于请求的设备指纹（SHA-1 摘要）：
 * 优先客户端上报的 X-Device-Fingerprint，其次注册 payload 的 deviceId，
 * 都没有时回退 UA + 客户端 IP 摘要（该场景下的稳定标识，防批量注册兜底）。
 */
export function requestFingerprint(
  req: Request,
  deviceId?: string | null,
): string {
  const header = (
    (req.headers['x-device-fingerprint'] as string | undefined) ?? ''
  ).trim();
  const ua = (req.headers['user-agent'] ?? '').slice(0, 200);
  const ip = (req.ip ?? '').split(':').pop() ?? '';
  const raw = header || deviceId?.trim() || `${ua}|${ip}`;
  return createHash('sha1').update(raw).digest('hex');
}
