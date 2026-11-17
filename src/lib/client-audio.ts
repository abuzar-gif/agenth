// Browser transport only: the browser receives audio, never provider credentials.
function mediaEvent(target:EventTarget,event:string,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const cleanup=()=>{target.removeEventListener(event,ok);target.removeEventListener('error',fail);signal.removeEventListener('abort',aborted);};const ok=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error('Audio decoding failed. Try another browser or retry playback.'));};const aborted=()=>{cleanup();reject(new DOMException('Stopped','AbortError'));};if(signal.aborted){aborted();return;}target.addEventListener(event,ok,{once:true});target.addEventListener('error',fail,{once:true});signal.addEventListener('abort',aborted,{once:true});});}
export async function prepareAudio(response:Response,audio:HTMLAudioElement,signal:AbortSignal){
 const mime=response.headers.get('Content-Type')?.split(';')[0]||'audio/mpeg';let url='';let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const dispose=()=>{audio.pause();audio.removeAttribute('src');audio.load();if(url){URL.revokeObjectURL(url);url='';}void reader?.cancel().catch(()=>{});};
 try{
  if(mime==='audio/mpeg'&&typeof MediaSource!=='undefined'&&MediaSource.isTypeSupported('audio/mpeg')&&response.body){
   const source=new MediaSource();url=URL.createObjectURL(source);audio.src=url;await mediaEvent(source,'sourceopen',signal);const buffer=source.addSourceBuffer('audio/mpeg');reader=response.body.getReader();
   let firstResolve!:()=>void,firstReject!:(error:unknown)=>void;const ready=new Promise<void>((resolve,reject)=>{firstResolve=resolve;firstReject=reject;});
   const done=(async()=>{let bytes=0;try{for(;;){signal.throwIfAborted();const {done,value}=await reader!.read();if(done)break;bytes+=value.byteLength;if(bytes>30000000)throw new Error('Audio exceeded the playback limit. Use shorter text.');const updated=mediaEvent(buffer,'updateend',signal);void updated.catch(()=>{});buffer.appendBuffer(new Uint8Array(value));await updated;firstResolve();}if(!bytes)throw new Error('The voice provider returned empty audio.');if(source.readyState==='open')source.endOfStream();}catch(error){firstReject(error);throw error;}})();void done.catch(()=>{});await ready;return {dispose,done,mode:'streaming' as const};
  }
  const blob=await response.blob();signal.throwIfAborted();if(!blob.size)throw new Error('The voice provider returned empty audio.');if(blob.size>30000000)throw new Error('Audio exceeded the playback limit.');url=URL.createObjectURL(blob);audio.src=url;return {dispose,done:Promise.resolve(),mode:'buffered' as const};
 }catch(error){dispose();throw error;}
}
