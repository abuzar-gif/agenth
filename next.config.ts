import type { NextConfig } from 'next';
const config: NextConfig = { outputFileTracingRoot:process.cwd(),outputFileTracingExcludes:{'*':['./.runtime/**/*','./test-results/**/*','./playwright-report/**/*','./speech/**/*']},turbopack:{root:process.cwd()},serverExternalPackages: ['playwright', 'pg-boss','@whiskeysockets/baileys','qrcode','pino'], poweredByHeader: false, async headers() { return [
  { source: '/(.*)', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'X-Frame-Options',value:'DENY'}] },
  { source: '/reference/agenth-dashboard.html', headers: [{key:'X-Frame-Options',value:'SAMEORIGIN'}] },
  { source: '/reference/agenth-live.html', headers: [{key:'X-Frame-Options',value:'SAMEORIGIN'}] },
  { source: '/dashboard/whatsapp-connect', headers: [{key:'X-Frame-Options',value:'SAMEORIGIN'}] },
  { source: '/dashboard/studio', headers: [{key:'X-Frame-Options',value:'SAMEORIGIN'}] },
]; } };
export default config;

