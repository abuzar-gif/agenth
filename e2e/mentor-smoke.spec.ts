import {test,expect} from '@playwright/test';

test('mentor readiness: account, four agents, custom agent, chat, schedule guard, WhatsApp status',async({page})=>{
  test.setTimeout(240_000);
  const origin='http://127.0.0.1:3000';
  const email='mentor-smoke-'+Date.now()+'@example.test';
  const password='Mentor-Smoke-QA-only-987654';
  let accountCreated=false;
  try {
    const registered=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Mentor QA',email,password}});
    accountCreated=registered.ok();
    expect(registered.ok(), 'temporary signup').toBe(true);
    const csrf=await (await page.request.get(origin+'/api/auth/csrf')).json();
    const login=await page.request.post(origin+'/api/auth/callback/credentials',{
      headers:{origin,'X-Auth-Return-Redirect':'1'},
      form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}
    });
    expect(login.ok(),'sign-in').toBe(true);
    const session=await (await page.request.get(origin+'/api/auth/session')).json();
    expect(session.user?.email).toBe(email);
    await page.goto(origin+'/dashboard/welcome');
    await expect(page.locator('.onboarding')).toBeVisible();
    const profile=await page.request.put(origin+'/api/profile',{
      headers:{origin},
      data:{language:'roman-ur',timezone:'Asia/Karachi',answers:{name:'Mentor QA'},onboarded:true,onboardingStep:10}
    });
    expect(profile.ok(),'save onboarding/profile').toBe(true);
    await page.goto(origin+'/dashboard');
    await expect(page.locator('iframe[title="AgentH V2 dashboard"]')).toBeVisible();
    const agentsResponse=await page.request.get(origin+'/api/agents');
    expect(agentsResponse.ok()).toBe(true);
    const agents=await agentsResponse.json();
    for(const name of ['Chief','Email Manager','Dost','1000$ Maker'])
      expect(agents.builtIn.some((a:{name:string})=>a.name===name),name+' available').toBe(true);
    const created=await page.request.post(origin+'/api/agents',{
      headers:{origin},data:{name:'Schedule QA Agent',role:'Help organize schedules and reminders in Roman Urdu',
        permissions:['report'],avatarColor:'teal',avatarShape:'soft'}
    });
    expect(created.ok(),'custom agent created').toBe(true);
    const custom=await created.json();
    expect(custom.name).toBe('Schedule QA Agent');
    const duplicate=await page.request.post(origin+'/api/agents',{
      headers:{origin},data:{name:'Schedule QA Agent',role:'Duplicate',permissions:['report']}
    });
    expect(duplicate.status(),'duplicate agent prevented').toBe(400);
    for(const agent of [agents.builtIn.find((a:{name:string})=>a.name==='Chief'),
       agents.builtIn.find((a:{name:string})=>a.name==='Dost'),custom]){
      const conversation=await page.request.post(origin+'/api/conversations',{
        headers:{origin},data:{title:agent.name+' • Smoke test'}
      });
      expect(conversation.status()).toBe(201);
      const {id}=await conversation.json();
      const response=await page.request.post(origin+'/api/conversations/'+encodeURIComponent(id)+'/messages',{
        headers:{origin},data:{agentId:agent.id,text:'Hi, reply in one short sentence.'},timeout:90_000
      });
      expect(response.status(),agent.name+' chat endpoint').toBe(200);
      const chunks=(await response.text()).trim().split('\n').map((line:string)=>JSON.parse(line));
      expect(chunks.some((c:{type:string})=>c.type==='done'),agent.name+' completed').toBe(true);
      expect(chunks.some((c:{type:string})=>c.type==='error'),agent.name+' no stream error').toBe(false);
      const reply=chunks.filter((c:{type:string})=>c.type==='delta').map((c:{text:string})=>c.text).join('');
      expect(reply.trim().length,agent.name+' nonempty reply').toBeGreaterThan(3);
      const saved=await (await page.request.get(origin+'/api/conversations/'+encodeURIComponent(id))).json();
      expect(saved.messages.some((m:{role:string;agent:string;status:string})=>m.role==='assistant'&&m.agent===agent.name&&m.status==='completed')).toBe(true);
    }
    const badSchedule=await page.request.post(origin+'/api/schedules',{
      headers:{origin},data:{instruction:'QA schedule validation',at:'2020-01-01T00:00:00Z',timezone:'Asia/Karachi'}
    });
    expect([400,422].includes(badSchedule.status()),'past schedule rejected').toBe(true);
    const wa=await page.request.get(origin+'/api/whatsapp/linked');
    expect(wa.ok(),'WhatsApp connector status readable').toBe(true);
    await page.goto(origin+'/dashboard');
    await expect(page.locator('iframe[title="AgentH V2 dashboard"]')).toBeVisible();
  } finally {
    if(accountCreated){
      await page.request.delete(origin+'/api/account',{
        headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'},timeout:20_000
      }).catch(()=>{});
    }
  }
});
