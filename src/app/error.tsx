'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className="signature-loading"><h1>Something needs attention.</h1><p>Please retry. If the problem continues, check the local database and worker.</p><button onClick={reset}>Try again</button></main>;}
