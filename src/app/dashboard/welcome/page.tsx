import {auth} from '@/auth';
import {db} from '@/lib/db';
import {redirect} from 'next/navigation';
import WelcomeShell from './welcome-shell';
export default async function WelcomePage(){const session=await auth();if(!session?.user?.id)redirect('/login');const profile=await db.profile.upsert({where:{userId:session.user.id},create:{userId:session.user.id},update:{}});if(profile.onboarded)redirect('/dashboard');return <WelcomeShell initial={profile as any}/>;}
