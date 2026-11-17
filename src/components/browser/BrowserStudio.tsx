'use client';
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useRef,useState,type FormEvent,type MouseEvent} from 'react';
import {ArrowRight,Check,Globe2,Keyboard,LoaderCircle,MousePointer2,Save,Square,Video} from 'lucide-react';
import './browser-studio.css';

type Step={action:string;description:string;selector?:string;url?:string;key?:string;placeholder?:string};
type Skill={id:string;name:string;description:string;steps:Step[];createdAt:string};
type State={url:string;title:string;recording:boolean;steps:Step[];skills:Skill[];updatedAt:string};
const initial:State={url:'about:blank',title:'',recording:false,steps:[],skills:[],updatedAt:''};

async function request(input?:Record<string,unknown>):Promise<State&{error?:string}>{
 const response=await fetch('/api/browser/studio',{credentials:'same-origin',cache:'no-store',...(input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});
 const data=await response.json().catch(()=>({error:'Unexpected browser response'}));
 if(!response.ok)throw Error(data.error||'Browser request failed');
 return data;
}
export default function BrowserStudio(){
 const [state,setState]=useState<State>(initial),[address,setAddress]=useState('https://www.google.com');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[value,setValue]=useState('');
 const [imageUrl,setImageUrl]=useState(''),[loadingImage,setLoadingImage]=useState(false);
 const [showSkill,setShowSkill]=useState(false),[skillName,setSkillName]=useState(''),[description,setDescription]=useState(''),[steps,setSteps]=useState('');
 const [saved,setSaved]=useState('');
 const ref=useRef<HTMLImageElement>(null),revision=useRef(0);
 const refreshImage=useCallback(()=>{
  const url='/api/browser?image=1&rev='+Date.now()+'-'+(++revision.current);
  setLoadingImage(true);
  const image=new Image();
  image.onload=()=>{setImageUrl(url);setLoadingImage(false)};
  image.onerror=()=>setLoadingImage(false);
  image.src=url;
 },[]);
 useEffect(()=>{
  let alive=true;
  request().then(result=>{if(!alive)return;setState(result);if(result.url!=='about:blank'){setAddress(result.url);refreshImage()}}).catch(err=>{if(alive)setError(err.message)});
  return()=>{alive=false};
 },[refreshImage]);
 async function act(action:string,fields:Record<string,unknown>={}){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const result=await request({action,...fields});setState(result);
   if(result.url!=='about:blank'){if(action==='navigate')setAddress(result.url);if(!['record-start','record-stop'].includes(action))refreshImage();}
   if(action==='record-stop'){setSteps(result.steps.map(s=>s.description).join('\n'));setShowSkill(true);}
  }catch(caught){setError(caught instanceof Error?caught.message:'Browser action failed');}
  finally{setBusy(false);}
 }
 function click(event:MouseEvent<HTMLImageElement>){
  if(busy)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const x=Math.round((event.clientX-rect.left)/rect.width*1280);
  const y=Math.round((event.clientY-rect.top)/rect.height*800);
  void act('click',{x,y});
 }
 async function saveSkill(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/browser/studio',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:'skill-save',name:skillName,description,steps})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Could not save skill');
   setSaved(result.skill.name);setShowSkill(false);setSkillName('');setDescription('');setSteps('');
   setState(await request());
  }catch(caught){setError(caught instanceof Error?caught.message:'Unable to save skill');}
  finally{setBusy(false);}
 }
 const blank=!imageUrl;
 return <section className="agenth-browser-studio">
  <header className="studio-heading"><div><span className="studio-eyebrow">AGENTH BROWSER</span><h2>Browser & Skills</h2><p>Control Chromium with your mouse and keyboard. Record actions, review steps and save reusable skills.</p></div><span className="studio-live"><span/> Private session</span></header>
  <div className="studio-toolbar">
   <form onSubmit={e=>{e.preventDefault();void act('navigate',{url:address})}}><Globe2 size={18}/><input type="url" aria-label="Browser address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="https://www.google.com" required/><button type="submit" disabled={busy} title="Open website"><ArrowRight size={18}/> Go</button></form>
   <button type="button" className={state.recording?'studio-recording':'studio-record'} disabled={busy} onClick={()=>void act(state.recording?'record-stop':'record-start')}>{state.recording?<><Square size={15}/> Stop recording</>:<><Video size={17}/> Record skill</>}</button>
  </div>
  <div className="studio-browser-shell">
   <div className="studio-browser-chrome"><div className="studio-traffic"><i/><i/><i/></div><span>{state.url==='about:blank'?'New browser tab':state.url}</span><small>{busy?'Working…':loadingImage?'Updating preview…':'Live screenshot controls'}</small></div>
   <div className="studio-browser-canvas">
    {blank?<div className="studio-blank"><Globe2 size={38}/><h3>Open a website to begin</h3><p>The real Chromium screenshot appears here. Click any visible element to interact with it.</p></div>:<img ref={ref} src={imageUrl} width={1280} height={800} onClick={click} alt="Interactive screenshot of the Chromium browser. Click the page to interact." draggable={false}/>}
    {busy&&<div className="studio-processing"><LoaderCircle size={15} className="studio-spinning"/> Running action</div>}
   </div>
  </div>
  <div className="studio-keys">
   <div className="studio-input"><Keyboard size={18}/><input aria-label="Text to type into selected website field" placeholder="Click a field above, then type here…" value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void act('type',{text:value}).then(()=>setValue(''))}}}/><button disabled={busy||!value} onClick={()=>void act('type',{text:value}).then(()=>setValue(''))}>Type</button></div>
   <button disabled={busy||blank} onClick={()=>void act('press',{key:'Enter'})}>Enter ↵</button>
   <button disabled={busy||blank} onClick={()=>void act('press',{key:'Tab'})}>Tab</button>
   <button disabled={busy||blank} onClick={()=>void act('scroll',{amount:520})}>Scroll ↓</button>
   <button disabled={busy||blank} onClick={()=>void act('scroll',{amount:-520})}>Scroll ↑</button>
  </div>
  {error&&<p className="studio-error" role="alert">{error}</p>}
  {saved&&<p className="studio-success" role="status"><Check size={17}/> Skill “{saved}” saved to your private library.</p>}
  <div className="studio-panels">
   <section className="studio-card"><div className="studio-card-heading"><h3><MousePointer2 size={18}/> Recorded actions</h3><span>{state.steps.length} actions</span></div>
    {state.recording&&<p className="studio-capturing"><span/> Recording clicks, typing steps, Enter and navigation</p>}
    {state.steps.length?<ol className="studio-step-list">{state.steps.map((step,index)=><li key={index}><span>{index+1}</span>{step.description}</li>)}</ol>:<p className="studio-muted">Press Record skill, interact with a page, then stop recording to review the steps.</p>}
    {!state.recording&&state.steps.length>0&&<button className="studio-primary" onClick={()=>{setSteps(state.steps.map(x=>x.description).join('\n'));setShowSkill(true)}}>Review & save skill <ArrowRight size={16}/></button>}
   </section>
   <section className="studio-card"><div className="studio-card-heading"><h3><Save size={18}/> Saved skills</h3><span>{state.skills.length} saved</span></div>
    {state.skills.length?<div className="studio-skill-list">{state.skills.map(skill=><article key={skill.id}><strong>{skill.name}</strong><p>{skill.description}</p><small>{skill.steps.length} steps · Saved</small><button onClick={()=>{setSkillName(skill.name);setDescription(skill.description);setSteps(skill.steps.map(x=>x.description).join('\n'));setShowSkill(true)}}>Review steps</button></article>)}</div>:<p className="studio-muted">Your reviewed skills appear here. Saved skills are instructions, not automatic background jobs.</p>}
   </section>
  </div>
  {showSkill&&<div className="studio-modal-backdrop"><form className="studio-review" onSubmit={saveSkill}><div className="studio-card-heading"><h3>Review the skill</h3><button type="button" onClick={()=>setShowSkill(false)}>✕</button></div><p>Check the recorded steps, edit anything, then save. Values such as <code>{'{search_term}'}</code> can be filled in each time.</p><label>Name<input required maxLength={100} placeholder="Google search for a term" value={skillName} onChange={e=>setSkillName(e.target.value)}/></label><label>What it does / when to use it<textarea rows={3} required maxLength={800} placeholder="Search Google and confirm results have loaded…" value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Steps (one per line)<textarea rows={10} required value={steps} onChange={e=>setSteps(e.target.value)}/></label><small>Typed values and private credentials are not stored in recorded steps. Verify selectors and steps before reuse.</small><div className="studio-review-actions"><button type="button" onClick={()=>setShowSkill(false)}>Discard</button><button type="submit" disabled={busy}><Save size={17}/> Save skill</button></div></form></div>}
  <p className="studio-footer-note">Browser interactions happen in your authenticated isolated Chromium session. No action is replayed or sent to another account automatically. Passwords and OTPs are not captured in saved steps.</p>
 </section>;
}
