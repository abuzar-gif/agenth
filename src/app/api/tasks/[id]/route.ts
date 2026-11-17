import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { z } from 'zod';
import { event } from '@/lib/engine';
export const POST=(r:Request,{params}:{params:Promise<{id:string}>})=>api(r,async userId=>{
  const {id}=await params;const {action}=z.object({action:z.enum(['approve','reject','cancel','pause','resume'])}).parse(await r.json());
  const task=await db.task.findFirst({where:{id,userId}});if(!task)throw new Error('Task not found');
  const data:Record<string,any>={};
  if(action==='approve'){
    if(task.status!=='waiting_approval')throw new Error('Task is not awaiting approval.');
    data.status='queued';data.approval={...(task.approval as object),approved:true};
  }else if(action==='cancel'||action==='reject'){if(['completed','cancelled'].includes(task.status))throw new Error('Task already ended.');data.status='cancelled';}
  else if(action==='pause'){if(!['queued','planning','running'].includes(task.status))throw new Error('Cannot pause this task.');data.status='paused';}
  else {if(!['failed','paused'].includes(task.status))throw new Error('Only paused or failed tasks can resume.');data.status='queued';data.error=null;data.approval={};}
  const updated=await db.task.updateMany({where:{id,userId,status:task.status},data});if(!updated.count)throw new Error('Task state changed; refresh and try again.');
  await event(id,'User',action,`${action} requested by task owner. In-flight remote actions may finish; subsequent steps stop.`);
  await db.audit.create({data:{userId,action:`task.${action}`,detail:id}});
  return Response.json({ok:true});
});
