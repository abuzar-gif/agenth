/* The V2 WhatsApp Manager uses the verified connector task protocol.
   Never direct its commands to the ordinary text-model conversation endpoint. */
let v2WaState={agent:null,tasks:[]};
let v2WaLoaded=false,v2WaBusy=false,v2WaError='',v2WaHelp=false,v2WaPollRunning=false;
let v2WaFingerprint='';
function v2WaIsActive(){return !!(data.agents?.some(a=>a.id===data.selected&&a.name==='WhatsApp Manager')&&tab==='Chat')}
function v2WaContacts(task){
  const event=[...(task.events||[])].reverse().find(e=>e.kind==='tool_result'&&Array.isArray(e.data?.output?.contacts));
  return (event?.data?.output?.contacts||[]).filter(c=>typeof c.id==='string'&&typeof c.name==='string');
}
function v2WaContactSummary(c){
  const digits=String(c.id||'').split('@')[0].split(':')[0];
  const phone=c.id?.endsWith('@s.whatsapp.net')&&/^\d{7,15}$/.test(digits)?'+'+digits:'Private WhatsApp ID';
  const name=String(c.name||'WhatsApp contact');
  return {name,phone};
}
function v2WaTaskHTML(task){
  const status=String(task.status||'queued');
  const result=String(task.result||'');
  const error=String(task.error||'');
  const contactEvents=(task.events||[]).filter(e=>e.kind==='contact_selected');
  const contactName=contactEvents.at(-1)?.data?.name||'';
  let assistant='';
  if(status==='needs_clarification'){
    const contacts=v2WaContacts(task);
    assistant='<strong>Which contact do you mean?</strong><p class="v2WaSmall">More than one contact matched. Choose the exact person before preparing your message.</p>'+
      (contacts.length?'<div class="v2WaChoices">'+contacts.map(c=>{
        const v=v2WaContactSummary(c);
        return '<button type="button" data-task="'+esc(task.id)+'" data-contact="'+esc(c.id)+'" onclick="v2WaChoose(this)" '+(v2WaBusy?'disabled':'')+'><strong>'+esc(v.name)+'</strong><small>'+esc(v.phone)+'</small></button>'
      }).join('')+'</div>':'<p>No contact was found in your synced WhatsApp contacts. Try an exact name or full mobile number.</p>');
  }else if(status==='waiting_approval'){
    const step=task.approval?.step,valid=step?.tool==='whatsapp.linked.send'||step?.tool==='whatsapp.send';
    const selected=contactName||v2WaContacts(task).find(c=>c.id===step?.args?.to)?.name||'';
    assistant=valid?'<strong>Confirm this one message</strong><p class="v2WaSmall">Please check the recipient and exact message. It will not be sent until you approve.</p>'+
      '<div class="v2WaPreview"><span>To</span><strong>'+esc(selected||String(step?.args?.to||'Unknown recipient'))+'</strong>'+
      (selected?'<small>'+esc(String(step?.args?.to||''))+'</small>':'')+
      '<span>Message</span><p>'+esc(String(step?.args?.text||''))+'</p></div>'+
      '<div class="v2WaActions"><button class="v2WaConfirm" type="button" data-task="'+esc(task.id)+'" onclick="v2WaAction(this,\'approve\')" '+(v2WaBusy?'disabled':'')+'>Send message</button>'+
      '<button type="button" data-task="'+esc(task.id)+'" onclick="v2WaAction(this,\'reject\')" '+(v2WaBusy?'disabled':'')+'>Cancel</button></div>'
      :'<p>Action pending review. Open Agent Tasks to inspect it.</p>';
  }else if(status==='completed'){
    assistant='<p>'+v2ChatRich(result||'Task ended. No WhatsApp provider send confirmation was recorded.')+'</p>';
  }else if(status==='failed'){
    assistant='<p>Could not complete this task. '+esc(error||'Please inspect the connection and try again.')+'</p>';
  }else if(status==='cancelled'){
    assistant='<p>Cancelled. Nothing further will be sent for this task.</p>';
  }else if(status==='paused'){
    assistant='<p>This task is paused. No message is being sent.</p>';
  }else{
    const latest=(task.events||[]).at(-1);
    const tool=latest?.data?.tool||'';
    const doing=tool.includes('contacts')?'Searching your permitted WhatsApp contacts…':tool.includes('send')?'Checking the exact recipient and preparing approval…':'Processing your request with the connected WhatsApp worker…';
    assistant='<p class="v2WaSmall">'+doing+'</p>';
  }
  return '<div class="v2WaTurn" data-wa-task="'+esc(task.id)+'"><div class="message user">'+esc(String(task.instruction||''))+'</div>'+
    '<div class="message assistant v2WaAssistant"><div class="by">WhatsApp Manager · '+esc(status.replace(/_/g,' '))+'</div>'+assistant+'</div></div>';
}
function v2WaChatHTML(a){
  const state=v2WaState||{},connected=!!state.agent;
  let body='<div class="v2WaIntro">'+v2WelcomeHTML(a)+'</div>';
  if(!v2WaLoaded)body+='<p class="v2WaNote">Checking your linked WhatsApp connection…</p>';
  else if(!connected)body+='<div class="v2WaStatusCard"><strong>WhatsApp is not connected</strong>'+
    '<p>Connect your phone first. Messages and contacts can only be accessed after successful pairing and your permissions.</p>'+
    '<button type="button" onclick="v2OpenWhatsAppConnector()">Connect WhatsApp</button></div>';
  else body+='<div class="v2WaLiveStatus"><span class="v2WaLiveDot"></span> Verified WhatsApp connection · Sending always requires your approval</div>';
  if(v2WaHelp)body+='<div class="message assistant v2WaAssistant"><div class="by">WhatsApp Manager</div>'+
    '<p>I can find contacts actually synced from your linked WhatsApp, clarify duplicate names, prepare an exact text message, and submit it only after you approve. You can also open the WhatsApp connector to manage pairing, permissions and contacts. I cannot make calls, join groups or send without approval.</p><p>Try <strong>Message Mama: hello</strong> or <strong>mama ko hello message kro</strong>.</p></div>';
  if(connected)body+=(state.tasks||[]).slice().reverse().map(v2WaTaskHTML).join('');
  if(v2WaError)body+='<p class="v2WaError" role="alert">'+esc(v2WaError)+'</p>';
  return '<div class="chatwrap v2WaChat"><div class="messages" id="v2WaMessages" aria-live="polite">'+body+'</div>'+
    '<form class="composer" onsubmit="v2WaSend(event)">'+
      '<button type="button" title="Connect WhatsApp and manage permissions" onclick="v2OpenWhatsAppConnector()">＋</button>'+
      '<textarea id="messageInput" placeholder="'+(connected?'Message Mama: hello':'Connect WhatsApp to send messages')+'" rows="1" maxlength="12000" '+(v2WaBusy?'disabled':'')+' onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit()}"></textarea>'+
      '<button type="button" title="Dictate" onclick="voiceLive()">♩</button>'+
      '<button type="submit" class="voice" title="Submit WhatsApp request" '+(v2WaBusy?'disabled':'')+'>➤</button></form>'+
    '<p class="v2WaFooter">Contact matches come from permitted synced WhatsApp records. A reply is not proof of delivery. Never enter pairing codes in chat.</p></div>';
}
function v2WaRefresh(keepScroll=true){
  if(!v2WaIsActive())return;
  const input=document.getElementById('messageInput'),draft=input?.value||'',focused=document.activeElement===input;
  const scrollBox=document.getElementById('v2WaMessages'),before=scrollBox?.scrollTop||0;
  const nearEnd=!!scrollBox&&(scrollBox.scrollHeight-scrollBox.scrollTop-scrollBox.clientHeight<140);
  render();
  const next=document.getElementById('messageInput');
  if(next&&!v2WaBusy)next.value=draft;
  if(focused)next?.focus({preventScroll:true});
  const box=document.getElementById('v2WaMessages');
  if(box&&keepScroll){box.scrollTop=nearEnd?box.scrollHeight:before}
}
async function v2WaLoad(force=false){
  if(v2WaPollRunning||!v2WaIsActive())return;
  v2WaPollRunning=true;
  try{
    const response=await fetch('/api/whatsapp/agent',{credentials:'same-origin',cache:'no-store'});
    if(response.status===401){window.top.location.assign('/login');return}
    const value=await response.json();
    if(!response.ok)throw Error(value.error||'Unable to check WhatsApp connection');
    const next={agent:value.agent||null,tasks:value.tasks||[]};
    const signature=JSON.stringify(next);
    if(force||!v2WaLoaded||signature!==v2WaFingerprint){
      v2WaState=next;v2WaFingerprint=signature;v2WaLoaded=true;v2WaError='';v2WaRefresh();
    }
  }catch(e){v2WaLoaded=true;v2WaError=e.message||String(e);if(force)v2WaRefresh()}
  finally{v2WaPollRunning=false}
}
function v2WaTaskId(button){return String(button?.dataset?.task||'')}
async function v2WaAction(button,action){
  if(v2WaBusy)return;
  const id=v2WaTaskId(button),task=v2WaState.tasks.find(t=>t.id===id);
  if(!task||task.status!=='waiting_approval')return;
  if(action==='approve'&&!confirm('Send this exact WhatsApp message to '+String(task.approval?.step?.args?.to||'the selected contact')+'?'))return;
  v2WaBusy=true;v2WaError='';
  try{await v2Request('/api/tasks/'+encodeURIComponent(id),'POST',{action});await v2WaLoad(true)}
  catch(e){v2WaError=e.message||String(e)}
  finally{v2WaBusy=false;v2WaRefresh()}
}
async function v2WaChoose(button){
  if(v2WaBusy)return;
  const id=v2WaTaskId(button),contactId=String(button?.dataset?.contact||'');
  const task=v2WaState.tasks.find(t=>t.id===id&&t.status==='needs_clarification');
  if(!task||!v2WaContacts(task).some(c=>c.id===contactId))return;
  v2WaBusy=true;v2WaError='';
  try{await v2Request('/api/whatsapp/agent/contact','POST',{taskId:id,contactId});await v2WaLoad(true)}
  catch(e){v2WaError=e.message||String(e)}
  finally{v2WaBusy=false;v2WaRefresh()}
}
function v2WaPending(status){return (v2WaState.tasks||[]).filter(t=>t.status===status)}
function v2WaNormalizeText(value){return String(value).normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
async function v2WaSend(event){
  event.preventDefault();
  if(v2WaBusy||!v2WaIsActive())return;
  const input=document.getElementById('messageInput'),instruction=String(input?.value||'').trim();
  if(!instruction)return;
  v2WaError='';
  if(!v2WaState.agent){v2WaError='Please connect WhatsApp before giving a send command.';v2WaRefresh();return}
  if(/^(?:haan+|ha+|han|yes|confirm|send it|bhejo|bhej do|ok|okay|sure)$/i.test(instruction)){
    const approvals=v2WaPending('waiting_approval');
    if(approvals.length!==1){v2WaError=approvals.length?'More than one send is awaiting approval. Use the exact Send message button on the correct task.':'No message is awaiting approval. Ask me to prepare a message first.';v2WaRefresh();return}
    input.value='';
    await v2WaAction({dataset:{task:approvals[0].id}},'approve');
    return;
  }
  if(/^(?:no|nahi|na|cancel|dont send|mat bhejo)$/i.test(instruction)){
    const approvals=v2WaPending('waiting_approval');
    if(approvals.length!==1){v2WaError='Select Cancel on the exact pending task.';v2WaRefresh();return}
    input.value='';
    await v2WaAction({dataset:{task:approvals[0].id}},'reject');
    return;
  }
  const pendingChoices=v2WaPending('needs_clarification');
  if(pendingChoices.length===1){
    const task=pendingChoices[0],needle=v2WaNormalizeText(instruction);
    const matching=v2WaContacts(task).filter(c=>{
      const name=v2WaNormalizeText(c.name),id=v2WaNormalizeText(c.id.split('@')[0]);
      return name===needle||id===needle||('+'+id)===instruction.replace(/\s/g,'');
    });
    if(matching.length===1){input.value='';await v2WaChoose({dataset:{task:task.id,contact:matching[0].id}});return}
  }
  if(/^(?:tum|aap|what|kya|how)\b.*(?:kar sakte|can you|help|features|kya)/i.test(instruction)||/^(?:help|madad|commands)\s*\??$/i.test(instruction)){
    v2WaHelp=true;input.value='';v2WaRefresh();return;
  }
  v2WaBusy=true;v2WaRefresh();
  try{
    await v2Request('/api/whatsapp/agent','POST',{instruction});
    const box=document.getElementById('messageInput');if(box)box.value='';
    await v2WaLoad(true);
  }catch(e){v2WaError=e.message||String(e)}
  finally{v2WaBusy=false;v2WaRefresh()}
}
const v2WaOldChatHTML=chatHTML;
chatHTML=function(a){return a?.name==='WhatsApp Manager'?v2WaChatHTML(a):v2WaOldChatHTML(a)};
const v2WaOldSelectAgent=selectAgent;
selectAgent=async function(id){
  await v2WaOldSelectAgent(id);
  if(v2WaIsActive())await v2WaLoad(true);
};
window.setInterval(()=>{if(v2WaIsActive())void v2WaLoad()},3000);
// Script may execute after the active agent is selected by a persisted session.
if(v2WaIsActive())void v2WaLoad(true);
