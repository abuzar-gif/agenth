
/* AgentH V2: authenticated browser client. No demo data and no simulated AI replies. */
let liveAccount={name:'',email:''};
let liveTasks=[],livePersonal=[],liveConnectors=[],liveConversations=[],liveUsage={};
let liveProfile=null,liveSettings=null,liveBusy=false,liveAttachment=null,liveStop=null;
let liveActive={},liveLoadingAgent='',liveError='',historyQuery='',liveWhatsappState='disconnected';
const v2Colors={violet:'#a779ff',blue:'#2c8cff',cyan:'#36bce2',teal:'#2bbca6',green:'#35ca8c',lime:'#86c73e',amber:'#ffb12f',orange:'#ff6c24',rose:'#f0473d',pink:'#f553ae',indigo:'#6865df'};
const v2AgentColors={Chief:'#a779ff',Researcher:'#2c8cff','Browser Agent':'#ffb12f','Gmail Agent':'#a47a53',Scheduler:'#2bbca6',Uploader:'#35ca8c',Reporter:'#777777',Poster:'#f553ae'};
const v2FetchOptions={credentials:'same-origin'};
async function v2Request(url,method,body){
  const options={credentials:'same-origin',cache:'no-store'};
  if(method){options.method=method; if(body!==undefined){options.headers={'Content-Type':'application/json'};options.body=JSON.stringify(body)}}
  const response=await fetch(url,options);
  let result;
  try{result=await response.json()}catch{result={error:'Unexpected server response'}}
  if(response.status===401){window.top.location.assign('/login');throw Error('Please sign in to your account')}
  if(!response.ok)throw Error(result.error||'Request failed ('+response.status+')');
  return result;
}
function v2ApplyTheme(preference){
  const systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark=preference==='Dark'||(preference==='System'&&systemDark);
  document.documentElement.dataset.v2Theme=dark?'dark':'light';
}
if(window.matchMedia){window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{if(data?.prefs?.appearance==='System')v2ApplyTheme('System')});}
function v2Error(error){const message=error instanceof Error?error.message:String(error);liveError=message;toast(message);if(tab==='Chat')render()}
function v2AvatarColor(value,name){
  if(typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value))return value;
  return v2Colors[value]||v2AgentColors[name]||'#a779ff';
}
function v2NormalizeAgent(a){
  const n=String(a.name||'Agent');
  const sh=String(a.avatarShape||'round');
  const shape=['round','circle','rounded','soft','squircle','blob','cloud','tilt'].includes(sh)?(sh==='circle'?'round':sh==='rounded'?'soft':sh):'soft';
  const tone=n==='WhatsApp Manager'?'#f1f0eb':v2AvatarColor(a.avatarColor,n);
  return {id:String(a.id),name:n,role:String(a.role||'Personal assistant'),intro:String(a.description||a.role||'Personal assistant'),color:tone,shape:n==='WhatsApp Manager'?'squircle':shape,eye:tone==='#f1f0eb'?'#111':'#fff',builtin:!!a.builtin,permissions:a.permissions||[],systemInstructions:a.systemInstructions||''};
}
async function v2LoadAgents(){
  const result=await v2Request('/api/agents');
  const previous=data.selected;
  data.agents=[...(result.builtIn||[]),...(result.custom||[])].filter(a=>a&&a.id).map(v2NormalizeAgent);
  const defaultOrder=['Chief','WhatsApp Manager','Email Manager','Dost','1000$ Maker'];
  data.agents.sort((a,b)=>{const ai=defaultOrder.indexOf(a.name),bi=defaultOrder.indexOf(b.name);return (ai<0?999:ai)-(bi<0?999:bi)});
  data.selected=data.agents.find(a=>a.id===previous)?.id||data.agents.find(a=>a.name==='Chief')?.id||data.agents[0]?.id||'';
}
async function v2LoadTasks(){liveTasks=await v2Request('/api/tasks');if(tab==='To-Do')render()}
async function v2LoadPersonal(){livePersonal=await v2Request('/api/personal-todos');if(tab==='To-Do')render()}
async function v2LoadConnections(){
  const previousWhatsApp=Boolean(data.connections?.WhatsApp);
  const previousState=liveWhatsappState;
  const [connectors,wa]=await Promise.all([v2Request('/api/connectors'),v2Request('/api/whatsapp/linked')]);
  liveConnectors=connectors;
  liveWhatsappState=wa.state||'disconnected';
  const next={};
  for(const c of liveConnectors)next[c.name]=!!c.connection;
  next.WhatsApp=Boolean(liveConnectors.find(c=>c.provider==='whatsapp-business'&&c.connection))||liveWhatsappState==='connected';
  next.Gmail=Boolean(liveConnectors.find(c=>c.provider==='gmail'&&c.connection));
  data.connections=next;
  if(modal==='connect'||previousWhatsApp!==next.WhatsApp||previousState!==liveWhatsappState)render();
}
async function v2LoadConversations(){liveConversations=await v2Request('/api/conversations')}
async function v2LoadUsage(){liveUsage=await v2Request('/api/usage');if(modal==='tokens'||settingsTab==='Usage & Billing')render()}
async function v2LoadSettings(){
  const both=await Promise.all([v2Request('/api/profile'),v2Request('/api/settings')]);
  liveProfile=both[0];liveSettings=both[1];
  const rememberedTheme=localStorage.getItem('agenth-v2-theme-preference');
  data.prefs.appearance=rememberedTheme==='System'||rememberedTheme==='Dark'||rememberedTheme==='Light'?rememberedTheme:(liveSettings.theme==='dark'?'Dark':'Light');
  const rememberedLanguage=localStorage.getItem('agenth-v2-language-preference');
  data.prefs.language=rememberedLanguage==='Auto - match my language'||rememberedLanguage==='English'||rememberedLanguage==='Roman Urdu'||rememberedLanguage==='Urdu'?rememberedLanguage:(liveProfile.language==='roman-ur'?'Roman Urdu':liveProfile.language==='ur'?'Urdu':'English');
  data.prefs.suggestions=liveProfile.answers?.suggestions_from_chief==='true';
  v2ApplyTheme(data.prefs.appearance);
}
async function v2LoadAgent(id){
  if(!id||!data.agents.some(a=>a.id===id))return;
  liveLoadingAgent=id;
  try{
    const agent=data.agents.find(a=>a.id===id);
    let cid=liveActive[id];
    if(!cid){
      const matching=liveConversations.find(c=>c.title?.startsWith(agent.name+' • '));
      cid=matching?.id||null;
      if(cid)liveActive[id]=cid;
    }
    if(cid){
      const conv=await v2Request('/api/conversations/'+encodeURIComponent(cid));
      data.messages[id]=(conv.messages||[]).map(m=>({role:m.role,text:m.content||'',status:m.status||'completed',tokens:m.tokens||0,model:m.model||''}));
    }else data.messages[id]=[];
  }catch(error){v2Error(error)}
  finally{if(data.selected===id){liveLoadingAgent='';render()}}
}
async function selectAgent(id){
  if(liveBusy){toast('Wait for the current response or press Stop');return}
  if(!data.agents.some(a=>a.id===id))return;
  data.selected=id;tab='Chat';render();
  await v2LoadAgent(id);
}
async function v2Boot(){
  try{
    const account=await v2Request('/api/account');
    if(!account.user||!account.user.id)throw Error('No signed-in account. Please log in.');
    liveAccount={id:account.user.id,name:account.user.name||'',email:account.user.email||''};
    await v2LoadAgents();
    if(!data.agents.length)throw Error('The server returned no agents');
    const results=await Promise.allSettled([v2LoadConversations(),v2LoadTasks(),v2LoadPersonal(),v2LoadConnections(),v2LoadUsage(),v2LoadSettings()]);
    const failed=results.filter(r=>r.status==='rejected');
    if(failed.length)liveError='Some services are unavailable: '+failed.map(x=>x.reason?.message||'unknown error').join('; ');
    const oauthReturn=new URLSearchParams(window.top.location.search);
    if(oauthReturn.get('connector')==='google'){
      const oauthError=oauthReturn.get('error');
      if(oauthError)liveError='Gmail connection failed: '+oauthError;
      else if(oauthReturn.get('status')==='connected')toast('Google account connected. Welcome back to AgentH.');
    }
    render();
    await v2LoadAgent(data.selected);
    window.setInterval(()=>{if(!liveBusy)void v2LoadTasks().catch(()=>{})},12000);
    window.setInterval(()=>void v2LoadConnections().catch(()=>{}),30000);
  }catch(error){
    document.getElementById('root').innerHTML='<div class="v2loading"><div><h2>Could not load AgentH</h2><p>'+esc(error.message||error)+'</p><a href="/login" target="_top">Sign in</a> · <a href="/dashboard?tab=legacy" target="_top">Open connected workspace</a></div></div>';
  }
}
const v2OriginalRender=render;
render=function(){
  if(!data.agents.length){document.getElementById('root').innerHTML='<div class="v2loading">Loading your agents…</div>';return}
  v2OriginalRender();
  const status=document.querySelector('.top .status');
  if(status)status.textContent=liveBusy?'working':'idle';
  const top=document.querySelector('.top');
  if(top&&tab==='Chat'){
    const controls=document.createElement('div');
    controls.className='v2HeaderTools';
    controls.innerHTML='<button type="button" class="outline" onclick="v2NewChat()" title="New conversation">＋</button><button type="button" class="outline" onclick="v2OpenHistory()" title="Saved conversation history">History</button>'+(current()?.name==='WhatsApp Manager'?'':'<button type="button" class="outline" onclick="v2RefreshCurrentChat()" title="Reload saved messages for this agent">Refresh Chat</button><button type="button" class="outline" onclick="v2ClearCurrentChat()" title="Delete this agent\'s current chat after confirmation">Clear Chat</button>');
    const tokens=top.querySelector('.tokensText');
    top.insertBefore(controls,tokens);
  }
  const active=data.agents.find(a=>a.id===data.selected);
  if(active&&!active.builtin){
    const button=document.createElement('button');
    button.type='button';button.className='v2EditAgent';button.title='Edit agent';
    button.textContent='✎';button.onclick=()=>openCreate(active.id);
    top?.appendChild(button);
  }
  if(liveError&&tab==='Chat'){
    const messages=document.querySelector('.chatwrap');
    if(messages){const n=document.createElement('div');n.className='noticeLive';n.textContent=liveError;messages.insertBefore(n,messages.lastElementChild)}
  }
};
function v2WelcomeHTML(a){
  const displayName=String(liveProfile?.answers?.name||liveAccount.name||'friend').trim().split(/\s+/)[0]||'friend';
  // Match the public dashboard's clean first-run state. Agent-specific guidance
  // remains available after the visitor starts a conversation.
  return '<div class="v2RefGreeting">Hey, '+esc(displayName)+'. Ready to dive in?</div>';
  const key=a.name.toLowerCase();
  let title='',paragraphs=[],hint='';
  if(key==='chief'){
    title='Hi '+displayName+', ready to dive in?';
    paragraphs=[
      'Assalamualaikum! I am Chief, your personal AgentH assistant. Tell me what you want to achieve, and I can help break a big goal into clear, manageable steps. Whether you are organizing school work, preparing an interview, planning a project, or handling a busy schedule, we can start right here.',
      'I can help you write messages, research ideas, organize your plans, and prepare work for your specialist agents. For tasks that actually use your connected apps or browser, AgentH will only act through supported tools and permissions. You stay in control, and sensitive external actions require your approval.',
      'Ready? Share one task that is on your mind today. We will figure out the next step together.'
    ];
    hint='Try: “Chief, help me plan my interviews for this week.”';
  }else if(key==='whatsapp manager'){
    title='Assalamualaikum '+displayName+'! Ready to manage WhatsApp?';
    paragraphs=[
      'I am your WhatsApp Manager. My job is to help you stay organized when messages, contacts, and follow-ups start piling up. I can help you prepare professional replies, plan follow-ups, and keep track of conversations you want to handle.',
      'To access actual WhatsApp chats or send messages, you must first connect and authorize your WhatsApp account. I will never pretend to have read or sent anything that the connected service has not confirmed. Sending messages to other people requires your permission and a review of the recipient and message.',
      'Tell me what you want to do first, or open Connect Apps to set up your WhatsApp connection.'
    ];
    hint=liveWhatsappState==='connected'?'WhatsApp is linked. Ask for help organizing an approved task.':'WhatsApp is not connected yet — open Connect Apps to link it.';
  }else if(key==='email manager'){
    title='Hi '+displayName+'! Ready to get your inbox under control?';
    paragraphs=[
      'Welcome! I am your Email Manager. I can help you write polished emails, reply professionally, prepare interview invitations, follow up with people, and organize communication so nothing important gets forgotten.',
      'You can ask me to improve a draft or create a message in English, Urdu, or Roman Urdu. If you want me to work with your actual Gmail account, you will need to authorize Gmail in Connect Apps. Until then, I can help draft and plan, but I cannot claim to read your inbox or send emails.',
      'What email should we work on today? You can paste a reply you received, or tell me who you want to contact.'
    ];
    hint='Try: “Write a short professional interview invitation.”';
  }else if(key==='dost'||key==='friend'){
    title='Hey '+displayName+'! Kya haal hai mere dost?';
    paragraphs=[
      'Assalamualaikum! Main tumhara Dost hoon. Yahan tum bilkul aaram se Roman Urdu, Urdu ya English mein baat kar sakte ho. Chahe school ka din tough gaya ho, koi exciting idea aaya ho, ya bas kisi se baat karni ho, main tumhari baat sunne ke liye yahan hoon.',
      'Hum goals, studies, family, technology, ya kisi bhi everyday topic par chat kar sakte hain. Agar tumhein kisi problem ka solution chahiye toh hum mil kar options samjhenge. Aur agar sirf halka-phulka gup-shup karna hai, woh bhi bilkul theek hai.',
      'Toh batao '+displayName+', aaj ka din kaisa ja raha hai?'
    ];
    hint='Try: “Dost, aaj mera din bohot busy raha.”';
  }else if(key==='1000$ maker'){
    title='Hey '+displayName+'! Ready to build your $1,000 plan?';
    paragraphs=[
      'I am your 1000$ Maker. Let us turn your skills into a practical freelancing plan. We can explore which services you could offer, improve your profile, build a portfolio, and prepare proposals that show clients what makes your work valuable.',
      'I can help you brainstorm Fiverr and Upwork gig ideas, draft outreach messages, practice talking to clients, and break big earning goals into realistic weekly actions. Earnings are never guaranteed, and actual platform browsing, posting, or messaging requires an authorized integration and your approval.',
      'Tell me which skill you want to earn from first: AI tools, website design, writing, video editing, or something else?'
    ];
    hint='Try: “Make me a realistic 30-day freelancing plan.”';
  }else{
    title='Hi '+displayName+', I am '+a.name+'. Ready to get started?';
    paragraphs=[
      'Welcome to your '+a.name+' workspace. My specialty is '+(a.role||'helping with your tasks')+'. You can use this conversation to ask questions, work through ideas, and plan your next steps.',
      'Your actual chat messages are saved in your account. Actions with outside services require supported tools and appropriate permissions.',
      'What should we work on first?'
    ];
    hint='Type your first message below to begin.';
  }
  return '<article class="message assistant v2Welcome" aria-label="Welcome message from '+esc(a.name)+'">'+
    '<div class="by">'+esc(a.name)+' · Welcome</div>'+
    '<div class="v2WelcomeTitle">'+esc(title)+'</div>'+
    '<div class="v2WelcomeBody">'+paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>'+
    '<div class="v2WelcomeHint">'+esc(hint)+'</div>'+
    '</article>';
}

