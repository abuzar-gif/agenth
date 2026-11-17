import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {activeWhatsAppAgent} from '@/lib/whatsapp-agent';

// Chat history is presentation data for this private assistant. Clearing it
// must never touch linked WhatsApp messages, contacts, or the connection.
export const DELETE=(r:Request)=>api(r,async userId=>{
  const agent=await activeWhatsAppAgent(userId);
  if(!agent)return Response.json({ok:true,cleared:0});
  const rows=await db.task.findMany({where:{userId,agentId:agent.id},select:{id:true}});
  const ids=rows.map(row=>row.id);
  if(ids.length)await db.$transaction([
    db.event.deleteMany({where:{taskId:{in:ids}}}),
    db.task.deleteMany({where:{id:{in:ids},userId,agentId:agent.id}}),
    db.audit.create({data:{userId,action:'whatsapp.agent.clear_chat',detail:String(ids.length)}}),
  ]);
  return Response.json({ok:true,cleared:ids.length});
});
