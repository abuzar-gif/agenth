import ApprovedDashboard from './ApprovedDashboard';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Dashboard from './workspace';
import {db} from '@/lib/db';
export default async function DashboardPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const session=await auth();if(!session?.user?.id)redirect('/login');const query=await searchParams;const profile=await db.profile.findUnique({where:{userId:session.user.id}});if(!profile?.onboarded&&!['setup','settings'].includes(query.tab||''))redirect('/dashboard/welcome');if(query.tab&&query.tab!=='preview'&&query.tab!=='v2')return <Dashboard name={session.user.name||'there'} email={session.user.email||''}/>;return <ApprovedDashboard/>;}
