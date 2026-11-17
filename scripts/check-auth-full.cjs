const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const path=require('node:path');
const email='agenth-auth-smoke-'+Date.now()+'@example.com';
const password='TestStrong-'+randomBytes(12).toString('hex');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[],responses=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async r=>{
  if(/\/api\/(register|auth\/callback|auth\/session)/.test(r.url())){
   let body='';try{body=(await r.text()).slice(0,800)}catch{}
   responses.push({url:r.url().split('?')[0],status:r.status(),body:body.replace(/"token":"[^"]+"/g,'"token":"redacted"')});
  }
 });
 try{
 await page.goto('http://localhost:3000/login?signup=1',{waitUntil:'domcontentloaded'});
 await page.getByPlaceholder('Your name').fill('AgentH Auth Test');
 await page.getByPlaceholder('you@example.com').fill(email);
 await page.getByPlaceholder('At least 10 characters').fill(password);
 await page.getByRole('button',{name:'Create account'}).click();
 await page.waitForTimeout(3500);
 const route=page.url();
 const alert=await page.locator('[role="alert"]').allTextContents();
 const headings=await page.locator('h1').allTextContents();
 const session=await page.request.get('http://localhost:3000/api/auth/session');
 console.log('TEST EMAIL',email);
 console.log('AFTER SIGNUP',route,'HEADINGS',headings,'ALERTS',alert);
 console.log('SESSION STATUS',session.status(),'USER',await session.text().then(t=>{try{const j=JSON.parse(t);return {email:j?.user?.email,idAvailable:!!j?.user?.id}}catch{return t.slice(0,50)}}));
 console.log('RESPONSES',JSON.stringify(responses));
 console.log('ERRORS',errors);
 }finally{
  await browser.close();
  try{
    loadEnvConfig(path.resolve(__dirname,'..'));
    const db=new PrismaClient();
    try{const rows=await db.user.deleteMany({where:{email}});console.log('CLEANUP DELETED TEST ACCOUNTS',rows.count)}finally{await db.$disconnect()}
  }catch(e){console.log('CLEANUP ERROR',e.message)}
 }
})().catch(e=>{console.error('TEST FAILURE',e);process.exit(1)});
