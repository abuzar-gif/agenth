import { auth } from '@/auth';
import { rateLimit,sameOrigin } from './security';
import { ZodError } from 'zod';
import { db } from './db';
import {publicErrorMessage} from './public-error';
export async function api(request:Request,fn:(userId:string)=>Promise<Response>){
  try{
    const session=await auth();if(!session?.user?.id)return Response.json({error:'Please sign in.'},{status:401});
    if(!await db.user.findUnique({where:{id:session.user.id},select:{id:true}}))return Response.json({error:'Account no longer exists. Please sign out.'},{status:401});
    rateLimit(session.user.id);
    if(!['GET','HEAD'].includes(request.method))sameOrigin(request);
    return await fn(session.user.id);
  }catch(error){
    if(error instanceof ZodError)return Response.json({error:'Invalid input',issues:error.issues},{status:400});
    const message=publicErrorMessage(error,'We could not complete that request. Please try again.');
    if(message.includes('Too many'))return Response.json({error:message},{status:429});
    if(message.includes('origin'))return Response.json({error:message},{status:403});
    if(message.includes('not found'))return Response.json({error:message},{status:404});
    console.error('API:',message);
    return Response.json({error:message},{status:400});
  }
}
