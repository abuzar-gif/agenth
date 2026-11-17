const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const path=require('node:path');
const assert=require('node:assert/strict');
const email='wa-layout-smoke-'+Date.now()+'@example.com';
const password='Testing-'+randomBytes(14).toString('hex');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],mutationRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/whatsapp/')&&r.method()!=='GET')mutationRequests.push(r.url())});
  const items=[
    {id:'layout-test-task',instruction:'message mama whatsapp hello',status:'completed',result:'This is a verified test result only, not a real outgoing WhatsApp message.',events:[]},
    {id:'layout-test-approval',instruction:'message Ali: hello',status:'waiting_approval',approval:{step:{tool:'whatsapp.linked.send',args:{to:'15555550123@s.whatsapp.net',text:'hello'}}},events:[]}
  ];
  try{
    await page.route('**/api/whatsapp/agent',async route=>{
      if(route.request().method()!=='GET')throw Error('Unexpected mutation in UI-only test');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({agent:{id:'test-wa-agent',name:'WhatsApp Manager',provider:'whatsapp-linked'},tasks:items})});
    });
    await page.route('**/api/whatsapp/live*',async route=>{
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({conversations:[{jid:'15555550123@s.whatsapp.net',name:'Ali Test',preview:'hi',updatedAt:new Date().toISOString()}],selected:'15555550123@s.whatsapp.net',messages:[{id:'mock-message',text:'hi',fromMe:false,createdAt:new Date().toISOString()}]})});
    });
    await page.goto('http://localhost:3000/login?signup=1',{waitUntil:'domcontentloaded'});
    await page.getByPlaceholder('Your name').fill('WA Layout Test');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('At least 10 characters').fill(password);
    await page.getByRole('button',{name:'Create account'}).click();
    await page.waitForURL(u=>u.pathname.startsWith('/dashboard'),{timeout:25000});
    const profileStatus=await page.evaluate(async()=> (await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:'en',timezone:'Asia/Karachi',answers:{},onboarded:true,onboardingStep:10})})).status);
    assert.equal(profileStatus,200);
    await page.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});
    const f=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
    await f.locator('.agent').first().waitFor({timeout:20000});
    await f.locator('.agent').filter({hasText:'WhatsApp Manager'}).click();
    const wa=f.frameLocator('iframe[title="WhatsApp Manager live chat"]');
    await wa.getByRole('button',{name:'View synced WhatsApp chats'}).waitFor({timeout:20000});
    await wa.getByText('message mama whatsapp hello').waitFor();
    assert.equal(await wa.locator('.wa-mini').count(),0,'mini screen should be absent from main chat when closed');
    const metrics=await wa.locator('.wa-chat').evaluate(element=>{
      const root=element.getBoundingClientRect(),transcript=element.querySelector('.wa-transcript').getBoundingClientRect(),composer=element.querySelector('.wa-composer').getBoundingClientRect();
      return {rootHeight:root.height,transcriptHeight:transcript.height,composerHeight:composer.height,composerBottom:composer.bottom,rootBottom:root.bottom};
    });
    console.log('LAYOUT',JSON.stringify(metrics));
    console.log('IFRAME_VIEWPORT',JSON.stringify(await wa.locator('.v2-wa-chat-embed').evaluate(el=>({innerHeight:window.innerHeight,documentHeight:document.body.scrollHeight,rootBottom:el.getBoundingClientRect().bottom,innerWidth:window.innerWidth}))));
    assert.ok(metrics.transcriptHeight>330,'chat transcript must receive substantial height');
    assert.ok(metrics.composerBottom<=metrics.rootBottom+10,'composer must remain visible');
    assert.equal(await wa.getByRole('button',{name:'Send message',exact:true}).count(),1,'approval button must have text');
    await wa.getByRole('button',{name:'View synced WhatsApp chats'}).click();
    await wa.getByRole('dialog',{name:'Synced WhatsApp conversations'}).waitFor();
    await wa.getByRole('button',{name:/Ali Test/}).waitFor({timeout:12000});
    await wa.getByRole('button',{name:'Close WhatsApp chats'}).click();
    await wa.getByRole('dialog',{name:'Synced WhatsApp conversations'}).waitFor({state:'detached'});
    assert.equal(await wa.locator('.wa-mini').count(),0);
    assert.equal(await f.locator('.agent').count(),5,'outer sidebar must remain unchanged');
    assert.deepEqual(mutationRequests,[],'UI-only inspection must never send real WhatsApp message');
    assert.deepEqual(errors,[]);
    console.log('PASS: WhatsApp compact chat, readable transcript, approval, on-demand drawer, sidebar and no outgoing sends');
  }finally{
    await browser.close();
    try{
      loadEnvConfig(path.resolve(__dirname,'..'));
      const db=new PrismaClient();
      try{console.log('CLEANUP TEST USER',(await db.user.deleteMany({where:{email}})).count)}finally{await db.$disconnect()}
    }catch(err){console.log('CLEANUP ERROR',err.message)}
  }
})().catch(err=>{console.error('TEST FAILED',err.stack||err);process.exit(1)});
