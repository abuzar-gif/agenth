import '../src/lib/load-worker-env';
import {chatAnywhere} from '../src/lib/chatanywhere';
async function main(){
  const result=await chatAnywhere([{role:'user',content:'Reply with exactly: AgentH connection works'}]);
  console.log(JSON.stringify({provider:'chatanywhere',model:result.model,reply:result.content,tokens:result.tokens},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'ChatAnywhere test failed.');process.exitCode=1;});
