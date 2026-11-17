import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
export function encrypt(value: unknown) {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? '', 'hex');
  if (key.length !== 32) throw new Error('Set TOKEN_ENCRYPTION_KEY to 32 random bytes encoded as hex.');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join('.');
}
export function decrypt<T = Record<string, string>>(value: string): T {
  const [iv, tag, data] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? '', 'hex'), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString());
}
export function isPrivate(address: string): boolean {
  const a = address.toLowerCase();
  if (a.startsWith('::ffff:')) return isPrivate(a.slice(7));
  if (isIP(a) === 6) return !a.startsWith('2') && !a.startsWith('3');
  const p = a.split('.').map(Number);
  return p.length !== 4 || p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
}
export async function publicUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw new Error('Only public HTTP(S) websites on standard ports are allowed.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(a => isPrivate(a.address))) throw new Error('Private and local network addresses are blocked.');
  return url.toString();
}
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max = 60, window = 60_000) {
  const now = Date.now();
  if (buckets.size > 10000) for (const [k,v] of buckets) if (v.reset < now) buckets.delete(k);
  const item = buckets.get(key);
  if (!item || item.reset < now) { buckets.set(key, { count:1, reset:now+window }); return; }
  if (++item.count > max) throw new Error('Too many requests. Please wait a minute.');
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected=new URL(process.env.APP_URL||request.url);
  if(origin===expected.origin)return;
  const trusted=(process.env.TRUSTED_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean);
  if(origin&&trusted.includes(origin))return;
  if(origin){const received=new URL(origin);const local=['localhost','127.0.0.1','[::1]'];if(local.includes(expected.hostname)&&local.includes(received.hostname)&&received.port===expected.port&&received.protocol===expected.protocol)return;}
  throw new Error('Invalid request origin.');
}
