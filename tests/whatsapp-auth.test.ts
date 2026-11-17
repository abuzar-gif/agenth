import {it,expect} from 'vitest';
import {sealWhatsApp,openWhatsApp} from '../src/lib/whatsapp-auth';
it('encrypts and restores linked-device binary keys without plaintext or Buffer corruption',async()=>{const original={secret:'private-session-key',bytes:Buffer.from([0,1,127,255])};const sealed=await sealWhatsApp(original);expect(sealed).not.toContain('private-session-key');const decoded=await openWhatsApp<typeof original>(sealed);expect(decoded.secret).toBe(original.secret);expect(Buffer.isBuffer(decoded.bytes)).toBe(true);expect([...decoded.bytes]).toEqual([0,1,127,255]);});
