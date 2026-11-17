import {assertWhatsAppAgent,outgoingOnce} from './whatsapp-agent';
import { z } from 'zod';
import { db } from './db';
import { browserAction } from './browser';
import { googleRequest,mimeEmail } from './google';
import { decrypt,publicUrl } from './security';
import {assertWhatsAppPermission} from './integrations';
import { CronExpressionParser } from 'cron-parser';
const text=z.string().min(1).max(20000);
const email=z.object({to:z.email(),subject:text,body:text,inReplyTo:z.string().optional(),threadId:z.string().optional()});
const definitions={
  report:{schema:z.object({text}),description:'Return an answer or clarification request. No action is performed.',approval:false},
  browse:{schema:z.object({action:z.enum(['navigate','read','wait','click','type','scroll','upload','download','screenshot','takeover','return','stop']),url:z.url().optional(),selector:z.string().max(1000).optional(),text:z.string().max(20000).optional(),amount:z.number().optional(),uploadId:z.string().optional()}),description:'Operate real Chromium. navigate requires url; wait/click/type/upload/download require selector. upload requires previously uploaded uploadId.',approval:true},
  'gmail.search':{schema:z.object({query:text}),description:'Search Gmail messages',approval:false},
  'gmail.read':{schema:z.object({id:text,thread:z.boolean().optional()}),description:'Read message or full thread',approval:false},
  'gmail.draft':{schema:email,description:'Create Gmail draft',approval:true},
  'gmail.send':{schema:email,description:'Send email or reply with optional inReplyTo Message-ID and threadId',approval:true},
  'gmail.modify':{schema:z.object({id:text,addLabelIds:z.array(text).default([]),removeLabelIds:z.array(text).default([])}),description:'Modify Gmail message labels',approval:true},
  'contacts.search':{schema:z.object({query:text}),description:'Find authorized Google contacts',approval:false},
  'calendar.list':{schema:z.object({timeMin:z.iso.datetime({offset:true}),timeMax:z.iso.datetime({offset:true})}),description:'List events in primary calendar',approval:false},
  'calendar.create':{schema:z.object({summary:text,start:z.iso.datetime({offset:true}),end:z.iso.datetime({offset:true}),timezone:text,attendees:z.array(z.email()).default([])}),description:'Create calendar event; attendees receive invitations',approval:true},
  'whatsapp.linked.send':{schema:z.object({to:z.string().trim().min(7).max(80),text:z.string().min(1).max(4096),replyTo:z.string().max(300).optional()}),description:'Send or reply from the connected personal linked device. A Pakistani 03xx number is normalized server-side. Requires an exact individual recipient and owner approval; groups/broadcasts unavailable.',approval:true},
  'whatsapp.linked.contacts':{schema:z.object({query:z.string().min(1).max(100)}),description:'Resolve permitted contacts received from WhatsApp. Multiple/no matches stop for owner clarification.',approval:false},
  'whatsapp.linked.messages':{schema:z.object({search:z.string().max(200).optional()}),description:'Search bounded permitted messages received while linked. No full-history claim.',approval:false},
  'whatsapp.send':{schema:z.object({to:z.string().regex(/^\d{7,15}$/),text:z.string().max(4096).optional(),mediaUrl:z.url().optional(),mediaType:z.enum(['image','document','video','audio']).optional(),replyTo:z.string().optional()}).refine(v=>Boolean(v.text)||Boolean(v.mediaUrl&&v.mediaType),'Text or attachment required'),description:'Official Business Cloud API message, subject to Meta conversation/template policy',approval:true},
  'whatsapp.contacts':{schema:z.object({query:z.string().min(1).max(100)}),description:'Resolve contacts only from consented incoming webhook messages, returns verified wa_id and profile name. Multiple matches require owner clarification. No full address-book access.',approval:false},
  'whatsapp.messages':{schema:z.object({search:z.string().optional()}),description:'Read locally stored messages received by the signed webhook; historical personal chats unavailable',approval:false},
  schedule:{schema:z.object({instruction:text,at:z.iso.datetime({offset:true}),cron:z.string().optional(),timezone:z.string().default('Asia/Karachi')}),description:'Create persistent one-time or cron task; external mutations still need approval at execution',approval:true}
};
export type ToolName=keyof typeof definitions;
export const toolCatalog=Object.entries(definitions).map(([name,v])=>({name,description:v.description,args:z.toJSONSchema(v.schema,{io:'input',unrepresentable:'any'})}));
export function validateTool(name:string,args:unknown){const d=definitions[name as ToolName];if(!d)throw new Error(`Unsupported tool: ${name}`);return d.schema.parse(args);}
export function needsApproval(name:string,args:Record<string,unknown>){return name==='browse' ? !['navigate','read','wait','scroll','screenshot'].includes(String(args.action)) : definitions[name as ToolName]?.approval ?? true;}
export async function executeTool(userId:string,name:string,input:unknown,context?:{agentId?:string;operationId?:string}){
  const a=validateTool(name,input) as Record<string,any>;
  if(name.startsWith('whatsapp'))await assertWhatsAppAgent(userId,context?.agentId,name);
  if(name.startsWith('whatsapp.linked.')){const linked=await import('./whatsapp-runtime');if(name==='whatsapp.linked.contacts')return linked.linkedContacts(userId,a.query);if(name==='whatsapp.linked.messages')return linked.linkedMessages(userId,a.search);return linked.linkedSend(userId,a as {to:string;text:string;replyTo?:string},context?.operationId);}
  const gmail='https://gmail.googleapis.com/gmail/v1/users/me';
  if(name==='report')return {text:a.text};
  if(name==='browse')return browserAction(userId,a);
  if(name==='gmail.search')return googleRequest(userId,'gmail',`${gmail}/messages?maxResults=20&q=${encodeURIComponent(a.query)}`);
  if(name==='gmail.read')return googleRequest(userId,'gmail',`${gmail}/${a.thread?'threads':'messages'}/${encodeURIComponent(a.id)}?format=full`);
  if(name==='gmail.draft'||name==='gmail.send'){
    const message={raw:mimeEmail(a as any),...(a.threadId?{threadId:a.threadId}:{})};
    return googleRequest(userId,'gmail',`${gmail}/${name==='gmail.send'?'messages/send':'drafts'}`,'POST',name==='gmail.send'?message:{message});
  }
  if(name==='gmail.modify')return googleRequest(userId,'gmail',`${gmail}/messages/${encodeURIComponent(a.id)}/modify`,'POST',{addLabelIds:a.addLabelIds,removeLabelIds:a.removeLabelIds});
  if(name==='contacts.search')return googleRequest(userId,'contacts',`https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(a.query)}&readMask=names,emailAddresses,phoneNumbers&pageSize=20`);
  if(name==='calendar.list')return googleRequest(userId,'calendar',`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&maxResults=50&timeMin=${encodeURIComponent(a.timeMin)}&timeMax=${encodeURIComponent(a.timeMax)}`);
  if(name==='calendar.create'){
    if(new Date(a.end)<=new Date(a.start))throw new Error('End must be after start.');
    return googleRequest(userId,'calendar','https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all','POST',{summary:a.summary,start:{dateTime:a.start,timeZone:a.timezone},end:{dateTime:a.end,timeZone:a.timezone},attendees:a.attendees.map((email:string)=>({email}))});
  }
  if(name==='whatsapp.send'){
    const c=await assertWhatsAppPermission(userId,'send');
    const creds=decrypt(c.encrypted);if(a.mediaUrl)await publicUrl(a.mediaUrl);
    const type=a.mediaType||'text';
    return outgoingOnce(userId,context?.operationId,a,async()=>{const r=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION||'v23.0'}/${encodeURIComponent(creds.phoneNumberId)}/messages`,{method:'POST',headers:{Authorization:`Bearer ${creds.token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:a.to,type,[type]:a.mediaUrl?{link:a.mediaUrl}:{body:a.text},...(a.replyTo?{context:{message_id:a.replyTo}}:{})}),signal:AbortSignal.timeout(30000)});
    const data=await r.json();if(!r.ok){if(r.status===401||data.error?.code===190)await db.connector.update({where:{id:c.id},data:{metadata:{...(c.metadata as object),health:'expired'}}});throw new Error(`WhatsApp provider rejected the request (${r.status}). Reconnect if authorization expired.`);}return {provider:'whatsapp-business',status:'accepted_by_provider',messageId:data.messages?.[0]?.id||null,timestamp:new Date().toISOString(),providerResult:data,note:'Accepted is not proof of delivery; delivery requires a status webhook.'};});
  }
  if(name==='whatsapp.contacts'){
    await assertWhatsAppPermission(userId,'incoming');
    const messages=await db.message.findMany({where:{userId,agent:'WhatsApp webhook',content:{contains:a.query,mode:'insensitive'}},take:50,orderBy:{createdAt:'desc'}});
    const found=new Map<string,{id:string;name:string}>();for(const item of messages){try{const m=JSON.parse(item.content);if(m.contact?.wa_id&&m.contact?.profile?.name)found.set(m.contact.wa_id,{id:m.contact.wa_id,name:m.contact.profile.name});}catch{}}
    return {contacts:[...found.values()],source:'Permitted received webhook messages only',requiresClarification:found.size!==1};
  }
  if(name==='whatsapp.messages'){await assertWhatsAppPermission(userId,'incoming');return db.message.findMany({where:{userId,agent:'WhatsApp webhook',...(a.search?{content:{contains:a.search,mode:'insensitive'}}:{})},take:20,orderBy:{createdAt:'desc'}});}
  if(name==='schedule'){
    new Intl.DateTimeFormat('en',{timeZone:a.timezone});
    if(a.cron)CronExpressionParser.parse(a.cron,{tz:a.timezone});
    if(new Date(a.at)<=new Date())throw new Error('Schedule must be in the future.');
    return db.schedule.create({data:{userId,instruction:a.instruction,nextRun:new Date(a.at),cron:a.cron,timezone:a.timezone}});
  }
  throw new Error('Unsupported tool.');
}
