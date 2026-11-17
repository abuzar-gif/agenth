const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const email='agenth-skills-smoke-'+Date.now()+'@example.com';
const password='TestStrong-'+randomBytes(10).toString('hex');
let testUserId;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)failures.push([r.status(),r.url().split('?')[0]])});
 try{
  await page.goto('http://localhost:3000/login?signup=1',{waitUntil:'domcontentloaded'});
  await page.getByPlaceholder('Your name').fill('Skills Test Person');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('At least 10 characters').fill(password);
  await page.getByRole('button',{name:'Create account'}).click();
  await page.waitForURL(url=>url.pathname.startsWith('/dashboard'),{timeout:30000});
  const user=await page.evaluate(async()=>await (await fetch('/api/account')).json());
  testUserId=user.user.id;
  const response=await page.evaluate(async()=>await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:'en',timezone:'Asia/Karachi',answers:{name:'Abuzar'},onboarded:true,onboardingStep:10})}).then(r=>r.status));
  assert.equal(response,200);
  await page.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});
  const f=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
  await f.locator('.agent').first().waitFor({timeout:30000});
  await f.getByRole('button',{name:'Agent details and skills'}).click();
  await f.getByRole('dialog',{name:'Chief details'}).waitFor();
  await f.getByRole('button',{name:'Skills',exact:true}).click();
  await f.getByText('Skills you taught').waitFor();
  await f.getByText(/No skills yet/).waitFor();
  console.log('SKILLS PANEL PASS');
  await f.getByRole('button',{name:/Teach a task/}).click();
  await f.getByRole('dialog',{name:'Teach a task'}).waitFor({timeout:20000});
  await f.getByRole('button',{name:/Start recording/}).click();
  await f.getByRole('button',{name:/Scroll/}).last().click();
  await page.waitForTimeout(2000);
  console.log('RECORDER AFTER SCROLL', (await f.locator('.v2TaskRecorder').innerText()).slice(0,1100));
  console.log('FAILED APIS AFTER SCROLL',JSON.stringify(failures));
  await f.getByText(/1 step\(s\) recorded/).waitFor({timeout:10000});
  page.on('dialog',d=>d.accept('Sample browser skill'));
  await f.getByRole('button',{name:/Stop & save/}).click();
  await f.getByText('Sample browser skill').waitFor({timeout:20000});
  console.log('SKILL SAVED PASS');
  const persisted=await page.evaluate(async()=>{const r=await fetch('/api/agent-skills?agentId=builtin-chief');return {status:r.status,data:await r.json()}});
  assert.equal(persisted.status,200);
  assert.equal(persisted.data.length,1);
  assert.equal(persisted.data[0].steps.length,1);
  assert.equal(persisted.data[0].steps[0].action,'scroll');
  await f.getByRole('button',{name:/Review \/ replay/}).click();
  await f.getByRole('button',{name:/Run next step/}).click();
  await f.getByText(/1\/1/).first().waitFor({timeout:30000});
  await f.getByRole('button',{name:'Close recorder'}).click();
  await f.getByRole('button',{name:/Delete/}).last().click();
  await f.getByText(/No skills yet/).waitFor({timeout:10000});
  console.log('REPLAY AND DELETE PASS');
  const rest=await page.evaluate(async()=>await (await fetch('/api/agent-skills?agentId=builtin-chief')).json());
  assert.equal(rest.length,0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failures,[]);
  console.log('PASS: authenticated agent profile, tabs, screenshot browser, record, save, replay, delete. No browser/API errors.');
 }finally{
  await browser.close();
  try{
    loadEnvConfig(path.resolve(__dirname,'..'));
    const db=new PrismaClient();
    try{const removed=await db.user.deleteMany({where:{email}});console.log('CLEANUP TEST ACCOUNT',removed.count)}
    finally{await db.$disconnect()}
    if(testUserId&&process.env.AGENTH_RUNTIME_DIR){
      const directory=path.resolve(process.env.AGENTH_RUNTIME_DIR,testUserId);
      if(path.dirname(directory)===path.resolve(process.env.AGENTH_RUNTIME_DIR)){await fs.rm(directory,{recursive:true,force:true});console.log('CLEANUP TEST SKILLS');}
    }
  }catch(err){console.log('CLEANUP FAILED',err.message)}
 }
})().catch(e=>{console.error('TEST FAILURE',e.stack||e);process.exit(1)});
