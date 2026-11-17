import './lib/load-worker-env';
import {syncWhatsAppSessions,stopWhatsAppSessions} from './lib/whatsapp-runtime';
import { db } from './lib/db';
import { queue,enqueue } from './lib/queue';
import { runTask } from './lib/engine';
import { processSchedules } from './lib/scheduler';
import { captureSessions } from './lib/browser';
import { mkdir,writeFile } from 'node:fs/promises';
async function main(){
  const boss=await queue();
  await boss.work<{taskId:string}>('agent-task',{localConcurrency:1},async jobs=>{for(const job of jobs)await runTask(job.data.taskId);});
  let ticking=false;
  async function tick(){
    if(ticking)return;ticking=true;
    try{
      await mkdir('.runtime',{recursive:true});await writeFile('.runtime/worker-heartbeat',String(Date.now()));
      // A crashed write may already have reached the remote service: require explicit review.
      const stale=await db.task.findMany({where:{status:{in:['planning','running']},leaseUntil:{lt:new Date()}}});
      for(const t of stale)await db.task.updateMany({where:{id:t.id,status:t.status},data:{status:'failed',error:'Worker interrupted. Inspect tool results and remote service before resuming; the last action may have completed.',leaseUntil:null}});
      await processSchedules();
      const pending=await db.task.findMany({where:{status:'queued'},take:50});for(const task of pending)await enqueue(task.id);
    }catch(error){console.error('Scheduler:',error instanceof Error?error.message:error);}finally{ticking=false;}
  }
  await syncWhatsAppSessions();setInterval(()=>void syncWhatsAppSessions().catch(()=>console.error('WhatsApp session maintenance failed; inspect connection status.')),3000);
  await tick();setInterval(()=>void tick(),5000);
  setInterval(()=>void captureSessions(),3000);
  console.log('AgentH worker ready. Persistent queue and scheduler active.');
  const stop=async()=>{await stopWhatsAppSessions();await boss.stop();await db.$disconnect();process.exit(0);};process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
main().catch(error=>{console.error(error);process.exit(1);});
