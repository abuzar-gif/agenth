import {api} from '@/lib/api';
import {browserAction,browserSession,screenshot} from '@/lib/browser';
import {z} from 'zod';

const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('navigate'),url:z.string().url().max(2000)}),
  z.object({action:z.literal('click'),x:z.number().int().min(0).max(1280),y:z.number().int().min(0).max(800)}),
  z.object({action:z.literal('type'),text:z.string().min(1).max(600)}),
  z.object({action:z.literal('scroll'),amount:z.number().int().min(-2000).max(2000)}),
]);
export const GET=(request:Request)=>api(request,async userId=>{
  const {page}=await browserSession(userId);
  if(new URL(request.url).searchParams.has('image')){
    const png=await page.screenshot({type:'png',timeout:10000,animations:'disabled'});
    return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png','Cache-Control':'no-store'}});
  }
  return Response.json({url:page.url(),title:await page.title(),viewport:{width:1280,height:800}},{headers:{'Cache-Control':'no-store'}});
});
export const POST=(request:Request)=>api(request,async userId=>{
  const command=actionSchema.parse(await request.json());
  const {page}=await browserSession(userId);
  if(command.action==='navigate'){
    await browserAction(userId,command);
  }else{
    if(page.url()!=='about:blank'&&new URL(page.url()).hostname==='web.whatsapp.com')throw new Error('WhatsApp Web must be managed by the dedicated connector.');
    if(command.action==='click')await page.mouse.click(command.x,command.y);
    else if(command.action==='type'){
      const sensitive=await page.evaluate(()=>{
        const element=document.activeElement;
        if(!(element instanceof HTMLInputElement)&&!(element instanceof HTMLTextAreaElement))return false;
        const fields=[element.getAttribute('type'),element.getAttribute('name'),element.getAttribute('id'),element.getAttribute('autocomplete'),element.getAttribute('aria-label')].join(' ');
        return /password|passcode|credit|card|cvv|cvc|one.time|otp|secret|private.key|pin|token/i.test(fields);
      });
      if(sensitive)throw new Error('Sensitive fields cannot be recorded. Enter credentials using the site directly outside teaching mode.');
      await page.keyboard.insertText(command.text);
    }
    else if(command.action==='scroll')await page.mouse.wheel(0,command.amount);
    await screenshot(userId);
  }
  return Response.json({url:page.url(),title:await page.title()},{headers:{'Cache-Control':'no-store'}});
});
