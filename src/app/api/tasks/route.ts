import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { taskSchema } from '@/lib/validation';
export const GET=(r:Request)=>api(r,async userId=>Response.json(await db.task.findMany({where:{userId},orderBy:{createdAt:'desc'},take:100,include:{events:{orderBy:{createdAt:'asc'},take:250}}})));
export const POST=(r:Request)=>api(r,async userId=>{const input=await r.json();if(input.agentId)throw new Error('Use the dedicated WhatsApp Agent conversation for connector commands.');const data=taskSchema.parse(input);const task=await db.task.create({data:{userId,...data}});return Response.json(task,{status:201});});
