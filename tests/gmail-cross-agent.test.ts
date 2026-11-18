import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({connector:vi.fn(),profile:vi.fn(),create:vi.fn(),enqueue:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{connector:{findUnique:mocks.connector},task:{create:mocks.create}}}));
vi.mock('../src/lib/google',()=>({googleRequest:mocks.profile}));
vi.mock('../src/lib/queue',()=>({enqueue:mocks.enqueue}));
import {gmailSendIntent,parseGmailSend,crossAgentGmailReply} from '../src/lib/cross-agent-gmail';
beforeEach(()=>vi.resetAllMocks());
describe('Gmail actions from all task agents',()=>{
 it('only recognizes action commands',()=>{
  expect(gmailSendIntent('Send email to someone')).toBe(true);
  expect(gmailSendIntent('Please read my Gmail inbox')).toBe(false);
  expect(gmailSendIntent('Write a poem about email history')).toBe(false);
 });
 it('extracts recipient, subject and body',()=>{
  expect(parseGmailSend('Send email to teacher@example.com, subject: School interview; body: Hello, can we schedule a call?')).toEqual({to:'teacher@example.com',subject:'School interview',body:'Hello, can we schedule a call?'});
 });
 it('explains how to connect Gmail if disconnected',async()=>{
  mocks.connector.mockResolvedValue(null);
  expect(await crossAgentGmailReply('owner','Send email to teacher@example.com','en')).toContain('not connected');
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('creates approval-only Gmail task without sending',async()=>{
  mocks.connector.mockResolvedValue({id:'gmail'});
  mocks.profile.mockResolvedValue({emailAddress:'owner@example.test'});
  mocks.create.mockImplementation(async({data})=>({id:'gmail-task',...data}));
  const reply=await crossAgentGmailReply('owner','Send email to teacher@example.com, subject: School interview; body: Hello, can we schedule a call?');
  expect(reply).toContain('Nothing has been sent');
  const plan=mocks.create.mock.calls[0][0].data.plan;
  expect(plan.steps[0]).toEqual(expect.objectContaining({agent:'Gmail Agent',tool:'gmail.send',args:{to:'teacher@example.com',subject:'School interview',body:'Hello, can we schedule a call?'}}));
  expect(mocks.enqueue).toHaveBeenCalledWith('gmail-task');
 });
 it('requests missing email details and does not queue',async()=>{
  mocks.connector.mockResolvedValue({id:'gmail'});
  mocks.profile.mockResolvedValue({emailAddress:'owner@example.test'});
  expect(await crossAgentGmailReply('owner','Send email to Mama')).toContain('recipient, subject and exact message');
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('handles expired Gmail connection without claiming inability',async()=>{
  mocks.connector.mockResolvedValue({id:'gmail'});
  mocks.profile.mockRejectedValue(Error('token expired'));
  expect(await crossAgentGmailReply('owner','Send email to Mama')).toContain('reconnect');
 });
});