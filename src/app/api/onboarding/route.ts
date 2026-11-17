import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { model } from '@/lib/model';
import { z } from 'zod';
export const GET=(r:Request)=>api(r,async userId=>Response.json(await db.message.findMany({where:{userId,agent:{in:['Onboarding user','Onboarding assistant']}},orderBy:{createdAt:'asc'},take:100})));
export const POST=(r:Request)=>api(r,async userId=>{
  const {text}=z.object({text:z.string().min(1).max(4000)}).parse(await r.json());
  const profile=await db.profile.findUnique({where:{userId}});
  const history=await db.message.findMany({where:{userId,agent:{in:['Onboarding user','Onboarding assistant']}},orderBy:{createdAt:'desc'},take:20});
  await db.message.create({data:{userId,agent:'Onboarding user',content:text}});
  const response=await model([{role:'system',content:`You are the AgentH onboarding assistant. Support ONLY English, Urdu, Roman Urdu. No Punjabi. Ask one helpful question at a time. Never invent profile details. Current saved profile: ${JSON.stringify(profile)}. Help user complete their profile form; explain that the form saves their answers.`},...history.reverse().map(m=>({role:m.agent==='Onboarding user'?'user':'assistant',content:m.content})),{role:'user',content:text}]);
  await db.message.create({data:{userId,agent:'Onboarding assistant',content:response.content}});
  return Response.json(response);
});
