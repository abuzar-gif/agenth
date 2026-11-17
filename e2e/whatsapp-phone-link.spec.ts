import {test,expect} from './fixtures';

test('phone-number pairing accepts local 03 number, shows returned code, and never contacts real WhatsApp in QA',async({page})=>{
 test.setTimeout(90_000);
 const origin=process.env.TEST_BASE_URL||'http://127.0.0.1:3000';
 const email='phone-pair-qa-'+Date.now()+'@example.test',password='Phone-test-QA-74399281';
 const headers={origin};let registered=false;
 try{
  const r=await page.request.post(origin+'/api/register',{headers,data:{name:'Phone Pair QA',email,password}});
  expect(r.ok()).toBe(true);registered=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{...headers,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers,data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Phone Pair QA'},onboarded:true}});
  let phoneSent='',connected=false;
  await page.route('**/api/whatsapp/linked',async route=>{
   if(route.request().method()==='POST'){
    const b=route.request().postDataJSON();phoneSent=b.phone;
    expect(b.mode).toBe('phone');connected=true;
    await route.fulfill({status:202,json:{state:'connecting',mode:'phone'}});return;
   }
   await route.fulfill({json:connected?{state:'pairing',mode:'phone',workerOnline:true,code:'4728-1190'}:{state:'disconnected',workerOnline:true}});
  });
  await page.goto(origin+'/dashboard?tab=apps');
  await page.getByRole('button',{name:'Connect WhatsApp',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Connect WhatsApp',exact:true});
  await dialog.getByLabel('This is my account').check();
  await dialog.getByRole('button',{name:'Choose linking method'}).click();
  await dialog.getByRole('button',{name:'Phone number'}).click();
  await dialog.getByPlaceholder('03001234567').fill('03001234567');
  await expect(dialog.getByText('Detected: +92 300 1234567')).toBeVisible();
  await dialog.getByRole('button',{name:'Get pairing code'}).click();
  await expect.poll(()=>phoneSent).toBe('923001234567');
  await expect(dialog.getByLabel('WhatsApp pairing code')).toHaveText('4728-1190',{timeout:18000});
 }finally{
  if(registered)await page.request.delete(origin+'/api/account',{headers,data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});
 }
});
