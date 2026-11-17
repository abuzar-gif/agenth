import {auth} from '@/auth';
import {redirect} from 'next/navigation';
import BrowserStudio from '@/components/browser/BrowserStudio';

export default async function StudioPage(){
 const session=await auth();
 if(!session?.user?.id)redirect('/login');
 return <main style={{minHeight:'100dvh',background:'#f7f8fb',padding:'clamp(12px,2vw,28px)'}}><BrowserStudio/></main>;
}
