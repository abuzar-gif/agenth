'use client';
import {useOrbState} from '@/hooks/useOrbState';
export default function OrbController(){const orb=useOrbState();return <div className="orb-controls"><button type="button" aria-pressed={orb.muted} onClick={()=>orb.setMuted(!orb.muted)}>{orb.muted?'Unmute voice':'Mute voice'}</button><button type="button" onClick={()=>orb.setFullscreen(true)}>Open voice view</button></div>;}
