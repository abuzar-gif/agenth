const {chromium}=require('playwright');
const {randomBytes}=require('node:crypto');
const {loadEnvConfig}=require('@next/env');
const {PrismaClient}=require('@prisma/client');
const path=require('node:path');
const email='agenth-auth-flow-'+Date.now()+'@example.com';
const password='Temp-'+randomBytes(12).toString('hex');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const err=[];
 const landing=await browser.newPage({viewport:{width:1360,height:860}});
 landing.on('pageerror',e=>err.push('landing '+e.message));
 try{
   await landing.goto('http://localhost:3000/',{waitUntil:'domcontentloaded'});
   const trigger=landing.getByRole('button',{name:/Continue with email/i});
   console.log('LANDING EMAIL TRIGGER COUNT',await trigger.count());
   await trigger.click();
   await landing.getByRole('dialog',{name:'Create an account'}).waitFor({timeout:5000});
   console.log('LANDING MODAL OPENED:',await landing.getByRole('dialog').count());
   await landing.getByPlaceholder('Your name').fill('AgentH Flow Test');
   await landing.getByPlaceholder('you@example.com').fill(email);
   await landing.getByPlaceholder('At least 10 characters').fill(password);
   await landing.getByRole('button',{name:'Create account'}).click();
   await landing.waitForURL(/\/dashboard\/welcome|\/dashboard|\/login/, {timeout:15000});
   console.log('LANDING SIGNUP URL',landing.url());
   const alert=await landing.locator('p[role=alert]').allTextContents();console.log('SIGNUP ALERTS',alert);
   const session=await landing.request.get('http://localhost:3000/api/auth/session');
   console.log('LANDING SIGNUP AUTH',session.status(),(await session.json())?.user?.email===email);
   const newctx=await browser.newContext({viewport:{width:1360,height:860}});
   const signin=await newctx.newPage();signin.on('pageerror',e=>err.push('sign-in '+e.message));
   await signin.goto('http://localhost:3000/login',{waitUntil:'domcontentloaded'});
   await signin.getByPlaceholder('you@example.com').fill(email);
   await signin.getByPlaceholder('Your password').fill(password);
   await signin.getByRole('button',{name:'Sign in',exact:true}).click();
   await signin.waitForURL(url => url.pathname.startsWith('/dashboard'), {timeout:25000});
   await signin.waitForTimeout(1000);
   console.log('EXISTING ACCOUNT LOGIN URL',signin.url());
   console.log('EXISTING ACCOUNT LOGIN ERRORS',await signin.locator('[role=alert]').allTextContents());
   const session2=await signin.request.get('http://localhost:3000/api/auth/session');
   console.log('EXISTING ACCOUNT AUTH',session2.status(),(await session2.json())?.user?.email===email);
   console.log('BROWSER ERRORS',err);
   await newctx.close();
 } finally {
   await browser.close();
   try{loadEnvConfig(path.resolve(__dirname,'..'));const db=new PrismaClient();try{console.log('REMOVED TEST ACCOUNTS',(await db.user.deleteMany({where:{email}})).count)}finally{await db.$disconnect()}}catch(e){console.log('CLEANUP FAILED',e.message)}
 }
})().catch(e=>{console.error('FLOW ERROR',e);process.exit(1)});
