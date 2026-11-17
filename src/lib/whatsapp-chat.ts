export function normalizeWhatsAppRecipient(value:string){
  if(/^\d+@(s\.whatsapp\.net|lid)$/.test(value))return value;
  const digits:Record<string,string>={zero:'0',oh:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
  let input=value.trim().toLowerCase().replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c>='۰'?1776:1632)));
  if(/[a-z]/.test(input)){let result='',repeat=1;for(const word of input.split(/[\s,-]+/)){if(word==='double'||word==='triple'){if(repeat!==1)throw new Error('Please provide the complete phone number.');repeat=word==='double'?2:3;continue;}const digit=digits[word]??(/^\d$/.test(word)?word:undefined);if(digit===undefined)throw new Error('Please provide an exact contact or complete phone number.');result+=digit.repeat(repeat);repeat=1;}if(repeat!==1)throw new Error('Please complete the number after double or triple.');input=result;}
  input=input.replace(/[\s()+.-]/g,'');if(input.startsWith('00'))input=input.slice(2);
  if(/^03\d{9}$/.test(input))input='92'+input.slice(1);else if(/^3\d{9}$/.test(input))input='92'+input;
  if(!/^[1-9]\d{6,14}$/.test(input)||input.startsWith('0')||(input.startsWith('92')&&!/^923\d{9}$/.test(input)))throw new Error('Please provide a complete international number, or an 11-digit Pakistani mobile number such as 03xx xxxxxxx.');
  return input;
}
export function recipientLabel(id:string){return id.endsWith('@lid')?'WhatsApp account · '+id.split('@')[0].slice(-6):'+'+id.split('@')[0];}
export function contactName(value:string){return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
export function directNumberPlan(instruction:string,agentName:string){
 const phone=/(?:\+?92[\s().-]*3\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d|0?3\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d[\s().-]*\d)/i;const match=instruction.match(phone);if(!match)return null;let number:string;try{number=normalizeWhatsAppRecipient(match[0]);}catch{return null;}let text='';const before=instruction.slice(0,match.index).replace(/^\s*(?:please\s+)?(?:message|send)\s*(?:to|on)?\s*/i,'').trim();const after=instruction.slice((match.index||0)+match[0].length).replace(/^\s*(?::|-|,|that|saying)\s*/i,'').trim();if(before&&/^(?:send|message)\b/i.test(instruction))text=before.replace(/\s+(?:to|on)$/i,'').trim();if(!text)text=after;if(!text)return null;return {summary:'Prepare one WhatsApp message for approval.',steps:[{agent:agentName,tool:'whatsapp.linked.send',args:{to:number,text},reason:'Prepare the exact WhatsApp message requested by the owner.'}]};
}
export function messageAfterSelectingContact(instruction:string,contactName:string,contactQuery=''){
 const parsed=parseNamedWhatsAppMessage(instruction);
 if(parsed)return parsed.text;
 const clean=(value:string)=>value.trim().replace(/\s+/g,' ');
 const targetText=clean(contactQuery||contactName);
 if(targetText){const escaped=targetText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const direct=instruction.match(new RegExp(`^\\s*(?:please\\s+)?(?:send\\s+)?message\\s+to\\s+${escaped}\\s+(.+)$`,'i'));if(direct?.[1]?.trim())return clean(direct[1]);}
 const english=instruction.match(/^\s*(?:please\s+)?(?:send\s+)?message\s+to\s+(.+?)\s*(?:[:,\-]|\bthat\b|\bsaying\b)\s*(.+)$/i);
 if(english?.[2]?.trim())return clean(english[2]);
 const roman=instruction.match(/^\s*(.+?)\s+ko\s+(.+?)\s+(?:message\s*)?(?:karo|kro|kar\s*do|kardo|bhej\s*do|bhejdo|bhejo|bhej\s*den|send\s*karo|send\s*kro|send\s*kar\s*do|send\s*kardo)\s*$/i);
 if(roman?.[2]?.trim())return clean(roman[2]);
 if(targetText){const escaped=targetText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=instruction.match(new RegExp(`^\\s*(?:please\\s+)?(?:message|send)\\s+${escaped}\\s*[:,\\-]?\\s*(.+)$`,'i'));if(match?.[1]?.trim())return clean(match[1]);}
 const words=instruction.trim().replace(/^\s*(?:please\s+)?(?:message|send)\s+/i,'').split(/\s+/);const normalized=(value:string)=>value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const honorific=new Set(['bhai','bhaii','brother','jan','jaan']);const target=contactName.split(/\s+/).map(normalized).filter(word=>word&&!honorific.has(word));let index=0;while(index<words.length&&target.length){const word=normalized(words[index]);if(honorific.has(word)){index++;continue;}if(word===target[0]||word.includes(target[0])||target[0].includes(word)){target.shift();index++;continue;}break;}while(index<words.length&&honorific.has(normalized(words[index])))index++;return words.slice(index).join(' ').replace(/^[:,-]+\s*/,'').trim();
}
export function selectedContactPlan(contactId:string,text:string,agentName:string){return {summary:'Send the exact owner-approved WhatsApp message to the selected contact.',steps:[{agent:agentName,tool:'whatsapp.linked.send',args:{to:contactId,text},reason:'Send the message to the contact explicitly selected by the owner.'}]};}
export function whatsAppReply(results:{data:unknown}[]){
  const outputs=results.map(e=>(e.data as any)?.output).filter(Boolean);
  const sent=outputs.find(o=>o.messageId&&(o.status==='submitted_to_whatsapp'||o.provider==='whatsapp-business'));
  if(sent)return 'Your message was submitted to WhatsApp. This confirms submission; delivery and read status are not confirmed yet.';
  const inbox=outputs.find(o=>Array.isArray(o.messages));if(inbox)return inbox.messages.length?inbox.messages.map((m:any)=>`${m.name||'Contact'}: ${m.text||'Non-text message'}`).join('\n\n'):'No matching messages are available yet. I can read messages received while linked with your permission.';
  const report=outputs.findLast(o=>typeof o.text==='string');if(report)return report.text;
  const contacts=outputs.find(o=>Array.isArray(o.contacts));if(contacts)return contacts.contacts.length?'I found '+contacts.contacts.map((c:any)=>c.name).join(', ')+'.':'I could not find that contact. Please provide the full number or a more specific name.';
  return 'The request finished. No message submission was confirmed.';
}

// Separate recipient identification from the exact message body. Never send the command itself.
export function parseNamedWhatsAppMessage(instruction:string):{query:string;text:string}|null{
 const clean=(value:string)=>value.trim().replace(/\s+/g,' ');
 const input=clean(instruction).replace(/^(?:please|kindly)\s+/i,'').replace(/^(?:(?:mere|meri|my)\s+)?whatsapp\s+(?:pe|per|par|on)\s+/i,'').replace(/^(?:میرے|میری)\s+واٹس\s*ایپ\s+پر\s+/u,'');
 const roman=input.match(/^(.+?)\s+ko\s+(.+?)\s+(?:(?:message|msg)\s*)?(?:bhejo|bhej\s*do|bhejdo|bhej\s*dena|send\s*karo|send\s*kro|send\s*kar\s*do|send\s*kardo|karo|kro|kar\s*do|kardo)\s*[.!؟?]*$/i);
 const urdu=input.match(/^(.+?)\s+کو\s+(.+?)\s+(?:بھیجو|بھیج\s*دو|بھیجیں|بھیج\s*دیں|میسج\s*کرو|میسج\s*بھیجو)\s*[۔!?؟]*$/u);
 const english=input.match(/^(?:send|message)\s+(?:a\s+)?(?:whatsapp\s+)?(?:message\s+)?to\s+(.+?)\s*(?:[:,\-]|\bthat\b|\bsaying\b)\s+(.+)$/i)
  ||input.match(/^(?:send|message)\s+(?:a\s+)?(?:whatsapp\s+)?message\s+to\s+(.+?)\s+(?:that\s+)?says?\s+(.+)$/i);
 const englishReverse=input.match(/^send\s+(.+?)\s+to\s+(.+?)(?:\s+on\s+whatsapp)?[.!?]*$/i);
 const m=roman||urdu||english;
 const query=clean(m?m[1]:(englishReverse?.[2]||''));
 const text=clean(m?m[2]:(englishReverse?.[1]||''));
 if(query.length<2||query.length>100||!text||text.length>4096)return null;
 if(/^(?:send|message|bhejo|bhejdo|کو|to)$/i.test(query))return null;
 if(/^(.+?)\s+(?:ko|کو)\s+/i.test(text))return null;
 return {query,text};
}
