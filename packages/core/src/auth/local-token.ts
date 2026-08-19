import { scryptSync, timingSafeEqual } from 'node:crypto';

const LOCAL_TOKEN_SALT = Buffer.from('brainledge-local-token');
const SCRYPT_KEYLEN = 32;

export function hashLocalApiToken(token: string): string {
  return scryptSync(token, LOCAL_TOKEN_SALT, SCRYPT_KEYLEN).toString('hex');
}

export function verifyLocalApiToken(presented: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashLocalApiToken(presented));
  const expected = Buffer.from(expectedHash);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
