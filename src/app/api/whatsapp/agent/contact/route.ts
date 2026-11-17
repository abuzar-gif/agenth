import {api} from '@/lib/api';
import {chooseWhatsAppContact} from '@/lib/whatsapp-choice';
import {z} from 'zod';
export const POST=(r:Request)=>api(r,async userId=>{const {taskId,contactId}=z.object({taskId:z.string().max(100),contactId:z.string().max(100)}).parse(await r.json());return Response.json(await chooseWhatsAppContact(userId,taskId,contactId));});
