import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { browserSession, screenshot, runtimePath, allowedBrowserUrl } from './browser';
import { encrypt, decrypt } from './security';

type RecordedStep={action:'navigate'|'click'|'type'|'press'|'scroll';description:string;selector?:string;url?:string;key?:string;placeholder?:string;amount?:number;x?:number;y?:number;fieldType?:string};
type StudioState={recording:boolean;steps:RecordedStep[];updatedAt:string};
type Skill={id:string;name:string;description:string;steps:RecordedStep[];createdAt:string};
const unsafePattern=/\b(send|submit|purchase|checkout|pay|delete|remove|transfer|publish|post|follow|like|unsubscribe|confirm|approve|save|invite|message|email|order|book)\b/i;
const safeSearchUrl=(value:string)=>{const url=new URL(value);return ['www.google.com','google.com','www.bing.com','bing.com','duckduckgo.com','www.duckduckgo.com'].includes(url.hostname)};
const locks=new Set<string>();
const current=new Map<string,StudioState>();
function defaultState():StudioState{return {recording:false,steps:[],updatedAt:new Date().toISOString()};}
async function load(userId:string){if(current.has(userId))return current.get(userId)!;let state=defaultState();try{const raw=await readFile(runtimePath(userId,'browser-recording.enc'),'utf8');const found=decrypt(raw) as StudioState;if(Array.isArray(found?.steps))state={...found,recording:false};}catch{}current.set(userId,state);return state;}
async function save(userId:string,state:StudioState){await mkdir(runtimePath(userId),{recursive:true});await writeFile(runtimePath(userId,'browser-recording.enc'),encrypt(state),'utf8');}
async function recorded(userId:string,step:RecordedStep){const state=await load(userId);if(state.recording){state.steps.push(step);state.steps=state.steps.slice(-80);state.updatedAt=new Date().toISOString();await save(userId,state);}}
async function skills(userId:string):Promise<Skill[]>{try{const raw=await readFile(runtimePath(userId,'browser-skills.enc'),'utf8');const list=decrypt(raw);return Array.isArray(list)?list:[]}catch{return[];}}
export async function studioSnapshot(userId:string){
 const state=await load(userId),s=await browserSession(userId),page=s.page;
 return {url:page.url(),title:await page.title(),recording:state.recording,steps:state.steps,skills:await skills(userId),viewport:{width:1280,height:800},manual:s.manual,updatedAt:state.updatedAt};
}
async function clickTarget(page:Awaited<ReturnType<typeof browserSession>>['page'],x:number,y:number){
 return page.evaluate(({x,y})=>{
  const e=document.elementFromPoint(x,y);if(!e)return null;
  const target=(e.closest('button,a,input,textarea,select,[role="button"],[role="link"],[role="combobox"],[contenteditable]')||e) as HTMLElement;
  const safe=(v:string)=>v.replace(/[^a-zA-Z0-9 _.-]/g,'').slice(0,90);
  const tag=target.tagName.toLowerCase();
  const label=target.getAttribute('aria-label')||target.getAttribute('placeholder')||'';
  const type=(target as HTMLInputElement).type||'';
  const sensitive=/password|secret|token|credit|card|otp|verification|security|pin/i.test(label+' '+type+' '+target.getAttribute('name'));
  const selector=target.id?'#'+CSS.escape(target.id):target.getAttribute('aria-label')?tag+'[aria-label="'+CSS.escape(target.getAttribute('aria-label')||'')+'"]':target.getAttribute('name')?tag+'[name="'+CSS.escape(target.getAttribute('name')||'')+'"]':target.getAttribute('placeholder')?tag+'[placeholder="'+CSS.escape(target.getAttribute('placeholder')||'')+'"]':'';
  return {selector,sensitive,description:safe((target.innerText||label||tag).trim()).slice(0,90),tag,fieldType:type};
 },{x,y});
}
export async function studioAction(userId:string,input:Record<string,unknown>){
 if(locks.has(userId))throw Error('Browser action still running. Try again after it completes.');
 locks.add(userId);
 try{
  const s=await browserSession(userId);if(s.manual)throw Error('Return browser control before using browser studio.');
  const p=s.page;
  const action=String(input.action||'');
  const state=await load(userId);
  if(action==='record-start'){state.steps=[];state.recording=true;await save(userId,state);}
  else if(action==='record-stop'){state.recording=false;await save(userId,state);}
  else if(action==='navigate'){
   const url=String(input.url||'').trim();
   await p.goto(await allowedBrowserUrl(url),{waitUntil:'domcontentloaded',timeout:30000});
   await recorded(userId,{action:'navigate',description:'Navigate to '+new URL(url).hostname,url:url.split('?')[0]});
  }else if(action==='click'){
   const x=Number(input.x),y=Number(input.y);
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1280||y<0||y>800)throw Error('Click outside browser viewport.');
   const target=await clickTarget(p,x,y);
   await p.mouse.click(x,y);
   await p.waitForLoadState('domcontentloaded',{timeout:6500}).catch(()=>{});
   await recorded(userId,{action:'click',description:target?.sensitive?'Click sensitive field (not saved)':('Click '+(target?.description||'page element')),selector:target?.sensitive?undefined:target?.selector||undefined,x:target?.sensitive?undefined:x,y:target?.sensitive?undefined:y});
  }else if(action==='focus-search'){
   if(!safeSearchUrl(p.url()))throw Error('Search focusing is only available on approved search websites.');
   const search=p.locator('textarea#sb_form_q:visible,input#sb_form_q:visible,textarea[name="q"]:visible,input[name="q"]:visible,input[name="search"]:visible,input[name="query"]:visible,[role="searchbox"]:visible,[role="combobox"][contenteditable="true"]:visible').first();
   await search.click({timeout:15000});
   await recorded(userId,{action:'click',description:'Click search field',selector:'textarea[name="q"],input[name="q"],input[name="search"],input[name="query"]'});
  }else if(action==='type'){
   const text=String(input.text||'');if(!text||text.length>1000)throw Error('Enter up to 1000 characters.');
   const element=await p.evaluate(()=>{const e=document.activeElement as HTMLInputElement|null;return {type:e?.type||'',label:e?.getAttribute('aria-label')||e?.getAttribute('placeholder')||'',tag:e?.tagName||''};});
   if(!['INPUT','TEXTAREA'].includes(element.tag))throw Error('Click an input field first, then type.');
   await p.keyboard.insertText(text);
   if(/password|secret|token|credit|card|otp|verification|security|pin/i.test(element.type+' '+element.label))await recorded(userId,{action:'type',description:'Enter private value (not recorded)',placeholder:'private_value'});
   else await recorded(userId,{action:'type',description:'Type text into '+(element.label||'selected field'),placeholder:'search_term'});
  }else if(action==='press'){
   const key=String(input.key||'');if(!['Enter','Tab','Escape','Backspace','ArrowDown','ArrowUp'].includes(key))throw Error('Unsupported key.');
   await p.keyboard.press(key);
   await recorded(userId,{action:'press',description:'Press '+key,key});
  }else if(action==='scroll'){
   const amount=Math.max(-1200,Math.min(1200,Number(input.amount)||500));
   await p.mouse.wheel(0,amount);await recorded(userId,{action:'scroll',description:'Scroll page',amount});
  }else if(action==='read'){}
  else throw Error('Unsupported browser studio action.');
  if(action!=='record-start'&&action!=='record-stop')await screenshot(userId);
  return studioSnapshot(userId);
 }finally{locks.delete(userId);}
}
export async function saveStudioSkill(userId:string,input:Record<string,unknown>){
 const state=await load(userId);
 const name=String(input.name||'').trim().slice(0,100),description=String(input.description||'').trim().slice(0,800);
 if(!name||!description||!state.steps.length)throw Error('Skill needs a name, description and recorded steps.');
 const edited=String(input.steps||'').trim();
 const instructions=edited?edited.split('\n').map(x=>x.trim()).filter(Boolean):[];
 if(instructions.length>80)throw Error('Too many steps.');
 const steps=instructions.length?instructions.map((line,i)=>({...state.steps[i%state.steps.length],description:line})):state.steps;
 if(steps.some(s=>s.description.length>500))throw Error('Each step must be at most 500 characters.');
 const list=await skills(userId);
 const skill:Skill={id:crypto.randomUUID(),name,description,steps,createdAt:new Date().toISOString()};
 list.unshift(skill);await mkdir(runtimePath(userId),{recursive:true});await writeFile(runtimePath(userId,'browser-skills.enc'),encrypt(list.slice(0,50)),'utf8');
 state.recording=false;state.steps=[];await save(userId,state);
 return skill;
}

