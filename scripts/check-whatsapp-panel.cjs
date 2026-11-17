const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const path=require('node:path');
const assert=require('node:assert/strict');
const email='agenth-whatsapp-panel-'+Date.now()+'@example.com';
const password='Testing-'+randomBytes(14).toString('hex');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[],waMutations=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
    if(r.url().includes('/api/whatsapp/')&&['POST','PATCH','DELETE'].includes(r.method()))waMutations.push([r.method(),r.url()]);
  });
  try{
    await page.goto('http://localhost:3000/login?signup=1',{waitUntil:'domcontentloaded'});
    await page.getByPlaceholder('Your name').fill('WhatsApp Panel Test');
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('At least 10 characters').fill(password);
    await page.getByRole('button',{name:'Create account'}).click();
    await page.waitForURL(u=>u.pathname.startsWith('/dashboard'),{timeout:25000});
    const profileStatus=await page.evaluate(async()=> (await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:'en',timezone:'Asia/Karachi',answers:{},onboarded:true,onboardingStep:10})})).status);
    assert.equal(profileStatus,200);
    await page.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});
    const f=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
    await f.locator('.agent').first().waitFor({timeout:25000});
    assert.equal(await f.locator('.agent').count(),5);
    await f.locator('.connectorLink').first().click();
    await f.locator('#v2WhatsAppHost').waitFor({timeout:9000});
    const wa=f.frameLocator('iframe[title="WhatsApp connector"]');
    await wa.getByRole('button',{name:/Connect & permissions/}).waitFor({timeout:15000});
    assert.equal(new URL(page.url()).pathname,'/dashboard');
    assert.equal(await f.locator('.agent').count(),5,'Opening WhatsApp must not hide the sidebar agents');
    console.log('PASS: sidebar retains five agents; no navigation on connector click');

    await wa.getByRole('button',{name:'Contacts',exact:true}).click();
    await wa.getByText(/Your WhatsApp account is not connected yet/).waitFor();
    assert.equal(await wa.getByRole('textbox',{name:'Search WhatsApp contacts'}).isDisabled(),true);
    await wa.getByRole('button',{name:/Open connection setup/}).click();
    await wa.getByRole('button',{name:/Connect WhatsApp/}).click();
    await wa.getByRole('dialog',{name:'Connect WhatsApp'}).waitFor();
    await wa.getByRole('dialog',{name:'Connect WhatsApp'}).getByText('Chats & contacts',{exact:true}).waitFor();
    await wa.getByRole('button',{name:'Close WhatsApp connection'}).click();
    assert.deepEqual(waMutations,[],'Opening consent must not initiate linking without confirmation');
    console.log('PASS: disconnected status and consent screen; no unauthorized link actions');

    const actual=await page.evaluate(async()=>{
      const res=await fetch('/api/whatsapp/contacts?q=Ali');
      return {status:res.status,body:await res.json()};
    });
    assert.equal(actual.status,400,'Unlinked accounts must not access contacts');
    assert.equal(actual.body.error?.includes('reconnecting'),true);
    console.log('PASS: contacts API rejects unlinked account');

    await page.route('**/api/whatsapp/linked',async route=>{
      if(route.request().method()!=='GET')throw Error('Unexpected mutation request to linked');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({state:'connected',mode:'qr',agent:{id:'demo-only',name:'WhatsApp Manager'},consent:{draft:true,chats:true,incoming:false,history:false,send:false,automatic:false}})});
    });
    await page.route('**/api/whatsapp/contacts?*',async route=>{
      const url=new URL(route.request().url());
      assert.equal(url.searchParams.get('q'),'Ali');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:1,requiresClarification:false,source:'Permitted WhatsApp contact updates',contacts:[{id:'15555550123@s.whatsapp.net',name:'Ali Demo'}]})});
    });
    await f.getByRole('button',{name:'Close WhatsApp connector'}).click();
    await f.locator('.connectorLink').first().click();
    await wa.getByRole('button',{name:'Contacts',exact:true}).click();
    await wa.getByRole('textbox',{name:'Search WhatsApp contacts'}).fill('Ali');
    await wa.getByRole('button',{name:'Search',exact:true}).click();
    await wa.getByText('Ali Demo').waitFor({timeout:16000});
    assert.equal(await f.locator('.agent').count(),5);
    console.log('PASS: mocked connected session, consented contacts search, sidebar remains visible');
    await f.locator('.agent').filter({hasText:'Dost'}).click();
    await f.locator('#v2WhatsAppHost').waitFor({state:'detached',timeout:12000});
    assert.equal(new URL(page.url()).pathname,'/dashboard');
    await f.locator('.pillBottom').click();
    await f.locator('.connectcard').filter({hasText:'WhatsApp'}).getByRole('button').click();
    await f.locator('#v2WhatsAppHost').waitFor({timeout:9000});
    assert.equal(await f.locator('.agent').count(),5);
    assert.equal(new URL(page.url()).pathname,'/dashboard');
    await f.getByRole('button',{name:'Close WhatsApp connector'}).click();
    console.log('PASS: Connect apps → WhatsApp also preserves sidebar and route');
    assert.deepEqual(waMutations,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS: switching agents closes connector without route change or browser errors');
  }finally{
    await browser.close();
    try{
      loadEnvConfig(path.resolve(__dirname,'..'));
      const db=new PrismaClient();
      try{console.log('CLEANUP TEST ACCOUNT',(await db.user.deleteMany({where:{email}})).count)}finally{await db.$disconnect();}
    }catch(e){console.log('CLEANUP ERROR',e.message);}
  }
})().catch(e=>{console.error('TEST FAILED',e.stack||e);process.exit(1)});
