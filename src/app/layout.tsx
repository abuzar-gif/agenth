import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import '@/styles/ai-orb.css';
import '@/styles/product.css';
import '@/styles/orb-theme.css';
import '@/styles/dashboard.css';
import '@/styles/reference-auth.css';
import '@/styles/reference-workspace.css';
import '@/styles/reference-motion.css';
import '@/styles/reference-media.css';
import '@/styles/reference-scale.css';
import '@/styles/reference-modal.css';
import '@/components/agents/agent-builder.css';
import '@/styles/agent-avatar-overrides.css';
import '@/styles/agent-editor.css';
import OrbProvider from '@/components/ai/OrbProvider';
import VoicePlayback from '@/components/ai/VoicePlayback';
import InstallWebApp from '@/components/InstallWebApp';
export const metadata:Metadata={title:'AgentH — Your AI workspace',description:'A multilingual AI agent workspace with real tools, approvals, and activity history.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body suppressHydrationWarning><Script id="extension-hydration-cleanup" strategy="beforeInteractive">{`(()=>{const clean=root=>{if(!root||root.nodeType!==1)return;for(const attribute of [...root.attributes||[]])if(attribute.name.startsWith('bis_')||attribute.name.startsWith('__processed_'))root.removeAttribute(attribute.name);if(root.classList?.contains('mtz-vlc-pjdbe'))root.classList.remove('mtz-vlc-pjdbe')};const cleanTree=root=>{clean(root);root?.querySelectorAll?.('[bis_skin_checked],[bis_register],[class*=mtz-vlc-pjdbe]').forEach(clean)};cleanTree(document.documentElement);new MutationObserver(records=>records.forEach(record=>{if(record.type==='attributes')clean(record.target);record.addedNodes.forEach(cleanTree)})).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['bis_skin_checked','bis_register','class']})})()`}</Script><OrbProvider>{children}<VoicePlayback/><InstallWebApp/></OrbProvider></body></html>;}


