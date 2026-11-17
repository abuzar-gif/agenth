import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {aiProvider,chatAnywhereModel} from '@/lib/ai-provider';
import {selectedModel} from '@/lib/ollama';

export const GET=(r:Request)=>api(r,async userId=>{
  const provider=aiProvider();
  const [tasks,chats,unknown,conversations,localModel]=await Promise.all([
    db.task.aggregate({where:{userId},_sum:{tokens:true,durationMs:true},_count:{id:true}}),
    db.message.aggregate({where:{userId,role:'assistant',conversationId:{not:null}},_sum:{tokens:true},_count:{id:true}}),
    db.message.count({where:{userId,role:'assistant',conversationId:{not:null},tokens:null}}),
    db.conversation.count({where:{userId}}),
    provider==='chatanywhere'?Promise.resolve(null):selectedModel().catch(()=>null),
  ]);
  return Response.json({
    provider,
    model:provider==='chatanywhere'?chatAnywhereModel():localModel,
    taskTokens:tasks._sum.tokens,
    chatTokens:chats._sum.tokens,
    taskCount:tasks._count.id,
    assistantMessages:chats._count.id,
    messagesWithoutTokenCounts:unknown,
    conversations,
    durationMs:tasks._sum.durationMs,
  });
});
