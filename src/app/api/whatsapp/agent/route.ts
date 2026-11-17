import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {activeWhatsAppAgent,assertWhatsAppAgent} from '@/lib/whatsapp-agent';
import {z} from 'zod';
import {enqueue} from '@/lib/queue';
import {directNumberPlan,normalizeWhatsAppRecipient,selectedContactPlan} from '@/lib/whatsapp-chat';
import {linkedContacts,rememberContactAlias,rememberedContactCommand} from '@/lib/whatsapp-runtime';
async function followUpPlan(userId:string,agentId:string,instruction:string,agentName:string){const match=instruction.match(/^\s*(?:message|send)\s+(?:him|her|this contact)\s*[:, -]?\s*(.+)$/i);if(!match?.[1]?.trim())return null;const event=await db.event.findFirst({where:{kind:'contact_selected',task:{userId,agentId}},orderBy:{createdAt:'desc'}});const selected=event?.data as {contactId?:string}|null;if(!selected?.contactId)return null;return selectedContactPlan(selected.contactId,match[1].trim(),agentName);}
function contactMessagePlan(query:string,text:string,agentName:string){
 return {summary:'Find the requested WhatsApp contact and prepare the exact message for approval.',steps:[
  {agent:agentName,tool:'whatsapp.linked.contacts',args:{query},reason:'Find only WhatsApp contacts matching the recipient name.'},
  {agent:agentName,tool:'whatsapp.linked.send',args:{to:'$step:0.contacts.0.id',text},reason:'Prepare the owner’s exact message for approval after one verified match.'},
 ]};
}
function namedMessagePlan(instruction:string,agentName:string){
 const clean=(value:string)=>value.trim().replace(/\s+/g,' ');
 const roman=instruction.match(/^\s*(.+?)\s+ko\s+(.+?)\s+(?:message\s*)?(?:karo|kro|kar\s*do|kardo|bhej\s*do|bhejdo|bhejo|bhej\s*den|send\s*karo|send\s*kro|send\s*kar\s*do|send\s*kardo)\s*$/i);
 const colon=instruction.match(/^\s*(?:please\s+)?(?:message|send)\s+(?:to\s+)?(.+?)\s*[:,-]\s*(.+)\s*$/i);
 const english=instruction.match(/^\s*(?:please\s+)?(?:send\s+)?message\s+to\s+(.+?)\s+(?:that|saying)\s+(.+)\s*$/i);
 const channel=instruction.match(/^\s*(?:please\s+)?(?:send\s+)?message\s+(?:to\s+)?(.+?)\s+(?:on\s+)?whatsapp\s*[:,\-]?\s+(.+)\s*$/i);
 const match=roman||colon||english||channel;
 if(!match)return null;
 const query=clean(match[1]),text=clean(match[2]);
 if(query.length<2||text.length<1||query.length>100||text.length>4096)return null;
 return contactMessagePlan(query,text,agentName);
}
async function plainMessagePlan(userId:string,instruction:string,agentName:string){
 const raw=instruction.match(/^\s*(?:please\s+)?(?:send\s+message|message|send)\s+(?:to\s+)?(.+?)\s*$/i)?.[1]?.trim();
 if(!raw||/^(?:him|her|this contact)\b/i.test(raw))return null;
 const words=raw.split(/\s+/).filter(Boolean);if(words.length<2)return null;
 for(let split=words.length-1;split>=1;split--){
  const query=words.slice(0,split).join(' '),text=words.slice(split).join(' ');
  if(query.length<2||!text)continue;
  try{const matches=await linkedContacts(userId,query);if(matches.contacts.length)return contactMessagePlan(query,text,agentName);}catch{break;}
 }
 // A local no-match result is clearer and safer than falling back to the general AI planner.
 return contactMessagePlan(words.slice(0,-1).join(' '),words.at(-1)!,agentName);
}
function contactToRemember(instruction:string){const match=instruction.match(/^\s*(?:please\s+)?(?:save|remember|add)\s+(?:this\s+)?(?:number|contact)\s+([+\d\s().-]+?)\s+(?:as|name\s+as)\s+(.+?)\s*$/i);if(!match)return null;try{return {id:normalizeWhatsAppRecipient(match[1])+'@s.whatsapp.net',alias:match[2].trim()};}catch{return null;}}
export const GET=(r:Request)=>api(r,async userId=>{const agent=await activeWhatsAppAgent(userId);if(!agent)return Response.json({agent:null,tasks:[],note:'A WhatsApp Agent appears only after a verified connection.'});if(new URL(r.url).searchParams.has('summary'))return Response.json({agent:{id:agent.id,name:agent.name,provider:agent.provider}});const tasks=await db.task.findMany({where:{userId,agentId:agent.id},orderBy:{createdAt:'desc'},take:50,include:{events:{orderBy:{createdAt:'asc'},take:250}}});const [contactsCount,messagesCount]=await Promise.all([db.whatsAppContact.count({where:{userId}}),db.whatsAppMessage.count({where:{userId,fromMe:false}})]);return Response.json({agent,tasks,contactsCount,messagesCount});});
export const POST=(r:Request)=>api(r,async userId=>{const {instruction}=z.object({instruction:z.string().trim().min(3).max(12000)}).parse(await r.json());const agent=await activeWhatsAppAgent(userId);await assertWhatsAppAgent(userId,agent?.id);const remembered=contactToRemember(instruction);if(remembered){await rememberContactAlias(userId,remembered.id,remembered.alias);const task=await db.task.create({data:{userId,agentId:agent!.id,instruction,status:'completed',result:`Saved “${remembered.alias}” in AgentH’s private WhatsApp contact memory. It does not edit your phone address book; the number will be checked on WhatsApp before any message is sent.`}});return Response.json(task,{status:201});}const known=await rememberedContactCommand(userId,instruction);const plan=directNumberPlan(instruction,agent!.name)||(known?selectedContactPlan(known.id,known.text,agent!.name):null)||await followUpPlan(userId,agent!.id,instruction,agent!.name)||namedMessagePlan(instruction,agent!.name)||await plainMessagePlan(userId,instruction,agent!.name);const task=await db.task.create({data:{userId,agentId:agent!.id,instruction,...(plan?{plan}: {})}});await enqueue(task.id);return Response.json(task,{status:201});});
