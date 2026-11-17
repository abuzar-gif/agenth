import {db} from './db';
import {assertWhatsAppAgent} from './whatsapp-agent';
import {messageAfterSelectingContact,selectedContactPlan} from './whatsapp-chat';
import {rememberContactAlias} from './whatsapp-runtime';
export async function chooseWhatsAppContact(userId:string,taskId:string,contactId:string){
 let alias='';
 const result=await db.$transaction(async tx=>{
  const task=await tx.task.findFirst({where:{id:taskId,userId}});if(!task||task.status!=='needs_clarification')throw new Error('This contact choice is no longer available.');
  await assertWhatsAppAgent(userId,task.agentId||undefined,'whatsapp.linked.contacts');
  const result=await tx.event.findFirst({where:{taskId,kind:'tool_result'},orderBy:{createdAt:'desc'}});const data=result?.data as any;
  const plan=task.plan as any;if(data?.index!==task.cursor||!plan?.steps?.[task.cursor]?.tool?.endsWith('.contacts'))throw new Error('There is no pending contact choice.');
  const chosen=data.output?.contacts?.find((c:any)=>c.id===contactId);if(!chosen)throw new Error('Choose a contact from this request’s list.');
  if(!await tx.whatsAppContact.findUnique({where:{userId_jid:{userId,jid:contactId}}}))throw new Error('This contact is no longer available. Search again.');
  const query=String(plan.steps?.[task.cursor]?.args?.query||'');
  alias=query;
  const text=messageAfterSelectingContact(task.instruction,chosen.name||'',query);
  const dataUpdate=text?{status:'waiting_approval',cursor:0,result:null,approval:{index:0,approved:false,step:selectedContactPlan(chosen.id,text,'WhatsApp Agent').steps[0]},error:null,plan:selectedContactPlan(chosen.id,text,'WhatsApp Agent')}:{status:'completed',cursor:task.cursor+1,result:`${chosen.name||'Contact'} selected. Type “message him …” with the message you want to send.`,approval:{},error:null};
  const claimed=await tx.task.updateMany({where:{id:taskId,userId,status:'needs_clarification',cursor:task.cursor},data:dataUpdate});if(!claimed.count)throw new Error('This choice was already handled. Refresh the conversation.');
  await tx.event.update({where:{id:result!.id},data:{data:{...data,output:{...data.output,contacts:[chosen],requiresClarification:false}}}});
  await tx.event.create({data:{taskId,agent:'User',kind:'contact_selected',message:text?'Contact selected. Final message approval is required.':'Contact selected by the task owner.',data:{contactId,name:chosen.name,text:text||null}}});
  await tx.audit.create({data:{userId,action:'whatsapp.contact_selected',detail:taskId}});
  return {ok:true};
 });
 if(alias)await rememberContactAlias(userId,contactId,alias).catch(()=>{});return result;
}
