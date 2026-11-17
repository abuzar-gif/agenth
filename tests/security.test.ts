import {describe,it,expect} from 'vitest';
import {encrypt,decrypt,isPrivate,publicUrl,sameOrigin,rateLimit} from '../src/lib/security';
import {profileSchema,planSchema,taskSchema} from '../src/lib/validation';
import {mimeEmail} from '../src/lib/google';
import {validateTool,needsApproval,toolCatalog} from '../src/lib/tools';
describe('security boundaries',()=>{
  it('encrypts credentials with unique IVs and authenticates ciphertext',()=>{const a=encrypt({token:'secret'}),b=encrypt({token:'secret'});expect(a).not.toEqual(b);expect(a).not.toContain('secret');expect(decrypt(a)).toEqual({token:'secret'});expect(()=>decrypt(a.slice(0,-2)+'ff')).toThrow();});
  it.each(['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','0.0.0.0'])('blocks private address %s',ip=>expect(isPrivate(ip)).toBe(true));
  it.each(['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])('permits public address %s',ip=>expect(isPrivate(ip)).toBe(false));
  it.each(['http://127.0.0.1','http://[::1]','file:///etc/passwd','https://user:pass@example.com','http://example.com:8080'])('rejects unsafe URL %s',async url=>{await expect(publicUrl(url)).rejects.toThrow();});
  it('requires matching origins',()=>{expect(()=>sameOrigin(new Request('http://localhost:3000/api',{headers:{origin:'http://evil.test'}}))).toThrow();expect(()=>sameOrigin(new Request('http://localhost:3000/api',{headers:{origin:'http://localhost:3000'}}))).not.toThrow();});
  it('limits repeated requests',()=>{const k=crypto.randomUUID();rateLimit(k,1);expect(()=>rateLimit(k,1)).toThrow('Too many');});
  it('rejects email header injection and encodes Urdu safely',()=>{expect(()=>mimeEmail({to:'a@b.com\r\nBcc:evil@b.com',subject:'s',body:'b'})).toThrow();const raw=Buffer.from(mimeEmail({to:'a@b.com',subject:'سلام',body:'Hello'}),'base64url').toString();expect(raw).toContain('=?UTF-8?B?');expect(raw).toContain('SGVsbG8=');});
});
describe('schemas and tool permissions',()=>{
  it('supports only requested languages and valid zones',()=>{const p={language:'ur',timezone:'Asia/Karachi',answers:{name:'علی'},onboarded:true};expect(profileSchema.parse(p)).toEqual(p);expect(profileSchema.safeParse({...p,language:'pa'}).success).toBe(false);expect(profileSchema.safeParse({...p,timezone:'invalid'}).success).toBe(false);});
  it('requires real, bounded instructions and plans',()=>{expect(taskSchema.safeParse({instruction:' '}).success).toBe(false);expect(planSchema.safeParse({summary:'x',steps:[]}).success).toBe(false);});
  it('blocks unknown tools and invalid destinations',()=>{expect(()=>validateTool('fake.success',{})).toThrow();expect(()=>validateTool('whatsapp.send',{to:'Ali',text:'Hi'})).toThrow();expect(()=>validateTool('gmail.send',{to:'a@b.com',body:'Hi'})).toThrow();});
  it('requires approval for all external mutations',()=>{for(const name of ['gmail.send','gmail.draft','gmail.modify','calendar.create','whatsapp.send','schedule'])expect(needsApproval(name,{})).toBe(true);for(const action of ['click','type','upload','download','takeover','stop'])expect(needsApproval('browse',{action})).toBe(true);expect(needsApproval('browse',{action:'read'})).toBe(false);expect(needsApproval('gmail.search',{})).toBe(false);});
  it('exports JSON argument schemas for structured planning',()=>{expect(toolCatalog.length).toBeGreaterThan(10);expect(toolCatalog.find(t=>t.name==='gmail.search')?.args).toHaveProperty('properties');});
});

