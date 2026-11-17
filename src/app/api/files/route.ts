import { api } from '@/lib/api';
import { runtimePath } from '@/lib/browser';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
export const POST=(r:Request)=>api(r,async userId=>{
  if(Number(r.headers.get('content-length')||0)>11000000)throw new Error('Maximum upload size: 10 MB.');
  const file=(await r.formData()).get('file');if(!(file instanceof File)||file.size>10000000||!file.size)throw new Error('Select a file under 10 MB.');
  const id=crypto.randomUUID();await mkdir(runtimePath(userId),{recursive:true});await writeFile(runtimePath(userId,id),Buffer.from(await file.arrayBuffer()));
  return Response.json({id,name:file.name,size:file.size});
});
export const GET=(r:Request)=>api(r,async userId=>{
  const id=new URL(r.url).searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('File not found');
  return new Response(await readFile(runtimePath(userId,id)),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${id}"`,'Cache-Control':'no-store'}});
});
