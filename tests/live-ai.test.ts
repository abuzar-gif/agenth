import 'dotenv/config';
import {it,expect,vi} from 'vitest';
import {model,makePlan} from '../src/lib/model';
import {installedModels} from '../src/lib/ollama';
import {toolCatalog} from '../src/lib/tools';
import {agents} from '../src/lib/registry';
import {db} from '../src/lib/db';
import {runTask} from '../src/lib/engine';
import {stopBrowser} from '../src/lib/browser';
import {mkdir,writeFile} from 'node:fs/promises';
it.skipIf(process.env.RUN_LIVE_AI!=='1')('uses actual local Qwen3 text, native planning, browser execution and reporting',async()=>{
  vi.stubEnv('OLLAMA_URL','http://localhost:11434');vi.stubEnv('AI_MODEL','qwen3:4b-instruct');
  const installed=await installedModels();expect(installed.some(m=>m.name==='qwen3:4b-instruct')).toBe(true);
  const answer=await model([{role:'system',content:'Reply in Roman Urdu using only Latin/English letters. Introduce yourself as AgentH in one short sentence. No Urdu or Arabic script, no hidden reasoning.'},{role:'user',content:'Assalamualaikum! Apna taaruf Roman Urdu mein dein.'}]);expect(answer.content.length).toBeGreaterThan(10);expect(answer.tokens).toBeGreaterThan(0);console.info('Verified real local reply:',answer.content,'tokens:',answer.tokens);
  const instruction='Open https://example.com and read its title. Do not click, send or submit anything.';
  const plan=await makePlan(instruction,{},toolCatalog.filter(t=>['browse','report','schedule'].includes(t.name)),agents);expect(plan.plan.steps.some(s=>s.tool==='browse')).toBe(true);expect(plan.toolCalls?.some(c=>c.function.name==='plan_task')).toBe(true);expect(plan.model).toBe('qwen3:4b-instruct');console.info('Verified native tool plan:',JSON.stringify(plan.plan));
  for(const step of plan.plan.steps){expect(['browse','report']).toContain(step.tool);if(step.tool==='browse')expect(['navigate','read','scroll','wait','screenshot']).toContain(step.args.action);}
  const user=await db.user.create({data:{email:`live-${crypto.randomUUID()}@example.test`,profile:{create:{language:'roman-ur'}}}});
  try{
    const task=await db.task.create({data:{userId:user.id,instruction,plan:JSON.parse(JSON.stringify(plan.plan)),model:plan.model,tokens:plan.tokens}});await runTask(task.id);
    let completed=await db.task.findUniqueOrThrow({where:{id:task.id},include:{events:true}});
    for(let i=0;i<180&&!['completed','failed','waiting_approval'].includes(completed.status);i++){await new Promise(r=>setTimeout(r,1000));completed=await db.task.findUniqueOrThrow({where:{id:task.id},include:{events:true}});}
    expect(completed.error).toBeNull();expect(completed.status).toBe('completed');expect(completed.events.some(e=>e.kind==='tool_result'&&JSON.stringify(e.data).includes('Example Domain'))).toBe(true);
    await mkdir('test-results',{recursive:true});await writeFile('test-results/live-qwen-proof.json',JSON.stringify({model:answer.model,reply:answer.content,replyTokens:answer.tokens,nativePlan:plan.plan,nativeToolCalls:plan.toolCalls,taskStatus:completed.status,result:completed.result,events:completed.events},null,2));
  }finally{await stopBrowser(user.id);await db.user.deleteMany({where:{id:user.id}});await db.$disconnect();}
},600000);

