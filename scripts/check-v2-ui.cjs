
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const chats=[];
  let personal=[];
  let tasks=[];
  let conversations=[];
  let customAgents=[];
  const json=(route,obj,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(obj)});
  await page.route('**/api/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
    let body={};if(method!=='GET'){try{body=request.postDataJSON()||{}}catch{}}
    if(path==='/api/account')return json(route,{user:{id:'test-user',name:'Real Test Account',email:'realtest@example.com'}});
    if(path==='/api/agents'){
      if(method==='POST'){assert.equal(body.permissions[0],'report');assert.ok(/^#[A-Fa-f0-9]{6}$/.test(body.avatarColor));const created={id:'test-created',...body};customAgents.push(created);return json(route,created,201)}
      return json(route,{builtIn:[{id:'builtin-chief',name:'Chief',role:'Plan tasks',permissions:['report'],builtin:true}],custom:customAgents,messages:[]});
    }
    if(path==='/api/conversations'&&method==='GET')return json(route,conversations);
    if(path==='/api/conversations'&&method==='POST'){
      const conv={id:'test-conversation',title:body.title,_count:{messages:0}};
      conversations.unshift(conv);return json(route,conv,201);
    }
    if(path==='/api/conversations/test-conversation/messages'&&method==='POST'){
      assert.equal(body.agentId,'builtin-chief');
      chats.push(body);
      return route.fulfill({status:200,contentType:'application/x-ndjson',body:'{"type":"start","id":"reply"}\n{"type":"delta","text":"Real backend stream reply."}\n{"type":"done","tokens":11,"model":"test-model"}\n'});
    }
    if(path==='/api/conversations/test-conversation')return json(route,{id:'test-conversation',messages:[{id:'m1',role:'user',content:'hello',status:'completed'},{id:'m2',role:'assistant',content:'Real backend stream reply.',status:'completed',tokens:11}]});
    if(path==='/api/tasks'){
      if(method==='POST'){tasks.push({id:'task1',instruction:body.instruction,status:'queued'});return json(route,tasks[0],201)}
      return json(route,tasks);
    }
    if(path==='/api/personal-todos'){
      if(method==='POST'){const item={id:'11111111-1111-4111-8111-111111111111',text:body.text,done:false,createdAt:new Date().toISOString()};personal.push(item);return json(route,item,201)}
      if(method==='PATCH'){personal=personal.map(x=>x.id===body.id?{...x,done:body.done}:x);return json(route,personal[0])}
      if(method==='DELETE'){personal=personal.filter(x=>x.id!==body.id);return json(route,{ok:true})}
      return json(route,personal);
    }
    if(path==='/api/connectors')return json(route,[{provider:'gmail',name:'Gmail',auth:'Google OAuth',connection:null}]);
    if(path==='/api/whatsapp/linked')return json(route,{state:'disconnected'});
    if(path==='/api/usage')return json(route,{provider:'chatanywhere',chatTokens:11,taskTokens:0});
    if(path==='/api/profile')return json(route,{language:'en',timezone:'Asia/Karachi',answers:{},onboarded:true,onboardingStep:0});
    if(path==='/api/settings')return json(route,{theme:'light',model:'auto',voice:'auto',speed:1,volume:1,autoplay:false,microphoneId:''});
    return json(route,{error:'Unmocked route: '+path},404);
  });
  await page.goto('http://127.0.0.1:3000/reference/agenth-live.html',{waitUntil:'domcontentloaded'});
  await page.locator('.who b').waitFor({timeout:15000});
  assert.equal(await page.locator('.who b').innerText(),'Real Test Account');
  assert.equal(await page.locator('.who small').innerText(),'realtest@example.com');
  assert.ok(!await page.locator('body').innerText().then(t=>t.includes('Irum')));
  await page.locator('#messageInput').fill('hello');
  await page.locator('button[type=submit].voice').click();
  await page.getByText('Real backend stream reply.').waitFor({timeout:10000});
  assert.equal(chats.length,1);
  await page.locator('.switch button').filter({hasText:'To-Do'}).click();
  await page.locator('.taskform').nth(0).locator('input').fill('Research topic');
  await page.locator('.taskform').nth(0).locator('button').click();
  await page.getByText('Research topic').waitFor();
  await page.locator('.taskform').nth(1).locator('input').fill('Personal note');
  await page.locator('.taskform').nth(1).locator('button').click();
  await page.getByText('Personal note').waitFor();
  await page.locator('.search button').click();
  await page.locator('#agentName').fill('My Real Agent');
  await page.getByRole('button',{name:'Get started'}).click();
  await page.getByText('My Real Agent').first().waitFor();
  if(errors.length)throw Error('Page errors: '+errors.join(' | '));
  console.log('PASS authenticated profile, agents, streamed AI, task persistence, personal to-do, agent create');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