chatHTML=function(a){
  const msgs=data.messages[a.id]||[];
  let body='';
  if(liveLoadingAgent===a.id)body='<div class="empty">Loading saved messages…</div>';
  else if(!msgs.length)body=v2WelcomeHTML(a);
  else body=msgs.map(m=>{
    if(m.role==='user')return '<div class="message user">'+esc(m.text)+'</div>';
    return '<div class="message assistant"><div class="by">'+esc(a.name)+(m.status==='generating'?' · replying':m.status==='failed'?' · failed':'')+'</div>'+v2ChatRich(m.text||'Thinking…')+'<div class="actions"><button class="square" type="button" title="Copy" onclick="copyText(this)">▢</button></div></div>';
  }).join('');
  return '<div class="chatwrap"><div class="messages">'+body+'</div>'+
    '<form class="composer" onsubmit="sendMessage(event)">'+
    '<button type="button" title="Attach a text file" onclick="document.getElementById(\'v2Attach\').click()">＋</button>'+
    '<input id="v2Attach" type="file" accept=".txt,.md,.csv,.json,.ts,.js,.py" hidden onchange="attachLive(event)">'+
    (liveAttachment?'<span class="v2AttachLabel" title="Text attachment">'+esc(liveAttachment.name)+' <button type="button" onclick="liveAttachment=null;render()" title="Remove file">×</button></span>':'')+
    '<textarea id="messageInput" placeholder="Ask '+esc(a.name)+'" rows="1" maxlength="20000" '+(liveBusy?'disabled':'')+' onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit()}"></textarea>'+
    '<button type="button" title="Voice dictation" onclick="voiceLive()">♩</button>'+
    (liveBusy?'<button type="button" class="voice" title="Stop generation" onclick="v2Stop()">■</button>':'<button type="submit" class="voice" title="Send">➤</button>')+
    '</form></div>';
};
copyText=function(button){const p=button.closest('.message');const text=p?.innerText||'';navigator.clipboard?.writeText(text).then(()=>toast('Copied')).catch(()=>toast('Copy unavailable'))};
function v2Stop(){if(liveStop)liveStop.abort()}
async function sendMessage(event){
  event.preventDefault();
  if(liveBusy)return;
  const input=document.getElementById('messageInput');
  const text=String(input?.value||'').trim();
  if(!text&&!liveAttachment)return;
  const agent=current(),id=agent.id,attachment=liveAttachment;
  liveError='';liveBusy=true;liveStop=new AbortController();
  (data.messages[id]??=[]).push({role:'user',text:text+(attachment?' [Attached: '+attachment.name+']':''),status:'completed'});
  const reply={role:'assistant',text:'',status:'generating',tokens:0};
  data.messages[id].push(reply);
  render();
  let completed=false;
  try{
    let cid=liveActive[id];
    if(!cid){
      const conv=await v2Request('/api/conversations','POST',{title:(agent.name+' • Chat').slice(0,120)});
      cid=conv.id;liveActive[id]=cid;
      liveConversations.unshift(conv);
    }
    const response=await fetch('/api/conversations/'+encodeURIComponent(cid)+'/messages',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,agentId:agent.id,...(attachment?{fileId:attachment.id}:{})}),
      signal:liveStop.signal
    });
    if(response.status===401){window.top.location.assign('/login');throw Error('Please sign in')}
    if(!response.ok){let error;try{error=(await response.json()).error}catch{}throw Error(error||'AI request failed')}
    const reader=response.body?.getReader();
    if(!reader)throw Error('No streaming response received');
    const decoder=new TextDecoder();
    let pending='';
    function accept(line){
      if(!line.trim())return;
      const chunk=JSON.parse(line);
      if(chunk.type==='error')throw Error(chunk.error||'AI generation failed');
      if(chunk.type==='delta'){reply.text+=chunk.text||'';render()}
      if(chunk.type==='done'){completed=true;reply.status='completed';reply.tokens=chunk.tokens||0;reply.model=chunk.model||''}
    }
    for(;;){
      const result=await reader.read();
      pending+=decoder.decode(result.value,{stream:!result.done});
      const lines=pending.split('\n');pending=lines.pop()||'';
      for(const line of lines)accept(line);
      if(result.done)break;
    }
    accept(pending);
    if(!completed)throw Error('Response ended before completion');
    liveAttachment=null;
    await v2LoadConversations();
    void v2LoadUsage().catch(()=>{});
  }catch(error){
    reply.status='failed';
    if(error.name==='AbortError')reply.text=reply.text||'Generation stopped.';
    else {reply.text=reply.text||'AI response failed.';liveError=error.message||String(error)}
  }finally{liveBusy=false;liveStop=null;render()}
}
async function attachLive(e){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>1000000){toast('Text attachment must be under 1 MB');return}
  const form=new FormData();form.append('file',file);
  try{
    const response=await fetch('/api/files',{method:'POST',credentials:'same-origin',body:form});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Upload failed');
    liveAttachment={id:result.id,name:file.name};render();
  }catch(error){v2Error(error)}
}
function voiceLive(){
  const Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognizer){toast('Speech recognition is not supported in this browser. Try Chrome.');return}
  const recog=new Recognizer();
  recog.lang=data.prefs.language==='Urdu'?'ur-PK':'en-US';
  recog.interimResults=false;recog.maxAlternatives=1;
  recog.onresult=e=>{const text=e.results?.[0]?.[0]?.transcript||'';const input=document.getElementById('messageInput');if(input){input.value=(input.value+' '+text).trim();input.focus()}};
  recog.onerror=e=>toast('Microphone: '+e.error);
  recog.start();toast('Listening…');
}
async function v2RefreshCurrentChat(){
  if(liveBusy){toast('Stop the current response before refreshing');return}
  const agent=current();if(!agent||agent.name==='WhatsApp Manager')return;
  try{
    await v2LoadConversations();
    if(liveActive[agent.id])await v2LoadAgent(agent.id);
    else render();
    toast('Chat refreshed');
  }catch(error){v2Error(error)}
}
async function v2ClearCurrentChat(){
  if(liveBusy){toast('Stop the current response before clearing');return}
  const agent=current();if(!agent||agent.name==='WhatsApp Manager')return;
  const cid=liveActive[agent.id];
  if(!confirm('Permanently clear the current '+agent.name+' chat? Only this conversation will be deleted.'))return;
  try{
    if(cid)await v2Request('/api/conversations/'+encodeURIComponent(cid),'DELETE');
    liveActive[agent.id]=null;
    data.messages[agent.id]=[];
    liveAttachment=null;liveError='';
    await v2LoadConversations();
    render();toast('Current chat cleared');
  }catch(error){v2Error(error)}
}
function v2NewChat(){
  if(liveBusy){toast('Stop the current response before starting a new chat');return}
  liveActive[data.selected]=null;data.messages[data.selected]=[];liveAttachment=null;liveError='';tab='Chat';render();
}
async function v2OpenHistory(){modal='history';try{await v2LoadConversations()}catch(error){v2Error(error)}render()}
async function v2OpenConversation(id){
  if(liveBusy){toast('Wait for the current response');return}
  const conv=liveConversations.find(c=>c.id===id);if(!conv)return;
  const name=conv.title.split(' • ')[0];
  const agent=data.agents.find(a=>a.name===name)||current();
  data.selected=agent.id;liveActive[agent.id]=id;modal='';tab='Chat';await v2LoadAgent(agent.id);
}
async function v2RenameConversation(id){
  const conv=liveConversations.find(c=>c.id===id);if(!conv)return;
  const value=prompt('Conversation title',conv.title);if(!value?.trim())return;
  try{await v2Request('/api/conversations/'+encodeURIComponent(id),'PATCH',{title:value.trim().slice(0,120)});await v2LoadConversations();render()}catch(e){v2Error(e)}
}
async function v2DeleteConversation(id){
  if(!confirm('Permanently delete this conversation and its messages?'))return;
  try{
    await v2Request('/api/conversations/'+encodeURIComponent(id),'DELETE');
    for(const key of Object.keys(liveActive))if(liveActive[key]===id){liveActive[key]=null;data.messages[key]=[]}
    await v2LoadConversations();render();
  }catch(e){v2Error(e)}
}
function v2HistoryItems(){
  const list=liveConversations.filter(c=>(c.title||'').toLowerCase().includes(historyQuery.toLowerCase()));
  return list.length?list.map(c=>'<div class="historyItem"><button type="button" onclick="v2OpenConversation(\''+esc(c.id)+'\')">'+esc(c.title||'New conversation')+'<small style="display:block;color:#888">'+(c._count?.messages||0)+' messages</small></button><button type="button" title="Rename" onclick="v2RenameConversation(\''+esc(c.id)+'\')">✎</button><button type="button" title="Delete" onclick="v2DeleteConversation(\''+esc(c.id)+'\')">×</button></div>').join(''):'<p class="empty">No saved conversations found.</p>';
}
function v2HistoryList(){const el=document.getElementById('v2HistoryList');if(el)el.innerHTML=v2HistoryItems()}
function v2HistoryHTML(){return '<h2>Chat history</h2><p class="sub">Saved conversations from your account</p><input class="connectorSearch" placeholder="Search your chats" value="'+esc(historyQuery)+'" oninput="historyQuery=this.value;v2HistoryList()"><div id="v2HistoryList" style="overflow-y:auto;max-height:55vh;margin-top:15px">'+v2HistoryItems()+'</div>'}
const v2OriginalModalHTML=modalHTML;
modalHTML=function(){
  if(modal==='history')return '<div class="shade" onclick="if(event.target===this)closeModal()"><div class="modal submodal"><button class="close" onclick="closeModal()">×</button>'+v2HistoryHTML()+'</div></div>';
  return v2OriginalModalHTML();
};
todoHTML=function(){
  const a=current();
  let agentItems=liveTasks.map(t=>{
    const status=String(t.status||'queued');
    const button=(action,title)=>'<button type="button" onclick="v2TaskAction(\''+esc(t.id)+'\',\''+action+'\')">'+title+'</button>';
    let actions='';
    if(status==='waiting_approval')actions+=button('approve','Approve')+button('reject','Reject');
    if(['queued','planning','running'].includes(status))actions+=button('pause','Pause')+button('cancel','Cancel');
    if(['paused','failed'].includes(status))actions+=button('resume','Resume')+button('cancel','Cancel');
    return '<div class="taskrow"><div class="taskname"><strong>'+esc(t.instruction)+'</strong><small style="display:block">'+esc(status.replace(/_/g,' '))+(t.error?' — '+esc(t.error):'')+'</small></div>'+actions+'</div>';
  }).join('');
  const personalItems=livePersonal.map(t=>'<div class="taskrow"><input type="checkbox" '+(t.done?'checked':'')+' onchange="v2PersonalToggle(\''+esc(t.id)+'\',this.checked)"><div class="taskname '+(t.done?'done':'')+'">'+esc(t.text)+'</div><button type="button" onclick="v2PersonalDelete(\''+esc(t.id)+'\')">×</button></div>').join('');
  return '<div class="todos"><div class="todocol"><h3>Agent\'s To-Do</h3><p>What your agents are doing on their own - scheduled jobs like a daily post - plus tasks you hand to them with Reassign.</p><form class="taskform" onsubmit="v2SubmitAgentTask(event)"><input name="task" placeholder="Add a task for the agent..." maxlength="12000" required><button class="black" type="submit">+</button></form>'+ (agentItems||'<div class="empty">Nothing here yet.</div>') +'</div><div class="todocol"><h3>Your To-Do</h3><p>Requests that came to you on WhatsApp, and things you add by hand. Use Reassign to hand one to an agent.</p><form class="taskform" onsubmit="v2SubmitPersonalTask(event)"><input name="task" placeholder="Add something for yourself..." maxlength="500" required><button class="black" type="submit">+</button></form>'+(personalItems||'<div class="empty">Nothing here yet.</div>')+'</div></div>';
};
async function v2SubmitAgentTask(e){e.preventDefault();const input=e.target.querySelector('input');const instruction=input.value.trim();if(!instruction)return;try{await v2Request('/api/tasks','POST',{instruction});input.value='';await v2LoadTasks();toast('Task queued for the worker')}catch(error){v2Error(error)}}
async function v2TaskAction(id,action){try{await v2Request('/api/tasks/'+encodeURIComponent(id),'POST',{action});await v2LoadTasks();toast('Task updated')}catch(error){v2Error(error)}}
async function v2SubmitPersonalTask(e){e.preventDefault();const input=e.target.querySelector('input');const text=input.value.trim();if(!text)return;try{await v2Request('/api/personal-todos','POST',{text});input.value='';await v2LoadPersonal()}catch(error){v2Error(error)}}
async function v2PersonalToggle(id,done){try{await v2Request('/api/personal-todos','PATCH',{id,done});await v2LoadPersonal()}catch(error){v2Error(error)}}
async function v2PersonalDelete(id){try{await v2Request('/api/personal-todos','DELETE',{id});await v2LoadPersonal()}catch(error){v2Error(error)}}
createAgent=async function(){
  const name=String(document.getElementById('agentName')?.value||'').trim();
  if(!name){toast('Enter an agent name');return}
  const existing=data.agents.find(a=>a.id===editId);
  if(existing?.builtin){toast('Built-in agents cannot be edited');return}
  const body={name,role:existing?.role||'Assist with '+name+' tasks',permissions:existing?.permissions||['report'],avatarColor:color,avatarShape:shape,template:'custom'};
  try{
    if(editId)await v2Request('/api/agents','PATCH',{id:editId,...body});
    else await v2Request('/api/agents','POST',body);
    const currentName=name;
    await v2LoadAgents();
    data.selected=data.agents.find(a=>a.name===currentName)?.id||data.selected;
    modal='';render();toast(editId?'Agent updated':'Agent created and saved');
  }catch(error){v2Error(error)}
};
deleteAgent=async function(){
  if(!editId||!confirm('Delete this custom agent?'))return;
  const existing=data.agents.find(a=>a.id===editId);
  if(!existing||existing.builtin)return toast('Cannot delete a built-in agent');
  try{await v2Request('/api/agents','DELETE',{id:editId});await v2LoadAgents();modal='';render();toast('Agent deleted')}catch(error){v2Error(error)}
};
connectHTML=function(){
  const matches=connectors.filter(c=>(filter==='All'||c[1]===filter)&&c[0].toLowerCase().includes(connectSearch.toLowerCase()));
  const available=['WhatsApp','Gmail','Email'];
  return '<h2>Connect Apps</h2><p class="sub">Connection status comes from your account, not a simulated demo.</p><p style="color:#777">'+liveConnectors.filter(c=>!!c.connection).length+' connected service(s)</p><input class="connectorSearch" placeholder="Search connectors…" value="'+esc(connectSearch)+'" oninput="connectSearch=this.value;render()"><div class="filters">'+['All','Messaging','Email','Social','Freelance','MCP'].map(x=>'<button class="filter '+(filter===x?'on':'')+'" onclick="filter=\''+x+'\';render()">'+x+'</button>').join('')+'</div><div class="connectgrid">'+matches.map(c=>{
    const name=c[0],connected=!!data.connections[name],supported=available.includes(name);
    return '<div class="connectcard"><div class="brand" style="background:'+c[2]+'">'+esc(c[3])+'</div><div class="info"><strong>'+esc(name)+'</strong><small>'+esc(connected?'Connected':supported?'Not connected':'Integration not available')+'</small></div><button class="black" '+(!supported?'disabled title="No backend connector is installed"':'onclick="connectorClick(\''+esc(name)+'\')"')+'>'+ (connected?'Manage':supported?'Connect':'Unavailable')+'</button></div>';
  }).join('')+'</div><p class="note">Google, WhatsApp and approved integrations require provider authorization. No messages are sent automatically.</p>';
};
connectorClick=async function(name){
  if(name==='WhatsApp'){window.top.location.assign('/dashboard?tab=whatsapp-agent');return}
  if(name==='Gmail'||name==='Email'){
    try{
      const r=await v2Request('/api/connectors/google','POST',{provider:'gmail'});
      if(!r.url||!/^https:\/\/accounts\.google\.com\//.test(r.url))throw Error('Google authorization URL unavailable');
      window.top.location.assign(r.url);
    }catch(error){v2Error(error)}
    return;
  }
  toast('This provider has no installed backend integration yet.');
};
const v2InformationFields=[
  ['name','Name','text','Your name'],['title','Title','text','Mr, Ms, Dr… — used in your email signature (Mr = His, Ms = Her)'],
  ['direct_email','Direct email','email','Your own email — it gets a copy of every email your agent sends, and goes in the signature'],
  ['company','Company / organisation','text',''],['website','Website','url','https://'],['what_you_do','What you do','text',''],
  ['work_repeat','Work you repeat','text',''],['location','Location','text',''],['phone','Phone','tel',''],
  ['linkedin','LinkedIn','url','https://'],['facebook','Facebook','url','https://'],['preferred_language','Preferred language','text','']
];
const v2MemoryExportPrompt=`Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.\n\n## Categories (output in this order):\n1. **Instructions**: Rules I've explicitly asked you to follow going forward - tone, format, style, "always do X", "never do Y", and corrections to your behavior. Only include rules from stored memories, not from conversations.\n2. **Identity**: Name, age, location, education, family, relationships, languages, and personal interests.\n3. **Career**: Current and past roles, companies, and general skill areas.\n4. **Projects**: Projects I meaningfully built or committed to. Ideally ONE entry per project. Include what it does, current status, and any key decisions. Use the project name or a short descriptor as the first words of the entry.\n5. **Preferences**: Opinions, tastes, and working-style preferences that apply broadly.\n\n## Format:\nUse section headers for each category. Within each category, list one entry per line, sorted by oldest date first. Format each line as:\n[YYYY-MM-DD] - Entry content here.\nIf no date is known, use [unknown] instead.\n\n## Output:\n- Wrap the entire export in a single code block for easy copying.\n- After the code block, state whether this is the complete set or if more remain.`;
function v2ProfilePayload(answers){return {language:liveProfile?.language||'en',timezone:liveProfile?.timezone||'Asia/Karachi',answers,onboarded:!!liveProfile?.onboarded,onboardingStep:liveProfile?.onboardingStep??-1};}
function v2InformationHTML(){
  const answers=liveProfile?.answers||{},memory=String(answers.agent_memory||'').split(/\n+/).map(value=>value.trim()).filter(Boolean);
  const fields=v2InformationFields.map(([key,label,type,placeholder])=>{const value=answers[key]||(key==='name'?liveAccount.name:'');return '<label class="v2InfoField">'+esc(label)+'<input name="'+key+'" type="'+type+'" value="'+esc(value)+'" placeholder="'+esc(placeholder)+'" maxlength="4000"></label>'}).join('');
  const memories=memory.length?'<ul>'+memory.map(entry=>'<li>'+esc(entry)+'</li>').join('')+'</ul>':'<p class="v2InfoEmpty">Nothing yet. When you tell an agent something about yourself, it shows up here.</p>';
  return '<div class="v2Information"><p class="v2InfoIntro">Everything your agents know about you - from your Welcome session and from what you\'ve told them since. Every agent uses it (for example to sign messages with your name).</p>'+ 
    '<form class="v2InfoForm" onsubmit="v2SaveInformation(event)">'+fields+'<button class="black" type="submit">Save</button></form>'+ 
    '<section class="v2InfoMemory"><div><h3>Things your agents know about you</h3><button class="outline" type="button" onclick="document.getElementById(\'v2MemoryEntry\')?.focus()">Add</button></div>'+memories+
    '<div class="v2MemoryAdd"><input id="v2MemoryEntry" maxlength="4000" placeholder="Add something your agents should remember"><button class="black" type="button" onclick="v2AddMemory()">Add</button></div></section>'+ 
    '<section class="v2InfoImport"><h3>Import memory from another AI</h3><p><b>1.</b> Copy this prompt into a chat with your other AI assistant (ChatGPT, Claude, Gemini, Grok...).</p><textarea id="v2MemoryPrompt" readonly>'+esc(v2MemoryExportPrompt)+'</textarea><button class="outline" type="button" onclick="v2CopyMemoryPrompt()">Copy prompt</button><p><b>2.</b> Paste the results below to add them to AgentH\'s memory. Every agent will use it.</p><textarea id="v2MemoryImport" maxlength="4000" placeholder="Paste the exported memories here"></textarea><button class="black" type="button" onclick="v2ImportMemory()">Add to Memory</button></section></div>';
}
async function v2SaveInformation(event){
  event.preventDefault();
  try{const form=new FormData(event.currentTarget),answers={...(liveProfile?.answers||{})};for(const [key] of v2InformationFields)answers[key]=String(form.get(key)||'').trim();liveProfile=await v2Request('/api/profile','PUT',v2ProfilePayload(answers));toast('Your information was saved for every agent.');render();}catch(error){v2Error(error)}
}
async function v2PersistMemory(value){
  const answers={...(liveProfile?.answers||{})},next=value.trim();if(next.length>4000)throw Error('Memory is limited to 4,000 characters.');answers.agent_memory=next;liveProfile=await v2Request('/api/profile','PUT',v2ProfilePayload(answers));
}
async function v2AddMemory(){
  const input=document.getElementById('v2MemoryEntry'),entry=String(input?.value||'').trim();if(!entry)return;try{const current=String(liveProfile?.answers?.agent_memory||'').trim(),next=current?current+'\n'+entry:entry;await v2PersistMemory(next);toast('Added to your agents\' shared memory.');render();}catch(error){v2Error(error)}}
async function v2ImportMemory(){
  const input=document.getElementById('v2MemoryImport'),entry=String(input?.value||'').trim();if(!entry)return;try{const current=String(liveProfile?.answers?.agent_memory||'').trim(),next=current?current+'\n'+entry:entry;await v2PersistMemory(next);toast('Imported into your agents\' shared memory.');render();}catch(error){v2Error(error)}}
async function v2CopyMemoryPrompt(){try{await navigator.clipboard.writeText(v2MemoryExportPrompt);toast('Prompt copied.')}catch{toast('Copy unavailable in this browser.')}}
async function v2ToggleSuggestions(){try{const next=!data.prefs.suggestions,answers={...(liveProfile?.answers||{}),suggestions_from_chief:String(next)};liveProfile=await v2Request('/api/profile','PUT',v2ProfilePayload(answers));data.prefs.suggestions=next;toast(next?'Chief suggestions are on.':'Chief suggestions are off.');render();}catch(error){v2Error(error)}}
settingsContent=function(){
  if(settingsTab==='General')return '<div class="panel">'+
    '<div class="settingrow"><div><div class="title">Appearance</div><div class="desc">Dark, light, or follow this device.</div></div><select onchange="setPref(\'appearance\',this.value)">'+['System','Dark','Light'].map(x=>'<option '+(data.prefs.appearance===x?'selected':'')+'>'+x+'</option>').join('')+'</select></div>'+
    '<div class="settingrow"><div><div class="title">Reply language</div><div class="desc">The language all your agents reply in, on the website and WhatsApp.</div></div><select onchange="setPref(\'language\',this.value)">'+['Auto - match my language','English','Roman Urdu','Urdu'].map(x=>'<option '+(data.prefs.language===x?'selected':'')+'>'+x+'</option>').join('')+'</select></div>'+
    '<div class="settingrow"><div><div class="title">Suggestions from Chief</div><div class="desc">Chief looks at your calendar, store and inbox and suggests ways to help - like spotting a double-booked meeting.</div></div><button class="toggle '+(data.prefs.suggestions?'on':'')+'" role="switch" aria-checked="'+!!data.prefs.suggestions+'" onclick="v2ToggleSuggestions()"></button></div>'+
    '<div class="settingrow"><div><div class="title">Notifications on this device</div><div class="desc">Get Chief\'s suggestions as notifications, even when AgentH is closed.</div></div><button class="outline" onclick="requestNotification()">Turn on</button></div>'+
    '<div class="settingrow"><div><div class="title">Show me messages before sending</div><div class="desc">Agents show every WhatsApp message or email to other people and wait for your OK.</div></div><button class="toggle" role="switch" aria-checked="false" title="External approvals stay enforced"></button></div>'+
    '</div>';
  if(settingsTab==='Your information')return v2InformationHTML();
  if(settingsTab==='Email')return '<div class="panel"><div class="title" style="font-size:22px">Email integrations</div><p class="desc">Gmail can be linked using Google authorization when your server is configured.</p><button class="black" onclick="connectorClick(\'Gmail\')">Connect Gmail</button><p class="note">AgentH does not currently provide an @agenth.net mailbox or domain-email claiming.</p></div>';
  if(settingsTab==='Vault')return '<div class="panel"><div class="title">Vault unavailable</div><p>Secure credential and card storage is not configured. Do not enter passwords, bank cards or API keys here.</p></div>';
  if(settingsTab==='Computer')return '<div class="panel"><div class="title">Computer and Browser</div><p>Use the authorized AgentH browser workspace for supported tools.</p><button class="black" onclick="window.top.location.assign(\'/dashboard?tab=browser\')">Open browser workspace</button></div>';
  if(settingsTab==='Usage & Billing')return '<div class="panel"><div class="settingrow"><div class="title">AI provider</div><strong>'+esc(liveUsage.provider||'Unknown')+'</strong></div><div class="settingrow"><div class="title">Recorded chat tokens</div><strong>'+Number(liveUsage.chatTokens||0).toLocaleString()+'</strong></div><div class="settingrow"><div class="title">Recorded task tokens</div><strong>'+Number(liveUsage.taskTokens||0).toLocaleString()+'</strong></div><p class="note">Usage values reflect server records, not an estimate or a bill.</p></div>';
  return '<div class="panel"><p>Current release of AgentH. More information is available in the connected workspace.</p><button class="black" onclick="window.top.location.assign(\'/dashboard?tab=setup\')">Setup and updates</button></div>';
};
setPref=async function(k,value){
  try{
    if(k==='appearance'){
      if(!liveSettings)throw Error('Settings are not loaded');
      const theme=value==='Dark'?'dark':value==='System'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'light';
      liveSettings=await v2Request('/api/settings','PUT',{model:liveSettings.model,voice:liveSettings.voice,speed:liveSettings.speed,volume:liveSettings.volume,autoplay:liveSettings.autoplay,theme,microphoneId:liveSettings.microphoneId||''});
      data.prefs.appearance=value;
      localStorage.setItem('agenth-v2-theme-preference',value);
      v2ApplyTheme(value);
    }else if(k==='language'){
      if(!liveProfile)throw Error('Profile is not loaded');
      const language=value==='Roman Urdu'?'roman-ur':value==='Urdu'?'ur':'en';
      liveProfile=await v2Request('/api/profile','PUT',{language,timezone:liveProfile.timezone||'Asia/Karachi',answers:liveProfile.answers||{},onboarded:!!liveProfile.onboarded,onboardingStep:liveProfile.onboardingStep??0});
      data.prefs.language=value;
      localStorage.setItem('agenth-v2-language-preference',value);
    }
    render();toast('Settings saved');
  }catch(error){v2Error(error);render()}
};
settingToggle=function(){toast('External-action approval is enforced by the server.')};
marketHTML=function(){
  return '<h2>Bot Marketplace</h2><p class="sub">Marketplace purchases are not available in this installation.</p><div class="panel"><p>Create your own persistent specialist agent instead.</p><button class="black" onclick="openCreate()">Create an agent</button></div>';
};
shareHTML=function(){return '<h2>Share this conversation</h2><p>Sharing and multi-user invitations require a server-side permission system, which is not installed. Your messages stay private to your account.</p><button class="black" disabled>Invitations unavailable</button>'};
tokensHTML=function(){return '<h2>Token usage</h2><p>Recorded chat tokens: <strong>'+Number(liveUsage.chatTokens||0).toLocaleString()+'</strong></p><p>Recorded task tokens: <strong>'+Number(liveUsage.taskTokens||0).toLocaleString()+'</strong></p><p class="note">Server-reported usage may exclude responses without token metadata.</p><button class="outline" onclick="v2LoadUsage().catch(v2Error)">Refresh usage</button>'};
function signOutLive(){window.top.location.assign('/api/auth/signout')}
void v2Boot();
// Keep the V2 connector badge in sync with real server connection state.
setInterval(()=>{if(document.visibilityState==='visible')void v2LoadConnections().catch(()=>{});},6000);
window.addEventListener('focus',()=>{void v2LoadConnections().catch(()=>{});});
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.data?.type!=='agenth:whatsapp-status-changed')return;
  void v2LoadConnections().catch(()=>{});
});

// The public dashboard keeps one compact WhatsApp connector row.  When it is
// linked, that same row opens the authenticated live-chat workspace.
const v2RenderWithWhatsAppLive=render;
render=function(){
  v2RenderWithWhatsAppLive();
  const whatsappRow=document.querySelector('.connectSide .connectorLink');
  if(whatsappRow&&data.connections?.WhatsApp){
    whatsappRow.setAttribute('role','link');
    whatsappRow.setAttribute('aria-label','Open WhatsApp Live');
    whatsappRow.onclick=()=>window.top.location.assign('/dashboard/whatsapp-connect?view=live');
  }
};
