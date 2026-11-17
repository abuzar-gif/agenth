import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {z} from 'zod';
export const PATCH=(r:Request)=>api(r,async userId=>{const {enabled}=z.object({enabled:z.boolean()}).parse(await r.json());return Response.json(await db.settings.upsert({where:{userId},create:{userId,welcomeAutoplay:enabled},update:{welcomeAutoplay:enabled}}));});
