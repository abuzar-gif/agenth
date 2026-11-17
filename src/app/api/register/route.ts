import { z } from 'zod';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { sameOrigin,rateLimit } from '@/lib/security';
import { whatsAppManagerDefaults } from '@/lib/default-agents';
export async function POST(request:Request){
  try{
    sameOrigin(request);rateLimit('register',20);
    const data=z.object({email:z.email(),password:z.string().min(10).max(200),name:z.string().trim().min(1).max(120)}).parse(await request.json());
    await db.user.create({data:{email:data.email.toLowerCase(),name:data.name,passwordHash:await hash(data.password,12),profile:{create:{}},agents:{create:[whatsAppManagerDefaults]}}});
    return Response.json({ok:true});
  }catch(error){console.error('Registration:',error instanceof Error?error.message:error);return Response.json({error:'Could not create the account. Use a valid email, a unique account, and a password of at least 10 characters.'},{status:400});}
}
