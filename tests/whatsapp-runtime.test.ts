import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {encrypt,decrypt} from '../src/lib/security';
const mocks=vi.hoisted(()=>({row:{} as any,contactRows:[] as any[],listeners:new Map<string,any>(),socketListeners:[] as Map<string,any>[],makeSocket:vi.fn(),pair:vi.fn(),end:vi.fn(),logout:vi.fn(),save:vi.fn(),ensure:vi.fn(),remove:vi.fn(),message:vi.fn(),contact:vi.fn(),audit:vi.fn(),sessionUpdate:vi.fn(),keysDelete:vi.fn()}));
vi.mock('@whiskeysockets/baileys',()=>({default:mocks.makeSocket,DisconnectReason:{connectionClosed:428,connectionLost:408,timedOut:408,connectionReplaced:440,loggedOut:401,badSession:500,restartRequired:515,multideviceMismatch:411,forbidden:403,unavailableService:503},Browsers:{macOS:()=>['Mac OS','Desktop','14.4.1']}}));
vi.mock('../src/lib/whatsapp-auth',()=>({databaseWhatsAppAuth:async()=>({state:{creds:{registered:false}},save:mocks.save}),sealWhatsApp:async(value:unknown)=>encrypt(value),openWhatsApp:async(value:string)=>decrypt(value)}));
vi.mock('../src/lib/whatsapp-agent',()=>({ensureWhatsAppAgent:mocks.ensure,removeWhatsAppAgent:mocks.remove,outgoingOnce:vi.fn()}));
function matchesSession(where:any):boolean {
  return Object.entries(where).every(([key,condition]:[string,any])=>{
    if(key==='OR')return condition.some(matchesSession);
    const value=mocks.row[key];
    if(condition&&typeof condition==='object'&&!(condition instanceof Date)){
      if('lt'in condition)return value!=null&&value<condition.lt;
      if('gt'in condition)return value!=null&&value>condition.gt;
    }
    return value===condition;
  });
}
vi.mock('../src/lib/db',()=>({db:{whatsAppSession:{findMany:async()=>[{...mocks.row}],findUniqueOrThrow:async()=>({...mocks.row}),findUnique:async()=>({...mocks.row}),updateMany:async({where,data}:any)=>{mocks.sessionUpdate(data,where);if(!matchesSession(where))return {count:0};Object.assign(mocks.row,data);return {count:1};},update:async({data}:any)=>Object.assign(mocks.row,data)},whatsAppKey:{deleteMany:mocks.keysDelete},whatsAppContact:{findMany:async()=>mocks.contactRows,upsert:mocks.contact,deleteMany:async()=>({count:0})},whatsAppMessage:{upsert:mocks.message,deleteMany:async()=>({count:0})},audit:{create:mocks.audit},$transaction:async(ops:any[])=>Promise.all(ops)}}));
import {syncWhatsAppSessions,stopWhatsAppSessions,rememberedContactCommand,linkedContacts} from '../src/lib/whatsapp-runtime';
beforeEach(()=>{vi.clearAllMocks();mocks.listeners.clear();mocks.socketListeners=[];mocks.contactRows=[];mocks.row={userId:'runtime-qa',state:'connecting',command:'connect',mode:'phone',owner:null,leaseUntil:null,heartbeat:null,phoneEncrypted:encrypt({phone:'15555550123'}),consent:{chats:false,incoming:false,send:false}};mocks.makeSocket.mockImplementation(()=>{const listeners=new Map<string,any>();mocks.listeners=listeners;mocks.socketListeners.push(listeners);return {ev:{on:(name:string,fn:any)=>listeners.set(name,fn)},requestPairingCode:mocks.pair,end:mocks.end,logout:mocks.logout};});mocks.pair.mockResolvedValue('TEST1234');mocks.end.mockResolvedValue(undefined);mocks.logout.mockResolvedValue(undefined);mocks.save.mockResolvedValue(undefined);mocks.ensure.mockResolvedValue({id:'managed-qa'});mocks.audit.mockResolvedValue({});mocks.keysDelete.mockResolvedValue({count:0});});afterEach(async()=>{await stopWhatsAppSessions();vi.useRealTimers();});
it('resolves saved aliases for task planning without requiring a worker-only socket',async()=>{mocks.contactRows=[{encrypted:encrypt({id:'15555550123@s.whatsapp.net',name:'Abubakar Bhaii',aliases:['Abu Bakr']})}];await expect(rememberedContactCommand('runtime-qa','Message Abu Bakr: hello')).resolves.toMatchObject({id:'15555550123@s.whatsapp.net',text:'hello'});});
it('requests a phone code only after the real socket readiness event, never creating an agent for a code',async()=>{await syncWhatsAppSessions();expect(mocks.pair).not.toHaveBeenCalled();mocks.listeners.get('connection.update')({qr:'MOCK_READINESS_EVENT'});await vi.waitFor(()=>expect(mocks.pair).toHaveBeenCalledWith('15555550123'));await vi.waitFor(()=>expect(mocks.row.state).toBe('pairing'));expect(mocks.row.pairingEncrypted).not.toContain('TEST1234');expect(decrypt<{code:string}>(mocks.row.pairingEncrypted).code).toBe('TEST1234');expect(mocks.ensure).not.toHaveBeenCalled();});
it('creates the sole dedicated agent only on verified socket open',async()=>{await syncWhatsAppSessions();mocks.listeners.get('connection.update')({connection:'open'});await vi.waitFor(()=>expect(mocks.ensure).toHaveBeenCalledWith('runtime-qa','whatsapp-linked'));expect(mocks.row.state).toBe('connected');expect(mocks.row.qrEncrypted).toBeNull();});
it('does not persist incoming messages without read consent',async()=>{await syncWhatsAppSessions();mocks.listeners.get('messages.upsert')({type:'notify',messages:[{key:{id:'m1',remoteJid:'15555550123@s.whatsapp.net'},message:{conversation:'private test message'}}]});await new Promise(resolve=>setTimeout(resolve,10));expect(mocks.message).not.toHaveBeenCalled();});
it('stores only consented bootstrap contacts and never imports history messages',async()=>{await syncWhatsAppSessions();const event={contacts:[{id:'15555550123@s.whatsapp.net',name:'Ali'}],messages:[{key:{id:'old-private'},message:{conversation:'Do not import'}}]};mocks.listeners.get('messaging-history.set')(event);await new Promise(resolve=>setTimeout(resolve,10));expect(mocks.contact).not.toHaveBeenCalled();mocks.row.consent.chats=true;mocks.listeners.get('messaging-history.set')(event);await vi.waitFor(()=>expect(mocks.contact).toHaveBeenCalledTimes(1));expect(mocks.contact.mock.calls[0][0].create.encrypted).not.toContain('Ali');expect(mocks.message).not.toHaveBeenCalled();});
it('logs out and revokes the managed agent on explicit disconnect',async()=>{await syncWhatsAppSessions();mocks.row.command='disconnect';await syncWhatsAppSessions();expect(mocks.logout).toHaveBeenCalledTimes(1);expect(mocks.remove).toHaveBeenCalledWith('runtime-qa');expect(mocks.row.credsEncrypted).toBeNull();expect(mocks.row.state).toBe('disconnected');});

