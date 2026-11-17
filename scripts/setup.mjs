import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
if(!existsSync('.env')){
  const password=randomBytes(24).toString('hex');
  let env=readFileSync('.env.example','utf8').replaceAll('CHANGE_ME',password);
  env=env.replace('AUTH_SECRET=','AUTH_SECRET='+randomBytes(32).toString('base64url')).replace('TOKEN_ENCRYPTION_KEY=','TOKEN_ENCRYPTION_KEY='+randomBytes(32).toString('hex')).replace('LOCAL_SPEECH_TOKEN=','LOCAL_SPEECH_TOKEN='+randomBytes(32).toString('hex'));
  writeFileSync('.env',env+'\nBROWSER_HEADLESS=true\n');
  console.log('Created .env with random secrets. Existing files are never overwritten.');
}else console.log('.env already exists; preserved.');
mkdirSync('.runtime',{recursive:true});
let current=readFileSync('.env','utf8');
if(!/^AGENTH_RUNTIME_DIR=.+$/m.test(current)){current=current.replace(/^AGENTH_RUNTIME_DIR=.*$/m,'');current+='\nAGENTH_RUNTIME_DIR='+path.resolve('.runtime')+'\n';writeFileSync('.env',current);}
