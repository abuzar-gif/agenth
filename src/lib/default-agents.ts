import { db } from '@/lib/db';

export const whatsAppManagerDefaults = {
  name: 'WhatsApp Manager',
  role: 'Manage your WhatsApp connection and approved tasks.',
  permissions: ['report'],
  connector: 'whatsapp',
  provider: null,
  template: 'whatsapp-manager',
  avatarColor: 'orange',
  avatarShape: 'squircle',
  description: 'Your dedicated WhatsApp manager. Connect WhatsApp before using it.',
  systemInstructions: 'This is the owner’s dedicated WhatsApp manager. Do not send messages without explicit review and approval.',
  memoryEnabled: false,
  approvalRequired: true,
  status: 'ready',
};

export function ensureWhatsAppManager(userId: string) {
  return db.agent.upsert({
    where: { userId_connector: { userId, connector: 'whatsapp' } },
    create: { userId, ...whatsAppManagerDefaults },
    update: {},
  });
}
