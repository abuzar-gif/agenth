const { chromium } = require('playwright');
const BASE='http://127.0.0.1:3000';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 const email='mobile-check-'+Date.now()+'@example.test';
 const password='Mobile-only-test-password-748291';
 let context;
 try{
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const examine=async(label,width)=>{
   const data=await page.evaluate(()=>{
    const w=innerWidth; const items=[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length && !['SCRIPT','STYLE'].includes(e.tagName)).map(e=>({name:e.tagName.toLowerCase()+(e.id?'#'+e.id:''),x:Math.round(e.getBoundingClientRect().x),right:Math.round(e.getBoundingClientRect().right),scroll:e.scrollWidth,client:e.clientWidth}));
    return {innerWidth:w,docWidth:document.documentElement.scrollWidth,offscreen:items.filter(e=>e.right>w+5||e.x<-5).slice(0,12).map(({name,x,right})=>({name,x,right})),textClipped:items.filter(e=>e.scroll>e.client+20&&e.client>0).slice(0,8).map(({name,scroll,client})=>({name,scroll,client}))};
   });
   results.push({label,width,...data});
   await page.screenshot({path:'test-results/mobile-qa-'+label+'-'+width+'.png',fullPage:true,animations:'disabled'});
  };
  for(const w of [375,390]){
    await page.setViewportSize({width:w,height:844});
    for(const [label,path] of [['landing','/'],['login','/login']]){
      await page.goto(BASE+path,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(350);await examine(label,w);
    }
  }
  const origin=BASE;
  const register=await page.request.post(BASE+'/api/register',{headers:{origin},data:{name:'Mobile QA',email,password}});
  if(!register.ok())throw Error('Synthetic signup failed: '+register.status());
  const csrf=await (await page.request.get(BASE+'/api/auth/csrf')).json();
  await page.request.post(BASE+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:BASE+'/dashboard'}});
  const profile=await page.request.put(BASE+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Mobile QA'},onboarded:true,onboardingStep:10}});
  if(!profile.ok())throw Error('Synthetic profile failed');
  for(const w of [375,390]){
   await page.setViewportSize({width:w,height:844});
   for(const [label,path] of [['dashboard','/dashboard'],['agents','/dashboard?tab=explore'],['whatsapp','/dashboard?tab=apps']]){
    await page.goto(BASE+path,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(1800);await examine(label,w);
    if(label==='dashboard'){
      const frame=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
      const iframe=await frame.locator('body').evaluate(()=>{
       const nodes=[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName.toLowerCase()+(e.id?'#'+e.id:''),r:e.getBoundingClientRect()}));
       return {innerWidth,docWidth:document.documentElement.scrollWidth,offscreen:nodes.filter(e=>e.r.right>innerWidth+5 || e.r.x<-5).slice(0,12).map(e=>({tag:e.tag,right:Math.round(e.r.right),x:Math.round(e.r.x)}))};
      });
      results.push({label:'dashboard-iframe',width:w,...iframe});
    }
   }
  }
 }finally{
  if(context){try{await context.request.delete(BASE+'/api/account',{headers:{origin:BASE},data:{confirmation:'DELETE MY ACCOUNT'}});}catch{}}
  await browser.close();
 }
 console.log('MOBILE_QA_RESULTS',JSON.stringify(results));
})().catch(e=>{console.log('MOBILE_QA_ERROR',e.message);process.exitCode=1});