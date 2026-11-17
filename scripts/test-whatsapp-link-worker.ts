// Isolated live QR smoke test. The existing worker owns the socket;
// this script never imports the runtime or touches another user's session.
import '../src/lib/load-worker-env';
import { db } from '../src/lib/db';

async function main() {
  const user = await db.user.create({ data: { email: `link-smoke-${crypto.randomUUID()}@example.test`, name: 'Isolated WhatsApp QR QA' } });
  try {
    await db.whatsAppSession.create({ data: { userId: user.id, mode: 'qr', command: 'connect', state: 'connecting', consent: { draft: true, chats: false, incoming: false, history: false, send: false, automatic: false } } });
    const deadline = Date.now() + 75_000;
    let prior = '', firstQrAt = 0;
    while (Date.now() < deadline) {
      const row = await db.whatsAppSession.findUniqueOrThrow({ where: { userId: user.id }, select: { state: true, error: true, qrEncrypted: true, expiresAt: true } });
      if (row.state !== prior) { console.log(JSON.stringify({ state: row.state, hasQr: Boolean(row.qrEncrypted), error: row.error })); prior = row.state; }
      if (row.state === 'qr' && row.qrEncrypted && row.expiresAt && row.expiresAt > new Date()) {
        if (!firstQrAt) firstQrAt = Date.now();
        if (Date.now() - firstQrAt >= 15_000) {
          console.log(JSON.stringify({ realQrGenerated: true, remainedAvailableSeconds: 15, agentCount: await db.agent.count({ where: { userId: user.id, connector: 'whatsapp' } }), paired: false, messageSent: false }));
          return;
        }
      }
      else firstQrAt = 0;
      if (['error', 'reconnect_required'].includes(row.state)) {
        const audits = await db.audit.findMany({ where: { userId: user.id, action: 'whatsapp.linked.connection_closed' }, select: { detail: true }, orderBy: { createdAt: 'desc' }, take: 6 });
        console.log(JSON.stringify({ disconnects: audits.map(audit => audit.detail ? JSON.parse(audit.detail) : null) }));
        throw new Error(row.error || 'QR linking failed.');
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    throw new Error('The existing worker did not produce a live QR within 75 seconds.');
  } finally {
    await db.whatsAppSession.updateMany({ where: { userId: user.id }, data: { command: 'disconnect', state: 'disconnecting' } });
    const deadline = Date.now() + 12_000;
    while (Date.now() < deadline) {
      const row = await db.whatsAppSession.findUnique({ where: { userId: user.id }, select: { state: true } });
      if (!row || row.state === 'disconnected') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await db.user.deleteMany({ where: { id: user.id, name: 'Isolated WhatsApp QR QA' } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'QR check failed.'); process.exitCode = 1; });
