import { db } from './db';
import { encrypt, decrypt } from './security';
export async function googleToken(userId:string,provider:string) {
  const connection=await db.connector.findUnique({where:{userId_provider:{userId,provider}}});
  if(!connection) throw new Error(`Connect ${provider} in Connected apps first.`);
  const credentials=decrypt<Record<string,any>>(connection.encrypted);
  if(credentials.expiresAt && credentials.expiresAt < Date.now()+60000) {
    if(!credentials.refresh_token) throw new Error(`Reconnect ${provider}: refresh authorization missing.`);
    const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.AUTH_GOOGLE_ID!,client_secret:process.env.AUTH_GOOGLE_SECRET!,grant_type:'refresh_token',refresh_token:credentials.refresh_token}),signal:AbortSignal.timeout(20000)});
    const data=await r.json();if(!r.ok) throw new Error(`Reconnect ${provider}: authorization expired.`);
    Object.assign(credentials,data,{expiresAt:Date.now()+data.expires_in*1000});
    await db.connector.update({where:{id:connection.id},data:{encrypted:encrypt(credentials)}});
  }
  return credentials.access_token;
}
export async function googleRequest(userId:string,provider:string,url:string,method='GET',body?:unknown) {
  const token=await googleToken(userId,provider);
  const response=await fetch(url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw new Error(`${provider} API error ${response.status}: ${(await response.text()).slice(0,500)}`);
  return response.status===204 ? {} : response.json();
}
export function mimeEmail(args:{to:string;subject:string;body:string;inReplyTo?:string}) {
  if(/[\r\n]/.test(args.to+args.subject+(args.inReplyTo||''))) throw new Error('Invalid email header.');
  const raw=[`To: ${args.to}`,`Subject: =?UTF-8?B?${Buffer.from(args.subject).toString('base64')}?=`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64',...(args.inReplyTo ? [`In-Reply-To: ${args.inReplyTo}`,`References: ${args.inReplyTo}`] : []),'',Buffer.from(args.body).toString('base64')].join('\r\n');
  return Buffer.from(raw).toString('base64url');
}
