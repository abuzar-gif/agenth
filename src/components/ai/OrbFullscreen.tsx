'use client';
import {useEffect} from 'react';
import {useOrbState} from '@/hooks/useOrbState';
import GlobalAIOrb from './GlobalAIOrb';
import OrbAudioVisualizer from './OrbAudioVisualizer';
export default function OrbFullscreen(){const orb=useOrbState();const {fullscreen,setFullscreen}=orb;useEffect(()=>{if(!fullscreen)return;const listener=(e:KeyboardEvent)=>{if(e.key==='Escape')setFullscreen(false);};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[fullscreen,setFullscreen]);if(!fullscreen)return null;return <div className="orb-fullscreen" role="dialog" aria-modal="true" aria-label="AI voice activity"><button autoFocus onClick={()=>setFullscreen(false)}>Close voice view ×</button><GlobalAIOrb variant="eyes" size={300} showStatus/><OrbAudioVisualizer/><p>Use the voice controls in your conversation. This view reflects the same real audio and agent activity.</p></div>;}
