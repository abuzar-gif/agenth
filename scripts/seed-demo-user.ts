import {PrismaClient} from '@prisma/client';
import {hash} from 'bcryptjs';

const email=process.env.DEMO_EMAIL;
const password=process.env.DEMO_PASSWORD;
if(!email||!password)throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD before running this script.');

const demoEmail=email;
const demoPassword=password;
const db=new PrismaClient();
async function seed(){
 const passwordHash=await hash(demoPassword,12);
 const user=await db.user.upsert({
  where:{email:demoEmail},
  update:{name:'AgentH Demo',passwordHash},
  create:{email:demoEmail,name:'AgentH Demo',passwordHash},
 });
 await db.profile.upsert({where:{userId:user.id},update:{onboarded:true,onboardingStep:-1},create:{userId:user.id,onboarded:true,onboardingStep:-1}});
 await db.settings.upsert({where:{userId:user.id},update:{},create:{userId:user.id}});
 console.log(`Demo user ready: ${user.email}`);
 await db.$disconnect();
}
void seed();
