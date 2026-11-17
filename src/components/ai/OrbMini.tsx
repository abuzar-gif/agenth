'use client';
import MiniEnergyCoreOrb from './MiniEnergyCoreOrb';
import { useOrbState } from '@/hooks/useOrbState';
import type {OrbState} from './OrbProvider';
export default function OrbMini({state,size=26}:{state?:OrbState;size?:number}){const orb=useOrbState();const active=state||orb.state;return <MiniEnergyCoreOrb size={size} state={active==='thinking'||active==='working'?'thinking':active==='success'?'done':active==='error'?'error':active==='listening'?'listening':active==='speaking'?'responding':'idle'} className="orb-mini"/>;}
