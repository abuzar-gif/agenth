import {api} from '@/lib/api';
import {rateLimit} from '@/lib/security';
import {studioAction,studioSnapshot,saveStudioSkill} from '@/lib/browser-studio';
import {z} from 'zod';
const action=z.discriminatedUnion('action',[
 z.object({action:z.literal('navigate'),url:z.url().max(2048)}),
 z.object({action:z.literal('click'),x:z.number().min(0).max(1280),y:z.number().min(0).max(800)}),
 z.object({action:z.literal('type'),text:z.string().min(1).max(1000)}),
 z.object({action:z.literal('press'),key:z.enum(['Enter','Tab','Escape','Backspace','ArrowDown','ArrowUp'])}),
 z.object({action:z.literal('scroll'),amount:z.number().min(-1200).max(1200)}),
 z.object({action:z.enum(['read','record-start','record-stop'])})
]);
export const GET=(request:Request)=>api(request,async userId=>Response.json(await studioSnapshot(userId)));
export const POST=(request:Request)=>api(request,async userId=>{
 rateLimit('browser-studio:'+userId,45);
 const payload=await request.json();
 if(payload.action==='skill-save'){
  const data=z.object({action:z.literal('skill-save'),name:z.string().trim().min(1).max(100),description:z.string().trim().min(1).max(800),steps:z.string().max(20000).optional()}).parse(payload);
  return Response.json({skill:await saveStudioSkill(userId,data)});
 }
 return Response.json(await studioAction(userId,action.parse(payload)));
});
