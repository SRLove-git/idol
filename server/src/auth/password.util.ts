import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as unknown as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/** scrypt 哈希密码，格式：scrypt$<salt hex>:<hash hex> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, rest] = stored.split('$');
  if (scheme !== 'scrypt' || !rest) return false;
  const [saltHex, hashHex] = rest.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
