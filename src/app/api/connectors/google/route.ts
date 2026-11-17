import { api } from '@/lib/api';
import { connectors } from '@/lib/registry';
import { encrypt } from '@/lib/security';
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
export const POST=(r:Request)=>api(r,async userId=>{
  if(!process.env.AUTH_GOOGLE_ID||!process.env.AUTH_GOOGLE_SECRET)throw new Error('Configure AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET first.');
  const {provider}=await r.json();const spec=connectors.find(c=>c.provider===provider&&c.auth==='Google OAuth');if(!spec)throw new Error('Invalid Google connector.');
  const nonce=randomBytes(24).toString('hex'),state=encrypt({userId,provider,nonce,expires:Date.now()+600000});
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:process.env.AUTH_GOOGLE_ID,redirect_uri:`${process.env.APP_URL}/api/connectors/google/callback`,response_type:'code',scope:spec.scopes.join(' '),access_type:'offline',prompt:'consent',state}).toString();
  const res=NextResponse.json({url:url.toString()});res.cookies.set('connector-state',nonce,{httpOnly:true,secure:process.env.APP_URL?.startsWith('https:'),sameSite:'lax',maxAge:600,path:'/api/connectors/google'});return res;
});
