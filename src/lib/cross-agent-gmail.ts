import {db} from './db';
import {enqueue} from './queue';
import {googleRequest} from './google';
import {gmailNotConnectedReply} from './email-chat';

/** Chat can prepare a Gmail send, but only an explicit owner approval executes it. */
export function gmailSendIntent(instruction:string){
 return /^(?:(?:hey|please|kindly|can you|could you|would you)\s+)*(?:(?:send|email|mail|draft|compose|forward|bhejo|bhejdo|bhej)\b|(?:بھیجو|بھیجیں))/iu.test(instruction.trim())
  && /\b(gmail|e-?mail|email|mail)\b|(?:جی\s*میل|ای\s*میل)/iu.test(instruction)
  && !/\b(check|read|show|search|inbox)\b/i.test(instruction);
}
export function parseGmailSend(instruction:string){
 const match=instruction.trim().match(/^(?:please\s+)?(?:send\s+)?(?:a\s+)?(?:gmail|email|mail)\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*[,;:-]?\s*subject\s*:\s*(.+?)\s*[,;]\s*(?:body|message)\s*:\s*([\s\S]+)$/i);
 if(!match)return null;
 const [,to,subject,body]=match;
 if(!subject.trim()||!body.trim()||subject.length>400||body.length>10000)return null;
 return {to,subject:subject.trim(),body:body.trim()};
}
export async function crossAgentGmailReply(userId:string,instruction:string,language='en'){
 const connection=await db.connector.findUnique({where:{userId_provider:{userId,provider:'gmail'}},select:{id:true}});
 if(!connection)return gmailNotConnectedReply(instruction,language);
 try{await googleRequest(userId,'gmail','https://gmail.googleapis.com/gmail/v1/users/me/profile');}
 catch{return 'Your Gmail connection needs attention. Open Connected Apps → Gmail and reconnect or renew permission. Then I can prepare the email for your approval.';}
 const request=parseGmailSend(instruction);
 if(!request)return 'Gmail is connected. Tell me the recipient, subject and exact message. Example: Send email to teacher@example.com, subject: School interview; body: Hello, may we schedule an interview? I will ask for your approval before sending.';
 const plan={summary:'Prepare an email for owner review. Sending requires explicit approval.',steps:[{agent:'Gmail Agent',tool:'gmail.send',args:request,reason:'Send exactly the approved Gmail message.'}]};
 const task=await db.task.create({data:{userId,instruction,plan}});
 await enqueue(task.id);
 return 'I prepared your email in To-Do (task '+task.id+'). Recipient: '+request.to+'. Subject: '+request.subject+'. Nothing has been sent. Please review and approve the exact message to send it.';
}
