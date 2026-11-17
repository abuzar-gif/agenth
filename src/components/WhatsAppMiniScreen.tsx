'use client';
import {Expand,Minimize2,RefreshCw,Search,SendHorizontal} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
type Props={tasks?:any[];interactive?:boolean};
type Conversation={jid:string;name:string;group?:boolean;preview?:string;updatedAt?:string;avatarUrl?:string|null};
type Data={conversations:Conversation[];selected?:string;messages:{id:string;text:string;fromMe:boolean;createdAt:string}[]};
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'W';

export default function WhatsAppMiniScreen({tasks=[],interactive=false}:Props){
 const [data,setData]=useState<Data|null>(null),[jid,setJid]=useState(''),[full,setFull]=useState(false),[query,setQuery]=useState(''),[error,setError]=useState(''),[text,setText]=useState(''),[syncing,setSyncing]=useState(false),[sending,setSending]=useState(false);
 const conversation=useRef<HTMLElement>(null),requestedJid=useRef('');
 const newest=tasks.findLast(task=>task.events?.some((event:any)=>event.kind==='contact_selected'||(event.kind==='tool_result'&&Array.isArray(event.data?.output?.contacts)&&event.data.output.contacts.length===1)));
 const selectedFromTask=newest?.events?.findLast((event:any)=>event.kind==='contact_selected')?.data?.contactId||newest?.events?.findLast((event:any)=>event.kind==='tool_result'&&Array.isArray(event.data?.output?.contacts)&&event.data.output.contacts.length===1)?.data?.output?.contacts?.[0]?.id||'';

 useEffect(()=>{if(selectedFromTask&&selectedFromTask!==requestedJid.current){requestedJid.current=selectedFromTask;setJid(selectedFromTask);}},[selectedFromTask]);
 useEffect(()=>{
  let alive=true;
  const load=async()=>{try{
   const response=await fetch(`/api/whatsapp/live${jid?`?jid=${encodeURIComponent(jid)}`:''}`,{cache:'no-store'}),value=await response.json();
   if(!response.ok)throw new Error(value.error||'WhatsApp messages are unavailable.');
   if(!alive)return;
   setData(value);setError('');
   if(jid&&!value.conversations.some((chat:Conversation)=>chat.jid===jid))setJid(value.selected||'');
  }catch(cause){if(alive)setError(cause instanceof Error?cause.message:'Could not load WhatsApp messages.');}};
  void load();const timer=setInterval(load,6000);return()=>{alive=false;clearInterval(timer);};
 },[jid]);
 useEffect(()=>{const element=conversation.current;if(!element)return;const distance=element.scrollHeight-element.scrollTop-element.clientHeight;if(distance<72)element.scrollTo({top:element.scrollHeight,behavior:'smooth'});},[data?.messages.length,jid]);
 const selected=jid||data?.selected||'';
 const active=data?.conversations.find(chat=>chat.jid===selected);
 const search=query.normalize('NFKC').toLocaleLowerCase();
 const conversations=data?.conversations.filter(chat=>`${chat.name} ${chat.preview||''}`.normalize('NFKC').toLocaleLowerCase().includes(search))||[];
 async function sync(){setSyncing(true);setError('');try{const response=await fetch('/api/whatsapp/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync'})}),value=await response.json();if(!response.ok)throw new Error(value.error||'Could not request WhatsApp sync.');setError(value.note||'Sync requested.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not request WhatsApp sync.');}finally{setSyncing(false);}}
 async function send(){if(!selected||!text.trim()||sending)return;if(!window.confirm('Send this exact message to the selected WhatsApp chat?'))return;setSending(true);setError('');try{const response=await fetch('/api/whatsapp/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',jid:selected,text:text.trim()})}),value=await response.json();if(!response.ok)throw new Error(value.error||'WhatsApp could not send the message.');setText('');}catch(cause){setError(cause instanceof Error?cause.message:'WhatsApp could not send the message.');}finally{setSending(false);}}
 const avatar=(chat:Conversation,extra='')=>chat.avatarUrl?<img className={`wa-avatar wa-avatar-image ${extra}`} src={chat.avatarUrl} alt=""/>:<i className={`wa-avatar ${extra}`}>{initials(chat.name)}</i>;
 const panel=<section className={`wa-mini${full?' wa-mini-full':''}`} aria-label="Available WhatsApp chats">
  <header className="wa-mini-top"><strong><i className="wa-logo">◔</i>WhatsApp</strong><div><span className="wa-live"><i/>Live</span>{interactive&&<button type="button" className="wa-sync-button" onClick={()=>void sync()} disabled={syncing} title="Ask WhatsApp to sync available history"><RefreshCw size={15} className={syncing?'is-spinning':''}/>{syncing?'Syncing…':'Sync messages again'}</button>}<button type="button" className="wa-icon-button" aria-label={full?'Return to mini screen':'Expand WhatsApp chats'} title={full?'Return to mini screen':'Expand WhatsApp chats'} onClick={()=>setFull(value=>!value)}>{full?<Minimize2 size={17}/>:<Expand size={17}/>}</button></div></header>
  <div className="wa-mini-body"><aside><label className="sr-only" htmlFor="whatsapp-chat-search">Search available chats</label><div className="wa-mini-search"><Search size={15}/><input id="whatsapp-chat-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search chats"/></div>{conversations.length?conversations.map(chat=><button type="button" className={`wa-chat-row ${selected===chat.jid?'active':''}`} key={chat.jid} onClick={()=>setJid(chat.jid)}>{avatar(chat)}<span><b>{chat.name}</b><small>{chat.group?'Group · read only':chat.preview||'WhatsApp chat'}</small></span></button>):<p className="wa-mini-empty">No available chats match.</p>}</aside>
  <main ref={conversation}><div className="wa-conversation-head">{active?<>{avatar(active,'wa-avatar-large')}<div><strong>{active.name}</strong><small>{active.group?'Group · read only':'Private WhatsApp chat'}</small></div></>:<small>Choose an available chat</small>}</div>{error?<p className="wa-mini-note">{error}</p>:!active?<p className="wa-mini-note">Available linked WhatsApp chats will appear here.</p>:<><div className="wa-message-list">{active.group&&<p className="wa-mini-note">Group chats are display-only. AgentH cannot send to groups.</p>}{data?.messages.length?data.messages.map(message=><p key={message.id} className={message.fromMe?'out':'in'}>{message.text}</p>):<p className="wa-mini-note">No stored messages in this chat yet.</p>}</div>{interactive&&!active.group&&<form className="wa-live-compose" onSubmit={event=>{event.preventDefault();void send();}}><input value={text} onChange={event=>setText(event.target.value)} maxLength={4096} placeholder={`Message ${active.name}`} aria-label={`Message ${active.name}`}/><button type="submit" disabled={!text.trim()||sending} title="Send exact WhatsApp message"><SendHorizontal size={17}/></button></form>}</>}</main></div>
 </section>;
 return full?<div className="wa-mini-overlay" role="dialog" aria-modal="true">{panel}</div>:panel;
}
