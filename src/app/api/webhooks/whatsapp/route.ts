import { createHmac,timingSafeEqual } from 'node:crypto';
import {grantedWhatsApp} from '@/lib/integrations';
import { db } from '@/lib/db';
export async function GET(r:Request){const q=new URL(r.url).searchParams;return q.get('hub.mode')==='subscribe'&&Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)&&q.get('hub.verify_token')===process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?new Response(q.get('hub.challenge')):new Response('Forbidden',{status:403});}
export async function POST(r:Request){
  if(!process.env.META_APP_SECRET)return new Response('Webhook setup required',{status:503});
  const raw=await r.text();if(Buffer.byteLength(raw)>1000000)return new Response('Too large',{status:413});
  const expected=Buffer.from('sha256='+createHmac('sha256',process.env.META_APP_SECRET).update(raw).digest('hex'));
  const actual=Buffer.from(r.headers.get('x-hub-signature-256')||'');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return new Response('Forbidden',{status:403});
  const payload=JSON.parse(raw);
  for(const entry of payload.entry||[])for(const change of entry.changes||[]){
    const value=change.value;const phone=value.metadata?.phone_number_id;if(!phone)continue;
    const connections=await db.connector.findMany({where:{provider:'whatsapp-business',metadata:{path:['id'],equals:phone}}});
    for(const c of connections){
      const consent=grantedWhatsApp(c.metadata);if(!consent?.incoming||!consent.chats)continue;
      for(const message of value.messages||[]){
      await db.message.upsert({where:{id:`wa-${c.id}-${message.id}`},create:{id:`wa-${c.id}-${message.id}`,userId:c.userId,agent:'WhatsApp webhook',content:JSON.stringify({...message,contact:(value.contacts||[]).find((contact:{wa_id:string})=>contact.wa_id===message.from)||null})},update:{}});
    }}
  }
  return Response.json({ok:true});
}
