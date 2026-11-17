import {test,expect} from './fixtures';

test('saved search skill can run with a new search term and blocks unsafe replay',async({page})=>{
 test.setTimeout(120000);
 const origin='http://127.0.0.1:3000',email='skill-replay-'+Date.now()+'@example.test',password='Skill-Replay-QA-753918!';
 let account=false;
 const api=async(action:string,fields:Record<string,unknown>={})=>{
  const r=await page.request.post(origin+'/api/browser/studio',{headers:{origin},data:{action,...fields}});
  const body=await r.json();return {status:r.status(),body};
 };
 try{
  const signup=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Skill Replay QA',email,password}});if(!signup.ok())throw Error('Signup HTTP '+signup.status()+' '+(await signup.text()).slice(0,200));account=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Skill Replay QA'},onboarded:true}});
  await page.goto(origin+'/dashboard/studio');
  await expect(page.getByRole('heading',{name:'Browser & Skills'})).toBeVisible();
  expect((await api('record-start')).status).toBe(200);
  const nav=await api('navigate',{url:'https://www.bing.com'});
  expect(nav.status).toBe(200);
  test.skip(!String(nav.body.url).startsWith('https://www.bing.com/'),'Bing did not load in this isolated browser session; remote search is unavailable for live E2E.');
  const focused=await api('focus-search');if(focused.status!==200)throw Error('FOCUS_FAIL '+JSON.stringify(focused.body).slice(0,350));
  const typed=await api('type',{text:'sample query'});if(typed.status!==200)throw Error('TYPE_FAIL '+JSON.stringify(typed.body).slice(0,300));
  const pressed=await api('press',{key:'Enter'});if(pressed.status!==200)throw Error('PRESS_FAIL '+JSON.stringify(pressed.body).slice(0,350));
  expect((await api('record-stop')).status).toBe(200);
  const saved=await api('skill-save',{name:'Bing search for a term',description:'Search Bing using the chosen phrase.'});
  expect(saved.status).toBe(200);const skillId=saved.body.skill.id;
  await page.reload();
  await expect(page.getByText('Bing search for a term',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'▶ Run skill'}).click();
  await page.getByPlaceholder('e.g. artificial intelligence').fill('renewable energy');
  await page.getByRole('button',{name:'Run safely'}).click();
  await expect(page.getByText(/Completed: Bing search for a term/)).toBeVisible({timeout:45000});
  const state=await page.request.get(origin+'/api/browser/studio');const snapshot=await state.json();
  expect(snapshot.url).toContain('bing.com/search');
  expect(decodeURIComponent(snapshot.url)).toMatch(/renewable|energy/i);
  const conv=await page.request.post(origin+'/api/conversations',{headers:{origin},data:{title:'Chief • Skill Replay QA'}});
  expect(conv.ok()).toBe(true);
  const {id:conversationId}=await conv.json();
  const chat=await page.request.post(origin+'/api/conversations/'+conversationId+'/messages',{headers:{origin},data:{text:'Run skill: Bing search for a term | solar power',agentId:'builtin-chief'}});
  expect(chat.ok()).toBe(true);
  const stream=await chat.text();
  expect(stream).toContain('Ran saved skill');
  expect(stream).toContain('solar power');
  const rejected=await api('skill-run',{skillId,searchTerm:''});
  expect(rejected.status).not.toBe(200);
  // Restriction: arbitrary example.com navigation is saved but cannot be auto-replayed.
  expect((await api('record-start')).status).toBe(200);
  expect((await api('navigate',{url:'https://example.com'})).status).toBe(200);
  expect((await api('record-stop')).status).toBe(200);
  const unsafe=await api('skill-save',{name:'Other website',description:'Navigate to unrelated public website.'});
  expect(unsafe.status).toBe(200);
  const blocked=await api('skill-run',{skillId:unsafe.body.skill.id,searchTerm:'test'});
  expect(blocked.status).not.toBe(200);
 }finally{if(account)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});