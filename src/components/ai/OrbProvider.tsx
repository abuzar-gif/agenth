'use client';
import {createContext,useCallback,useMemo,useState,type ReactNode} from 'react';
export type OrbState='idle'|'listening'|'thinking'|'speaking'|'working'|'success'|'error'|'paused'|'muted'|'offline';
type Activity={state:OrbState;detail?:string;at:number};
type OrbContextValue={state:OrbState;detail:string;amplitude:number;setAmplitude:(n:number)=>void;setActivity:(source:string,state:OrbState|null,detail?:string)=>void;muted:boolean;setMuted:(v:boolean)=>void;fullscreen:boolean;setFullscreen:(v:boolean)=>void};
export const OrbContext=createContext<OrbContextValue|null>(null);
const priority:Record<OrbState,number>={idle:0,success:1,offline:2,paused:3,working:4,thinking:5,error:6,listening:7,speaking:8,muted:9};
export default function OrbProvider({children}:{children:ReactNode}){
  const [activities,setActivities]=useState<Record<string,Activity>>({}),[amplitude,setAmplitude]=useState(0),[muted,setMuted]=useState(false),[fullscreen,setFullscreen]=useState(false);
  const setActivity=useCallback((source:string,state:OrbState|null,detail?:string)=>{setActivities(old=>{const next={...old};if(state)next[source]={state,detail,at:Date.now()};else delete next[source];return next;});},[]);
  const current=Object.values(activities).sort((a,b)=>priority[b.state]-priority[a.state]||b.at-a.at)[0];
  const value=useMemo(()=>({state:muted?'muted' as const:current?.state||'idle' as const,detail:current?.detail||'',amplitude,setAmplitude,setActivity,muted,setMuted,fullscreen,setFullscreen}),[current?.state,current?.detail,amplitude,setActivity,muted,fullscreen]);
  return <OrbContext.Provider value={value}>{children}</OrbContext.Provider>;
}
