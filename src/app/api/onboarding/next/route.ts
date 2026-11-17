import {api} from '@/lib/api';
import {db} from '@/lib/db';
import {z} from 'zod';
const fields=['name','business','website','profession','responsibilities','linkedin','automation','communication'];
const prompts=['What first name would you like me to use?','Do you have a company, business, organization, or school? None, student, and skip are welcome.','Do you have a website? Share its URL, or skip.','In one or two sentences, what kind of work or study do you do?','What work do you repeat daily or weekly?','Would you like to share a LinkedIn or professional profile URL? You can skip.','What would you like your AI assistant to help automate?','Would you prefer text, voice, or both?'];
const localizedPrompts:{en:string[];ur:string[];'roman-ur':string[]}={
  en:prompts,
  ur:['آپ کا پہلا نام کیا ہے؟','کیا آپ کسی ادارے، اسکول یا کاروبار سے وابستہ ہیں؟ اگر نہیں تو چھوڑ دیں۔','آپ کی ویب سائٹ کا لنک کیا ہے؟ اگر نہیں ہے تو چھوڑ دیں۔','آپ کیا کام کرتے ہیں یا کیا پڑھتے ہیں؟','آپ روزانہ یا ہفتہ وار کون سے کام دہراتے ہیں؟','آپ کا لنکڈ اِن یا پیشہ ورانہ پروفائل لنک کیا ہے؟ اگر چاہیں تو چھوڑ دیں۔','آپ اپنے اسسٹنٹ سے کون سے کام خودکار کروانا چاہتے ہیں؟','آپ تحریر، آواز یا دونوں کو ترجیح دیتے ہیں؟'],
  'roman-ur':['Aap ka pehla naam kya hai?','Kya aap kisi company, school ya business se wabasta hain? Agar nahi to skip kar dein.','Aap ki website ka link kya hai? Agar nahi hai to skip kar dein.','Aap kya kaam karte hain ya kya parhte hain?','Aap rozana ya har haftay kaun se kaam dohrate hain?','Aap ka LinkedIn ya professional profile link kya hai? Agar chahein to skip kar dein.','Aap apne assistant se kaun se kaam automate karwana chahte hain?','Aap text, voice ya dono pasand karte hain?']
};
export const POST=(r:Request)=>api(r,async userId=>{
  const data=z.object({step:z.number().int().min(0).max(8),answer:z.string().max(4000).default(''),skip:z.boolean().default(false),language:z.enum(['en','ur','roman-ur'])}).parse(await r.json());
  if(data.step>0&&!data.skip&&!data.answer.trim())return Response.json({error:'It is a blank field. If you do not want to write an answer, you can skip.'},{status:400});
  if([3,6].includes(data.step)&&!data.skip&&data.answer.trim()){const url=z.url().parse(data.answer);if(!['https:','http:'].includes(new URL(url).protocol))throw new Error('Enter a full HTTP(S) URL or skip.');}
  const p=await db.profile.upsert({where:{userId},create:{userId},update:{}});const answers={...(p.answers as Record<string,string>)};
  if(data.step>0)answers[fields[data.step-1]]=data.skip?'':data.answer.trim();
  const next=data.step+1;await db.profile.update({where:{userId},data:{answers,language:data.language,onboardingStep:next}});
  if(next>8)return Response.json({next,question:data.language==='ur'?'اپنی محفوظ معلومات دیکھیں، پھر ورک اسپیس کھولیں۔':data.language==='roman-ur'?'Apni mehfooz maloomat dekhein, phir workspace kholein.':'Review your saved information, then open your workspace.',ai:false});
  // The step itself owns the displayed question.  Do not ask the model to
  // acknowledge one answer and preview the next prompt: speech and UI must
  // always say exactly the same thing.
  const question=localizedPrompts[data.language][next-1];
  await db.message.create({data:{userId,agent:'Onboarding assistant',role:'assistant',content:question}});
  return Response.json({next,question,ai:false});
});
