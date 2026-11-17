import {test,expect} from './fixtures';
test('voice understands contact and exact message, plus natural contact ordinals',async({page})=>{
 test.setTimeout(90000);
 const origin='http://127.0.0.1:3000',email='qa-voice-command-'+Date.now()+'@example.test',password='QA-Voice-cmd-752093!';
 let created=false;
 try{
  const signup=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Voice Command QA',email,password}});expect(signup.ok()).toBeTruthy();created=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Voice Command QA'},onboarded:true}});
  await page.setViewportSize({width:393,height:852});await page.goto(origin+'/dashboard');
  const frame=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
  const call=frame.getByRole('button',{name:/Start voice call with/});await expect(call).toBeVisible({timeout:20000});
  const style=await call.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e.querySelector('svg')!).stroke,svg:!!e.querySelector('svg')}));
  expect(style.bg).toBe('rgb(40, 124, 245)');expect(style.color).toBe('rgb(255, 255, 255)');expect(style.svg).toBe(true);
  const parsed=await frame.locator('body').evaluate(()=>{
    const inputs=['Open WhatsApp and message mama hello','send message to mama hello','Message Ali: how are you','mama ko hello message bhejo'];
    return {inputs:inputs.map(v=>(window as any).v2VoiceWhatsAppCommand(v)),choices:['first','first first','first one','the first one','second one','dusra'].map(v=>(window as any).v2VoiceContactIndex(v,[{name:'Mama Personal'},{name:'Mama Work'}]))};
  });
  expect(parsed.inputs.map((v:any)=>v?.body)).toEqual(['hello','hello','how are you','hello']);
  expect(parsed.inputs.map((v:any)=>v?.recipient)).toEqual(['mama','mama','Ali','mama']);
  expect(parsed.choices).toEqual([0,0,0,0,1,1]);
  await call.click();await expect(frame.getByRole('button',{name:'End call'})).toBeVisible();
 }finally{if(created)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});