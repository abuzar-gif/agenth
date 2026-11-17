import {test,expect} from './fixtures';

test('Gmail disconnect guidance, Teach a Task entry and more responsive agent eyes',async({page})=>{
 test.setTimeout(115000);
 const origin='http://127.0.0.1:3000',email='gmail-eyes-qa-'+Date.now()+'@example.test',password='QA-Gmail-Teach-872633!';
 let created=false;
 try{
  const signup=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Guide QA',email,password}});
  expect(signup.ok()).toBe(true);created=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Guide QA'},onboarded:true}});
  const conversation=await page.request.post(origin+'/api/conversations',{headers:{origin},data:{title:'Chief • QA Gmail'}});expect(conversation.ok()).toBe(true);
  const {id}=await conversation.json();
  const response=await page.request.post(origin+'/api/conversations/'+encodeURIComponent(id)+'/messages',{headers:{origin},data:{agentId:'builtin-chief',text:'Please open my Gmail and check recent inbox'}});
  expect(response.ok()).toBe(true);
  const raw=await response.text();
  expect(raw).toContain('Gmail is not connected');
  expect(raw).toContain('Connected Apps');
  expect(raw).toContain('Email Manager');
  expect(raw).not.toContain('log in to your Gmail account directly');
  await page.setViewportSize({width:1366,height:900});
  await page.goto(origin+'/dashboard');
  const frame=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
  const teach=frame.getByRole('button',{name:/Teach a task/i});
  await expect(teach).toBeVisible({timeout:20000});
  const eye=frame.locator('.top .bot').first();
  await expect(eye).toBeVisible();
  const before=await eye.evaluate(el=>({animation:getComputedStyle(el.querySelector('.eye')!).animationDuration}));
  expect(before.animation).toBe('2.65s');
  const bounds=await eye.boundingBox();if(!bounds)throw Error('Agent avatar missing');
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);
  await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.5);
  const movement=await eye.evaluate(el=>getComputedStyle(el).getPropertyValue('--ex'));
  expect(parseFloat(movement)).toBeGreaterThan(3);
  await teach.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const studio=frame.frameLocator('iframe[title="Teach a Task Browser Studio"]');
  await expect(studio.getByRole('heading',{name:'Browser & Skills'})).toBeVisible({timeout:20000});
 }finally{if(created)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});