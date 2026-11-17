import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { rm } from 'node:fs/promises';
import { runtimePath,stopBrowser } from '@/lib/browser';
export const GET=(r:Request)=>api(r,async userId=>Response.json({user:await db.user.findUnique({where:{id:userId},select:{id:true,email:true,name:true,profile:true}}),audits:await db.audit.findMany({where:{userId},orderBy:{createdAt:'desc'},take:100})}));
export const DELETE=(r:Request)=>api(r,async userId=>{
  const {confirmation}=await r.json();if(confirmation!=='DELETE MY ACCOUNT')throw new Error('Type DELETE MY ACCOUNT to confirm.');
  const active=await db.task.count({where:{userId,status:{in:['running','planning']}}});if(active)throw new Error('Cancel active tasks and wait for running operations to finish before deleting.');
  await stopBrowser(userId);
  await db.user.delete({where:{id:userId}});await rm(runtimePath(userId),{recursive:true,force:true});return Response.json({ok:true});
});
