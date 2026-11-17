import { z } from 'zod';
export const languages = ['en','ur','roman-ur'] as const;
export const profileSchema = z.object({language:z.enum(languages),timezone:z.string().refine(v=>{try {new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Invalid time zone'),answers:z.record(z.string().max(80),z.string().max(4000)),onboarded:z.boolean(),onboardingStep:z.number().int().min(-1).max(12).optional()}).superRefine((p,ctx)=>{for(const key of ['website','linkedin']){const value=p.answers[key]?.trim();if(!value)continue;try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))throw new Error();}catch{ctx.addIssue({code:'custom',path:['answers',key],message:'Use a full HTTP(S) URL, or leave blank.'});}}});
export const taskSchema = z.object({instruction:z.string().trim().min(3).max(12000)});
export const toolStepSchema = z.object({agent:z.string().min(1).max(80),tool:z.string().max(80),args:z.record(z.string(),z.unknown()),reason:z.string().max(2000)});
export const planSchema = z.object({summary:z.string(),steps:z.array(toolStepSchema).min(1).max(12)});
export type Step = z.infer<typeof toolStepSchema>;
