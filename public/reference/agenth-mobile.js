/* AgentH mobile polish and real, opt-in voice calls. No fake AI or speech output. */
const v2MobileIcons={
 menu:'<path d="M6 5l7 7-7 7"/>',
 mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
 micOff:'<path d="M2 2l20 20M9 9v2a3 3 0 0 0 5.1 2.1M15 9V5a3 3 0 0 0-5.5-1.7M5 10a7 7 0 0 0 12 4.9M19 10v1a7 7 0 0 1-.4 2.2M12 18v4m-4 0h8"/>',
 wave:'<path d="M3 12v-2m4 6V7m4 12V5m4 10V9m4 3v-2m3 3v-2"/>',
 phoneOff:'<path d="m3 3 18 18M9 4.6l1.2 2.8-1.8 2.3a15 15 0 0 0 5.9 5.9l2.3-1.8 2.8 1.2a2 2 0 0 1 1.1 2.4l-.6 2.5a2 2 0 0 1-2.3 1.5C9.3 21.1 2.9 14.7 2.5 6.4A2 2 0 0 1 4 4.1l2.5-.6a2 2 0 0 1 2.5 1.1"/>',
 keyboard:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16h10"/>',
 volume:'<path d="M3 9h5l5-4v14l-5-4H3zM17 9a4 4 0 0 1 0 6M20 6a8 8 0 0 1 0 12"/>'
};
function v2MobileSVG(name){
 return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(v2MobileIcons[name]||'')+'</svg>';
}
let v2MobileDrawer=false, v2MotionEnabled=false, v2Dictation=null;
function v2MobileToggle(force){
 v2MobileDrawer=typeof force==='boolean'?force:!v2MobileDrawer;
 const app=document.querySelector('.app');if(!app)return;
 app.classList.toggle('mobile-drawer-open',v2MobileDrawer);
 const b=app.querySelector('.v2-mobile-nav-toggle');if(b)b.setAttribute('aria-expanded',String(v2MobileDrawer));
 const scrim=app.querySelector('.v2-mobile-scrim');
 if(v2MobileDrawer&&!scrim){
  const s=document.createElement('button');s.type='button';s.className='v2-mobile-scrim';
  s.setAttribute('aria-label','Close agent navigation');s.onclick=()=>v2MobileToggle(false);app.insertBefore(s,app.firstChild);
 }else if(!v2MobileDrawer&&scrim)scrim.remove();
}
function v2MobileDecorate(){
 const app=document.querySelector('.app');if(!app)return;
 if(window.matchMedia('(max-width:650px)').matches){
  const top=app.querySelector('.top'),bot=top?.querySelector('.bot');
  if(top&&bot){
   const menu=document.createElement('button');menu.type='button';menu.className='v2-mobile-nav-toggle';
   menu.title='Open agent navigation';menu.setAttribute('aria-label','Open agent navigation');menu.setAttribute('aria-expanded',String(v2MobileDrawer));
   menu.innerHTML=v2MobileSVG('menu');menu.onclick=()=>v2MobileToggle();bot.after(menu);
   bot.title='Tap to enable motion-following eyes';bot.setAttribute('role','button');bot.setAttribute('tabindex','0');
   bot.onclick=()=>void v2EnableMotion();
   bot.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void v2EnableMotion()}};
  }
  const agents=[...app.querySelectorAll('.agentlist>.agent')];
  const getName=el=>el.querySelector('.details strong')?.textContent?.trim()||'';
  const order=['Chief','WhatsApp Manager','1000$ Maker','Dost','Email Manager'];
  agents.sort((a,b)=>{const ai=order.indexOf(getName(a)),bi=order.indexOf(getName(b));return (ai<0?99:ai)-(bi<0?99:bi)});
  const container=app.querySelector('.agentlist');
  for(const a of agents){a.dataset.mobileGroup=['Chief','WhatsApp Manager','1000$ Maker'].includes(getName(a))?'chip':'row';container.appendChild(a)}
 }
 const dict=app.querySelector('.composer button[title="Voice dictation"]');
 if(dict){dict.innerHTML=v2MobileSVG('mic');dict.classList.add('v2-mic-btn');dict.setAttribute('aria-label','Dictate using microphone');dict.onclick=()=>void v2Dictate();}
 const composer=app.querySelector('.composer');
 if(composer&&current()?.name!=='WhatsApp Manager'){
  const oldMic=composer.querySelector('.v2-mic-btn');
  if(oldMic&&!composer.querySelector('.v2-call-start')){
   const call=document.createElement('button');call.type='button';call.className='v2-call-start';call.title='Voice call with '+current().name;call.setAttribute('aria-label','Start voice call with '+current().name);call.innerHTML=v2MobileSVG('wave');call.onclick=()=>void v2CallOpen();
   oldMic.after(call);
  }
 }
 if(v2MobileDrawer&&window.matchMedia('(max-width:650px)').matches)v2MobileToggle(true);
}
const v2MobilePreviousRender=render;
render=function(){v2MobilePreviousRender();v2MobileDecorate()};
// Initial dashboard may finish rendering before this enhancement loads.
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v2MobileDecorate,{once:true});
else v2MobileDecorate();
const v2MobilePreviousSelectAgent=selectAgent;
selectAgent=async function(id){v2MobileDrawer=false;return v2MobilePreviousSelectAgent(id)};
window.addEventListener('resize',()=>{if(innerWidth>650&&v2MobileDrawer)v2MobileToggle(false)});
function v2ApplyMotion(event){
 if(!v2MotionEnabled)return;
 const x=Math.max(-1,Math.min(1,(Number(event.gamma)||0)/35));
 const y=Math.max(-1,Math.min(1,(Number(event.beta)||0)/50));
 for(const e of document.querySelectorAll('.top .bot,.v2-call-avatar-wrap .bot')){
  e.style.setProperty('--ex',(x*8).toFixed(1)+'px');e.style.setProperty('--ey',(y*6).toFixed(1)+'px');
 }
}
async function v2EnableMotion(){
 if(typeof DeviceOrientationEvent==='undefined'){toast('Motion sensors are unavailable on this device.');return}
 try{
  if(typeof DeviceOrientationEvent.requestPermission==='function'){
   const answer=await DeviceOrientationEvent.requestPermission();
   if(answer!=='granted')throw Error('Motion permission was not granted');
  }
  if(!v2MotionEnabled){window.addEventListener('deviceorientation',v2ApplyMotion);v2MotionEnabled=true}
  toast('Eyes follow your phone motion');
 }catch(error){toast(error.message||'Motion access unavailable')}
}
/* Shared opt-in audio capture for phone dictation and voice calls. */
async function v2Capture(onAudio,onFailure){
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Microphone needs HTTPS and a supported browser.');
 const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
 const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(x=>MediaRecorder.isTypeSupported(x));
 let recorder;
 try{recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined)}catch(err){stream.getTracks().forEach(t=>t.stop());throw err}
 const chunks=[];let stopped=false,speechStarted=false,lastSound=Date.now();
 // Time-domain RMS detects quieter phone voices more reliably than frequency averages.
 const finish=()=>{if(!stopped&&recorder.state==='recording'){stopped=true;recorder.stop()}};
 const audioContext=window.AudioContext?new AudioContext():null;
 let analyzer=null,levels=null,timer=null;
 if(audioContext){try{const source=audioContext.createMediaStreamSource(stream);analyzer=audioContext.createAnalyser();analyzer.fftSize=1024;source.connect(analyzer);levels=new Uint8Array(analyzer.fftSize)}catch{}}
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 recorder.onstop=async()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());if(audioContext)void audioContext.close().catch(()=>{});const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(blob.size>0)try{await onAudio(blob)}catch(error){onFailure(error)}};
 recorder.onerror=e=>onFailure(e.error||Error('Recording failed'));
 recorder.start();
 const started=Date.now();
 timer=setInterval(()=>{
  if(analyzer&&levels){analyzer.getByteTimeDomainData(levels);let power=0;for(const sample of levels){const v=(sample-128)/128;power+=v*v}const rms=Math.sqrt(power/levels.length);if(rms>0.016){speechStarted=true;lastSound=Date.now()}}
  // Short pauses should complete a turn; cap recording so users never wait through an 18s silence.
  if((speechStarted&&Date.now()-lastSound>850&&Date.now()-started>800)||Date.now()-started>9500)finish();
 },150);
 return {stop:finish,cancel:()=>{recorder.onstop=()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());if(audioContext)void audioContext.close().catch(()=>{})};finish()}};
}
async function v2Transcribe(blob){
 const form=new FormData();const mp4=blob.type.includes('mp4');
 form.append('audio',blob,mp4?'utterance.mp4':'utterance.webm');
 const language=data.prefs.language==='Urdu'?'ur':data.prefs.language==='English'?'en':'roman-ur';
 form.append('language',language);
 const response=await fetch('/api/voice/transcribe',{method:'POST',body:form,credentials:'same-origin'});
 const info=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(info.error||'Speech transcription unavailable');
 return String(info.text||'').trim();
}
async function v2Dictate(){
 if(v2Dictation){v2Dictation.stop();v2Dictation=null;return}
 try{
  toast('Listening — tap the mic again to finish');
  v2Dictation=await v2Capture(async blob=>{
   v2Dictation=null;const words=await v2Transcribe(blob);
   const field=document.getElementById('messageInput');
   if(field&&words){field.value=(field.value+' '+words).trim();field.focus();toast('Dictation ready — review and send')}
   else toast(words?'Dictation saved':'No speech detected');
  },error=>{v2Dictation=null;toast(error.message||'Dictation failed')});
 }catch(error){v2Dictation=null;toast(error.message||'Microphone unavailable')}
}

