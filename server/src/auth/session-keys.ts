/**
 * 会话相关 Redis 键。
 *
 * 强制下线/封禁通过「下线标记」实现：标记存在期间，该用户已签发的
 * access token 与 refresh token 一律失效（守卫/刷新/网关各自检查），
 * 重新登录成功后清除标记并签发全新 token。
 */

/** 下线标记键：kick:{userId} = '1' */
export const kickKey = (userId: number): string => `kick:${userId}`;

/** 下线标记有效期：与 refresh token 生命周期（30 天）一致 */
export const FORCE_OFFLINE_TTL = 30 * 24 * 3600;
