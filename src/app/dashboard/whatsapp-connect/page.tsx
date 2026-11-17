import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import WhatsAppConnectorWorkspace from './workspace';

export default async function WhatsAppConnectPage({ searchParams }: { searchParams: Promise<{ view?: string; embed?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const query = await searchParams;
  return <WhatsAppConnectorWorkspace initialTab={query.view === 'agent' ? 'agent' : query.view === 'live' ? 'live' : 'connection'} embedded={query.embed === 'chat'} />;
}
