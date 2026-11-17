import {test,expect} from './fixtures';
test('voice call is visible and opens on desktop and iPhone width',async({page})=>{
 test.setTimeout(90000);
 const origin='http://127.0.0.1:3000';
 const email='voice-smoke-'+Date.now()+'@example.test',password='QA-V0ice-Pass-87619';
 let created=false;
 try{
  const signup=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Voice QA',email,password}});
  expect(signup.ok()).toBeTruthy();created=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Voice QA'},onboarded:true}});
  for(const width of [1366,430,393]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+'/dashboard');
   const frame=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
   const call=frame.getByRole('button',{name:/Start voice call with/});
   await expect(call).toBeVisible({timeout:20000});
   await call.click();
   await expect(frame.getByRole('dialog',{name:/Voice call with/})).toBeVisible();
   await expect(frame.getByRole('button',{name:'End call'})).toBeVisible();
   await frame.getByRole('button',{name:'End call'}).click();
   await expect(frame.getByRole('dialog',{name:/Voice call with/})).toHaveCount(0);
  }
 }finally{if(created)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});