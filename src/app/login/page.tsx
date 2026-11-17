import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginForm from './form';
export default async function Login({searchParams}:{searchParams:Promise<{signup?:string}>}){const [session,params]=await Promise.all([auth(),searchParams]);if(session?.user)redirect('/dashboard');return <div className="reference-auth-route"><div className="reference-auth-route-backdrop" aria-hidden="true"/><LoginForm signup={params.signup==='1'} google={Boolean(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET)} emailLink={Boolean(process.env.EMAIL_SERVER)}/></div>;}
