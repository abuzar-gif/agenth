import {readFile} from 'node:fs/promises';

/** Recent heartbeat means the background runner can process linking commands. */
export async function workerOnline(maxAgeMs=20_000):Promise<boolean>{
 try{const value=Number((await readFile('.runtime/worker-heartbeat','utf8')).trim());return Number.isFinite(value)&&value>0&&Date.now()-value>=0&&Date.now()-value<maxAgeMs;}
 catch{return false;}
}
