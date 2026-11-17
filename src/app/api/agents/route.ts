import {activeWhatsAppAgent} from '@/lib/whatsapp-agent';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { agents, dashboardAgents } from '@/lib/registry';
import { ensureWhatsAppManager } from '@/lib/default-agents';
import { z } from 'zod';
const permission=z.enum(['report','browse','gmail.search','gmail.read','gmail.draft','gmail.send','gmail.modify','contacts.search','calendar.list','calendar.create','schedule']);
const avatarColor=z.union([z.enum(['violet','blue','cyan','teal','green','lime','amber','orange','rose','pink','indigo']),z.string().regex(/^#[\da-f]{6}$/i,'Avatar color must be a named palette color or six-digit hex value.')]);
const avatarShape=z.enum(['rounded','circle','squircle','hex','round','soft','blob','cloud','tilt']);
const agentInput=z.object({name:z.string().trim().min(1).max(80),role:z.string().trim().min(1).max(500),permissions:z.array(permission).max(12),template:z.string().trim().max(80).optional(),avatarColor:avatarColor.optional(),avatarShape:avatarShape.optional(),description:z.string().trim().max(4000).optional(),systemInstructions:z.string().trim().max(12000).optional(),memoryEnabled:z.boolean().optional(),approvalRequired:z.boolean().optional(),status:z.enum(['ready','paused']).optional()});
export const GET=(r:Request)=>api(r,async userId=>{const [custom,defaultWhatsApp]=await Promise.all([db.agent.findMany({where:{userId,connector:null}}),ensureWhatsAppManager(userId)]);const whatsapp={...(await activeWhatsAppAgent(userId)||defaultWhatsApp),name:'WhatsApp Manager'};return Response.json({builtIn:dashboardAgents,custom:[...custom.map(a=>({...a,permissions:a.permissions.filter(p=>!p.startsWith('whatsapp'))})),whatsapp],messages:await db.message.findMany({where:{userId,agent:{notIn:['WhatsApp webhook','WhatsApp linked']}},orderBy:{createdAt:'desc'},take:50})});});
export const POST=(r:Request)=>api(r,async userId=>{
  const data=agentInput.parse(await r.json());
  if(data.name.toLowerCase()==='whatsapp agent')throw new Error('WhatsApp Agent is created only after a verified WhatsApp connection.');
  if([...agents,...dashboardAgents].some(a=>a.name.toLowerCase()===data.name.toLowerCase())||await db.agent.findFirst({where:{userId,name:{equals:data.name,mode:'insensitive'}}}))throw new Error('Choose a unique specialist name.');
  return Response.json(await db.agent.create({data:{userId,...data}}));
});
export const PATCH=(r:Request)=>api(r,async userId=>{const {id,...data}=agentInput.partial().extend({id:z.string()}).parse(await r.json());if(data.name?.toLowerCase()==='whatsapp agent')throw new Error('WhatsApp Agent is created only after a verified WhatsApp connection.');if(data.name&&([...agents,...dashboardAgents].some(a=>a.name.toLowerCase()===data.name?.toLowerCase())||await db.agent.findFirst({where:{userId,id:{not:id},name:{equals:data.name,mode:'insensitive'}}})))throw new Error('Choose a unique specialist name.');const updated=await db.agent.updateMany({where:{id,userId,connector:null},data});if(!updated.count)throw new Error('This custom agent is unavailable.');return Response.json(await db.agent.findUniqueOrThrow({where:{id}}));});
export const DELETE=(r:Request)=>api(r,async userId=>{const {id}=z.object({id:z.string()}).parse(await r.json());await db.agent.deleteMany({where:{id,userId,connector:null}});return Response.json({ok:true});});
