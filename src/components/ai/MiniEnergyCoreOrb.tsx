'use client';

import { memo, useEffect, useRef, type CSSProperties } from 'react';
import type { AnimatedOrbProps } from './orb-types';
import styles from './dual-orbs.module.css';

// Port of the supplied chatorbcircle.html: the same shell, rings, energy and sparks.
function MiniEnergyCoreOrb({ state = 'idle', size = 48, className = '', label, decorative = false }: AnimatedOrbProps) {
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const orb = element.current;
    if (!orb) return;
    let visible = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { orb.dataset.animating = String(visible && !document.hidden && !motion.matches); };
    const observer = new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
      update();
    });
    observer.observe(orb);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
    };
  }, []);

  return (
    <span
      ref={element}
      className={`${styles.energyOrb} ${className}`}
      style={{ '--agenth-orb-size': `${size}px` } as CSSProperties}
      data-state={state}
      data-animating="false"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label || `AgentH energy core: ${state}`}
    >
      <span className={styles.halo} />
      <span className={styles.ring} />
      <span className={`${styles.ring} ${styles.ringTwo}`} />
      <span className={styles.shell}>
        <span className={styles.energy} />
        <span className={`${styles.energy} ${styles.energySecond}`} />
      </span>
      <span className={`${styles.spark} ${styles.sparkA}`} />
      <span className={`${styles.spark} ${styles.sparkB}`} />
      <span className={`${styles.spark} ${styles.sparkC}`} />
    </span>
  );
}

export default memo(MiniEnergyCoreOrb);
export type { OrbAnimationState as EnergyCoreState } from './orb-types';
