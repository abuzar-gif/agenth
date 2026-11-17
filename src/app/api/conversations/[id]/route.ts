import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {z} from 'zod';
type Context={params:Promise<{id:string}>};
export const GET=(r:Request,c:Context)=>api(r,async userId=>{const {id}=await c.params;const conversation=await db.conversation.findFirst({where:{id,userId},include:{messages:{orderBy:{createdAt:'asc'},take:500}}});if(!conversation)throw new Error('Conversation not found');return Response.json(conversation);});
export const PATCH=(r:Request,c:Context)=>api(r,async userId=>{const {id}=await c.params;const data=z.object({title:z.string().trim().min(1).max(120)}).parse(await r.json());const result=await db.conversation.updateMany({where:{id,userId},data});if(!result.count)throw new Error('Conversation not found');return Response.json({ok:true});});
export const DELETE=(r:Request,c:Context)=>api(r,async userId=>{const {id}=await c.params;await db.conversation.deleteMany({where:{id,userId}});return Response.json({ok:true});});
