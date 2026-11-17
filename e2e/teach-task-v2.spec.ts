import {test,expect} from './fixtures';

test('Teach a Task stays inside V2, closes with X and types directly into browser',async({page})=>{
 test.setTimeout(110000);
 const origin='http://127.0.0.1:3000';
 const email='studio-v2-qa-'+Date.now()+'@example.test',password='Studio-Direct-QA-752931!';
 let made=false;
 try{
  const created=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Studio V2 QA',email,password}});
  expect(created.ok()).toBeTruthy();made=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Studio V2 QA'},onboarded:true}});
  await page.goto(origin+'/dashboard');
  const v2=page.frameLocator('iframe[title="AgentH V2 dashboard"]');
  const teach=v2.getByRole('button',{name:/Teach a task/i});
  await expect(teach).toBeVisible({timeout:20000});
  await teach.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(v2.getByRole('dialog',{name:'Teach a Task'})).toBeVisible();
  await expect(v2.getByRole('button',{name:'Close Teach a Task'})).toBeVisible();
  const studio=v2.frameLocator('iframe[title="Teach a Task Browser Studio"]');
  const studioResponse=await page.request.get(origin+'/dashboard/studio');
  expect(studioResponse.ok()).toBeTruthy();
  expect(studioResponse.headers()['x-frame-options']).toBe('SAMEORIGIN');
  await expect(studio.getByRole('heading',{name:'Browser & Skills'})).toBeVisible({timeout:20000});
  await expect(studio.getByRole('textbox',{name:'Text to type into selected website field'})).toHaveCount(0);
  await studio.getByRole('button',{name:'Record skill'}).click();
  await studio.getByRole('button',{name:'Open Google'}).click();
  await expect(studio.getByRole('img',{name:/Interactive screenshot/})).toBeVisible({timeout:25000});
  const image=studio.getByRole('img',{name:/Interactive screenshot/});
  // Google homepage center search field (1280x800 browser viewport).
  const box=await image.boundingBox();if(!box)throw Error('Browser screenshot unavailable');
  await image.click({position:{x:Math.round(box.width*620/1280),y:Math.round(box.height*352/800)}});
  const keyboard=studio.getByRole('textbox',{name:'Website keyboard input'});
  await expect(keyboard).toBeFocused();
  await keyboard.pressSequentially('agenth studio regression',{delay:8});
  await keyboard.press('Enter');
  await page.waitForTimeout(2200);
  await expect(studio.locator('.studio-error')).toHaveCount(0);
  const progress=await page.request.get(origin+'/api/browser/studio');
  expect(progress.ok()).toBeTruthy();
  const typedState=await progress.json() as {steps:{action:string}[]};
  expect(typedState.steps.map(x=>x.action)).toEqual(expect.arrayContaining(['navigate','click','type','press']));
  await studio.getByRole('button',{name:'Stop recording'}).click();
  await expect(studio.getByText('Review the skill',{exact:true})).toBeVisible();
  await studio.getByRole('button',{name:'Discard'}).click();
  await v2.getByRole('button',{name:'Close Teach a Task'}).click();
  await expect(v2.getByRole('dialog',{name:'Teach a Task'})).toHaveCount(0);
  await expect(v2.locator('.composer')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
 }finally{if(made)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});}
});