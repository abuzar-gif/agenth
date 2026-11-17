import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {z} from 'zod';
import {dashboardAgents} from '@/lib/registry';
export const GET=(r:Request)=>api(r,async userId=>{
  const url=new URL(r.url),q=url.searchParams.get('q')?.slice(0,200),agentId=url.searchParams.get('agent');
  let agentName:string|null=null;
  if(agentId){
    const builtIn=dashboardAgents.find(a=>a.id===agentId);
    const custom=!builtIn?await db.agent.findFirst({where:{id:agentId,userId,connector:null},select:{name:true}}):null;
    if(!builtIn&&!custom)throw new Error('Agent not found.');
    agentName=builtIn?.name||custom!.name;
  }
  return Response.json(await db.conversation.findMany({
    where:{userId,...(agentName?{messages:{some:{role:'assistant',agent:{in:agentName==='Chief'?['Chief','Assistant']:[agentName]}}}}:{}),...(q?{OR:[{title:{contains:q,mode:'insensitive'}},{messages:{some:{content:{contains:q,mode:'insensitive'}}}}]}:{})},
    orderBy:{updatedAt:'desc'},take:100,include:{_count:{select:{messages:true}}}
  }));
});
export const POST=(r:Request)=>api(r,async userId=>{const {title}=z.object({title:z.string().trim().min(1).max(120).default('New conversation')}).parse(await r.json());return Response.json(await db.conversation.create({data:{userId,title}}),{status:201});});
