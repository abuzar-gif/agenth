'use strict';
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const runtime=path.join(root,'.runtime');
const cloudflared='C:\\Program Files (x86)\\cloudflared\\cloudflared.exe';
const pathToUrl=path.join(runtime,'public-url.txt');
const linkFile=path.join(process.env.USERPROFILE||path.join(root,'..'),'Desktop','AgentH Public Link.txt');
fs.mkdirSync(runtime,{recursive:true});
const log=(...args)=>console.log(new Date().toISOString(),...args);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const services={};
let tunnel=null,server=null,launching=false,stopping=false;
function listening(port){return new Promise(resolve=>{const sock=net.connect({host:'127.0.0.1',port});sock.setTimeout(1300);sock.once('connect',()=>{sock.destroy();resolve(true)});sock.once('error',()=>resolve(false));sock.once('timeout',()=>{sock.destroy();resolve(false)});});}
async function until(condition,ms){const stop=Date.now()+ms;do{if(await condition())return true;await wait(1000);}while(Date.now()<stop);return false;}
function service(name,args){
 const child=spawn(process.execPath,args,{cwd:root,env:{...process.env},windowsHide:true,stdio:['ignore','pipe','pipe']});
 services[name]=child;
 for(const stream of [child.stdout,child.stderr])stream.on('data',buf=>{const lines=String(buf).trim();if(lines)log(name,lines.slice(0,900));});
 child.once('exit',code=>{if(services[name]===child)delete services[name];log(name,'exited',code);});
 return child;
}
async function ensureDb(){
 if(await listening(5432))return log('Database local loopback OK');
 service('database',['scripts/local-db.mjs']);
 if(!await until(()=>listening(5432),55000))throw Error('Database failed to start. See database logs.');
}
async function ensureWorker(){
 const p=path.join(runtime,'worker-heartbeat');
 const fresh=()=>{try{return Date.now()-Number(fs.readFileSync(p,'utf8'))<20000;}catch{return false;}};
 if(fresh())return log('Worker already healthy');
 service('worker',['--import','tsx','src/worker.ts']);
 if(!await until(async()=>fresh(),50000))throw Error('Worker heartbeat not restored.');
}
function startTunnel(){
 return new Promise((resolve,reject)=>{
  if(!fs.existsSync(cloudflared))return reject(Error('Cloudflared not installed'));
  const child=spawn(cloudflared,['tunnel','--no-autoupdate','--url','http://127.0.0.1:3001'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
  tunnel=child;
  let pending='',done=false;
  const timer=setTimeout(()=>{if(!done){done=true;child.kill();reject(Error('Cloudflare tunnel URL timed out'));}},45000);
  for(const stream of [child.stdout,child.stderr])stream.on('data',buf=>{
   const txt=String(buf);pending=(pending+txt).slice(-12000);
   const match=pending.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
   if(match&&!done){done=true;clearTimeout(timer);resolve(match[0]);}
   const line=txt.trim();if(line&&(/ERR|error|Registered tunnel/.test(line)))log('tunnel',line.slice(0,700));
  });
  child.once('exit',code=>{
   clearTimeout(timer);if(!done){done=true;reject(Error('Tunnel exited before creating URL: '+code));}
   if(!stopping){log('Tunnel stopped. Scheduling a fresh URL.');setTimeout(()=>void relaunch().catch(e=>log('Relauch failed',e.message)),6000);}
  });
 });
}
async function launchServer(url){
 fs.writeFileSync(pathToUrl,url+'\n');
 fs.writeFileSync(linkFile,'AgentH public link while laptop is online:\r\n'+url+'\r\n\r\nThis is a temporary Cloudflare URL. A restart may change the link.\r\n');
 if(await listening(3001))throw Error('Port 3001 already occupied. Stop the previous production server to apply the new tunnel URL.');
 server=service('production',['scripts/start-public-next.cjs']);
 if(!await until(()=>listening(3001),35000))throw Error('Production Next.js did not start.');
 if(!await until(async()=>{try{const r=await fetch('http://127.0.0.1:3001/login',{signal:AbortSignal.timeout(4000)});return r.ok();}catch{return false;}},20000))throw Error('Production health check failed.');
 log('PUBLIC_LINK_READY',url,'(also on Desktop: AgentH Public Link.txt)');
}
async function relaunch(){
 if(launching||stopping)return;launching=true;
 try{
  if(server){server.kill();server=null;await until(async()=>!await listening(3001),10000);}
  await ensureDb();await ensureWorker();
  const url=await startTunnel();
  await launchServer(url);
 }catch(e){log('LAUNCH_ERROR',e.message);setTimeout(()=>void relaunch(),20000);}
 finally{launching=false;}
}
async function monitor(){
 if(stopping||launching)return;
 if(!await listening(5432)||!await listening(3001)){log('Services unhealthy; attempting recovery');void relaunch();return;}
 const p=path.join(runtime,'worker-heartbeat');let age=Infinity;try{age=Date.now()-Number(fs.readFileSync(p,'utf8'));}catch{}
 if(age>30000){log('Worker unhealthy; attempting restart');if(services.worker){services.worker.kill();delete services.worker;}await ensureWorker().catch(e=>log('Worker recovery error',e.message));}
}
function stop(){stopping=true;for(const c of [server,tunnel,...Object.values(services)])c?.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
if(process.argv.includes('--check')){console.log('AgentH public autostart script ready.',fs.existsSync(cloudflared)?'cloudflared installed':'cloudflared missing');process.exit(0);}
void (async()=>{await ensureDb();await ensureWorker();await relaunch();setInterval(()=>void monitor(),30000);})().catch(e=>log('FATAL',e.message));
