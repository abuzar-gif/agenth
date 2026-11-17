import { auth } from '@/auth';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const session=await auth();if(!session?.user?.id)return new Response('Unauthorized',{status:401});
  const userId=session.user.id;const encoder=new TextEncoder();let count=0;
  if(!await db.user.findUnique({where:{id:userId},select:{id:true}}))return new Response('Unauthorized',{status:401});
  const stream=new ReadableStream({async start(controller){
    try{while(!request.signal.aborted&&count++<90){
      const tasks=await db.task.findMany({where:{userId},orderBy:{updatedAt:'desc'},take:30,include:{events:{orderBy:{createdAt:'asc'},take:250}}});
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(tasks)}\n\n`));
      await new Promise(resolve=>setTimeout(resolve,2000));
    }}catch{try{controller.enqueue(encoder.encode('event: backend-error\ndata: Database unavailable\n\n'));}catch{}}finally{try{controller.close();}catch{}}
  }});
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
