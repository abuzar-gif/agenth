import {describe,it,expect,vi,afterEach} from 'vitest';
import {model,makePlan} from '../src/lib/model';
afterEach(()=>vi.unstubAllGlobals());
describe('real model protocol',()=>{
  it('does not fabricate replies when the provider is unavailable',async()=>{vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));await expect(model([{role:'user',content:'Hi'}])).rejects.toThrow('Local Ollama unavailable');});
  it('uses only provider-reported token counts',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:{content:'سلام'}})));const r=await model([{role:'user',content:'Hi'}]);expect(r.tokens).toBeNull();expect(r.content).toBe('سلام');});
  it('validates structured plans',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:{content:JSON.stringify({summary:'Answer',steps:[{agent:'Reporter',tool:'report',args:{text:'Hi'},reason:'Respond'}]})},eval_count:5,prompt_eval_count:8})));const p=await makePlan('Hi',{},[]);expect(p.plan.steps[0].tool).toBe('report');expect(p.tokens).toBe(13);});
  it('rejects malformed plans',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({message:{content:'{"summary":"invented","steps":[]}'}})));await expect(makePlan('Hi',{},[])).rejects.toThrow();});
});