it('keeps one reconnect attempt and does not let maintenance bypass backoff',async()=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.row.credsEncrypted='sealed-unregistered-credentials';
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnecting'));
  await syncWhatsAppSessions();
  await syncWhatsAppSessions();
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(900);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(100);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(2);
  expect(mocks.ensure).not.toHaveBeenCalled();
});

it('restarts after the pairing restart signal without enabling an agent prematurely',async()=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:515}}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnecting'));
  await vi.advanceTimersByTimeAsync(1000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(2);
  expect(mocks.ensure).not.toHaveBeenCalled();
  mocks.listeners.get('connection.update')({connection:'open'});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('connected'));
  expect(mocks.ensure).toHaveBeenCalledTimes(1);
});

it('clears a scheduled reconnect when the owner disconnects',async()=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:408}}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnecting'));
  mocks.row.command='disconnect';
  await syncWhatsAppSessions();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  expect(mocks.row.state).toBe('disconnected');
});

it('stops transient retries after the bounded reconnect budget instead of resetting it on each maintenance tick',async()=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.row.credsEncrypted='sealed-unregistered-credentials';
  for(let retry=0;retry<5;retry++){
    mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});
    await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnecting'));
    await syncWhatsAppSessions();
    await vi.advanceTimersByTimeAsync(1000*2**retry);
    expect(mocks.makeSocket).toHaveBeenCalledTimes(retry+2);
  }
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnect_required'));
  await syncWhatsAppSessions();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(6);
  expect(mocks.row.error).toContain('code 428');
});

it('worker shutdown cancels pending reconnects instead of leaving a timer that opens a new socket',async()=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:428}}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnecting'));
  await stopWhatsAppSessions();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  expect(mocks.row.owner).toBeNull();
  expect(mocks.logout).not.toHaveBeenCalled();
});

