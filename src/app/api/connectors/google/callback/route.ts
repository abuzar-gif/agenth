import { auth } from '@/auth';
import { decrypt,encrypt } from '@/lib/security';
import { db } from '@/lib/db';
import { NextRequest,NextResponse } from 'next/server';
export async function GET(r:NextRequest){
  const app=process.env.APP_URL||'http://localhost:3000';
  try{
    const session=await auth();if(!session?.user?.id)throw new Error('Sign in before connecting.');
    const state=decrypt<{userId:string;provider:string;nonce:string;expires:number}>(r.nextUrl.searchParams.get('state')||'');
    if(state.userId!==session.user.id||state.expires<Date.now()||state.nonce!==r.cookies.get('connector-state')?.value)throw new Error('Invalid or expired authorization state.');
    const code=r.nextUrl.searchParams.get('code');if(!code)throw new Error('Authorization declined.');
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code,client_id:process.env.AUTH_GOOGLE_ID!,client_secret:process.env.AUTH_GOOGLE_SECRET!,redirect_uri:`${app}/api/connectors/google/callback`,grant_type:'authorization_code'}),signal:AbortSignal.timeout(20000)});
    const data=await response.json();if(!response.ok)throw new Error('Google token exchange failed.');
    const encrypted=encrypt({...data,expiresAt:Date.now()+data.expires_in*1000});
    await db.connector.upsert({where:{userId_provider:{userId:state.userId,provider:state.provider}},create:{userId:state.userId,provider:state.provider,encrypted,metadata:{scope:data.scope}},update:{encrypted,metadata:{scope:data.scope}}});
    const res=NextResponse.redirect(`${app}/dashboard?connector=google&status=connected`);res.cookies.delete('connector-state');return res;
  }catch(error){return NextResponse.redirect(`${app}/dashboard?connector=google&error=${encodeURIComponent(error instanceof Error?error.message:'Connection failed')}`);}
}
