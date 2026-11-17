import {chatAnywhereConfigured,chatAnywhereModel} from './ai-provider';
import {backendMessage} from './public-error';
import type {OllamaMessage} from './ollama';
type Options={signal?:AbortSignal;json?:boolean;tools?:unknown[];think?:boolean;model?:string};
const endpoint='https://api.chatanywhere.org/v1/chat/completions';
export function providerError(status:number,code?:string){
  if(status===401||status===403||status===429||status===402||/quota|balance|limit/i.test(code||'')||status===400)return new Error(backendMessage);
  return new Error(backendMessage);
}
async function request(messages:OllamaMessage[],options:Options,stream:boolean){
  if(!chatAnywhereConfigured())throw new Error(backendMessage);
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000);
  let response:Response;
  try{response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.CHATANYWHERE_API_KEY!.trim()}`,'Content-Type':'application/json'},body:JSON.stringify({model:chatAnywhereModel(),messages,stream,max_tokens:options.tools?2000:1600,...(stream?{stream_options:{include_usage:true}}:{}),...(options.json?{response_format:{type:'json_object'}}:{}),...(options.tools?{tools:options.tools,tool_choice:'auto'}:{})}),signal,cache:'no-store',redirect:'error'});}
  catch{if(options.signal?.aborted)throw new Error('Generation stopped.');throw new Error(backendMessage);}
  if(!response.ok){let code='';try{code=String((await response.json()).error?.code||'');}catch{}throw providerError(response.status,code);}
  return response;
}
function parseToolCalls(calls:any[]|undefined){return calls?.map(call=>{let args:unknown;try{args=typeof call.function.arguments==='string'?JSON.parse(call.function.arguments):call.function.arguments;}catch{throw new Error('ChatAnywhere returned invalid tool arguments. No tools were executed.');}return {function:{name:String(call.function.name),arguments:args}};});}
export async function chatAnywhere(messages:OllamaMessage[],options:Options={}){
  const response=await request(messages,options,false);let data;
  try{data=await response.json();}catch{throw new Error('ChatAnywhere returned an invalid response.');}
  if(data.error)throw providerError(502,String(data.error.code||''));
  const message=data.choices?.[0]?.message;
  if(data.choices?.[0]?.finish_reason==='length')throw new Error('ChatAnywhere response reached its length limit. Shorten the request and retry.');
  if(typeof message?.content!=='string'&&!message?.tool_calls?.length)throw new Error('ChatAnywhere returned no text or tool call.');
  return {content:message.content||'',model:chatAnywhereModel(),tokens:typeof data.usage?.total_tokens==='number'?data.usage.total_tokens:null,toolCalls:parseToolCalls(message.tool_calls)};
}
export async function* streamChatAnywhere(messages:OllamaMessage[],options:Options={}){
  const response=await request(messages,options,true);if(!response.body)throw new Error('ChatAnywhere returned no stream.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',finished=false;
  try{while(!finished){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});if(pending.length>1000000)throw new Error('ChatAnywhere stream exceeded the response limit.');const lines=pending.split('\n');pending=lines.pop()||'';if(done&&pending){lines.push(pending);pending='';}
    for(const line of lines){if(!line.startsWith('data:'))continue;const payload=line.slice(5).trim();if(!payload)continue;if(payload==='[DONE]'){finished=true;break;}let data;try{data=JSON.parse(payload);}catch{throw new Error('ChatAnywhere returned an invalid stream.');}if(data.error)throw providerError(502,String(data.error.code||''));if(data.choices?.[0]?.finish_reason==='content_filter')throw new Error('ChatAnywhere declined this response.');yield {text:data.choices?.[0]?.delta?.content||'',done:false,model:chatAnywhereModel(),tokens:typeof data.usage?.total_tokens==='number'?data.usage.total_tokens:null};}
    if(done){if(!finished)throw new Error('ChatAnywhere connection ended before the response completed. Please retry.');break;}
  }}finally{await reader.cancel().catch(()=>{});}
}
