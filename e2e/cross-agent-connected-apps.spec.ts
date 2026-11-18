import {test,expect} from './fixtures';

test('Chief gives WhatsApp and Gmail connection guidance without generic refusal',async({page})=>{
 test.setTimeout(80000);
 const origin='http://127.0.0.1:3000',email='app-guidance-qa-'+Date.now()+'@example.test',password='Connection-QA-813749!';
 let created=false;
 try{
  const r=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Connection QA',email,password}});
  expect(r.ok()).toBe(true);created=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Connection QA'},onboarded:true}});
  for(const [command,expected] of [['Send WhatsApp message to Mama: hello',"I can't send messages on WhatsApp while WhatsApp is not connected."],['Send email to teacher@example.com, subject: Interview; body: Hello, can we talk?','Gmail is not connected']]){
   const c=await page.request.post(origin+'/api/conversations',{headers:{origin},data:{title:'Chief • Connection QA'}});expect(c.ok()).toBe(true);
   const {id}=await c.json();
   const result=await page.request.post(origin+'/api/conversations/'+id+'/messages',{headers:{origin},data:{text:command,agentId:'builtin-chief'}});
   expect(result.ok()).toBe(true);
   const events=await result.text();
   expect(events).toContain(expected);
   expect(events).not.toContain('log in to your Gmail account directly');
  }
  const tasks=await page.request.get(origin+'/api/tasks');expect(tasks.ok()).toBe(true);
  expect((await tasks.json()).length).toBe(0);
 }finally{if(created)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{})}
});
