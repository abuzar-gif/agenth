import {describe,it,expect,vi} from 'vitest';

const mocks=vi.hoisted(()=>({
 updateMany:vi.fn(),findUniqueOrThrow:vi.fn(),update:vi.fn(),eventCreate:vi.fn(),eventFindMany:vi.fn(),
 agentFindMany:vi.fn(),assertWhatsAppAgent:vi.fn(),executeTool:vi.fn()
}));
vi.mock('../src/lib/db',()=>({db:{
 task:{updateMany:mocks.updateMany,findUniqueOrThrow:mocks.findUniqueOrThrow,update:mocks.update},
 event:{create:mocks.eventCreate,findMany:mocks.eventFindMany},
 agent:{findMany:mocks.agentFindMany}
}}));
vi.mock('../src/lib/whatsapp-agent',()=>({
 assertWhatsAppAgent:mocks.assertWhatsAppAgent,
 matchesWhatsAppStepAgent:(step:string,name:string)=>step===name||step==='WhatsApp Agent'||step==='WhatsApp Manager'
}));
vi.mock('../src/lib/tools',()=>({
 executeTool:mocks.executeTool,
 needsApproval:(name:string)=>name==='whatsapp.linked.send',
 validateTool:vi.fn(),
 toolCatalog:[]
}));
vi.mock('../src/lib/model',()=>({model:vi.fn(),makePlan:vi.fn()}));
vi.mock('../src/lib/integrations',()=>({integrationRegistry:vi.fn()}));
vi.mock('../src/lib/registry',()=>({agents:[]}));
vi.mock('../src/lib/whatsapp-chat',()=>({whatsAppReply:vi.fn()}));
import {runTask} from '../src/lib/engine';

describe('legacy WhatsApp scoped task approval',()=>{
 it.each(['WhatsApp Agent','WhatsApp Manager'])('routes %s to current WhatsApp Manager and waits for explicit approval',async legacyName=>{
  vi.resetAllMocks();
  const agent={id:'agent-test',name:'WhatsApp Manager',provider:'whatsapp-linked',permissions:['report','whatsapp.linked.send','whatsapp.linked.contacts']};
  const step={agent:legacyName,tool:'whatsapp.linked.send',args:{to:'923001234567',text:'hello'},reason:'Prepared exact message'};
  const task={id:'qa-task',userId:'qa-user',agentId:agent.id,status:'queued',cursor:0,plan:{summary:'Prepare reviewed send',steps:[step]},approval:null};
  mocks.updateMany.mockResolvedValue({count:1});
  mocks.findUniqueOrThrow.mockResolvedValue(task);
  mocks.agentFindMany.mockResolvedValue([agent]);
  mocks.assertWhatsAppAgent.mockResolvedValue(agent);
  mocks.eventFindMany.mockResolvedValue([]);
  mocks.update.mockResolvedValue({});
  mocks.eventCreate.mockResolvedValue({});
  await runTask(task.id);
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({where:{id:task.id},data:expect.objectContaining({status:'waiting_approval'})}));
  expect(mocks.executeTool).not.toHaveBeenCalled();
  expect(mocks.assertWhatsAppAgent).toHaveBeenCalledWith(task.userId,agent.id,'whatsapp.linked.send');
 });
 it('does not allow Chief to impersonate a scoped WhatsApp agent',async()=>{
  vi.resetAllMocks();
  const agent={id:'wa',name:'WhatsApp Manager',provider:'whatsapp-linked',permissions:['whatsapp.linked.send']};
  const step={agent:'Chief',tool:'whatsapp.linked.send',args:{to:'923001234567',text:'hello'},reason:'Untrusted tool assignment'};
  const task={id:'qa-task',userId:'qa-user',agentId:agent.id,status:'queued',cursor:0,plan:{summary:'Bad assignment',steps:[step]},approval:null};
  mocks.updateMany.mockResolvedValue({count:1});
  mocks.findUniqueOrThrow.mockResolvedValue(task);
  mocks.agentFindMany.mockResolvedValue([agent]);
  mocks.assertWhatsAppAgent.mockResolvedValue(agent);
  mocks.eventFindMany.mockResolvedValue([]);
  mocks.eventCreate.mockResolvedValue({});
  await runTask(task.id);
  expect(mocks.executeTool).not.toHaveBeenCalled();
  expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'failed',error:expect.stringContaining('does not have permission')})}));
 });
});
