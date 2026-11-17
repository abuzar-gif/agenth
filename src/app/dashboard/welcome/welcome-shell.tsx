'use client';
import {useState} from 'react';
import Link from 'next/link';
import Onboarding,{type Profile} from '@/components/onboarding';
export default function WelcomeShell({initial}:{initial:Profile}){const [profile,setProfile]=useState(initial);return <main className="welcome-page"><header><Link href="/" className="brand"><span className="brand-icon">H</span> AgentH</Link></header><Onboarding profile={profile} onSave={async p=>{const r=await fetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const d=await r.json();if(!r.ok)throw new Error(d.error);setProfile(d);}}/></main>;}
