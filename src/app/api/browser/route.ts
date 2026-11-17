import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { validateTool } from '@/lib/tools';
import { browserStatus,runtimePath } from '@/lib/browser';
import { readFile } from 'node:fs/promises';
export const GET=(r:Request)=>api(r,async userId=>{
  if(new URL(r.url).searchParams.has('image')){try{return new Response(await readFile(runtimePath(userId,'browser.png')),{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}});}catch{return new Response('No browser screenshot yet',{status:404});}}
  return Response.json(await browserStatus(userId));
});
export const POST=(r:Request)=>api(r,async userId=>{
  const args=validateTool('browse',await r.json()) as {action:string};
  const task=await db.task.create({data:{userId,instruction:`Browser: ${args.action}`,plan:{summary:'User requested browser action',steps:[{agent:'Browser Agent',tool:'browse',args,reason:'Browser panel action requested by user.'}]}}});
  return Response.json(task,{status:201});
});
