'use client';
import {useEffect,useState} from 'react';
import Voice from './voice';
export default function OnboardingChat({language}:{language:string}){
  const [text,setText]=useState(''),[messages,setMessages]=useState<{id:string;agent:string;content:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load(){const r=await fetch('/api/onboarding');if(r.ok)setMessages(await r.json());}
  useEffect(()=>{void load();},[]);
  async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});const d=await r.json();if(!r.ok)throw new Error(d.error);setText('');await load();}catch(e){setError(e instanceof Error?e.message:'Conversation failed');}finally{setBusy(false);}}
  return <details className="card"><summary>Talk to the AI onboarding assistant (requires a configured AI model)</summary><p>Ask questions in your preferred language. Use the profile form above to save or change your information.</p><div className="conversation">{messages.map(m=><div key={m.id}><small>{m.agent==='Onboarding user'?'You':'Assistant'}</small><p>{m.content}</p></div>)}</div><form onSubmit={send}><label>Message to onboarding assistant<textarea value={text} onChange={e=>setText(e.target.value)} required maxLength={4000}/></label><Voice language={language} onText={setText}/><button disabled={busy||!text.trim()}>{busy?'Thinking…':'Ask assistant'}</button></form>{error&&<p className="error" role="alert">{error}</p>}</details>;
}
