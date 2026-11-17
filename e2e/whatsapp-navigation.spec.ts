import {test,expect} from './fixtures';

test('connected WhatsApp automatically opens Agent, visible tabs, bilingual help',async({page})=>{
 test.setTimeout(90_000);
 const origin='http://127.0.0.1:3000';
 const email='wa-nav-qa-'+Date.now()+'@example.test',password='QA-WA-Navigation-438671!';
 let made=false;
 try{
  const signup=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'WhatsApp Navigation QA',email,password}});
  expect(signup.ok()).toBe(true);made=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'roman-ur',timezone:'Asia/Karachi',answers:{name:'WhatsApp Navigation QA'},onboarded:true}});
  await page.route('**/api/whatsapp/linked',async route=>{
    if(route.request().method()==='GET')return route.fulfill({json:{state:'connected',mode:'phone',agent:{id:'qa-whatsapp',name:'WhatsApp Manager'},consent:{chats:true,incoming:true,send:true},workerOnline:true}});
    return route.fulfill({status:405,json:{error:'QA blocked mutations'}});
  });
  await page.route('**/api/whatsapp/agent',async route=>route.fulfill({json:{agent:{id:'qa-whatsapp',name:'WhatsApp Manager'},tasks:[]}}));
  for(const width of [390,1366]){
   await page.setViewportSize({width,height:844});
   await page.goto(origin+'/dashboard/whatsapp-connect');
   const tab=page.getByRole('tab',{name:'WhatsApp Agent'});
   await expect(tab).toHaveAttribute('aria-selected','true',{timeout:20000});
   await expect(page.getByText('WhatsApp kaise use karein?')).toBeVisible();
   await page.getByRole('button',{name:'English',exact:true}).click();
   await expect(page.getByText('How to use WhatsApp Manager')).toBeVisible();
   await page.getByRole('button',{name:'Roman Urdu',exact:true}).click();
   await expect(page.getByText('WhatsApp kaise use karein?')).toBeVisible();
   await expect(page.getByRole('tab',{name:'Contacts'})).toBeVisible();
   await expect(page.getByRole('tab',{name:'WhatsApp Live'})).toBeVisible();
  }
 }finally{if(made)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});
