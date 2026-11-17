import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {activeWhatsAppAgent} from '@/lib/whatsapp-agent';

// Contact disambiguation is deliberately session-scoped. A reload begins a
// new session, so an old "Which Ali?" prompt cannot look like a live request.
export const POST=(r:Request)=>api(r,async userId=>{
  const agent=await activeWhatsAppAgent(userId);
  if(!agent)return Response.json({ok:true,discarded:0});
  const changed=await db.task.updateMany({
    where:{userId,agentId:agent.id,status:'needs_clarification'},
    data:{status:'cancelled',error:'Contact choice expired after the chat session ended.'},
  });
  if(changed.count)await db.audit.create({data:{userId,action:'whatsapp.agent.clear_stale_choices',detail:String(changed.count)}});
  return Response.json({ok:true,discarded:changed.count});
});
