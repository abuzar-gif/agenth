import {googleRequest} from './google';

type GmailProfile={emailAddress?:string};
type GmailList={messages?:{id:string}[]};
type GmailMetadata={payload?:{headers?:{name:string;value:string}[]};snippet?:string};

function safeField(value:unknown){
  return String(value||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,200);
}

export function gmailActionIntent(input:string){
  const t=input.toLowerCase();
  const mentions=/\b(gmail|e-?mail|inbox|mailbox|emails?|mails?)\b|(?:ای\s*میل|جی\s*میل|ان باکس)/i.test(t);
  const actionable=/\b(check|show|open|read|search|find|fetch|list|latest|recent|new|send|write|draft|reply|forward|delete|archive|inbox|connect|connected|link|authorize|dekho|dikhao|dikha|bhejo|bhej|karo|kro|parho|khol|kholo)\b|(?:دیکھو|دکھاؤ|بھیجو|پڑھو|کھولو)/i.test(t);
  return mentions&&actionable;
}
export function gmailNotConnectedReply(input:string,language='en'){
  const roman=/\b(kya|kia|hai|mera|meri|mujhe|mujy|dikha|dekho|bata|bta|kr|kro|kar|nhi|yaar|khol|bhejo)\b/i.test(input);
  const urdu=/[\u0600-\u06ff]/.test(input)||language==='ur';
  if(urdu)return 'آپ کا Gmail ابھی کنیکٹ نہیں ہے۔ براہِ کرم پہلے AgentH میں Connected Apps کھول کر Gmail کنیکٹ کریں۔ اس کے بعد واپس آ کر مجھے یا Email Manager کو اپنا کام بتائیں۔ شکریہ!';
  if(roman||language==='roman-ur')return 'Aapka Gmail abhi connected nahi hai. Kindly pehle AgentH ke Connected Apps mein ja kar Gmail connect karein. Phir wapas aa kar mujhe ya Email Manager ko apni command dein. Shukriya!';
  return 'Your Gmail is not connected yet. Please open Connected Apps in AgentH and connect your Gmail first. Then come back and tell me, or Email Manager, what you would like to do. Thank you!';
}
function romanUrdu(input:string){
  return /\b(kia|kya|hai|mera|meri|mujhe|mujy|dikha|dekho|bata|bta|kr|kro|kar|nhi|yaar)\b/i.test(input);
}

function friendlyError(error:unknown,roman:boolean){
  const message=error instanceof Error?error.message:'Unknown Gmail error';
  if(/Connect gmail/i.test(message))return roman?'Gmail abhi connected nahi hai. Connect Apps mein Gmail ko authorize karein.':'Gmail is not connected. Open Connect Apps to authorize it.';
  if(/Reconnect gmail|API error 401|API error 403/i.test(message))return roman?'Gmail ka access expire ya revoke ho gaya hai. Connect Apps se Gmail dobara connect karein.':'Gmail access is expired, revoked, or missing the required permission. Reconnect Gmail in Connect Apps.';
  return roman?'Gmail ko verify karte waqt error aaya. Connection aur network check karein, phir retry karein.':'Could not verify Gmail right now. Check the connection and retry.';
}

export async function emailManagerReadOnlyReply(userId:string,agentName:string,input:string):Promise<string|null>{
  if(agentName!=='Email Manager')return null;
  const normalized=input.toLowerCase();
  const asksConnection=/\b(gmail|email|mail)\b.{0,60}\b(connect|connected|authorized|linked)\b|\b(connect|connected|authorized|linked)\b.{0,60}\b(gmail|email|mail)\b/i.test(normalized);
  const asksInbox=/\b(inbox|ibox|ibx|emails?|mails?|messages?)\b/i.test(normalized)
    && /\b(check|show|list|read|recent|latest|new|last|dekho|dek|dikhao|dikha|bata|bta|khol|see|fetch)\b/i.test(normalized);
  if(!asksConnection&&!asksInbox)return null;
  const roman=romanUrdu(input);
  try{
    const base='https://gmail.googleapis.com/gmail/v1/users/me';
    const profile=await googleRequest(userId,'gmail',base+'/profile') as GmailProfile;
    if(asksConnection&&!asksInbox){
      return roman?`Haan, Gmail API se connection verify ho gaya hai. Connected account: ${safeField(profile.emailAddress)||'authorized Gmail account'}. Main aapki permission se inbox read kar sakta hun. Email bhejne se pehle approval zaroori hai.`
        :`Yes. Gmail API verified the connection for ${safeField(profile.emailAddress)||'your authorized Gmail account'}. I can read inbox messages you request. Sending emails requires your approval.`;
    }
    const list=await googleRequest(userId,'gmail',base+'/messages?labelIds=INBOX&maxResults=5') as GmailList;
    const ids=(list.messages||[]).slice(0,5).map(item=>item.id).filter(Boolean);
    if(!ids.length)return roman?'Gmail connected hai, lekin inbox mein koi email nahi mili.':'Gmail is connected, but there are no messages in the inbox.';
    const results=await Promise.all(ids.map(id=>googleRequest(userId,'gmail',base+'/messages/'+encodeURIComponent(id)+'?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date') as Promise<GmailMetadata>));
    const items=results.map((item,index)=>{
      const headers=item.payload?.headers||[];
      const header=(name:string)=>safeField(headers.find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value);
      const subject=header('Subject')||'(No subject)';
      const from=header('From')||'(Unknown sender)';
      const date=header('Date');
      return `${index+1}. ${subject}\n   From: ${from}${date?'\n   Date: '+date:''}`;
    });
    return (roman?`Gmail Inbox ki ${items.length} recent emails (real Gmail API):`:`Latest ${items.length} inbox emails (verified from Gmail API):`)+'\n\n'+items.join('\n\n')+'\n\n'+(roman?'Yeh real inbox ke sender, subject aur date hain. Koi email send nahi ki gayi.':'These are real inbox sender, subject, and date details. No email was sent.');
  }catch(error){
    return friendlyError(error,roman);
  }
}
