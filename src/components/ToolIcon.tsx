import type { SVGProps } from 'react';

type Props = { provider: string; size?: number };

// Local vector service marks. Brand colors remain distinct from AgentH's UI accent.
export default function ToolIcon({ provider, size = 22 }: Props) {
  const common: SVGProps<SVGSVGElement> = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    'aria-hidden': true, focusable: false,
  };
  if (provider.includes('whatsapp')) return (
    <svg {...common} className="tool-icon tool-icon-whatsapp">
      <path fill="#25D366" d="M12 1.8a10.1 10.1 0 0 0-8.75 15.14L1.8 22.2l5.39-1.41A10.2 10.2 0 1 0 12 1.8Z" />
      <path fill="#fff" d="M12 3.5a8.5 8.5 0 0 0-7.26 12.9l.2.32-.86 3.15 3.23-.85.31.19A8.5 8.5 0 1 0 12 3.5Zm0 1.45a7.05 7.05 0 1 1-3.6 13.11l-.53-.31-1.98.52.53-1.93-.35-.55A7.04 7.04 0 0 1 12 4.95Z" />
      <path fill="#fff" d="M9.22 7.65c-.17-.4-.36-.41-.53-.42h-.45c-.16 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.21.94 2.37c.11.15 1.6 2.46 3.9 3.44 1.92.82 2.31.65 2.73.61.41-.04 1.33-.54 1.52-1.07.19-.52.19-.97.13-1.07-.06-.09-.21-.15-.44-.27l-1.5-.71c-.2-.08-.35-.12-.5.11l-.72.88c-.14.16-.27.18-.5.06-.23-.11-.97-.36-1.84-1.14-.68-.61-1.14-1.36-1.27-1.59-.13-.23-.01-.35.1-.47l.35-.41.23-.39c.08-.15.04-.29-.02-.4l-.72-1.72Z" />
    </svg>
  );
  if (provider === 'gmail') return (
    <svg {...common} className="tool-icon tool-icon-gmail" viewBox="0 0 24 20">
      <path fill="#4285F4" d="M1 4.1 5 7.2V19H2a1 1 0 0 1-1-1V4.1Z" />
      <path fill="#34A853" d="m19 7.2 4-3.1V18a1 1 0 0 1-1 1h-3V7.2Z" />
      <path fill="#EA4335" d="m5 3.2 7 5.4 7-5.4v4.9l-7 5.4-7-5.4V3.2Z" />
      <path fill="#C5221F" d="M1 4.1V2.6A1.6 1.6 0 0 1 3.6 1.3L5 2.4v5.7L1 5Z" />
      <path fill="#FBBC04" d="m19 2.4 1.4-1.1A1.6 1.6 0 0 1 23 2.6V5l-4 3.1V2.4Z" />
    </svg>
  );
  if (provider === 'calendar') return (
    <svg {...common} className="tool-icon tool-icon-calendar">
      <path fill="#4285F4" d="M3 2h18v15l-6 5H3V2Z" />
      <path fill="#fff" d="M6 6h12v12H6V6Z" />
      <path fill="#1A73E8" d="M3 6h3v12H3V6Z" /><path fill="#EA4335" d="M6 2h12v4H6V2Z" />
      <path fill="#FBBC04" d="M18 6h3v11l-3 1V6Z" /><path fill="#34A853" d="M6 18h12l-3 4H6v-4Z" />
      <path fill="#188038" d="M15 22v-5h6l-6 5Z" />
      <path stroke="#4285F4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" d="M8.1 9.2c1.8-1.2 3.6.7 1.8 2.1 2 .3 1.7 3.1-.6 3.1-.6 0-1-.2-1.4-.5M13.3 10.1l1.5-1.1v5.4" />
    </svg>
  );
  if (provider === 'contacts') return (
    <svg {...common} className="tool-icon tool-icon-contacts">
      <path fill="#1A73E8" d="M4 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4V2Z" />
      <path fill="#4285F4" d="M4 2h3v20H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <circle cx="12.6" cy="9" r="3" fill="#fff" /><path fill="#fff" d="M7.5 18a5.1 5.1 0 0 1 10.2 0H7.5Z" />
      <path stroke="#8AB4F8" strokeWidth="1.5" strokeLinecap="round" d="M1.7 7H4M1.7 12H4M1.7 17H4" />
    </svg>
  );
  return <svg {...common} className="tool-icon"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".18" /><path d="M8 9.5a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0v-5Z" stroke="currentColor" strokeWidth="1.8" /></svg>;
}
