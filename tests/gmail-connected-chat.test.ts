import {describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({googleRequest:vi.fn()}));
vi.mock('../src/lib/google',()=>({googleRequest:mocks.googleRequest}));
import {emailManagerReadOnlyReply} from '../src/lib/email-chat';
describe('connected Gmail is available to all agents in read-only chat',()=>{
 it.each(['Chief','Email Manager','Dost'])('reads real provider metadata for %s',async agent=>{
  mocks.googleRequest.mockReset();
  mocks.googleRequest.mockImplementation(async (_u:string,_p:string,url:string)=>{
   if(url.endsWith('/profile'))return {emailAddress:'authorized@example.test'};
   if(url.includes('/messages?'))return {messages:[{id:'id-1'}]};
   return {payload:{headers:[{name:'From',value:'Teacher <teacher@example.test>'},{name:'Subject',value:'School project'},{name:'Date',value:'Tue, 17 Nov 2026 10:00:00 GMT'}]}};
  });
  const response=await emailManagerReadOnlyReply('qa-user',agent,'check recent inbox');
  expect(response).toContain('School project');
  expect(response).toContain('Teacher');
  expect(response).not.toContain('I can\'t open your Gmail');
  expect(mocks.googleRequest).toHaveBeenCalledTimes(3);
 });
 it('opens verified inbox metadata for an Urdu-script Gmail request',async()=>{
  mocks.googleRequest.mockReset();
  mocks.googleRequest.mockImplementation(async (_u:string,_p:string,url:string)=>url.endsWith('/profile')?{emailAddress:'authorized@example.test'}:url.includes('/messages?')?{messages:[{id:'message-one'}]}:{payload:{headers:[{name:'Subject',value:'Recent class update'},{name:'From',value:'Teacher'}]}});
  const response=await emailManagerReadOnlyReply('qa-user','Chief','میرا Gmail کھولو');
  expect(response).toContain('Recent class update');
  expect(mocks.googleRequest).toHaveBeenCalledTimes(3);
 });
 it('never sends mail through ordinary chat',async()=>{
  mocks.googleRequest.mockReset().mockResolvedValue({emailAddress:'authorized@example.test'});
  const response=await emailManagerReadOnlyReply('qa-user','Chief','send email to my teacher');
  expect(response).toContain('cannot send email directly');
  expect(mocks.googleRequest).toHaveBeenCalledTimes(1);
 });
});