import {aiProvider,chatAnywhereConfigured,chatAnywhereModel} from '@/lib/ai-provider';
import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {installedModels,selectedModel,hardwareRecommendation,ollamaUrl} from '@/lib/ollama';
export const GET=(r:Request)=>api(r,async userId=>{
 if(aiProvider()==='chatanywhere')return Response.json({online:chatAnywhereConfigured(),configured:chatAnywhereConfigured(),verified:false,models:[{name:chatAnywhereModel(),size:0}],selected:chatAnywhereModel(),info:{supportsThinking:false,capabilities:['completion','tools']},provider:'chatanywhere',localOnly:false,error:chatAnywhereConfigured()?null:'Enter CHATANYWHERE_API_KEY in .env.local and restart AgentH.'});
 try{const settings=await db.settings.findUnique({where:{userId}});const models=await installedModels();const selected=await selectedModel(settings?.model).catch(()=>null);let info=null;
 if(selected){const response=await fetch(`${ollamaUrl()}/api/show`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:selected}),signal:AbortSignal.timeout(5000)});if(response.ok){const d=await response.json();const finetune=String(d.model_info?.['general.finetune']||'');info={capabilities:d.capabilities||[],supportsThinking:!selected.includes('instruct')&&(d.capabilities||[]).includes('thinking'),thinkingOnly:finetune.toLowerCase()==='thinking',finetune};}}
 return Response.json({online:true,models:models.filter(m=>m.name.startsWith('qwen3:')&&!m.name.endsWith('-agenth')),selected,info,hardware:hardwareRecommendation(),provider:'ollama',localOnly:true});
 }catch(error){return Response.json({online:false,models:[],hardware:hardwareRecommendation(),error:error instanceof Error?error.message:'Start local Ollama.',provider:'ollama',localOnly:true});}
});
