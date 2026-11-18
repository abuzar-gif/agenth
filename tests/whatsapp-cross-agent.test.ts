import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({active:vi.fn(),create:vi.fn(),enqueue:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{task:{create:mocks.create}}}));
vi.mock('../src/lib/whatsapp-agent',()=>({activeWhatsAppAgent:mocks.active}));
vi.mock('../src/lib/queue',()=>({enqueue:mocks.enqueue}));
import {crossAgentWhatsAppReply} from '../src/lib/cross-agent-whatsapp';
import {whatsAppActionIntent,whatsAppNotConnectedReply} from '../src/lib/whatsapp-chat';

beforeEach(()=>{vi.resetAllMocks()});
describe('all authorized agents can prepare owner-approved WhatsApp actions',()=>{
 it.each(['Send WhatsApp message to Mama: hello','Open WhatsApp and message Mama hello','WhatsApp pe Ali ko hello bhejo','میرا واٹس ایپ کھولو'])('recognizes explicit WhatsApp intent: %s',text=>expect(whatsAppActionIntent(text)).toBe(true));
 it.each(['Write a WhatsApp blog article','How does WhatsApp work?','Hello Mama','Tell me a story'])('does not start action from ordinary conversation: %s',text=>expect(whatsAppActionIntent(text)).toBe(false));
 it('gives clear English reply if no connection',async()=>{
  mocks.active.mockResolvedValue(null);
  const reply=await crossAgentWhatsAppReply('owner','Send WhatsApp message to Mama: hello','en');
  expect(reply).toContain("I can't send messages on WhatsApp");
  expect(reply).toContain('Connected Apps');
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('gives Urdu and Roman Urdu guidance',()=>{
  expect(whatsAppNotConnectedReply('میرا واٹس ایپ کھولو','ur')).toContain('کنیکٹ');
  expect(whatsAppNotConnectedReply('Mama ko hello bhejo WhatsApp pe','roman-ur')).toContain('Connected Apps');
 });
 it('creates a scoped WhatsApp task with exact text and no direct send',async()=>{
  mocks.active.mockResolvedValue({id:'wa-1',name:'WhatsApp Manager',provider:'whatsapp-linked',permissions:['whatsapp.linked.send','whatsapp.linked.contacts']});
  mocks.create.mockImplementation(async({data})=>({id:'task-1',...data}));mocks.enqueue.mockResolvedValue('queued');
  const reply=await crossAgentWhatsAppReply('owner','Send WhatsApp message to Mama: hello','en');
  expect(reply).toContain('queued');
  expect(mocks.create).toHaveBeenCalledOnce();
  const plan=mocks.create.mock.calls[0][0].data.plan;
  expect(plan.steps[0]).toEqual(expect.objectContaining({agent:'WhatsApp Manager',tool:'whatsapp.linked.contacts',args:{query:'Mama'}}));
  expect(plan.steps[1]).toEqual(expect.objectContaining({agent:'WhatsApp Manager',tool:'whatsapp.linked.send',args:{to:'$step:0.contacts.0.id',text:'hello'}}));
  expect(mocks.enqueue).toHaveBeenCalledWith('task-1');
 });
 it('never queues sending without consent',async()=>{
  mocks.active.mockResolvedValue({id:'wa-1',name:'WhatsApp Manager',provider:'whatsapp-linked',permissions:['report']});
  expect(await crossAgentWhatsAppReply('owner','Send WhatsApp message to Mama: hello','en')).toContain('Send permission is off');
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('never guesses a message body',async()=>{
  mocks.active.mockResolvedValue({id:'wa-1',name:'WhatsApp Manager',provider:'whatsapp-linked',permissions:['whatsapp.linked.send']});
  const reply=await crossAgentWhatsAppReply('owner','Open WhatsApp','en');
  expect(reply).toContain('connected');
  expect(mocks.create).not.toHaveBeenCalled();
 });
});
