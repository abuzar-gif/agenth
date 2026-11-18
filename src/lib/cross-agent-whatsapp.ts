import {db} from './db';
import {enqueue} from './queue';
import {activeWhatsAppAgent} from './whatsapp-agent';
import {directNumberPlan,parseNamedWhatsAppMessage,whatsAppNotConnectedReply} from './whatsapp-chat';

export async function crossAgentWhatsAppReply(userId:string,instruction:string,language:string):Promise<string>{
 const agent=await activeWhatsAppAgent(userId);
 if(!agent)return whatsAppNotConnectedReply(instruction,language);
 const sendRequested=/\b(send|message|text|bhejo|bhej|bhejdo|forward|reply|karo|kro)\b|(?:بھیجو|بھیجیں|میسج)/iu.test(instruction);
 if(!sendRequested)return 'WhatsApp is connected. Give me a recipient and message, and I can prepare it for your approval.';
 if(!agent.permissions.includes(agent.provider==='whatsapp-linked'?'whatsapp.linked.send':'whatsapp.send'))
  return 'WhatsApp is connected but Send permission is off. Open Connected Apps → WhatsApp → Permissions to enable approved sending. Nothing was sent.';
 const named=parseNamedWhatsAppMessage(instruction);
 let plan;
 if(agent.provider==='whatsapp-linked'){
  plan=directNumberPlan(instruction,agent.name)||(named?{summary:'Resolve a WhatsApp recipient and prepare the exact message for review.',steps:[
   {agent:agent.name,tool:'whatsapp.linked.contacts',args:{query:named.query},reason:'Resolve a contact name. Multiple matches require owner selection.'},
   {agent:agent.name,tool:'whatsapp.linked.send',args:{to:'$step:0.contacts.0.id',text:named.text},reason:'Send only after exact recipient and message approval.'}
  ]}:null);
 }else if(agent.provider==='whatsapp-business'){
  // Official WhatsApp Business supports exact numbers only through this workflow.
  const match=instruction.match(/\b(?:to|number)\s*[: ]\s*(\+?\d[\d\s().-]{5,20})\s*[:,-]\s*(.+)$/i);
  const number=match?.[1].replace(/[^\d]/g,'');
  if(number&&/^\d{7,15}$/.test(number)&&match?.[2].trim())plan={summary:'Prepare WhatsApp Business message for owner review.',steps:[
   {agent:agent.name,tool:'whatsapp.send',args:{to:number,text:match[2].trim()},reason:'Send only after approval and provider policy verification.'}
  ]};
 }
 if(!plan)return agent.provider==='whatsapp-business'
  ? 'WhatsApp Business is connected. Give me an exact international number and message, for example: Send WhatsApp to number +923001234567: hello. I will ask for approval before sending.'
  : 'WhatsApp is connected. Please specify the recipient and exact message, for example: Send WhatsApp message to Ali: hello. Nothing was sent.';
 const task=await db.task.create({data:{userId,agentId:agent.id,instruction,plan}});
 await enqueue(task.id);
 return 'Your WhatsApp request has been queued in To-Do (task '+task.id+'). I will resolve the recipient, ask for clarification if needed, then request your approval of the exact message. Nothing has been sent yet.';
}
