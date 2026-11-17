import {z} from 'zod';
import {db} from '@/lib/db';
import {sameOrigin,rateLimit} from '@/lib/security';
import {createHash} from 'node:crypto';
import {hash} from 'bcryptjs';
export async function POST(r:Request){try{sameOrigin(r);rateLimit('password-reset-consume',20);const {token,password}=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:z.string().min(10).max(200)}).parse(await r.json());const digest=createHash('sha256').update(token).digest('hex');const saved=await db.verificationToken.findUnique({where:{token:digest}});if(!saved||saved.expires<new Date()||!saved.identifier.startsWith('reset:'))throw new Error('Invalid or expired link');const passwordHash=await hash(password,12);await db.$transaction(async tx=>{const used=await tx.verificationToken.deleteMany({where:{token:digest,expires:{gt:new Date()}}});if(!used.count)throw new Error('Link already used');await tx.user.update({where:{email:saved.identifier.slice(6)},data:{passwordHash,authVersion:{increment:1}}});});return Response.json({ok:true});}catch{return Response.json({error:'Reset failed. The link may be expired or used. Password must contain at least 10 characters.'},{status:400});}}
