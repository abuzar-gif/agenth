import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { runtimePath } from '@/lib/browser';
import { dashboardAgents } from '@/lib/registry';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { z } from 'zod';

const stepSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('navigate'),url:z.string().url().max(2000)}),
  z.object({action:z.literal('click'),x:z.number().int().min(0).max(1280),y:z.number().int().min(0).max(800)}),
  z.object({action:z.literal('type'),text:z.string().min(1).max(600)}),
  z.object({action:z.literal('scroll'),amount:z.number().int().min(-2000).max(2000)}),
]);
const skillSchema=z.object({
  id:z.string().uuid(),
  agentId:z.string().min(1).max(100),
  title:z.string().trim().min(1).max(90),
  steps:z.array(stepSchema).min(1).max(80),
  createdAt:z.string().datetime(),
  notes:z.string().max(300).default(''),
});
const allSkillsSchema=z.array(skillSchema).max(300);
type Skill=z.infer<typeof skillSchema>;

async function authorizeAgent(userId:string,agentId:string){
  if(dashboardAgents.some(agent=>agent.id===agentId))return;
  const found=await db.agent.findFirst({where:{userId,id:agentId},select:{id:true}});
  if(!found)throw new Error('This agent does not belong to your account.');
}
async function load(userId:string):Promise<Skill[]>{
  try{return allSkillsSchema.parse(JSON.parse(await readFile(runtimePath(userId,'agent-skills.json'),'utf8')))}
  catch(err){
    if((err as NodeJS.ErrnoException).code==='ENOENT')return [];
    throw err;
  }
}
async function store(userId:string,items:Skill[]){
  const file=runtimePath(userId,'agent-skills.json');
  await mkdir(runtimePath(userId),{recursive:true});
  const temp=runtimePath(userId,'skills-'+crypto.randomUUID()+'.tmp');
  await writeFile(temp,JSON.stringify(allSkillsSchema.parse(items)),{flag:'wx',mode:0o600});
  await rename(temp,file);
}
export const GET=(r:Request)=>api(r,async userId=>{
  const agentId=new URL(r.url).searchParams.get('agentId')||'';
  await authorizeAgent(userId,agentId);
  const items=await load(userId);
  return Response.json(items.filter(s=>s.agentId===agentId),{headers:{'Cache-Control':'no-store'}});
});
export const POST=(r:Request)=>api(r,async userId=>{
  const input=skillSchema.pick({agentId:true,title:true,steps:true,notes:true}).parse(await r.json());
  await authorizeAgent(userId,input.agentId);
  const skills=await load(userId);
  if(skills.length>=300)throw new Error('Maximum 300 recorded skills per account.');
  const item:Skill=skillSchema.parse({...input,id:crypto.randomUUID(),createdAt:new Date().toISOString()});
  skills.unshift(item);
  await store(userId,skills);
  return Response.json(item,{status:201});
});
export const DELETE=(r:Request)=>api(r,async userId=>{
  const {id}=z.object({id:z.string().uuid()}).parse(await r.json());
  const skills=await load(userId);
  const selected=skills.find(s=>s.id===id);
  if(!selected)return Response.json({error:'Skill not found'},{status:404});
  await authorizeAgent(userId,selected.agentId);
  await store(userId,skills.filter(s=>s.id!==id));
  return Response.json({ok:true});
});
