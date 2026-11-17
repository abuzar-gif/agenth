import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { z } from 'zod';
export const POST=(r:Request)=>api(r,async userId=>{const {content}=z.object({content:z.string().min(1).max(12000)}).parse(await r.json());await db.message.create({data:{userId,agent:'User',content}});const task=await db.task.create({data:{userId,instruction:`Team request: ${content}`}});return Response.json(task);});
