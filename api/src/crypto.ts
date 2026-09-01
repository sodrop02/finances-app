import crypto from 'node:crypto';
import { env } from './env.js';

// AES-256-GCM. Key is 32 raw bytes, provided base64-encoded in ENCRYPTION_KEY.
const key = Buffer.from(env.ENCRYPTION_KEY, 'base64');
if (key.length !== 32) {
  throw new Error(
    'ENCRYPTION_KEY must decode to 32 bytes. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  );
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv.ciphertext.tag, all base64
  return [iv.toString('base64'), enc.toString('base64'), tag.toString('base64')].join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, dataB64, tagB64] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
