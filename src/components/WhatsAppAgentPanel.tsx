'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {SendHorizontal, MessagesSquare, X, ShieldCheck, Trash2} from 'lucide-react';
import Voice from './voice';
import WhatsAppMiniScreen from './WhatsAppMiniScreen';
type Task={id:string;instruction:string;status:string;result?:string;error?:string;approval?:any;events:any[]};
async function responseJson(r:Response){const raw=await r.text();try{return raw?JSON.parse(raw):{};}catch{throw new Error('AgentH returned an invalid response. Please refresh the page and try again.');}}
const activity=(task:Task)=>{const latest=task.events?.at(-1);if(task.status==='queued'||task.status==='planning')return 'Thinking about your request…';if(task.status==='running'){if(latest?.kind==='tool_started'&&String(latest?.data?.tool||'').includes('contacts'))return 'Searching your WhatsApp contacts…';if(latest?.kind==='tool_started'&&String(latest?.data?.tool||'').includes('send'))return 'Preparing your message…';return 'Working on it…';}if(task.status==='waiting_approval')return 'Your approval is needed before sending.';if(task.status==='needs_clarification')return 'Checking the available synced contacts.';if(task.status==='completed')return 'Done';return task.status==='failed'?'Something needs attention.':'';};
const approvedContact=(task:Task)=>task.events?.findLast(e=>e.kind==='contact_selected')?.data?.name as string|undefined;
function contactDisplay(contact:any){const raw=String(contact.name||'').trim();const number=String(contact.id||'').split('@')[0].split(':')[0];const phone=/^\d{7,15}$/.test(number)?`+${number}`:'WhatsApp account';const letters=(raw.match(/[\p{L}\p{N}]/gu)||[]).length;const generic=!raw||/^whatsapp(?:\s+account|\s+contact)?$/i.test(raw)||/whatsapp account/i.test(raw)||letters<2||raw.length>70;return {phone,name:generic?'':raw,secondary:generic?(raw&&raw!==phone?raw:'WhatsApp contact'):`${raw} · ${phone}`};}
function usableContact(contact:any){const raw=String(contact?.name||'').trim(),digits=(raw.match(/\d/g)||[]).length,phones=raw.match(/\+?\d{7,}/g)||[];return raw.length>1&&raw.length<=80&&digits<10&&phones.length<2&&/[\p{L}]/u.test(raw)&&!/whatsapp\s+account/i.test(raw);}
function Contacts({task,onChoose,busy}:{task:Task;onChoose:(id:string)=>void;busy:boolean}){const [more,setMore]=useState(false);const item=task.events?.findLast(e=>e.kind==='tool_result'&&Array.isArray(e.data?.output?.contacts));const contacts=(item?.data?.output?.contacts||[]).filter(usableContact);if(!contacts.length)return <div className="wa-choice"><strong>No matching clean contact</strong><p>Try the full contact name or complete Pakistani mobile number, for example 03xx xxxxxxx. Corrupted and number-only records are hidden.</p></div>;const visible=more?contacts:contacts.slice(0,5);return <div className="wa-choice"><strong>Which contact do you mean?</strong><p>I found these matching contacts. Choose one and I will prepare the message for your approval.</p>{visible.map((contact:any)=>{const display=contactDisplay(contact);return <button key={contact.id} aria-label={`Choose ${display.name||display.phone}`} disabled={busy} className="wa-contact-choice" onClick={()=>onChoose(contact.id)}><span>{display.name||display.phone}</span><small>{display.secondary}</small></button>})}{contacts.length>5&&<button type="button" className="wa-show-more" onClick={()=>setMore(v=>!v)}>{more?'Show less':`Show ${contacts.length-5} more`}</button>}</div>}
export default function WhatsAppAgentPanel({language,onManageConnection}:{language:string;onManageConnection?:()=>void}){
 const [data,setData]=useState<any>(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showChats,setShowChats]=useState(false);const transcript=useRef<HTMLDivElement>(null);
 const friendlyError=(e:unknown,fallback:string)=>e instanceof TypeError&&e.message==='Failed to fetch'?'AgentH is reconnecting. Please wait a moment and try again.':e instanceof Error?e.message:fallback;
 const load=useCallback(async()=>{try{const r=await fetch('/api/whatsapp/agent',{cache:'no-store'}),d=await responseJson(r);if(!r.ok)throw new Error(d.error);setData(d);setError('');}catch(e){setError(friendlyError(e,'Could not load WhatsApp Agent'));}},[]);
 useEffect(()=>{void (async()=>{try{await fetch('/api/whatsapp/agent/clear-choices',{method:'POST'});}finally{await load();}})();const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer);},[load]);
 const tasks:Task[]=useMemo(()=>[...(data?.tasks||[])].reverse(),[data]);
 const latestStatus=tasks.length?tasks[tasks.length-1].status:'';
 useEffect(()=>{const element=transcript.current;if(!element)return;const distance=element.scrollHeight-element.scrollTop-element.clientHeight;if(distance<96)element.scrollTo({top:element.scrollHeight,behavior:'smooth'});},[tasks.length,latestStatus]);
 async function send(){if(!text.trim()||busy)return;setBusy(true);setError('');try{const r=await fetch('/api/whatsapp/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({instruction:text})}),d=await responseJson(r);if(!r.ok)throw new Error(d.error);setText('');await load();}catch(e){setError(friendlyError(e,'Could not send command'));}finally{setBusy(false);}}
 async function taskAction(task:Task,action:'approve'|'reject'){setBusy(true);setError('');try{const r=await fetch(`/api/tasks/${task.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})}),d=await responseJson(r);if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(friendlyError(e,'Could not update this message'));}finally{setBusy(false);}}
 async function choose(task:Task,contactId:string){setBusy(true);setError('');try{const r=await fetch('/api/whatsapp/agent/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({taskId:task.id,contactId})}),d=await responseJson(r);if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(friendlyError(e,'Could not select contact'));}finally{setBusy(false);}}
 async function clearChat(){if(busy||!tasks.length)return;if(!window.confirm('Clear this WhatsApp Manager chat? This removes only AgentH chat history, not your WhatsApp messages or contacts.'))return;setBusy(true);setError('');try{const r=await fetch('/api/whatsapp/agent/clear',{method:'DELETE'}),d=await responseJson(r);if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(friendlyError(e,'Could not clear this chat'));}finally{setBusy(false);}}
 if(!data?.agent)return (
  <section className="wa-chat">
   <div className="wa-chat-hero">
    <h2>WhatsApp Manager</h2>
    <p>Connect WhatsApp first. This private chat appears after a verified connection.</p>
    {onManageConnection ? <button className="button primary" onClick={onManageConnection}>Connect WhatsApp</button> : <Link className="button primary" href="/dashboard?tab=apps">Connect WhatsApp</Link>}
   </div>
   {error&&<p className="error">{error}</p>}
  </section>
 );
 return (
  <section className="wa-chat">
   <header className="wa-chat-header">
    <div><h2>WhatsApp Manager</h2><p>Ready to help with your connected WhatsApp.</p></div>
    <div className="v2-wa-chat-actions"><span className="v2-wa-private-label"><ShieldCheck size={14}/> Private · Approval required</span><button type="button" className="v2-wa-view-chats" onClick={()=>setShowChats(true)} aria-label="View synced WhatsApp chats"><MessagesSquare size={16}/> View chats</button><button type="button" className="v2-wa-clear-chat" onClick={()=>void clearChat()} disabled={busy||!tasks.length} title="Clear AgentH chat history"><Trash2 size={15}/> Clear chat</button>{onManageConnection ? <button type="button" className="wa-manage" onClick={onManageConnection}>Connection</button> : <Link href="/dashboard?tab=apps" className="wa-manage">Connection</Link>}</div>
   </header>
   {tasks.length===0 && <div className="wa-chat-intro">
    <h3>What do you want to do with WhatsApp Manager?</h3>
    <p>Search contacts, write messages and review the exact recipient before sending anything.</p>
   </div>}
   {showChats&&<div className="v2-wa-chats-backdrop" role="presentation" onMouseDown={()=>setShowChats(false)}><section className="v2-wa-chats-drawer" role="dialog" aria-label="Synced WhatsApp conversations" aria-modal="true" onMouseDown={event=>event.stopPropagation()}><header><div><strong>WhatsApp chats</strong><small>Read-only preview of permitted synced messages</small></div><button type="button" aria-label="Close WhatsApp chats" onClick={()=>setShowChats(false)}><X size={20}/></button></header><WhatsAppMiniScreen tasks={tasks}/></section></div>}
   <div className="wa-transcript" ref={transcript}>
    {tasks.map(task=>(
     <div className="wa-turn" key={task.id}>
      <article className="wa-bubble wa-user"><span>You</span><p>{task.instruction}</p></article>
      {['queued','planning','running','paused'].includes(task.status)&&<article className="wa-bubble wa-agent wa-progress"><span>WhatsApp Manager</span><div className="wa-thinking"><i/><i/><i/></div><p>{activity(task)}</p></article>}
      {task.status==='needs_clarification'&&<article className="wa-bubble wa-agent"><span>WhatsApp Manager</span><Contacts task={task} busy={busy} onChoose={id=>void choose(task,id)}/></article>}
      {task.status==='waiting_approval'&&<article className="wa-bubble wa-agent"><span>WhatsApp Manager</span><div className="wa-approval"><strong>{approvedContact(task)?`Message ${approvedContact(task)}?`:'Ready to send'}</strong><p>To: {approvedContact(task)||task.approval?.step?.args?.to||'Selected contact'}</p><div className="wa-message-preview">{task.approval?.step?.args?.text||'No message text'}</div><p>Send this exact message?</p><div><button className="primary" disabled={busy} onClick={()=>void taskAction(task,'approve')}>Send message</button><button disabled={busy} onClick={()=>void taskAction(task,'reject')}>Don’t send</button></div></div></article>}
      {task.status==='completed'&&<article className="wa-bubble wa-agent"><span>WhatsApp Manager</span><p>{task.result||'Done.'}</p></article>}
      {task.status==='failed'&&<article className="wa-bubble wa-agent wa-error"><span>WhatsApp Manager</span><p>{task.error||'I could not complete that request.'}</p></article>}
     </div>
    ))}
   </div>
   <form className="wa-composer" onSubmit={event=>{event.preventDefault();void send();}}>
    <label className="sr-only" htmlFor="whatsapp-command">Message WhatsApp Manager</label>
    <textarea id="whatsapp-command" rows={1} value={text} maxLength={12000} onChange={event=>setText(event.target.value)} placeholder="Message Mother: hello" onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void send();}}}/>
    <Voice language={language} onText={setText} composer/>
    <button className="primary" aria-label="Send WhatsApp command" title="Send WhatsApp command" disabled={busy||!text.trim()}><SendHorizontal size={19}/></button>
   </form>
   {tasks.length===0&&<p className="wa-composer-hint">Try “Message Mother: hello”. AgentH asks before sending.</p>}
   {error&&<p className="error" role="alert">{error}</p>}
  </section>
 );
}
