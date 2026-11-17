import {db} from './db';
export type WhatsAppConsent={chats:boolean;draft:boolean;send:boolean;incoming:boolean;automatic:false};
export function grantedWhatsApp(metadata:unknown):WhatsAppConsent|null{const m=metadata as {consent?:WhatsAppConsent}|null;return m?.consent||null;}
export async function integrationRegistry(userId:string){
 const rows=await db.connector.findMany({where:{userId},select:{id:true,provider:true,metadata:true,updatedAt:true}});
 return rows.map(row=>{const m=row.metadata as Record<string,any>;const consent=grantedWhatsApp(m);const wa=row.provider==='whatsapp-business';
 const tools=wa?(consent?[...(consent.send?['whatsapp.send']:[]),...(consent.incoming&&consent.chats?['whatsapp.messages','whatsapp.contacts']:[])]:[]):row.provider==='gmail'?['gmail.search','gmail.read','gmail.draft','gmail.send','gmail.modify']:row.provider==='calendar'?['calendar.list','calendar.create']:row.provider==='contacts'?['contacts.search']:[];
 return {id:row.id,provider:row.provider,state:m.health==='expired'?'reconnect_required':wa&&!consent?'consent_required':'authorized',health:m.health||'not_rechecked',lastVerifiedAt:m.verifiedAt||null,updatedAt:row.updatedAt,permissions:wa?consent:null,tools,capabilities:wa?['Official Business messaging','Only signed webhook messages stored by AgentH; no personal history or address book']:tools};});
}
export async function assertWhatsAppPermission(userId:string,permission:'send'|'incoming'){
 const row=await db.connector.findUnique({where:{userId_provider:{userId,provider:'whatsapp-business'}}});if(!row)throw new Error('Connect WhatsApp Business first.');
 const consent=grantedWhatsApp(row.metadata);if(!consent?.[permission]||(permission==='incoming'&&!consent.chats))throw new Error('WhatsApp permission not granted. Review connector consent in Connected apps.');
 if((row.metadata as Record<string,unknown>).health==='expired')throw new Error('WhatsApp authorization expired. Reconnect in Connected apps.');return row;
}
