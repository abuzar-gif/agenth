'use client';
import {useContext} from 'react';
import {OrbContext} from '@/components/ai/OrbProvider';
export function useOrbState(){const orb=useContext(OrbContext);if(!orb)throw new Error('OrbProvider is required.');return orb;}