/** Read-only search replay: skills cannot submit forms, send messages or perform purchases. */
export async function chatStudioSkill(userId:string,instruction:string):Promise<string|null>{
 const text=instruction.trim();
 const explicit=text.match(/^run\s+(?:my\s+)?(?:saved\s+)?skill\s*:\s*(.+?)\s*\|\s*(.+)$/i);
 const conversational=text.match(/^(?:run|chalao|chala\s*do)\s+(?:my\s+)?(?:saved\s+)?(.+?)\s+(?:skill\s+)?(?:for|search|about|ke\s+liye|par)\s+(.+)$/i);
 if(!explicit&&!conversational)return null;
 const name=(explicit||conversational)![1].trim(),term=(explicit||conversational)![2].trim();
 const all=await skills(userId);
 const match=all.find(s=>s.name.toLowerCase()===name.toLowerCase())||all.find(s=>s.name.toLowerCase().includes(name.toLowerCase())&&name.length>5);
 if(!match)return 'I could not find that saved skill. Open Teach a Task → Saved skills to check its exact name. For a search, say: Run skill: Google search for a term | renewable energy.';
 const done=await runStudioSkill(userId,match.id,term);
 const url=new URL(done.url);const publicSearch=url.origin+url.pathname+'?q='+encodeURIComponent(term);
 return 'Ran saved skill "'+done.skillName+'" for "'+term+'" in your private browser. '+done.trace.join(' → ')+'. Results URL: '+publicSearch+(done.previewUpdated?'':'. Preview screenshot could not refresh; the browser search itself completed.');
}
export async function runStudioSkill(userId:string,skillId:string,searchTerm:string){
 if(locks.has(userId))throw Error('Browser is busy. Finish the current action first.');
 const term=searchTerm.trim();
 if(!term||term.length>160||/[\r\n]/.test(term))throw Error('Enter a search term (maximum 160 characters).');
 const entry=(await skills(userId)).find(x=>x.id===skillId);
 if(!entry)throw Error('Saved skill not found.');
 if(entry.steps.length<2||entry.steps.length>40||!entry.steps.some(s=>s.action==='type')||!entry.steps.some(s=>s.action==='press'&&s.key==='Enter'))throw Error('A replayable search skill must include typing and pressing Enter. Record the full search first.');
 // Replays of arbitrary sites can have side effects. Only approved public search pages are replayable.
 const nav=entry.steps.find(x=>x.action==='navigate');
 if(!nav?.url||!safeSearchUrl(nav.url))throw Error('Safe replay currently supports Google, Bing and DuckDuckGo search skills only.');
 if(entry.steps.some(x=>!['navigate','click','type','press','scroll'].includes(x.action)||
  (x.action==='navigate'&&(!x.url||!safeSearchUrl(x.url)))||
  (x.action==='press'&&x.key!=='Enter')||
  (x.action==='click'&&unsafePattern.test(x.description)&&!/search/i.test(x.description))||
  (x.action==='type'&&x.placeholder==='private_value')))
  throw Error('This recording includes actions that need manual review; automatic replay is blocked.');
 locks.add(userId);
 try{
  const session=await browserSession(userId);
  if(session.manual)throw Error('Return browser control first.');
  const page=session.page;
  const trace:string[]=[];
  const searchInput=()=>page.locator('textarea#sb_form_q:visible,input#sb_form_q:visible,textarea[name="q"]:visible,input[name="q"]:visible,input[name="search"]:visible,input[name="query"]:visible,[role="searchbox"]:visible,[role="combobox"][contenteditable="true"]:visible').first();
  for(const step of entry.steps){
   if(step.action==='navigate'){
    await page.goto(await allowedBrowserUrl(step.url!),{waitUntil:'domcontentloaded',timeout:30000});
    trace.push('Opened search website');
   }else if(step.action==='click'){
    // Search focus is the only allowed automated click. Never replay arbitrary coordinates.
    const input=searchInput();await input.waitFor({state:'visible',timeout:12000});
    await input.click();trace.push('Selected search field');
   }else if(step.action==='type'){
    const input=searchInput();
    await input.fill(term);trace.push('Entered search term');
   }else if(step.action==='press'){
    const focused=await page.evaluate(()=>{const e=document.activeElement;return e?.getAttribute('name')||e?.getAttribute('role')||''});
    if(!['q','search','query','combobox'].includes(focused))throw Error('Search field is not focused; replay stopped safely.');
    await page.keyboard.press('Enter');await page.waitForLoadState('domcontentloaded',{timeout:8000}).catch(()=>{});
    // Search engines sometimes swallow Enter for autocomplete. A read-only search
    // URL is the safe equivalent, and avoids claiming success on the homepage.
    const visited=new URL(page.url());
    if((visited.searchParams.get('q')||'').toLowerCase()!==term.toLowerCase()){
     const searchUrl=new URL(visited.hostname.endsWith('duckduckgo.com')?'/' :'/search',new URL(nav.url!).origin);
     searchUrl.searchParams.set('q',term);
     await page.goto(await allowedBrowserUrl(searchUrl.toString()),{waitUntil:'domcontentloaded',timeout:25000});
    }
    const finished=new URL(page.url());
    if((finished.searchParams.get('q')||'').toLowerCase()!==term.toLowerCase())throw Error('Search did not reach results for the requested term.');
    trace.push('Searched');
   }else if(step.action==='scroll'){
    await page.mouse.wheel(0,Math.max(-1200,Math.min(1200,step.amount||500)));trace.push('Scrolled results');
   }
   if(page.url()!=='about:blank'&&!safeSearchUrl(page.url()))throw Error('Replay left an approved search site. Stopped.');
  }
  // Screenshot is a preview, not the browser action itself. A transient GPU capture
  // error must not turn a completed search into a false task failure.
  let previewUpdated=false;
  for(let attempt=0;attempt<2;attempt++){
   try{await screenshot(userId);previewUpdated=true;break;}catch{if(attempt===0)await page.waitForTimeout(350);}
  }
  return {ok:true,skillId:entry.id,skillName:entry.name,url:page.url(),title:await page.title(),trace,previewUpdated};
 }finally{locks.delete(userId);}
}
