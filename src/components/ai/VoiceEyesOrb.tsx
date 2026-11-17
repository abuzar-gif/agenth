'use client';

import { memo, useEffect, useRef, type CSSProperties } from 'react';
import type { AnimatedOrbProps, OrbAnimationState } from './orb-types';
import styles from './dual-orbs.module.css';

type VoiceEyesOrbProps = AnimatedOrbProps & { amplitude?: number };

// Drawing coordinates and layers are preserved from the supplied eyesorb.html.
function paintEyesOrb(context: CanvasRenderingContext2D, time: number, state: OrbAnimationState, amplitude: number) {
  const TAU = Math.PI * 2;
  const cx = 450;
  const cy = 450;
  const ellipse = (x: number, y: number, rx: number, ry: number, rotation = 0) => {
    context.beginPath();
    context.ellipse(x, y, rx, ry, rotation, 0, TAU);
  };
  context.clearRect(0, 0, 900, 900);
  const scale = 1 + .012 * Math.sin(time * 1.8);
  context.save();
  context.translate(cx, cy);
  context.scale(scale, scale);
  context.translate(-cx, -cy);

  const halo = context.createRadialGradient(cx, cy, 140, cx, cy, 385);
  halo.addColorStop(0, 'rgba(114,35,225,.17)');
  halo.addColorStop(.7, 'rgba(73,38,181,.09)');
  halo.addColorStop(1, 'rgba(73,38,181,0)');
  context.fillStyle = halo;
  ellipse(cx, cy, 385, 385);
  context.fill();

  const sphere = context.createRadialGradient(365, 300, 30, 450, 460, 285);
  sphere.addColorStop(0, '#3954aa');
  sphere.addColorStop(.28, '#172c68');
  sphere.addColorStop(.62, '#11143d');
  sphere.addColorStop(.91, '#080c21');
  sphere.addColorStop(1, '#5a2fbb');
  context.fillStyle = sphere;
  ellipse(cx, cy, 255, 255);
  context.fill();
  context.save();
  ellipse(cx, cy, 251, 251);
  context.clip();

  for (let index = 0; index < 7; index++) {
    context.beginPath();
    const phase = time * (state === 'thinking' ? 1.6 : .55) + index * 1.37;
    for (let point = 0; point <= 120; point++) {
      const angle = point / 120 * TAU;
      const radius = 105 + 38 * Math.sin(angle * 3 + phase + index);
      const x = cx + Math.cos(angle) * radius + 48 * Math.sin(phase * .5 + index);
      const y = cy + Math.sin(angle) * radius * .86 + 38 * Math.cos(phase * .6 + index);
      if (point) context.lineTo(x, y);
      else context.moveTo(x, y);
    }
    context.strokeStyle = index % 2 ? 'rgba(52,214,255,.16)' : 'rgba(159,82,255,.19)';
    context.lineWidth = 9 + index % 3 * 4;
    context.shadowBlur = 24;
    context.shadowColor = '#2d9aff';
    context.stroke();
  }

  for (let index = 0; index < 115; index++) {
    const angle = index * 2.39996;
    const radius = 230 * Math.sqrt((index + .5) / 115);
    const x = cx + radius * Math.cos(angle + .12 * time);
    const y = cy + radius * Math.sin(angle + .12 * time);
    context.beginPath();
    context.arc(x, y, index % 7 === 0 ? 2.1 : 1.1, 0, TAU);
    context.fillStyle = index % 3 === 0 ? 'rgba(169,111,255,.6)' : 'rgba(68,220,255,.55)';
    context.fill();
  }
  context.restore();
  context.strokeStyle = 'rgba(139,108,255,.8)';
  context.lineWidth = 3;
  ellipse(cx, cy, 254, 254);
  context.stroke();

  for (let ring = 0; ring < 2; ring++) {
    const angle = (ring ? -.66 : .7) + .12 * Math.sin(time * .35 + ring);
    context.save();
    context.translate(cx, cy);
    context.rotate(angle);
    context.beginPath();
    context.ellipse(0, 0, 325, 120, 0, Math.PI, TAU);
    context.strokeStyle = ring ? 'rgba(156,101,240,.52)' : 'rgba(136,204,255,.55)';
    context.lineWidth = 15;
    context.shadowColor = ring ? '#9a4dff' : '#57caff';
    context.shadowBlur = 20;
    context.stroke();
    context.restore();
  }

  const blink = Math.pow(Math.max(0, Math.cos(time * 1.03 + 1.5)), 45);
  const eyeHeight = Math.max(2, 31 * (1 - blink));
  for (const eyeX of [376, 524]) {
    const eye = context.createRadialGradient(eyeX, 397, 3, eyeX, 397, 48);
    eye.addColorStop(0, '#ffffff');
    eye.addColorStop(.35, '#e6faff');
    eye.addColorStop(.65, '#8fe8ff');
    eye.addColorStop(1, 'rgba(40,165,255,0)');
    context.fillStyle = eye;
    ellipse(eyeX, 397, 49, eyeHeight + 17);
    context.fill();
    context.fillStyle = '#f7ffff';
    context.shadowColor = '#9efaff';
    context.shadowBlur = 26;
    ellipse(eyeX, 397, 27, eyeHeight);
    context.fill();
    context.shadowBlur = 0;
  }

  for (let ring = 0; ring < 2; ring++) {
    context.save();
    context.translate(cx, cy);
    context.rotate((ring ? -.66 : .7) + .12 * Math.sin(time * .35 + ring));
    context.beginPath();
    context.ellipse(0, 0, 325, 120, 0, 0, Math.PI);
    context.strokeStyle = ring ? 'rgba(200,178,255,.75)' : 'rgba(171,218,255,.83)';
    context.lineWidth = 15;
    context.shadowColor = '#7a5eff';
    context.shadowBlur = 12;
    context.stroke();
    context.restore();
  }

  if (state === 'listening' || state === 'responding') {
    const pulse = Math.max(amplitude, Math.abs(Math.sin(time * (state === 'responding' ? 9 : 3))) * .7);
    context.beginPath();
    context.arc(cx, cy, 273 + pulse * 18, 0, TAU);
    context.strokeStyle = `rgba(70,225,255,${.14 + pulse * .4})`;
    context.lineWidth = 3 + pulse * 3;
    context.stroke();
  }
  if (state === 'done' || state === 'error') {
    context.beginPath();
    context.arc(cx, cy, 277, 0, TAU);
    context.strokeStyle = state === 'done' ? 'rgba(75,245,166,.65)' : 'rgba(255,82,126,.75)';
    context.lineWidth = 6;
    context.stroke();
  }
  context.restore();
}

