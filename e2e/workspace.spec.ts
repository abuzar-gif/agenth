import {test,expect} from './fixtures';
test.afterEach(async({page})=>{
  // Remove only the authenticated account created by this test fixture.
  const response=await page.request.get('/api/tasks');if(response.status()!==200)return;
  const tasks=await response.json();for(const t of tasks)if(!['completed','cancelled'].includes(t.status))await page.request.post(`/api/tasks/${t.id}`,{headers:{origin:'http://localhost:3000'},data:{action:'cancel'}});
  await page.request.delete('/api/account',{headers:{origin:'http://localhost:3000'},data:{confirmation:'DELETE MY ACCOUNT'}});
});
test('public landing, protected APIs, and login setup states',async({page,request})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:/Less busywork/})).toBeVisible();
  expect((await request.get('/api/tasks')).status()).toBe(401);
  await page.goto('/dashboard');await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();
});
test('signup, multilingual onboarding, persisted tasks, approval, schedules, isolation and responsive layout',async({page,browser})=>{
  test.setTimeout(480000);
  const email=`qa-${Date.now()}@example.test`,password='Test-only-password-3982';
  await page.goto('/login');await page.getByRole('button',{name:'Sign up',exact:true}).click();
  await page.getByLabel('Your name').fill('QA User');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create account',exact:false}).click();await expect(page).toHaveURL(/dashboard/);
  await expect(page).toHaveURL(/dashboard\/welcome/);
  await expect(page.getByRole('heading',{name:/Make yourself/})).toBeVisible();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Hello and Assalamualaikum! Would you prefer to continue in English, Urdu, or Roman Urdu?')).toBeVisible();
  await page.getByLabel('Preferred language').selectOption('ur');await expect(page.locator('.onboarding')).toHaveAttribute('dir','rtl');
  await page.getByLabel('Preferred language').selectOption('roman-ur');await expect(page.locator('.onboarding')).toHaveAttribute('dir','ltr');
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Type your answer',exact:true}).click();await page.getByLabel('Your answer',{exact:true}).fill('Ali');await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.locator('.answer-chips')).toContainText('Ali');await page.reload();await expect(page.locator('.answer-chips')).toContainText('Ali');
  for(let i=0;i<7;i++){await expect(page.getByRole('button',{name:'Skip',exact:true})).toBeEnabled({timeout:180000});await page.getByRole('button',{name:'Skip',exact:true}).click();}
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Welcome back, Ali.'})).toBeVisible({timeout:180000});
  await expect(page.getByLabel('Workspace language')).toHaveValue('roman-ur');
  await page.reload();await expect(page.getByRole('heading',{name:'Welcome back, Ali.'})).toBeVisible();
  const origin='http://localhost:3000';
  const bad=await page.request.post('/api/tasks',{headers:{origin},data:{instruction:''}});expect(bad.status()).toBe(400);
  const created=await page.request.post('/api/tasks',{headers:{origin},data:{instruction:'QA request: please introduce yourself.'}});expect(created.status()).toBe(201);const task=await created.json();await page.request.post(`/api/tasks/${task.id}`,{headers:{origin},data:{action:'cancel'}});
  const stranger=await browser.newContext();expect((await stranger.request.get(`${origin}/api/tasks`)).status()).toBe(401);await stranger.close();
  await page.getByRole('button',{name:'☰ Workspace'}).count();await page.getByRole('button',{name:/Tasks & history/}).click();await expect(page.getByText('QA request: please introduce yourself.',{exact:true})).toBeVisible({timeout:15000});
  const gated=await page.request.post('/api/browser',{headers:{origin},data:{action:'click',selector:'button'}});expect(gated.status()).toBe(201);const gatedTask=await gated.json();
  await expect.poll(async()=>{const r=await page.request.get('/api/tasks');const data=await r.json();return data.find((t:any)=>t.id===gatedTask.id)?.status;},{timeout:180000}).toBe('waiting_approval');
  await expect(page.getByRole('button',{name:'Approve this action'})).toBeVisible();
  await page.getByRole('button',{name:'Reject',exact:true}).click();
  const schedule=await page.request.post('/api/schedules',{headers:{origin},data:{instruction:'QA scheduled research',at:new Date(Date.now()+3600000).toISOString(),timezone:'Asia/Karachi'}});expect(schedule.ok()).toBeTruthy();
  await page.getByRole('button',{name:/Schedules/}).click();await expect(page.getByRole('heading',{name:'QA scheduled research'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-workspace.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Chat$/}).click();await page.screenshot({path:'test-results/desktop-workspace.png',fullPage:true});
  // Delete only the test-owned account after stopping its tasks.
  await page.waitForTimeout(2000);await page.request.delete('/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}});
});


