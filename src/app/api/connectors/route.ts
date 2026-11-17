import {ensureWhatsAppAgent,removeWhatsAppAgent} from '@/lib/whatsapp-agent';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { connectors } from '@/lib/registry';
import { encrypt } from '@/lib/security';
import { z } from 'zod';
export const GET=(r:Request)=>api(r,async userId=>{
  const existing=await db.connector.findMany({where:{userId},select:{provider:true,metadata:true,updatedAt:true}});
  return Response.json(connectors.map(c=>({...c,connection:existing.find(v=>v.provider===c.provider)||null})));
});
export const POST=(r:Request)=>api(r,async userId=>{
  const data=z.object({provider:z.literal('whatsapp-business'),token:z.string().min(10).max(4000),phoneNumberId:z.string().regex(/^\d+$/),consent:z.object({chats:z.boolean(),draft:z.literal(true),send:z.boolean(),incoming:z.boolean(),automatic:z.literal(false)})}).parse(await r.json());
  const linked=await db.whatsAppSession.findUnique({where:{userId}});if(linked&&['connected','connecting','qr','pairing','reconnecting'].includes(linked.state))throw new Error('Disconnect the linked WhatsApp account first. Only one WhatsApp connection and agent is allowed.');
  const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION||'v23.0'}/${data.phoneNumberId}?fields=id,display_phone_number,verified_name`,{headers:{Authorization:`Bearer ${data.token}`},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`WhatsApp connection verification failed (${response.status}).`);
  const verified=await response.json();
  const metadata={...verified,consent:data.consent,verifiedAt:new Date().toISOString(),health:'verified'};
  await db.connector.upsert({where:{userId_provider:{userId,provider:data.provider}},create:{userId,provider:data.provider,encrypted:encrypt(data),metadata},update:{encrypted:encrypt(data),metadata}});
  await ensureWhatsAppAgent(userId,data.provider);
  await db.audit.create({data:{userId,action:'connector.whatsapp.consent',detail:JSON.stringify({permissions:data.consent,phoneNumberId:data.phoneNumberId})}});
  return Response.json({ok:true,metadata});
});
export const DELETE=(r:Request)=>api(r,async userId=>{
  const {provider}=z.object({provider:z.string()}).parse(await r.json());
  if(provider==='whatsapp-linked')throw new Error('Use the linked-device disconnect control so its session is logged out.');
  if(provider==='whatsapp-business')await removeWhatsAppAgent(userId);
  await db.connector.deleteMany({where:{userId,provider}});await db.audit.create({data:{userId,action:'connector.disconnect',detail:provider}});
  return Response.json({ok:true,note:'Local credentials deleted. Revoke provider access in Google/Meta settings if desired.'});
});