const v2Call={open:false,session:0,agent:null,phase:'idle',muted:false,volume:.85,recording:null,audio:null,controller:null,transcript:'',reply:'',error:'',showText:false,showVolume:false};
function v2CallPhase(phase,message=''){
 v2Call.phase=phase;
 const root=document.getElementById('v2CallScreen');if(!root)return;
 root.dataset.phase=phase;
 const state=root.querySelector('.v2-call-state');
 const notes=root.querySelector('.v2-call-message');
 if(state)state.textContent=({idle:'Ready to talk',listening:'Listening',transcribing:'Understanding you',thinking:'Thinking…',speaking:'Speaking',error:'Something went wrong'})[phase]||'Voice call';
 if(notes&&message)notes.textContent=message;
}
async function v2CallOpen(){
 if(v2Call.open||liveBusy)return;
 const agent=current();if(!agent)return;
 if(agent.name==='WhatsApp Manager'){toast('Use WhatsApp Manager chat for WhatsApp permissions. Calling supports conversation only for this agent.');}
 v2Call.open=true;v2Call.session++;v2Call.agent={...agent};v2Call.phase='idle';v2Call.muted=false;v2Call.showText=false;v2Call.error='';
 const el=document.createElement('section');el.id='v2CallScreen';el.className='v2-call-screen';el.dataset.phase='idle';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Voice call with '+agent.name);
 el.innerHTML='<div class="v2-call-top"><div class="v2-call-kicker">AGENTH VOICE</div><h2>'+esc(agent.name)+'</h2><div class="v2-call-sub">Private AI voice conversation</div></div>'+
 '<div class="v2-call-center"><div class="v2-call-avatar-wrap" title="Tap for motion-following eyes" onclick="v2EnableMotion()">'+avatar(agent,180)+'</div><div class="v2-call-state" role="status" aria-live="polite">Connecting</div><div class="v2-call-message" id="v2CallMessage">Speak English, Urdu or Roman Urdu. Microphone access needs your permission.</div></div>'+
 '<form id="v2CallTextForm" class="v2-call-text-panel" onsubmit="v2CallTextSubmit(event)"><input name="message" maxlength="1000" placeholder="Type your message…" aria-label="Message to agent"><button type="submit">Send</button></form>'+
 '<div class="v2-call-controls">'+
 '<button class="v2-call-control" id="v2CallMute" type="button" aria-pressed="false" title="Mute microphone" aria-label="Mute microphone" onclick="v2CallToggleMute()">'+v2MobileSVG('mic')+'</button>'+
 '<button class="v2-call-control" id="v2CallKeyboard" type="button" aria-pressed="false" title="Type a message" aria-label="Type a message" onclick="v2CallTextToggle()">'+v2MobileSVG('keyboard')+'</button>'+
 '<div class="v2-call-volume" id="v2CallVolume"><button class="v2-call-control" type="button" aria-label="Adjust voice volume" title="Adjust voice volume" onclick="v2CallVolumeToggle()">'+v2MobileSVG('volume')+'</button><div class="v2-call-volume-pop"><label for="v2CallGain">Volume</label><input id="v2CallGain" type="range" min="0" max="100" value="85" oninput="v2CallSetVolume(this.value)"></div></div>'+
 '<button class="v2-call-control v2-call-end" type="button" aria-label="End call" title="End call" onclick="v2CallClose()">'+v2MobileSVG('phoneOff')+'</button></div>';
 document.body.append(el);document.body.style.overflow='hidden';v2CallPhase('idle','Tap the microphone to speak, or type a message.');
 // iOS microphone permissions must be requested from a direct user gesture.
 await v2CallListen();
}
function v2CallClose(){
 v2Call.open=false;v2Call.session++;
 const recording=v2Call.recording;v2Call.recording=null;if(recording)recording.cancel();
 v2Call.controller?.abort();v2Call.controller=null;
 if(v2Call.audio){v2Call.audio.pause();v2Call.audio.src='';v2Call.audio=null;}
 document.getElementById('v2CallScreen')?.remove();document.body.style.overflow='';
}
function v2CallToggleMute(){
 v2Call.muted=!v2Call.muted;
 const btn=document.getElementById('v2CallMute');
 if(btn){btn.innerHTML=v2MobileSVG(v2Call.muted?'micOff':'mic');btn.setAttribute('aria-pressed',String(v2Call.muted));btn.setAttribute('aria-label',v2Call.muted?'Unmute microphone':'Mute microphone');}
 if(v2Call.muted){if(v2Call.recording){v2Call.recording.cancel();v2Call.recording=null;}v2CallPhase('idle','Microphone muted. Tap again to resume.');}
 else void v2CallListen();
}
function v2CallTextToggle(){
 v2Call.showText=!v2Call.showText;
 const form=document.getElementById('v2CallTextForm'),b=document.getElementById('v2CallKeyboard');
 form?.classList.toggle('is-open',v2Call.showText);b?.setAttribute('aria-pressed',String(v2Call.showText));
 if(v2Call.showText)form?.querySelector('input')?.focus();
}
function v2CallVolumeToggle(){document.getElementById('v2CallVolume')?.classList.toggle('is-open')}
function v2CallSetVolume(value){v2Call.volume=Math.max(0,Math.min(1,Number(value)/100));if(v2Call.audio)v2Call.audio.volume=v2Call.volume}
function v2CallTextSubmit(event){
 event.preventDefault();
 const input=event.currentTarget.querySelector('input'),text=String(input?.value||'').trim();
 if(!text||v2Call.phase==='thinking'||v2Call.phase==='speaking'||v2Call.phase==='transcribing')return;
 input.value='';v2Call.showText=false;document.getElementById('v2CallTextForm')?.classList.remove('is-open');
 const recording=v2Call.recording;v2Call.recording=null;if(recording)recording.cancel();
 void v2CallSubmit(text);
}
async function v2CallListen(){
 if(!v2Call.open||v2Call.muted||v2Call.recording||['thinking','transcribing','speaking'].includes(v2Call.phase))return;
 const session=v2Call.session;
 try{
  v2CallPhase('listening','Listening — speak naturally. Tap mute to pause.');
  const recording=await v2Capture(async blob=>{
   if(!v2Call.open||session!==v2Call.session)return;
   v2Call.recording=null;
   v2CallPhase('transcribing','Converting your speech into text…');
   try{
    const words=await v2Transcribe(blob);
    if(!v2Call.open||session!==v2Call.session)return;
    if(!words){v2CallPhase('idle','Could not hear you. Tap microphone to try again.');return}
    await v2CallSubmit(words);
   }catch(error){if(v2Call.open&&session===v2Call.session)v2CallPhase('error',error.message||'Transcription failed. Tap the microphone to retry.')}
  },error=>{if(v2Call.open&&session===v2Call.session){v2Call.recording=null;v2CallPhase('error',error.message||'Microphone failed')}});
  if(v2Call.open&&session===v2Call.session&&!v2Call.muted)v2Call.recording=recording;
  else recording.cancel();
 }catch(error){if(v2Call.open&&session===v2Call.session)v2CallPhase('error',(error.message||'Microphone unavailable')+' — type a message instead.')}
}
async function v2CallSubmit(text){
 if(!v2Call.open)return;
 const agent=v2Call.agent,session=v2Call.session;
 v2CallPhase('thinking',text);
 let cid=liveActive[agent.id],reply='';
 const controller=new AbortController();v2Call.controller=controller;
 try{
  if(!cid){const conv=await v2Request('/api/conversations','POST',{title:(agent.name+' • Voice call').slice(0,120)});cid=conv.id;liveActive[agent.id]=cid;liveConversations.unshift(conv);}
  const response=await fetch('/api/conversations/'+encodeURIComponent(cid)+'/messages',{
   method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
   body:JSON.stringify({text,agentId:agent.id}),signal:controller.signal
  });
  if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.error||'Call conversation failed');}
  const reader=response.body?.getReader();if(!reader)throw Error('No conversation response');
  let pending='',done=false;const decoder=new TextDecoder();
  for(;;){
   const next=await reader.read();pending+=decoder.decode(next.value,{stream:!next.done});
   const lines=pending.split('\n');pending=lines.pop()||'';
   for(const line of lines){if(!line.trim())continue;const data=JSON.parse(line);if(data.type==='error')throw Error(data.error||'AI request failed');if(data.type==='delta')reply+=data.text||'';if(data.type==='done')done=true;}
   if(next.done)break;
  }
  if(pending.trim()){const data=JSON.parse(pending);if(data.type==='delta')reply+=data.text||'';if(data.type==='done')done=true;if(data.type==='error')throw Error(data.error||'AI request failed');}
  if(!done||!reply.trim())throw Error('No complete AI response received');
  if(!v2Call.open||session!==v2Call.session)return;
  (data.messages[agent.id]??=[]).push({role:'user',text,status:'completed'},{role:'assistant',text:reply,status:'completed'});
  v2Call.reply=reply;
  await v2CallSpeak(reply,session);
 }catch(error){if(v2Call.open&&session===v2Call.session){v2CallPhase('error',error.message||'Call failed. No action was taken.');}}
 finally{if(v2Call.controller===controller)v2Call.controller=null;}
}
async function v2CallSpeak(message,session){
 if(!v2Call.open||session!==v2Call.session)return;
 v2CallPhase('speaking',message);
 try{
  const language=/[\u0600-\u06ff]/.test(message)?'ur':/\b(kya|kia|mujhe|mujy|hai|nhi|kar|kr|karo|mein|tum|aap)\b/i.test(message)?'roman-ur':'en';
  const response=await fetch('/api/voice/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({text:message.slice(0,5000),language})});
  if(!response.ok){const info=await response.json().catch(()=>({}));throw Error(info.error||'Voice service is unavailable');}
  const blob=await response.blob();if(!v2Call.open||session!==v2Call.session)return;
  const url=URL.createObjectURL(blob),audio=new Audio(url);v2Call.audio=audio;audio.volume=v2Call.volume;
  try{await audio.play();await new Promise((resolve,reject)=>{audio.onended=resolve;audio.onerror=()=>reject(Error('Audio playback failed'));});}
  finally{audio.pause();URL.revokeObjectURL(url);if(v2Call.audio===audio)v2Call.audio=null;}
  if(v2Call.open&&session===v2Call.session){v2CallPhase('idle','Ready for your next question.');if(!v2Call.muted)void v2CallListen();}
 }catch(error){if(v2Call.open&&session===v2Call.session)v2CallPhase('error',(error.message||'Speech playback unavailable')+' — tap microphone to continue.');}
}
