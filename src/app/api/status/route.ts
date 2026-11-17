import {aiProvider,chatAnywhereConfigured,chatAnywhereModel} from '@/lib/ai-provider';
import {voiceConfiguration} from '@/lib/elevenlabs';
import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {hardwareRecommendation,installedModels,selectedModel} from '@/lib/ollama';
import {speechUrl} from '@/lib/speech';
export const GET=(r:Request)=>api(r,async()=>{
  let database=false,ai=false,models:string[]=[],selected:string|null=null,speech=false;
  try{await db.$queryRaw`SELECT 1`;database=true;}catch{}
  if(aiProvider()==='chatanywhere'){selected=chatAnywhereModel();models=[selected];ai=chatAnywhereConfigured();}else try{models=(await installedModels()).map(m=>m.name);selected=await selectedModel();ai=models.includes(selected);}catch{}
  try{speech=(await fetch(`${speechUrl()}/health`,{signal:AbortSignal.timeout(1500)})).ok;}catch{}
  let worker=false;try{const {readFile}=await import('node:fs/promises');const stamp=await readFile('.runtime/worker-heartbeat','utf8');worker=Date.now()-Number(stamp)<20000;}catch{}
  return Response.json({voice:voiceConfiguration(),database,worker,ai,models,model:selected||hardwareRecommendation().recommended,provider:aiProvider(),localOnly:aiProvider()==='ollama',aiVerified:false,hardware:hardwareRecommendation(),speech,google:Boolean(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET),smtp:Boolean(process.env.EMAIL_SERVER),encryption:Boolean(process.env.TOKEN_ENCRYPTION_KEY),browserHeaded:process.env.BROWSER_HEADLESS==='false'});
});
