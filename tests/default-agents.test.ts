import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock('../src/lib/db', () => ({ db: { agent: { upsert: mocks.upsert } } }));

import { ensureWhatsAppManager } from '../src/lib/default-agents';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('default WhatsApp Manager', () => {
  it('uses the owner-and-connector key so repeated checks reuse one manager', async () => {
    const manager = { id: 'manager-1', name: 'WhatsApp Manager' };
    mocks.upsert.mockResolvedValue(manager);

    await expect(ensureWhatsAppManager('user-1')).resolves.toBe(manager);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { userId_connector: { userId: 'user-1', connector: 'whatsapp' } },
      create: expect.objectContaining({
        userId: 'user-1',
        name: 'WhatsApp Manager',
        connector: 'whatsapp',
        permissions: ['report'],
      }),
      update: {},
    });
  });
});
