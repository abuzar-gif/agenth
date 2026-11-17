import { api } from '@/lib/api';
import { linkedContacts } from '@/lib/whatsapp-runtime';
import { z } from 'zod';

/**
 * On-demand, owner-scoped contact search. No bulk address-book downloads.
 * The underlying connector enforces both a live linked session and chats consent.
 */
export const GET = (request: Request) => api(request, async userId => {
  const query = z.string().trim().min(2, 'Enter at least two characters.').max(80)
    .parse(new URL(request.url).searchParams.get('q') || '');
  const result = await linkedContacts(userId, query);
  return Response.json({
    contacts: result.contacts.map(contact => ({ id: contact.id, name: contact.name })),
    count: result.contacts.length,
    requiresClarification: result.requiresClarification,
    source: result.source,
  }, { headers: { 'Cache-Control': 'no-store' } });
});
