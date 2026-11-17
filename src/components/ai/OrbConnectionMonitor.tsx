'use client';
import {useEffect} from 'react';
import {useOrbState} from '@/hooks/useOrbState';
export default function OrbConnectionMonitor(){const {setActivity}=useOrbState();useEffect(()=>{let alive=true;const check=async()=>{try{const r=await fetch('/api/ai/models');const data=await r.json();if(alive)setActivity('local-connection',data.online&&data.selected?null:'offline',data.error||(data.provider==='chatanywhere'?'ChatAnywhere setup required':'Local Ollama is offline'));}catch{if(alive)setActivity('local-connection','offline','Cannot reach the local AI backend');}};void check();const timer=setInterval(()=>void check(),30000);return()=>{alive=false;clearInterval(timer);setActivity('local-connection',null);};},[setActivity]);return null;}
