import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { encrypt, rateLimit } from '@/lib/security';
import { whatsAppManagerDefaults } from '@/lib/default-agents';
const baseAdapter = PrismaAdapter(db);
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: { ...baseAdapter, async createUser(user) {
    return db.user.create({data:{name:user.name,email:user.email,emailVerified:user.emailVerified,image:user.image,agents:{create:[whatsAppManagerDefaults]}}});
  }, async linkAccount(account) {
    const secured = { ...account };
    for (const key of ['access_token','refresh_token','id_token'] as const) if (secured[key]) secured[key] = encrypt(secured[key]);
    await baseAdapter.linkAccount!(secured);
    return secured;
  } },
  session: { strategy:'jwt', maxAge: 7 * 24 * 3600 },
  pages: { signIn:'/login' },
  providers: [
    Credentials({ credentials:{ email:{}, password:{} }, async authorize(values) {
      const parsed = z.object({email:z.email(),password:z.string().min(10).max(200)}).safeParse(values);
      if (!parsed.success) return null;
      rateLimit('login:'+parsed.data.email.toLowerCase(),10);
      const user = await db.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});
      return user?.passwordHash && await compare(parsed.data.password, user.passwordHash) ? {id:user.id,email:user.email,name:user.name} : null;
    } }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google({clientId:process.env.AUTH_GOOGLE_ID,clientSecret:process.env.AUTH_GOOGLE_SECRET})] : []),
    ...(process.env.EMAIL_SERVER ? [Nodemailer({server:process.env.EMAIL_SERVER,from:process.env.EMAIL_FROM})] : [])
  ],
  callbacks: {
    async jwt({token,user}) { if(user){token.sub=user.id;const record=await db.user.findUnique({where:{id:user.id}});token.version=record?.authVersion||0;}else if(token.sub){const record=await db.user.findUnique({where:{id:token.sub},select:{authVersion:true}});if(!record||record.authVersion!==(token.version||0))return null;} return token; },
    session({session,token}) { if(session.user && token.sub) session.user.id=token.sub; return session; }
  }
});
