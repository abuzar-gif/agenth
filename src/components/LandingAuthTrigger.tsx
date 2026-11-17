'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import LoginForm from '@/app/login/form';

type LandingAuthTriggerProps = {
  children: ReactNode;
  className: string;
  google: boolean;
  signup?: boolean;
};

/**
 * Render the authentication dialog at the document root, outside the landing
 * hero's animation/transform stacking context. Otherwise the media preview
 * can appear above the modal and intercept sign-in / sign-up button clicks.
 */
export default function LandingAuthTrigger({
  children,
  className,
  google,
  signup = false,
}: LandingAuthTriggerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`reference-auth-trigger ${className}`}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="reference-auth-modal"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={signup ? 'Create an account' : 'Sign in'}
            onMouseDown={event => event.stopPropagation()}
          >
            <LoginForm
              google={google}
              emailLink={false}
              signup={signup}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
