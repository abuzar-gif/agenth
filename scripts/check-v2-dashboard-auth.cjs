const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const path=require('node:path');
const assert=require('node:assert/strict');
const email='agenth-v2-dashboard-smoke-'+Date.now()+'@example.com';
const password='Temp-'+randomBytes(12).toString('hex');
const expected=['Chief','WhatsApp Manager','Email Manager','Dost','1000$ Maker'];
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const errors=[];
 const failedResponses=[];
 page.on('pageerror',e=>errors.push('page: '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,220))});
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400)failedResponses.push([r.status(),r.url().split('?')[0]])});
 try{
  await page.goto('http://localhost:3000/login?signup=1',{waitUntil:'domcontentloaded'});
  await page.getByPlaceholder('Your name').fill('AgentH Dashboard Test');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('At least 10 characters').fill(password);
  await page.getByRole('button',{name:'Create account'}).click();
  await page.waitForURL(url=>url.pathname.startsWith('/dashboard'),{timeout:25000});
  const saved=await page.evaluate(async()=>{
    const result=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({language:'en',timezone:'Asia/Karachi',answers:{},onboarded:true,onboardingStep:10})});
    return {status:result.status,body:await result.text()};
  });
  assert.equal(saved.status,200,'Onboarding completion failed: '+JSON.stringify(saved));
  await page.goto('http://localhost:3000/dashboard',{waitUntil:'domcontentloaded'});
  const f=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
  await f.locator('.agent').first().waitFor({timeout:20000});
  const labels=await f.locator('.agent .details strong').allTextContents();
  assert.deepEqual(labels,expected);
  console.log('DASHBOARD URL',page.url());
  console.log('DEFAULT AGENTS',JSON.stringify(labels));
  console.log('PROFILE',await f.locator('.profile .who').innerText());
  assert.ok((await f.locator('.profile .who').innerText()).includes('AgentH Dashboard Test'));
  await f.locator('.v2WelcomeTitle').getByText('Hi AgentH, ready to dive in?').waitFor({timeout:10000});
  assert.ok((await f.locator('.v2WelcomeBody').innerText()).length>400);
  console.log('CHIEF WELCOME',await f.locator('.v2WelcomeTitle').innerText());
  await f.locator('.agent').nth(3).click();
  await f.getByText('Hey AgentH! Kya haal hai mere dost?').waitFor({timeout:10000});
  console.log('DOST WELCOME',await f.locator('.v2WelcomeTitle').innerText());
  await f.locator('.top h1').waitFor();
  console.log('SELECTED AGENT',await f.locator('.top h1').innerText());
  assert.equal((await f.locator('.top h1').innerText()).trim(),'Dost');
  await f.locator('.switch button').filter({hasText:'To-Do'}).click();
  await f.locator('.todocol').first().waitFor();
  console.log('TODOS TITLE',await f.locator('.todocol h3').allTextContents());
  await f.locator('.taskform').nth(1).locator('input').fill('Temporary test note');
  await f.locator('.taskform').nth(1).locator('button').click();
  await f.getByText('Temporary test note').waitFor();
  await page.reload({waitUntil:'domcontentloaded'});
  await f.locator('.agent').first().waitFor({timeout:20000});
  console.log('PAGE ERRORS',JSON.stringify(errors.slice(0,8)));
  console.log('FAILED API RESPONSES',JSON.stringify(failedResponses.slice(0,8)));
  console.log('PASS authenticated signup, onboarding, exact five agents, agent selection, task form');
 }finally{
  await browser.close();
  try{
   loadEnvConfig(path.resolve(__dirname,'..'));
   const db=new PrismaClient();
   try{const r=await db.user.deleteMany({where:{email}});console.log('CLEANUP',r.count)}finally{await db.$disconnect()}
  }catch(e){console.log('CLEANUP ERROR',e.message)}
 }
})().catch(e=>{console.error('TEST FAILURE',e.message);process.exit(1)});