it('ignores obsolete socket events after Refresh QR starts a replacement socket',async()=>{
  await syncWhatsAppSessions();
  const obsolete=mocks.listeners.get('connection.update');
  mocks.row.command='connect';
  await syncWhatsAppSessions();
  expect(mocks.makeSocket).toHaveBeenCalledTimes(2);
  obsolete({connection:'close',lastDisconnect:{error:{output:{statusCode:401}}}});
  mocks.listeners.get('connection.update')({qr:'CURRENT_READINESS'});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('pairing'));
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.keysDelete).not.toHaveBeenCalled();
});

it('does not take over another live lease because its heartbeat is eleven seconds old',async()=>{
  mocks.row.owner='another-live-worker';
  mocks.row.leaseUntil=new Date(Date.now()+20_000);
  mocks.row.heartbeat=new Date(Date.now()-11_000);
  await syncWhatsAppSessions();
  expect(mocks.makeSocket).not.toHaveBeenCalled();
  expect(mocks.row.owner).toBe('another-live-worker');
});

it('closes the local socket without logout when another worker owns the live lease',async()=>{
  await syncWhatsAppSessions();
  mocks.row.owner='replacement-worker';
  mocks.row.leaseUntil=new Date(Date.now()+20_000);
  mocks.row.state='connected';
  await syncWhatsAppSessions();
  expect(mocks.end).toHaveBeenCalledTimes(1);
  expect(mocks.logout).not.toHaveBeenCalled();
  expect(mocks.row.owner).toBe('replacement-worker');
  expect(mocks.row.state).toBe('connected');
});

it.each([403,405,440])('surfaces terminal WhatsApp code %s without retrying or erasing credentials',async code=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.row.credsEncrypted='existing-sealed-credentials';
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:code},message:'must not leak session data'}}});
  await vi.waitFor(()=>expect(mocks.row.state).toBe('reconnect_required'));
  await vi.advanceTimersByTimeAsync(30_000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  expect(mocks.row.error).toContain(`code ${code}`);
  expect(mocks.row.credsEncrypted).toBe('existing-sealed-credentials');
  expect(mocks.keysDelete).not.toHaveBeenCalled();
  expect(mocks.audit).toHaveBeenCalledWith({data:expect.objectContaining({action:'whatsapp.linked.connection_closed',detail:JSON.stringify({code,registered:false,retry:false,attempt:1})})});
});

it.each([401,500,411])('revokes invalid auth for WhatsApp code %s without automatic relinking',async code=>{
  vi.useFakeTimers();
  await syncWhatsAppSessions();
  mocks.row.credsEncrypted='invalid-sealed-credentials';
  mocks.listeners.get('connection.update')({connection:'close',lastDisconnect:{error:{output:{statusCode:code}}}});
  await vi.waitFor(()=>expect(mocks.remove).toHaveBeenCalledWith('runtime-qa'));
  await vi.advanceTimersByTimeAsync(30_000);
  expect(mocks.makeSocket).toHaveBeenCalledTimes(1);
  expect(mocks.keysDelete).toHaveBeenCalledWith({where:{userId:'runtime-qa'}});
  expect(mocks.row.credsEncrypted).toBeNull();
  expect(mocks.row.state).toBe('reconnect_required');
});

it('searches linked, consented contacts from encrypted storage without requiring an API-process socket',async()=>{
  mocks.row={...mocks.row,state:'connected',command:null,heartbeat:new Date(),leaseUntil:new Date(Date.now()+20_000),consent:{chats:true,incoming:false,send:false}};
  mocks.contactRows=[{encrypted:encrypt({id:'15555550123@s.whatsapp.net',name:'Ali Raza',aliases:['Ali Bhai'],kind:'direct'})}];
  const result=await linkedContacts('runtime-qa','Ali');
  expect(result.contacts).toHaveLength(1);
  expect(result.contacts[0].name).toBe('Ali Raza');
  expect(result.source).toContain('Permitted WhatsApp');
  expect(mocks.makeSocket).not.toHaveBeenCalled();
});
it('never exposes contacts when consent is missing or the connection heartbeat is stale',async()=>{
  mocks.row={...mocks.row,state:'connected',command:null,heartbeat:new Date(),leaseUntil:new Date(Date.now()+20_000),consent:{chats:false}};
  mocks.contactRows=[{encrypted:encrypt({id:'15555550123@s.whatsapp.net',name:'Private Example',kind:'direct'})}];
  await expect(linkedContacts('runtime-qa','Private')).rejects.toThrow('Chats & contacts');
  mocks.row.consent.chats=true;
  mocks.row.heartbeat=new Date(Date.now()-60_000);
  await expect(linkedContacts('runtime-qa','Private')).rejects.toThrow('reconnecting');
  expect(mocks.makeSocket).not.toHaveBeenCalled();
});
