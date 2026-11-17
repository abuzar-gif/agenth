/* AgentH V2 – agent profile, saved skill recorder and manual replay.
   This UI never pretends a recorded skill has been trained into an autonomous model. */
let v2SkillPanelOpen=false, v2SkillTab='Skills', v2SkillAgentId='', v2SkillList=[];
let v2SkillRecorderOpen=false, v2SkillRecording=false, v2SkillSteps=[], v2SkillReplay=null, v2SkillReplayIndex=0;
let v2SkillBrowserUrl='about:blank', v2SkillBrowserTitle='', v2SkillScreenNonce=0, v2SkillBusy=false, v2SkillError='', v2SkillComposeOpen=false, v2SkillLoading=false;

function v2ChatRich(value){
  // Basic safe markdown renderer. Escape before adding markup; never trust model HTML.
  const raw=String(value||'').replace(/(^|\n)\s*(?:svg){2,}\s*(?=\n|$)/gi,'$1').trim();
  const lines=raw.split(/\n/);
  let out='',list=false;
  const inline=text=>esc(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>');
  const endList=()=>{if(list){out+='</ul>';list=false}};
  for(const line of lines){
    const item=line.match(/^\s*[-*]\s+(.+)/);
    const number=line.match(/^\s*\d+\.\s+(.+)/);
    const heading=line.match(/^\s*#{1,3}\s+(.+)/);
    const buttons=line.match(/^\s*\[\[buttons:\s*(.+?)\s*\]\]\s*$/);
    if(item||number){
      if(!list){out+='<ul class="v2RichList">';list=true}
      out+='<li>'+inline((item||number)[1])+'</li>';
    }else{
      endList();
      if(buttons){
        out+='<div class="v2RichSuggestions">'+buttons[1].split('|').slice(0,6).map(x=>'<button type="button" class="v2RichSuggestion" data-suggestion="'+esc(x.trim())+'">'+esc(x.trim())+'</button>').join('')+'</div>';
      }else if(heading)out+='<h3 class="v2RichHeading">'+inline(heading[1])+'</h3>';
      else if(line.trim())out+='<p class="v2RichParagraph">'+inline(line.trim())+'</p>';
      else out+='<div class="v2RichBreak"></div>';
    }
  }
  endList();
  return out||'';
}
function v2SkillApplySuggestion(value){
  const input=document.getElementById('messageInput');
  if(!input){toast('Open Chat to use this suggestion');return}
  input.value=value;input.focus();
}

function v2SkillIcon(name){
  const paths={
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-1.84 1.84-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.52V21h-2.6v-.09a1.65 1.65 0 0 0-1.02-1.52 1.65 1.65 0 0 0-1.82.33l-.06.06-1.84-1.84.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.52-1H5v-2.6h.09a1.65 1.65 0 0 0 1.52-1.02 1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.06 7.7l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.52V6h2.6v.09a1.65 1.65 0 0 0 1.02 1.52 1.65 1.65 0 0 0 1.82-.33l.06-.06 1.84 1.84-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.52 1H20v2.6h-.09A1.65 1.65 0 0 0 18.4 15Z"/>',
    sliders:'<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    logout:'<path d="M10 17l5-5-5-5"/><path d="M15 12H4"/><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/>',
    profile:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    laptop:'<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20"/>',
    arrow:'<path d="M5 12h14M12 5l7 7-7 7"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 16v4h14v-4"/>',
    paperclip:'<path d="m20 11.5-7.7 7.7a5 5 0 0 1-7.1-7.1L13 4.3a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-2.9-2.9l7.2-7.2"/>',
    record:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    close:'<path d="m5 5 14 14M19 5 5 19"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a16 16 0 0 1 0 18M12 3a16 16 0 0 0 0 18"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
    share:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 14v6h14v-6"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    expand:'<path d="M8 3H3v5M16 21h5v-5M3 8l6-6M21 16l-6 6"/>',
    volume:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
    whatsapp:'<path d="M5 19l-2 3 4-1a9 9 0 1 0-3-3"/><path d="M8 9c0 3 4 7 7 7l2-2-2-1-1 1a8 8 0 0 1-4-4l1-1-1-2z"/>',
    robot:'<rect x="4" y="7" width="16" height="13" rx="3"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M12 7V3m-2 0h4M2 13h2m16 0h2"/>',
    check:'<path d="m5 12 5 5 9-10"/>',
  };
  return '<svg class="v2UIIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.profile)+'</svg>';
}
function v2SkillAgent(){return data.agents.find(a=>a.id===v2SkillAgentId)||current()}
function v2SkillHost(){let el=document.getElementById('v2SkillOverlayHost');if(!el){el=document.createElement('div');el.id='v2SkillOverlayHost';document.body.append(el)}return el}
function v2SkillFlash(error){v2SkillError=error instanceof Error?error.message:String(error);toast(v2SkillError);v2SkillRenderLayer()}
function v2SkillRenderLayer(){
  const host=v2SkillHost();
  if(v2SkillRecorderOpen){host.innerHTML=v2SkillRecorderHTML();return}
  if(v2SkillPanelOpen){host.innerHTML=v2SkillPanelHTML();return}
  host.innerHTML='';
}
function v2SkillOpenProfile(id){
  const found=data.agents.find(a=>a.id===(id||current().id));
  if(!found)return;
  v2SkillPanelOpen=true;v2SkillRecorderOpen=false;v2SkillAgentId=found.id;v2SkillTab='Details';v2SkillError='';
  v2SkillRenderLayer();
  void v2SkillLoadList();
}
function v2SkillCloseProfile(){v2SkillPanelOpen=false;v2SkillComposeOpen=false;v2SkillError='';v2SkillRenderLayer()}
function v2SkillSetTab(name){
  v2SkillTab=name;v2SkillError='';v2SkillRenderLayer();
  if(name==='Skills')void v2SkillLoadList();
  if(name==='Computer')void v2SkillLoadBrowser();
}
async function v2SkillLoadList(){
  const id=v2SkillAgentId;
  if(!id)return;
  v2SkillLoading=true;v2SkillRenderLayer();
  try{
    const list=await v2Request('/api/agent-skills?agentId='+encodeURIComponent(id));
    if(id===v2SkillAgentId)v2SkillList=Array.isArray(list)?list:[];
  }catch(e){v2SkillError=e.message||String(e)}
  finally{v2SkillLoading=false;v2SkillRenderLayer()}
}
async function v2SkillLoadBrowser(){
  try{
    const state=await v2Request('/api/agent-skills/browser');
    v2SkillBrowserUrl=String(state.url||'about:blank');
    v2SkillBrowserTitle=String(state.title||'');
    v2SkillScreenNonce=Date.now();
    v2SkillError='';
  }catch(e){v2SkillError=e.message||String(e)}
  v2SkillRenderLayer();
}
function v2SkillMiniBrowser(){
  return '<div class="v2SkillMiniBrowser"><div class="v2SkillMiniChrome"><i class="v2SkillDot"></i><i class="v2SkillDot"></i><i class="v2SkillDot"></i><div class="v2SkillUrl">'+esc(v2SkillBrowserUrl)+'</div></div>'+
    (v2SkillScreenNonce?'<img src="/api/agent-skills/browser?image=1&t='+v2SkillScreenNonce+'" alt="Your actual AgentH browser session">':'<div style="height:210px;background:#fff"></div>')+'</div>';
}
function v2SkillDetailContent(a){
  const c=a.permissions||[];
  return '<h3>About '+esc(a.name)+'</h3>'+
  '<p>'+esc(a.role||a.intro||'This assistant can help you plan and organize your work.')+'</p>'+
  '<div class="v2SkillRow"><strong>Available capabilities</strong><div>'+c.map(t=>'<span class="v2PanelBtn" style="font-size:12px;padding:6px 11px">'+esc(t)+'</span>').join('')+'</div><small>Real external actions only work through authorized AgentH tools.</small></div>'+
  '<div class="v2SkillRow"><strong>Approval before external actions</strong><small>Sending messages and changing other services requires explicit user approval when supported.</small></div>'+
  '<button class="v2PanelBtn v2PanelBtn--highlight" onclick="v2SkillStartRecorder()">'+v2SkillIcon('record')+' Teach a task</button>';
}
function v2SkillLibraryContent(){
  return '<h3>Library</h3><p>Documents sent in the agent chat are stored with your conversations. Add a new text document using the paperclip in the chat composer.</p>'+
    '<button class="v2PanelBtn" onclick="v2SkillGoChatUpload()">'+v2SkillIcon('paperclip')+' Attach in chat</button>'+
    '<p class="v2SkillMuted" style="margin-top:34px">A shared per-agent file library is not configured yet.</p>';
}
function v2SkillGoChatUpload(){
  v2SkillCloseProfile();tab='Chat';render();
  document.getElementById('v2Attach')?.click();
}
function v2SkillComputerContent(){
  return '<h3>'+esc(v2SkillAgent().name)+'&#39;s computer</h3>'+
    '<p>This is an actual authenticated AgentH browser session. Open the recorder to show a repeatable workflow.</p>'+
    v2SkillMiniBrowser()+
    '<div style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center"><button class="v2PanelBtn v2PanelBtn--highlight" onclick="v2SkillStartRecorder()">'+v2SkillIcon('record')+' Teach a task</button>'+
    '<button class="v2PanelBtn" onclick="v2SkillLoadBrowser()">'+v2SkillIcon('refresh')+' Refresh</button></div>'+
    '<p class="v2SkillMuted">Websites may block automated browsers or require their own login.</p>';
}
function v2SkillSkillsContent(){
  let body='';
  if(v2SkillLoading)body='<p class="v2SkillMuted">Loading your saved skills…</p>';
  else if(!v2SkillList.length)body='<p class="v2SkillMuted" style="margin-top:40px">No skills yet. Press “Teach a task” and show your agent how you do something.</p>';
  else body=v2SkillList.map(s=>{
    const stamp=new Date(s.createdAt);const date=Number.isNaN(stamp.getTime())?'':stamp.toLocaleDateString();
    return '<article class="v2SkillRow"><strong>'+esc(s.title)+'</strong><small>'+s.steps.length+' saved browser step(s) · '+esc(date)+'</small>'+
      '<div><button onclick="v2SkillReplaySaved(\''+esc(s.id)+'\')">'+v2SkillIcon('arrow')+' Review / replay</button>'+
      '<button class="v2SkillDanger" onclick="v2SkillDelete(\''+esc(s.id)+'\')">'+v2SkillIcon('trash')+' Delete</button></div></article>';
  }).join('');
  return '<div class="v2SkillEmpty"><h3>Skills you taught</h3><p>Show your agent a task once in its browser.<br>Save the steps to review and replay with your permission.</p>'+
    '<button class="v2PanelBtn v2PanelBtn--highlight" onclick="v2SkillStartRecorder()">🎓 Teach a task</button>'+body+'</div>';
}
function v2SkillPanelHTML(){
  const a=v2SkillAgent();
  const tabs=['Details','Library','Computer','Skills'];
  const contents={Details:()=>v2SkillDetailContent(a),Library:()=>v2SkillLibraryContent(),Computer:()=>v2SkillComputerContent(),Skills:()=>v2SkillSkillsContent()};
  return '<div class="v2TaskBackdrop" onclick="if(event.target===this)v2SkillCloseProfile()"><section class="v2AgentProfilePanel" role="dialog" aria-modal="true" aria-label="'+esc(a.name)+' details">'+
   '<div class="v2ProfileActions"><button title="Share" onclick="toast(\'Agent invitations are not available yet\')">'+v2SkillIcon('share')+'</button>'+
   '<button title="Close profile" onclick="v2SkillCloseProfile()">'+v2SkillIcon('close')+'</button></div>'+
   '<div class="v2ProfileIdentity">'+avatar(a,96)+'<h2>'+esc(a.name)+'</h2><p>'+esc(a.role||'Personal assistant')+'</p></div>'+
   '<nav class="v2ProfileTabs" aria-label="Agent details tabs">'+tabs.map(name=>'<button aria-selected="'+(v2SkillTab===name)+'" onclick="v2SkillSetTab(\''+name+'\')">'+name+'</button>').join('')+'</nav>'+
   '<div class="v2ProfileBody">'+(v2SkillError?'<p class="v2RecorderError">'+esc(v2SkillError)+'</p>':'')+contents[v2SkillTab]()+'</div></section></div>';
}
function v2SkillRecorderHTML(){
  const a=v2SkillAgent();
  const replay=!!v2SkillReplay;
  const buttonLabel=replay?'Run next step ('+v2SkillReplayIndex+'/'+v2SkillReplay.steps.length+')':v2SkillRecording?'■ Stop & save':'◉ Start recording';
  const buttonAction=replay?'v2SkillRunNext()':'v2SkillToggleRecording()';
  const stepSummary=replay?'Saved workflow: '+esc(v2SkillReplay.title):v2SkillRecording?v2SkillSteps.length+' step(s) recorded':'Your browser actions can be saved as a skill';
  return '<div class="v2TaskRecorder" role="dialog" aria-modal="true" aria-label="Teach a task">'+
   '<div class="v2RecorderTop"><h2>Record yourself doing a task. '+esc(a.name)+' saves the steps to review and repeat.</h2>'+
   '<div class="v2RecorderActions"><button class="v2RecorderButton" onclick="'+buttonAction+'" '+(v2SkillBusy?'disabled':'')+'>'+buttonLabel+'</button>'+
   '<button class="v2RecorderClose" aria-label="Close recorder" title="Close recorder" onclick="v2SkillDismissRecorder()">×</button></div></div>'+
   '<form class="v2RecorderNavigate" onsubmit="v2SkillNavigate(event)"><span>'+v2SkillIcon('globe')+'</span>'+
   '<input id="v2RecorderUrlInput" placeholder="Go to a website - type it (e.g. example.com) and press Enter" value="'+esc(v2SkillBrowserUrl==='about:blank'?'':v2SkillBrowserUrl)+'" aria-label="Website URL"><button title="Go" type="submit">Go</button></form>'+
   '<div class="v2RecorderBrowser"><div class="v2RecorderChrome"><i class="v2SkillDot"></i><i class="v2SkillDot"></i><i class="v2SkillDot"></i>'+
   '<div class="v2SkillUrl">♙ &nbsp;'+esc(v2SkillBrowserUrl)+'</div></div>'+
   '<div class="v2RecorderScreen">'+(v2SkillScreenNonce?
   '<img src="/api/agent-skills/browser?image=1&t='+v2SkillScreenNonce+'" alt="Live browser screenshot; click to interact with the webpage" onclick="v2SkillBrowserClick(event)" onwheel="v2SkillBrowserWheel(event)" draggable="false">':
   '<div style="width:70%;height:100%;background:#fff"></div>')+
   (v2SkillBusy?'<div class="v2RecorderBusy">Working in browser…</div>':'')+
   '</div></div>'+
   '<div class="v2RecorderTools"><form class="v2RecorderType" onsubmit="v2SkillType(event)"><input id="v2SkillTypedText" maxlength="600" placeholder="Type into selected field (no passwords)" aria-label="Type into browser"><button type="submit" '+(v2SkillBusy?'disabled':'')+'>Type</button></form>'+
   '<button onclick="v2SkillScroll(-590)" '+(v2SkillBusy?'disabled':'')+'>↑ Scroll</button><button onclick="v2SkillScroll(590)" '+(v2SkillBusy?'disabled':'')+'>↓ Scroll</button>'+
   '<button onclick="v2SkillLoadBrowser()" '+(v2SkillBusy?'disabled':'')+'>'+v2SkillIcon('refresh')+' Refresh</button></div>'+
   (v2SkillError?'<div class="v2RecorderError">'+esc(v2SkillError)+'</div>':'')+
   '<div class="v2RecorderHUD"><strong>➤ You&#39;re in control <small> · '+stepSummary+'</small></strong>'+
   (v2SkillRecording?'<button onclick="v2SkillToggleRecording()">Save</button>':'')+'</div>'+
   '<div class="v2RecorderStepsMini">Only record your own permitted actions. Passwords and payment details must not be typed here. Saved steps do not run automatically.</div></div>';
}
async function v2SkillStartRecorder(){
  v2SkillPanelOpen=false;
  v2SkillRecorderOpen=true;
  v2SkillReplay=null;
  v2SkillRecording=false;
  v2SkillReplayIndex=0;
  v2SkillSteps=[];
  v2SkillError='';
  v2SkillRenderLayer();
  await v2SkillLoadBrowser();
}
function v2SkillDismissRecorder(){
  if(v2SkillRecording&&v2SkillSteps.length&&!confirm('Discard the unsaved recording?'))return;
  v2SkillRecorderOpen=false;v2SkillRecording=false;v2SkillReplay=null;v2SkillBusy=false;
  v2SkillPanelOpen=true;v2SkillTab='Skills';v2SkillRenderLayer();
  void v2SkillLoadList();
}
async function v2SkillToggleRecording(){
  if(v2SkillBusy)return;
  if(!v2SkillRecording){
    v2SkillRecording=true;v2SkillSteps=[];v2SkillError='';v2SkillRenderLayer();return;
  }
  if(!v2SkillSteps.length){v2SkillRecording=false;toast('No steps recorded yet.');v2SkillRenderLayer();return}
  const title=prompt('What should this saved skill be called?',v2SkillAgent().name+' workflow');
  if(title===null)return;
  if(!title.trim()){toast('Give the skill a name.');return}
  v2SkillBusy=true;v2SkillRenderLayer();
  try{
    await v2Request('/api/agent-skills','POST',{agentId:v2SkillAgentId,title:title.trim().slice(0,90),steps:v2SkillSteps,notes:'Recorded in the AgentH teaching browser.'});
    v2SkillRecording=false;v2SkillRecorderOpen=false;v2SkillPanelOpen=true;v2SkillTab='Skills';v2SkillSteps=[];
    await v2SkillLoadList();toast('Skill saved privately to your account.');
  }catch(e){v2SkillFlash(e)}
  finally{v2SkillBusy=false;v2SkillRenderLayer()}
}
async function v2SkillNavigate(event){
  event.preventDefault();
  let raw=String(document.getElementById('v2RecorderUrlInput')?.value||'').trim();
  if(!raw)return;
  if(!/^https?:\/\//i.test(raw))raw='https://'+raw;
  await v2SkillPerform({action:'navigate',url:raw});
}
async function v2SkillBrowserClick(event){
  if(v2SkillBusy)return;
  const rect=event.currentTarget.getBoundingClientRect();
  const x=Math.round(((event.clientX-rect.left)/rect.width)*1280);
  const y=Math.round(((event.clientY-rect.top)/rect.height)*800);
  if(x<0||x>1280||y<0||y>800)return;
  await v2SkillPerform({action:'click',x,y});
}
let v2SkillWheelLast=0;
async function v2SkillBrowserWheel(event){
  event.preventDefault();
  if(v2SkillBusy||Date.now()-v2SkillWheelLast<500)return;
  v2SkillWheelLast=Date.now();
  await v2SkillPerform({action:'scroll',amount:event.deltaY>0?590:-590});
}
async function v2SkillType(event){
  event.preventDefault();
  const value=String(document.getElementById('v2SkillTypedText')?.value||'');
  if(!value.trim())return;
  await v2SkillPerform({action:'type',text:value});
}
async function v2SkillScroll(amount){await v2SkillPerform({action:'scroll',amount})}
async function v2SkillPerform(command){
  if(v2SkillBusy)return;
  v2SkillBusy=true;v2SkillError='';v2SkillRenderLayer();
  try{
    const result=await v2Request('/api/agent-skills/browser','POST',command);
    if(v2SkillRecording&&!v2SkillReplay)v2SkillSteps.push(command);
    v2SkillBrowserUrl=String(result.url||'about:blank');
    v2SkillBrowserTitle=String(result.title||'');
    v2SkillScreenNonce=Date.now();
  }catch(e){v2SkillError=e.message||String(e)}
  finally{v2SkillBusy=false;v2SkillRenderLayer()}
}
async function v2SkillReplaySaved(id){
  const s=v2SkillList.find(x=>x.id===id);
  if(!s)return;
  v2SkillReplay=s;v2SkillReplayIndex=0;v2SkillRecording=false;v2SkillSteps=[];v2SkillError='';
  v2SkillRecorderOpen=true;v2SkillPanelOpen=false;v2SkillRenderLayer();
  await v2SkillLoadBrowser();
}
async function v2SkillRunNext(){
  if(!v2SkillReplay)return;
  const step=v2SkillReplay.steps[v2SkillReplayIndex];
  if(!step)return toast('You reviewed every saved step.');
  if(step.action==='click'||step.action==='type'){
    const label=step.action==='type'?'type saved text into the focused field':'click the saved screen position';
    if(!confirm('Run step '+(v2SkillReplayIndex+1)+'? It will '+label+' on the live website. Review the site before continuing.'))return;
  }
  await v2SkillPerform(step);
  if(!v2SkillError){v2SkillReplayIndex++;v2SkillRenderLayer()}
}
async function v2SkillDelete(id){
  const s=v2SkillList.find(x=>x.id===id);
  if(!s||!confirm('Delete the saved skill “'+s.title+'”?'))return;
  try{await v2Request('/api/agent-skills','DELETE',{id});await v2SkillLoadList();toast('Skill deleted.')}
  catch(e){v2SkillFlash(e)}
}
function v2SkillOpenComposeMenu(event){
  event.preventDefault();event.stopPropagation();
  const dropdown=document.getElementById('v2ComposerDropdown');
  if(dropdown){dropdown.remove();return}
  const bar=document.querySelector('.composer');
  if(!bar)return;
  bar.classList.add('v2ComposeAnchor');
  const node=document.createElement('div');
  node.className='v2ComposerDropdown';node.id='v2ComposerDropdown';
  node.innerHTML='<button type="button" id="v2ComposeAttach">'+v2SkillIcon('paperclip')+' Attach files</button>'+
    '<button type="button" id="v2ComposeTeach">'+v2SkillIcon('record')+' Teach a task</button>';
  bar.append(node);
  node.querySelector('#v2ComposeAttach').onclick=()=>{node.remove();document.getElementById('v2Attach')?.click()};
  node.querySelector('#v2ComposeTeach').onclick=()=>{node.remove();v2SkillAgentId=current().id;void v2SkillStartRecorder()};
}
function v2SkillSpeech(button){
  if(!('speechSynthesis' in window)){toast('Text-to-speech is unavailable in this browser.');return}
  window.speechSynthesis.cancel();
  const bubble=button.closest('.message');
  const content=bubble?.innerText||'';
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(content));
}
function v2SkillEnhance(){
  if(!data.agents?.length)return;
  const top=document.querySelector('.top');
  if(!top)return;
  const agentAvatar=top.querySelector('.bot');
  if(agentAvatar){
    agentAvatar.classList.add('v2TopClickable');
    agentAvatar.setAttribute('role','button');
    agentAvatar.setAttribute('tabindex','0');
    agentAvatar.title='Open agent details, computer and skills';
    agentAvatar.onclick=()=>v2SkillOpenProfile(current().id);
    agentAvatar.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();v2SkillOpenProfile(current().id)}};
  }
  if(!top.querySelector('.v2ProfileTrigger')){
    const button=document.createElement('button');
    button.type='button';button.className='outline v2ProfileTrigger';
    button.title='Agent details, computer and skills';button.setAttribute('aria-label','Agent details and skills');
    button.innerHTML=v2SkillIcon('profile');button.onclick=()=>v2SkillOpenProfile(current().id);
    top.appendChild(button);
  }
  const profileButtons=document.querySelectorAll('.profile > button.square');
  if(profileButtons[0])profileButtons[0].innerHTML=v2SkillIcon('settings');
  if(profileButtons[1])profileButtons[1].innerHTML=v2SkillIcon('sliders');
  if(profileButtons[2]){profileButtons[2].title='Sign out';profileButtons[2].innerHTML=v2SkillIcon('logout')}
  const sideIcons=document.querySelectorAll('.connectorLink .ci');
  if(sideIcons[0])sideIcons[0].innerHTML=v2SkillIcon('whatsapp');
  if(sideIcons[1])sideIcons[1].innerHTML=v2SkillIcon('robot');
  const share=top.querySelector('button[title="Share conversation"]');
  if(share)share.innerHTML=v2SkillIcon('share');
  const composer=document.querySelector('.composer');
  if(composer){
    const buttons=composer.querySelectorAll(':scope > button');
    if(buttons[0]){buttons[0].title='Attach files or teach a task';buttons[0].onclick=v2SkillOpenComposeMenu}
    if(buttons.length>1)buttons[buttons.length-1].innerHTML=v2SkillIcon('arrow');
  }
  document.querySelectorAll('.message.assistant:not(.v2Welcome)').forEach(message=>{
    let actions=message.querySelector('.actions');
    if(!actions){actions=document.createElement('div');message.append(actions)}
    actions.classList.add('v2ToolActions');
    actions.innerHTML='<button type="button" title="Copy message" onclick="copyText(this)">'+v2SkillIcon('copy')+'</button>'+
      '<button type="button" title="Expand message" onclick="this.closest(\'.message\').style.maxHeight=\'none\'">'+v2SkillIcon('expand')+'</button>'+
      '<button type="button" title="Read aloud" onclick="v2SkillSpeech(this)">'+v2SkillIcon('volume')+'</button>';
  });
  document.querySelectorAll('.v2RichSuggestion').forEach(button=>{button.onclick=()=>v2SkillApplySuggestion(button.getAttribute('data-suggestion')||'')});
  const m=document.querySelector('.messages');
  if(m?.querySelector('.v2Welcome'))m.scrollTop=0;
}
const v2SkillPriorRender=render;
render=function(){v2SkillPriorRender();v2SkillEnhance();if(v2SkillPanelOpen||v2SkillRecorderOpen)v2SkillRenderLayer()};
