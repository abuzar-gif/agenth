'use client';
import {useOrbState} from '@/hooks/useOrbState';
export default function OrbAudioVisualizer(){const {amplitude,state}=useOrbState();return <meter className="audio-meter" min={0} max={1} value={amplitude} aria-label={`Actual ${state} audio level`}/>;}
