import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { browserSession, screenshot, runtimePath, allowedBrowserUrl } from './browser';
import { encrypt, decrypt } from './security';

type RecordedStep={action:'navigate'|'click'|'type'|'press'|'scroll';description:string;selector?:string;url?:string;key?:string;placeholder?:string;amount?:number};
type StudioState={recording:boolean;steps:RecordedStep[];updatedAt:string};
type Skill={id:string;name:string;description:string;steps:RecordedStep[];createdAt:string};
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
  return {selector,sensitive,description:safe((target.innerText||label||tag).trim()).slice(0,90),tag};
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
   await recorded(userId,{action:'click',description:target?.sensitive?'Click sensitive field (not saved)':('Click '+(target?.description||'page element')),selector:target?.sensitive?undefined:target?.selector||undefined});
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
