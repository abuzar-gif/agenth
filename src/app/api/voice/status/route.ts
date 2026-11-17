import {api} from '@/lib/api';
import {voiceConfiguration,verifyElevenVoice,safeVoiceError} from '@/lib/elevenlabs';
import {speechUrl} from '@/lib/speech';
export const GET=(r:Request)=>api(r,async()=>{const config=voiceConfiguration();let recognition=false;try{recognition=(await fetch(`${speechUrl()}/health`,{signal:AbortSignal.timeout(1500)})).ok;}catch{}return Response.json({...config,configured:config.provider==='local'||config.keyConfigured&&config.voiceConfigured,verified:false,recognition,recognitionProvider:'Local Whisper',verificationNote:'Configuration presence is not proof of an authenticated ElevenLabs request.'});});
export const POST=(r:Request)=>api(r,async()=>{try{return Response.json(await verifyElevenVoice(AbortSignal.any([r.signal,AbortSignal.timeout(20000)])));}catch(error){const safe=safeVoiceError(error);return Response.json({error:safe.message,verified:false},{status:safe.status});}});
