import 'dotenv/config';
const url=new URL(process.env.OLLAMA_URL||'http://localhost:11434');if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Local Ollama only.');
const model=process.argv[2]||'qwen3:4b-instruct';if(!/^qwen3:[a-zA-Z0-9_.-]+$/.test(model)||model.includes('cloud'))throw new Error('Choose a local Qwen3 model.');
const response=await fetch(`${url.origin}/api/show`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model})});if(!response.ok)throw new Error(`Install ${model} first.`);const data=await response.json();
const finetune=String(data.model_info?.['general.finetune']||'');if(finetune.toLowerCase()==='thinking')throw new Error('This model is thinking-only; install qwen3:4b-instruct for normal chat.');
console.log(JSON.stringify({model,capabilities:data.capabilities,finetune,localOnly:true,note:'No model-template patch or cloud fallback is applied.'}));