function VoiceEyesOrb({ state = 'idle', size = 340, amplitude = 0, className = '', label, decorative = false }: VoiceEyesOrbProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ state, amplitude });
  const repaint = useRef<(() => void) | null>(null);

  useEffect(() => {
    current.current = { state, amplitude: Math.min(1, Math.max(0, amplitude)) };
    repaint.current?.();
  }, [state, amplitude]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let visible = false;
    let lastPaint = 0;
    let start = performance.now();
    let lastTime = 0;
    const paint = (now: number) => {
      lastTime = motion.matches ? 0 : (now - start) / 1000;
      context.setTransform(element.width / 900, 0, 0, element.height / 900, 0, 0);
      paintEyesOrb(context, lastTime, current.current.state, current.current.amplitude);
    };
    const tick = (now: number) => {
      if (now - lastPaint >= 32) { // A single 30fps canvas loop keeps the laptop workload modest.
        paint(now);
        lastPaint = now;
      }
      frame = requestAnimationFrame(tick);
    };
    const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
    const update = () => {
      cancel();
      if (!visible || document.hidden) return;
      start = performance.now() - lastTime * 1000;
      paint(performance.now());
      if (!motion.matches) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(entries => { visible = Boolean(entries[0]?.isIntersecting); update(); });
    observer.observe(element);
    const resize = new ResizeObserver(() => {
      const physicalSize = Math.max(1, Math.min(900, Math.round(element.clientWidth * Math.min(devicePixelRatio || 1, 2))));
      element.width = physicalSize;
      element.height = physicalSize;
      update();
    });
    resize.observe(element);
    repaint.current = () => {
      if (visible && !document.hidden && motion.matches) paint(performance.now());
    };
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    return () => {
      cancel();
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
      repaint.current = null;
      context.clearRect(0, 0, 900, 900);
    };
  }, []);

  return (
    <span className={`${styles.eyesOrb} ${className}`} data-state={state} style={{ '--agenth-orb-size': `${size}px` } as CSSProperties}>
      <canvas
        ref={canvas}
        width={900}
        height={900}
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : label || `AgentH eyes orb: ${state}`}
      />
    </span>
  );
}

export default memo(VoiceEyesOrb);
export type { VoiceEyesOrbProps };
export type { OrbAnimationState as VoiceEyesState } from './orb-types';
