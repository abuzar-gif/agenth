import {api} from '@/lib/api';
import {z} from 'zod';
import {linkedConversation,linkedSend,requestLinkedHistorySync} from '@/lib/whatsapp-runtime';
export const GET=(r:Request)=>api(r,async userId=>{const jid=z.string().max(100).optional().parse(new URL(r.url).searchParams.get('jid')||undefined);return Response.json(await linkedConversation(userId,jid),{headers:{'Cache-Control':'no-store'}});});
export const POST=(r:Request)=>api(r,async userId=>{
 const body=z.object({action:z.enum(['send','sync']),jid:z.string().max(100).optional(),text:z.string().trim().min(1).max(4096).optional()}).parse(await r.json());
 if(body.action==='sync')return Response.json(await requestLinkedHistorySync(userId));
 if(!body.jid||!body.text)throw new Error('Choose a chat and write a message before sending.');
 return Response.json(await linkedSend(userId,{to:body.jid,text:body.text}));
});
