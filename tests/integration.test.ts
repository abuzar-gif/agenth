import 'dotenv/config';
import {describe,it,expect,afterAll} from 'vitest';
import {db} from '../src/lib/db';
import {databaseWhatsAppAuth} from '../src/lib/whatsapp-auth';
import {ensureWhatsAppAgent} from '../src/lib/whatsapp-agent';
import {runTask} from '../src/lib/engine';
import {browserAction,browserSession,stopBrowser,runtimePath} from '../src/lib/browser';
import {readFile} from 'node:fs/promises';
import {processSchedules} from '../src/lib/scheduler';
const users:string[]=[];
describe.skipIf(process.env.RUN_DB_TESTS!=='1')('real PostgreSQL and execution integration',()=>{
  afterAll(async()=>{for(const id of users){await stopBrowser(id);await db.user.deleteMany({where:{id}});}await db.$disconnect();});
  it('stores and reloads WhatsApp binary auth keys while rejecting a stale worker lease',async()=>{
    const user=await db.user.create({data:{email:`auth-keys-${crypto.randomUUID()}@example.test`}});users.push(user.id);const owner='test-worker';
    await db.whatsAppSession.create({data:{userId:user.id,state:'connecting',owner,leaseUntil:new Date(Date.now()+60000)}});
    const auth=await databaseWhatsAppAuth(user.id,owner);await auth.save();await auth.state.keys.set({'pre-key':{'1':{public:Buffer.from([1,2]),private:Buffer.from([3,4])}}});
    const reload=await databaseWhatsAppAuth(user.id,owner);const keys=await reload.state.keys.get('pre-key',['1']);expect([...keys['1'].private]).toEqual([3,4]);
    await db.whatsAppSession.update({where:{userId:user.id},data:{state:'disconnecting',command:'disconnect'}});await expect(auth.save()).rejects.toThrow('lease');await db.whatsAppSession.update({where:{userId:user.id},data:{state:'connected',command:null,owner:'another-worker'}});await expect(auth.save()).rejects.toThrow('lease');await expect(auth.state.keys.set({'pre-key':{'2':{public:Buffer.from([5]),private:Buffer.from([6])}}})).rejects.toThrow('lease');
  });
  it('defaults welcome read-aloud ON and persists an explicit OFF per user',async()=>{
    const first=await db.user.create({data:{email:`welcome-${crypto.randomUUID()}@example.test`,settings:{create:{}}}});users.push(first.id);
    const second=await db.user.create({data:{email:`welcome-${crypto.randomUUID()}@example.test`,settings:{create:{}}}});users.push(second.id);
    expect((await db.settings.findUniqueOrThrow({where:{userId:first.id}})).welcomeAutoplay).toBe(true);
    await db.settings.update({where:{userId:first.id},data:{welcomeAutoplay:false}});
    expect((await db.settings.findUniqueOrThrow({where:{userId:first.id}})).welcomeAutoplay).toBe(false);
    expect((await db.settings.findUniqueOrThrow({where:{userId:second.id}})).welcomeAutoplay).toBe(true);
  });
  it('persists Urdu, isolates task ownership, and executes real report output',async()=>{
    const u=await db.user.create({data:{email:`integration-${crypto.randomUUID()}@example.test`,profile:{create:{language:'ur',answers:{name:'علی'}}}}});users.push(u.id);
    expect((await db.profile.findUnique({where:{userId:u.id}}))?.answers).toEqual({name:'علی'});
    const task=await db.task.create({data:{userId:u.id,instruction:'Integration report',plan:{summary:'Report',steps:[{agent:'Reporter',tool:'report',args:{text:'Verified tool output'},reason:'Return supplied text'}]}}});
    expect(await db.task.findFirst({where:{id:task.id,userId:'another-user'}})).toBeNull();
    await runTask(task.id);const done=await db.task.findUniqueOrThrow({where:{id:task.id},include:{events:true}});
    expect(done.status).toBe('completed');expect(done.result).toContain('Verified tool output');expect(done.events.some(e=>e.kind==='tool_result')).toBe(true);
  });
  it('gates a real database task before an outgoing message',async()=>{
    const u=await db.user.create({data:{email:`approval-${crypto.randomUUID()}@example.test`}});users.push(u.id);
    // Test-only verified-provider fixture; no live Meta call or message is made.
    await db.connector.create({data:{userId:u.id,provider:'whatsapp-business',encrypted:'test-only-not-used',metadata:{health:'verified',consent:{send:true,chats:true,incoming:true,draft:true,automatic:false}}}});
    const wa=await ensureWhatsAppAgent(u.id,'whatsapp-business');
    const denied=await db.task.create({data:{userId:u.id,instruction:'General Chief must not access WhatsApp',plan:{summary:'Denied',steps:[{agent:'WhatsApp Agent',tool:'whatsapp.messages',args:{},reason:'Must be denied outside dedicated scope'}]}}});await runTask(denied.id);expect((await db.task.findUniqueOrThrow({where:{id:denied.id}})).status).toBe('failed');expect(await db.event.count({where:{taskId:denied.id,kind:'tool_started'}})).toBe(0);
    const task=await db.task.create({data:{userId:u.id,agentId:wa.id,instruction:'Approval integration',plan:{summary:'Send',steps:[{agent:'WhatsApp Agent',tool:'whatsapp.send',args:{to:'923001234567',text:'TEST - must never send'},reason:'Approval test'}]}}});
    await runTask(task.id);expect((await db.task.findUniqueOrThrow({where:{id:task.id}})).status).toBe('waiting_approval');
    expect(await db.event.count({where:{taskId:task.id,kind:'tool_started'}})).toBe(0);
  });
  it('atomically runs one-time and recurring durable schedules without duplicate dispatch',async()=>{
    const u=await db.user.create({data:{email:`schedule-${crypto.randomUUID()}@example.test`}});users.push(u.id);
    const now=new Date(Date.now()+3600000),due=new Date(now.getTime()-1000);
    await db.schedule.create({data:{userId:u.id,instruction:'One-time integration',nextRun:due}});
    await db.schedule.create({data:{userId:u.id,instruction:'Recurring integration',nextRun:due,cron:'0 9 * * *',timezone:'Asia/Karachi'}});
    await processSchedules(now);await processSchedules(now);
    expect(await db.task.count({where:{userId:u.id}})).toBe(2);
    const one=await db.schedule.findFirstOrThrow({where:{userId:u.id,cron:null}});expect(one.paused).toBe(true);
    const recurring=await db.schedule.findFirstOrThrow({where:{userId:u.id,cron:{not:null}}});expect(recurring.nextRun.getTime()).toBeGreaterThan(now.getTime());
  });
  it('operates real Chromium, captures an actual PNG, and blocks host network',async()=>{
    const u=await db.user.create({data:{email:`browser-${crypto.randomUUID()}@example.test`}});users.push(u.id);
    const session=await browserSession(u.id);await session.page.setContent('<html><head><title>AgentH QA</title></head><body><h1>Real browser check</h1><input aria-label="Name"/><button onclick="this.textContent=\'Clicked\'">Go</button></body></html>');
    await browserAction(u.id,{action:'type',selector:'input',text:'Ali'});expect(await session.page.locator('input').inputValue()).toBe('Ali');
    await browserAction(u.id,{action:'click',selector:'button'});expect(await session.page.locator('button').innerText()).toBe('Clicked');
    const result=await browserAction(u.id,{action:'read'});expect(result).toHaveProperty('title','AgentH QA');
    const png=await readFile(runtimePath(u.id,'browser.png'));expect(png.subarray(1,4).toString()).toBe('PNG');
    const closeCode=await session.page.evaluate(()=>new Promise<number>(resolve=>{const socket=new WebSocket('ws://127.0.0.1:3000');socket.onclose=e=>resolve(e.code);setTimeout(()=>resolve(-1),3000);}));expect(closeCode).toBe(1008);
    await expect(browserAction(u.id,{action:'navigate',url:'http://127.0.0.1'})).rejects.toThrow('blocked');
    await stopBrowser(u.id);
  });
  it('navigates a real public website using the production browser adapter',async()=>{
    const u=await db.user.create({data:{email:`public-browser-${crypto.randomUUID()}@example.test`}});users.push(u.id);
    const result=await browserAction(u.id,{action:'navigate',url:'https://example.com'});
    expect(result).toHaveProperty('title','Example Domain');await stopBrowser(u.id);
  },60000);
});
