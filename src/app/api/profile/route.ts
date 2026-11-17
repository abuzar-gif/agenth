import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { profileSchema } from '@/lib/validation';
export const GET=(r:Request)=>api(r,async userId=>Response.json(await db.profile.upsert({where:{userId},create:{userId},update:{}})));
export const PUT=(r:Request)=>api(r,async userId=>{const data=profileSchema.parse(await r.json());return Response.json(await db.profile.upsert({where:{userId},create:{userId,...data},update:data}));});
export const DELETE=(r:Request)=>api(r,async userId=>{await db.profile.deleteMany({where:{userId}});return Response.json({ok:true});});
