import {aiProvider,chatAnywhereModel} from '@/lib/ai-provider';
import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {z} from 'zod';
import {assertLocalModel,installedModels} from '@/lib/ollama';
const schema=z.object({model:z.string(),voice:z.enum(['auto','mms-urdu','mms-english']),speed:z.number().min(.5).max(1.5),volume:z.number().min(0).max(1),autoplay:z.boolean(),theme:z.enum(['dark','light']),microphoneId:z.string().max(500)});
export const GET=(r:Request)=>api(r,async userId=>Response.json(await db.settings.upsert({where:{userId},create:{userId},update:{}})));
export const PUT=(r:Request)=>api(r,async userId=>{const data=schema.parse(await r.json());if(aiProvider()==='chatanywhere'){data.model=chatAnywhereModel();}else if(data.model!=='auto'){assertLocalModel(data.model);if(!(await installedModels()).some(m=>m.name===data.model))throw new Error('Install this Qwen3 model before selecting it.');}return Response.json(await db.settings.upsert({where:{userId},create:{userId,...data},update:data}));});

