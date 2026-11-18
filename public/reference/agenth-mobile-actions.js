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
   const items=v2VoiceTask.contacts||[];
   const at=v2VoiceContactIndex(text,items);
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
 if(looksWA&&wantsSend){
  if(v2Call.agent?.name==='Dost'){await v2CallSpeak('Dost is a conversation-only companion. Open Chief or another task agent to send a WhatsApp message.',v2Call.session);return;}
  const parsed=v2VoiceWhatsAppCommand(command);
  if(!parsed){await v2CallSpeak('Please say the contact and exact message. For example: Open WhatsApp and message Mama hello. Nothing has been sent.',v2Call.session);return}
  await v2VoiceWhatsApp(parsed.instruction);return
 }
 return v2CallCoreSubmit(text);
};
async function v2VoiceWhatsApp(text){
 const session=v2Call.session;
 v2CallPhase('thinking','Checking your WhatsApp connection…');
 try{
  const connection=await v2Request('/api/whatsapp/linked');
  if(connection.state!=='connected'||!connection.agent){
   const instruction=/[\u0600-\u06ff]/.test(text)?'آپ کا WhatsApp ابھی کنیکٹ نہیں ہے۔ براہِ کرم Connected Apps میں جا کر WhatsApp کنیکٹ کریں، پھر مجھے کمانڈ دیں۔ شکریہ!':/\b(ko|bhejo|bhejdo|karo|kro|mera|meri)\b/i.test(text)?'Aapka WhatsApp connected nahi hai. Pehle Connected Apps mein WhatsApp connect karein, phir mujhe command dein. Shukriya!':"I can't send messages on WhatsApp while WhatsApp is not connected. Please connect WhatsApp in Connected Apps, then use me. Thank you.";
   await v2CallSpeak(instruction,session);return;
  }
  if(connection.consent?.send===false){await v2CallSpeak('WhatsApp is connected but Send permission is off. Please enable sending in Connected Apps, then ask me again.',session);return;}
  v2CallPhase('thinking','Finding your WhatsApp contact…');
  const reply=await v2Request('/api/whatsapp/agent','POST',{instruction:text});
  if(!reply.id)throw Error('WhatsApp did not create a task.');
  v2VoiceTask={taskId:reply.id,kind:'whatsapp',stage:'waiting',session};
  await v2VoiceWait();
 }catch(error){if(v2Call.open&&session===v2Call.session){v2VoiceTaskReset();await v2CallSpeak('I could not prepare the WhatsApp request. Nothing was sent. Please check your connection and try again.',session);}}
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

// Spoken commands use a deliberately narrow parser. Ambiguous wording is clarified,
// never sent as the message body. Every resulting send still waits for owner approval.
function v2VoiceClean(text){return String(text||'').trim().replace(/\s+/g,' ').replace(/[。।]+$/u,'').trim();}
function v2VoiceWhatsAppCommand(text){
 const plain=v2VoiceClean(text).replace(/^(?:hey\s+)?(?:please\s+)?(?:open|go\s+to|launch|start)\s+(?:my\s+)?whatsapp\s*(?:and|then|,)?\s*/i,'').replace(/^(?:on\s+)?whatsapp\s*(?:please\s+)?/i,'');
 if(!plain)return null;
 let match=plain.match(/^(?:send\s+(?:a\s+)?(?:whatsapp\s+)?message|message|text)\s+(?:to\s+)?([\p{L}\p{N}_.-]+)\s*[:,]\s*(.+)$/iu);
 if(!match)match=plain.match(/^(?:send\s+(?:a\s+)?(?:whatsapp\s+)?message|message|text)\s+(?:to\s+)?([\p{L}\p{N}_.-]+)\s+(?:saying\s+|that\s+says\s+)?(.+)$/iu);
 if(!match)match=plain.match(/^([\p{L}\p{N}_.-]+)\s+ko\s+(.+?)\s+(?:message\s+)?(?:bhejo|bhej\s*do|bhejdo|send\s*karo|send\s*krdo)$/iu);
 if(!match)match=plain.match(/^([\p{L}\p{N}_.-]+)\s+کو\s+(.+?)\s+(?:بھیجو|بھیج\s*دو|بھیجیں)$/u);
 if(!match)return null;
 const recipient=v2VoiceClean(match[1]),body=v2VoiceClean(match[2]).replace(/\s+(?:on\s+whatsapp|please)$/i,'').trim();
 if(!recipient||!body||recipient.length>100||body.length>4096)return null;
 if(/^(?:to|send|message|whatsapp)$/i.test(recipient))return null;
 if(/^(?:open\s+whatsapp|message\s+\S+\s+\S+\s+\S+\s+\S+)$/i.test(body))return null;
 return {recipient,body,instruction:'send message to '+recipient+': '+body};
}
function v2VoiceContactIndex(text,contacts){
 const clean=v2VoiceClean(text).toLowerCase().replace(/[.,!؟۔]/g,'').replace(/\s+/g,' ');
 const wordSets=[['first','1','one','number one','pehla','pehli','پہلا','پہلی','ایک'],['second','2','two','number two','dusra','dusri','دوسرا','دوسری','دوسرے'],['third','3','three','teesra','تیسرا','تیسری'],['fourth','4','four','chautha','چوتھا'],['fifth','5','five','panchwa','پانچواں'],['sixth','6','six','chhata','چھٹا'],['seventh','7','seven','satwa','ساتواں'],['eighth','8','eight','athwa','آٹھواں']];
 const simplified=clean.replace(/^(?:i\s+want|choose|select|pick|it's|its|the|please|mera|meri|mujhe|yeh|woh)\s+/g,'').replace(/\s+(?:one|contact|person|number|wala|wali|please|hi|hai|ko|select|choose|karo|kar\s*do)$/g,'').trim();
 for(let i=0;i<Math.min(contacts.length,8);i++){
  const variants=wordSets[i];
  if(variants.some(v=>simplified===v||simplified===v+' '+v||clean===v+' '+v||clean==='the '+v+' one'))return i;
 }
 return contacts.findIndex(c=>clean===String(c.name||'').trim().toLowerCase()||simplified===String(c.name||'').trim().toLowerCase());
}
