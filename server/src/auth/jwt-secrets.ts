import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * JWT 无缝轮换支持。
 *
 * - JWT_SECRET / JWT_REFRESH_SECRET：当前签发密钥。新令牌用它签发，旧令牌也用它验证。
 * - JWT_LEGACY_SECRETS：逗号分隔的历史密钥，仅用于验证旧令牌，不参与签发。
 *
 * 轮换步骤：先把旧密钥追加到 JWT_LEGACY_SECRETS，再更新 JWT_SECRET 并重启；
 * 待旧 access/refresh token 全部过期后可清空 JWT_LEGACY_SECRETS。
 */
export function jwtSecretCandidates(
  config: ConfigService,
  secretEnvName: string,
): string[] {
  const current = config.get<string>(secretEnvName);
  const legacy = (config.get<string>('JWT_LEGACY_SECRETS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [current, ...legacy].filter((s): s is string => Boolean(s));
}

/** 依次用当前/历史密钥验签（异步），全部失败抛出最后一次错误 */
export async function verifyJwtWithRotation<T extends object>(
  jwt: JwtService,
  token: string,
  config: ConfigService,
  secretEnvName: string,
): Promise<T> {
  const secrets = jwtSecretCandidates(config, secretEnvName);
  let lastError: unknown = new Error('未配置 JWT 密钥');
  for (const secret of secrets) {
    try {
      return await jwt.verifyAsync<T>(token, { secret });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** 依次用当前/历史密钥验签（同步，聊天网关握手等场景用） */
export function verifyJwtWithRotationSync<T extends object>(
  jwt: JwtService,
  token: string,
  config: ConfigService,
  secretEnvName: string,
): T {
  const secrets = jwtSecretCandidates(config, secretEnvName);
  let lastError: unknown = new Error('未配置 JWT 密钥');
  for (const secret of secrets) {
    try {
      return jwt.verify<T>(token, { secret });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
