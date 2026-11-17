import {describe,it,expect,vi,afterEach} from 'vitest';
import {assertLocalModel,ollamaUrl,selectedModel,streamOllama} from '../src/lib/ollama';
import {fitContext} from '../src/lib/context';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('local-only AI boundary',()=>{
  it.each(['https://api.openai.com','https://ollama.com','http://192.168.1.5:11434'])('rejects non-local endpoint %s',url=>{vi.stubEnv('OLLAMA_URL',url);expect(()=>ollamaUrl()).toThrow('local Ollama');});
  it.each(['qwen3:cloud','qwen3:4b-cloud','gpt-4.1-mini','qwen3-cloud'])('rejects paid/cloud model route %s',name=>expect(()=>assertLocalModel(name)).toThrow());
  it('discovers a suitable installed local model',async()=>{vi.stubEnv('AI_MODEL','auto');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({models:[{name:'qwen3:0.6b',size:523000000}]})));expect(await selectedModel()).toBe('qwen3:0.6b');});
  it('parses actual NDJSON chunks across network boundaries',async()=>{const encoder=new TextEncoder();const stream=new ReadableStream({start(c){c.enqueue(encoder.encode('{"message":{"content":"Hel'));c.enqueue(encoder.encode('lo"},"done":false}\n{"message":{"content":"!"},"done":true,"eval_count":2,"prompt_eval_count":4}\n'));c.close();}});vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(stream)));const output=[];for await(const chunk of streamOllama([{role:'user',content:'Hi'}]))output.push(chunk);expect(output.map(c=>c.text).join('')).toBe('Hello!');expect(output.at(-1)?.tokens).toBe(6);});
  it('bounds model context while retaining complete database transcripts separately',()=>{const messages=fitContext([{role:'user',content:'old'.repeat(30)},{role:'assistant',content:'reply'},{role:'user',content:'latest answer'}],20);expect(messages.at(-1)?.content).toBe('latest answer');expect(messages.reduce((n,m)=>n+m.content.length,0)).toBeLessThanOrEqual(20);});
});
