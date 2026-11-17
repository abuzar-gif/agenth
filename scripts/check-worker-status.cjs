const fs=require('node:fs');
const file='.runtime/worker-heartbeat';
try {
 const timestamp=Number(fs.readFileSync(file,'utf8'));
 const age=Math.round((Date.now()-timestamp)/1000);
 console.log(Number.isFinite(age)&&age>=0&&age<20?'WORKER_ONLINE, heartbeat age '+age+'s':'WORKER_OFFLINE, heartbeat age '+age+'s');
} catch(error) {
 console.log('WORKER_OFFLINE, no readable heartbeat');
}
