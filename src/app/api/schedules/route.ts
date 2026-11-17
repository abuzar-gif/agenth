import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { executeTool } from '@/lib/tools';
import { z } from 'zod';
export const GET=(r:Request)=>api(r,async userId=>Response.json(await db.schedule.findMany({where:{userId},orderBy:{nextRun:'asc'}})));
export const POST=(r:Request)=>api(r,async userId=>Response.json(await executeTool(userId,'schedule',await r.json())));
export const PATCH=(r:Request)=>api(r,async userId=>{const {id,paused}=z.object({id:z.string(),paused:z.boolean()}).parse(await r.json());await db.schedule.updateMany({where:{id,userId},data:{paused}});return Response.json({ok:true});});
export const DELETE=(r:Request)=>api(r,async userId=>{const {id}=z.object({id:z.string()}).parse(await r.json());await db.schedule.deleteMany({where:{id,userId}});return Response.json({ok:true});});
