/* Speech-controlled owner-approved actions. Never impersonate a provider result. */
let v2VoiceTask=null;
function v2VoiceTaskReset(){
 v2VoiceTask=null;
 document.getElementById('v2VoiceChoices')?.remove();
}
function v2VoiceChoices(items,onSelect){
 document.getElementById('v2VoiceChoices')?.remove();
 const screen=document.getElementById('v2CallScreen');if(!screen)return;
 const block=document.createElement('div');block.id='v2VoiceChoices';block.className='v2-voice-choices';
 items.slice(0,8).forEach((item,i)=>{
  const b=document.createElement('button');b.type='button';b.textContent=(i+1)+'. '+item.name;
  b.onclick=()=>void onSelect(item,i);block.append(b);
 });
 screen.querySelector('.v2-call-center')?.append(block);
}
function v2VoiceAffirmative(text){
 const clean=String(text).trim().toLowerCase().replace(/[.,!؟۔]/g,'').replace(/\s+/g,' ');
 return /^(?:yes|yes send|yes send it|send it|send now|send please|yes please|go ahead|confirm|haan|han|hanji|haan bhej do|han bhej do|jee|ji|ji bhej do|bhej do|bhejo|bilkul|theek hai bhej do|ہاں|جی|ہاں بھیج دو|بھیج دو|بھیج دیں)$/.test(clean);
}
function v2VoiceNegative(text){
 const clean=String(text).trim().toLowerCase().replace(/[.,!؟۔]/g,'');
 return /^(?:no|nope|cancel|stop|dont send|do not send|nahi|nahin|na|mat bhejo|rehne do|نہیں|نہ بھیجو|مت بھیجو|منسوخ)$/.test(clean);
}
const v2CallCoreSubmit=v2CallSubmit;
v2CallSubmit=async function(text){
 if(!v2Call.open)return;
 if(v2VoiceTask){
  if(v2VoiceTask.stage==='choose'){
   const n=String(text).trim().toLowerCase();
   const names=['first','second','third','fourth','fifth','sixth','seventh','eighth'];
   const roman=['pehla','dusra','teesra','chautha','panchwa','chhata','satwa','athwa'];
   const urdu=['پہلا','دوسرا','تیسرا','چوتھا','پانچواں','چھٹا','ساتواں','آٹھواں'];
   const items=v2VoiceTask.contacts||[];
   const at=items.findIndex((item,i)=>n===String(i+1)||n===names[i]||n===roman[i]||n===urdu[i]||n===String(item.name||'').trim().toLowerCase());
   if(at>=0){await v2VoiceChoose(items[at]);return}
   if(v2VoiceNegative(n)){await v2VoiceCancel();return}
   await v2CallSpeak('Please choose the correct contact by name or number, such as first or second.',v2Call.session);return;
  }
  if(v2VoiceTask.stage==='approve'){
   if(v2VoiceAffirmative(text)){await v2VoiceApprove();return}
   if(v2VoiceNegative(text)){await v2VoiceCancel();return}
   await v2CallSpeak('I have not sent anything. Please say yes send it, or no cancel.',v2Call.session);return;
  }
 }
 const command=String(text).trim();
 const looksWA=/(?:whatsapp|واٹس\s*ایپ|\bko\b.+\b(?:bhejo|bhejdo|bhej\s*do|send\s*karo|message\s*karo)\b|\bکو\b.+\b(?:بھیجو|بھیج\s*دو|بھیجیں)\b)/i.test(command);
 const looksMail=/\b(?:gmail|email|e-mail)\b|(?:ای\s*میل|جی\s*میل)/i.test(command);
 const wantsSend=/\b(?:send|bhejo|bhejdo|bhej|message|mail|email)\b|(?:بھیجو|بھیجیں|بھیج\s*دو)/i.test(command);
 if(looksMail&&wantsSend){await v2VoiceEmail(command);return}
 if(looksWA&&wantsSend){await v2VoiceWhatsApp(command);return}
 return v2CallCoreSubmit(text);
};
async function v2VoiceWhatsApp(text){
 const session=v2Call.session;
 v2CallPhase('thinking','Finding the contact through the connected WhatsApp Agent…');
 try{
  const reply=await v2Request('/api/whatsapp/agent','POST',{instruction:text});
  if(!reply.id)throw Error('WhatsApp did not create a task.');
  v2VoiceTask={taskId:reply.id,kind:'whatsapp',stage:'waiting',session};
  await v2VoiceWait();
 }catch(error){if(v2Call.open&&session===v2Call.session){v2VoiceTaskReset();v2CallPhase('error',error.message||'WhatsApp task could not start. Nothing was sent.');}}
}
async function v2VoiceEmail(text){
 const session=v2Call.session;
 v2CallPhase('thinking','Preparing your Gmail request using the authorized task worker…');
 try{
  const reply=await v2Request('/api/tasks','POST',{instruction:text});
  if(!reply.id)throw Error('Email task was not created.');
  v2VoiceTask={taskId:reply.id,kind:'email',stage:'waiting',session};
  await v2VoiceWait();
 }catch(error){if(v2Call.open&&session===v2Call.session){v2VoiceTaskReset();v2CallPhase('error',error.message||'Email task could not start. Nothing was sent.');}}
}
async function v2VoiceWait(){
 const task=v2VoiceTask;if(!task)return;
 const session=task.session;
 for(let i=0;i<38;i++){
  if(!v2Call.open||session!==v2Call.session||v2VoiceTask!==task)return;
  const list=await v2Request(task.kind==='whatsapp'?'/api/whatsapp/agent':'/api/tasks');
  const item=(task.kind==='whatsapp'?list.tasks:list).find(t=>t.id===task.taskId);
  if(!item)throw Error('Could not locate your task. No send confirmation is available.');
  if(item.status==='needs_clarification'){
   const result=(item.events||[]).filter(e=>e.kind==='tool_result').at(-1);
   const contacts=(result?.data?.output?.contacts||[]).filter(c=>c?.id&&c?.name);
   if(!contacts.length)throw Error(item.result||'No matching contact. Please give the complete number or a more specific name.');
   task.stage='choose';task.contacts=contacts;
   v2VoiceChoices(contacts,c=>v2VoiceChoose(c));
   await v2CallSpeak('I found '+contacts.length+' matching contacts. '+contacts.slice(0,4).map((c,i)=>(i+1)+': '+c.name).join('. ')+'. Tell me which one to message, or tap the correct name.',session);
   return;
  }
  if(item.status==='waiting_approval'){
   const step=item.approval?.step;
   if(!step||!['whatsapp.linked.send','gmail.send','gmail.draft'].includes(step.tool))throw Error('This task requires review in the regular To-Do screen; no voice approval was applied.');
   const to=String(step.args?.to||''),body=String(step.args?.text||step.args?.body||''),subject=String(step.args?.subject||'');
   if(!to||!body)throw Error('Recipient or message is missing. No approval was applied.');
   task.stage='approve';
   task.step=step;
   task.recipient=to;
   const phrase=task.kind==='whatsapp'?'WhatsApp message':'Email';
   const statement=phrase+' to '+to+'. '+(subject?'Subject: '+subject+'. ':'')+'Exact message: '+body+'. Say yes send it to approve, or no cancel.';
   await v2CallSpeak(statement,session);
   return;
  }
  if(['completed','failed','cancelled','paused'].includes(item.status)){
   const success=item.status==='completed';
   const output=success?String(item.result||'Task completed. Check the exact provider result in To-Do.'):String(item.error||item.result||'Task was not completed.');
   v2VoiceTaskReset();
   await v2CallSpeak(output.slice(0,900),session);
   return;
  }
  await new Promise(resolve=>setTimeout(resolve,1400));
 }
 v2CallPhase('error','Still processing. Open your To-Do for the verified status; nothing was automatically approved.');
 v2VoiceTaskReset();
}
async function v2VoiceChoose(contact){
 const task=v2VoiceTask;if(!task||task.stage!=='choose')return;
 task.stage='waiting';
 document.getElementById('v2VoiceChoices')?.remove();
 v2CallPhase('thinking','Confirming the contact you selected…');
 try{
  await v2Request('/api/whatsapp/agent/contact','POST',{taskId:task.taskId,contactId:contact.id});
  await v2VoiceWait();
 }catch(error){v2CallPhase('error',error.message||'Contact selection failed');v2VoiceTaskReset();}
}
async function v2VoiceApprove(){
 const task=v2VoiceTask;if(!task||task.stage!=='approve')return;
 task.stage='waiting';
 v2CallPhase('thinking','Your voice approval was accepted. Checking the provider result…');
 try{
  await v2Request('/api/tasks/'+encodeURIComponent(task.taskId),'POST',{action:'approve'});
  await v2VoiceWait();
 }catch(error){v2CallPhase('error',(error.message||'Approval failed')+'. No successful send has been confirmed.');v2VoiceTaskReset();}
}
async function v2VoiceCancel(){
 const task=v2VoiceTask;if(!task)return;
 task.stage='waiting';
 try{await v2Request('/api/tasks/'+encodeURIComponent(task.taskId),'POST',{action:'cancel'});v2VoiceTaskReset();await v2CallSpeak('Cancelled. Nothing new was approved for sending.',v2Call.session)}
 catch(error){v2VoiceTaskReset();v2CallPhase('error',error.message||'Unable to cancel. Check To-Do for the latest status.')}
}
const v2CallCoreClose=v2CallClose;
v2CallClose=function(){v2VoiceTaskReset();v2CallCoreClose()};
