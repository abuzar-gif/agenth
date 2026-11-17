import 'dotenv/config';
import {mkdir,writeFile} from 'node:fs/promises';
const model=process.argv[2]||'qwen3:4b-instruct';
if(!/^qwen3:[a-zA-Z0-9_.-]+$/.test(model)||model.includes('cloud'))throw new Error('Local Qwen3 models only.');
const url=new URL(process.env.OLLAMA_URL||'http://localhost:11434');if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local Ollama only.');
const response=await fetch(`${url.origin}/api/pull`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,stream:true})});if(!response.ok)throw new Error(await response.text());
await mkdir('.runtime',{recursive:true});const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',last=-1;
for(;;){const {done,value}=await reader.read();pending+=decoder.decode(value,{stream:!done});const lines=pending.split('\n');pending=lines.pop()||'';for(const line of lines){if(!line.trim())continue;const data=JSON.parse(line);if(data.error)throw new Error(data.error);await writeFile('.runtime/model-download.json',JSON.stringify({model,...data,updatedAt:new Date().toISOString()}));const percent=data.total?Math.floor((data.completed||0)*100/data.total):null;if(percent!==null&&Math.floor(percent/10)>last){last=Math.floor(percent/10);console.log(`${model}: ${percent}% of current layer downloaded`);}else if(!data.total)console.log(data.status);}if(done)break;}
console.log(`Verified local model download complete: ${model}`);
