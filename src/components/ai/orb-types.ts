export type OrbAnimationState = 'idle' | 'listening' | 'thinking' | 'responding' | 'done' | 'error';

export type AnimatedOrbProps = {
  state?: OrbAnimationState;
  size?: number;
  className?: string;
  label?: string;
  decorative?: boolean;
};
