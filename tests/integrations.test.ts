import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({findMany:vi.fn(),findUnique:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:{connector:mocks}}));
import {integrationRegistry,assertWhatsAppPermission} from '../src/lib/integrations';
beforeEach(()=>vi.clearAllMocks());
describe('per-user integration permissions',()=>{
 it('queries only the authenticated owner and exports no secrets',async()=>{mocks.findMany.mockResolvedValue([{id:'c',provider:'whatsapp-business',updatedAt:new Date(),metadata:{consent:{chats:true,incoming:true,send:false,draft:true,automatic:false},health:'verified'}}]);const result=await integrationRegistry('owner-a');expect(mocks.findMany.mock.calls[0][0].where).toEqual({userId:'owner-a'});expect(result[0].tools).toEqual(['whatsapp.messages','whatsapp.contacts']);expect(result[0]).not.toHaveProperty('encrypted');});
 it('does not grandfather consent onto old connections',async()=>{mocks.findMany.mockResolvedValue([{id:'old',provider:'whatsapp-business',metadata:{id:'123'}}]);expect((await integrationRegistry('a'))[0]).toMatchObject({state:'consent_required',tools:[]});});
 it('enforces send consent on the backend',async()=>{mocks.findUnique.mockResolvedValue({metadata:{consent:{send:false}}});await expect(assertWhatsAppPermission('a','send')).rejects.toThrow('permission not granted');expect(mocks.findUnique.mock.calls[0][0].where.userId_provider.userId).toBe('a');});
 it('blocks expired sessions despite prior consent',async()=>{mocks.findUnique.mockResolvedValue({metadata:{consent:{send:true},health:'expired'}});await expect(assertWhatsAppPermission('a','send')).rejects.toThrow('expired');});
 it('requires conversation and incoming consent together',async()=>{mocks.findUnique.mockResolvedValue({metadata:{consent:{incoming:true,chats:false}}});await expect(assertWhatsAppPermission('a','incoming')).rejects.toThrow('permission not granted');});
});
