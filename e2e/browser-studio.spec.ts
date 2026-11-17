import {test,expect} from './fixtures';

test('Browser Studio records Google-style navigation and saves a private reviewed skill',async({page})=>{
 test.setTimeout(120_000);
 const origin='http://127.0.0.1:3000';
 const email='browser-studio-qa-'+Date.now()+'@example.test',password='Browser-QA-Strong-83615';
 let account=false;
 try{
  const r=await page.request.post(origin+'/api/register',{headers:{origin},data:{name:'Browser Studio QA',email,password}});
  expect(r.ok()).toBe(true);account=true;
  const csrf=await(await page.request.get(origin+'/api/auth/csrf')).json();
  await page.request.post(origin+'/api/auth/callback/credentials',{headers:{origin,'X-Auth-Return-Redirect':'1'},form:{csrfToken:csrf.csrfToken,email,password,callbackUrl:origin+'/dashboard'}});
  await page.request.put(origin+'/api/profile',{headers:{origin},data:{language:'en',timezone:'Asia/Karachi',answers:{name:'Browser Studio QA'},onboarded:true}});
  await page.goto(origin+'/dashboard?tab=browser');
  await expect(page.getByRole('heading',{name:'Browser & Skills'})).toBeVisible({timeout:20000});
  await page.getByRole('button',{name:'Record skill'}).click();
  await expect(page.getByRole('button',{name:'Stop recording'})).toBeVisible();
  const p=await page.request.post(origin+'/api/browser/studio',{headers:{origin},data:{action:'navigate',url:'https://example.com'}});
  expect(p.ok(),await p.text()).toBe(true);
  await page.getByRole('button',{name:'Stop recording'}).click();
  const dialogue=page.getByText('Review the skill',{exact:true}).last();
  await expect(dialogue).toBeVisible();
  await page.getByPlaceholder('Google search for a term').fill('Example page load');
  await page.getByPlaceholder('Search Google and confirm results have loaded…').fill('Navigate to example.com and inspect loaded page.');
  await page.getByRole('button',{name:'Save skill',exact:true}).click();
  await expect(page.getByText('Example page load',{exact:true}).last()).toBeVisible();
  const state=await page.request.get(origin+'/api/browser/studio');
  expect(state.ok()).toBe(true);
  const result=await state.json();
  expect(result.skills.some((s:{name:string})=>s.name==='Example page load')).toBe(true);
 }finally{
  if(account)await page.request.delete(origin+'/api/account',{headers:{origin},data:{confirmation:'DELETE MY ACCOUNT'}}).catch(()=>{});
 }
});
