import {readFile,writeFile} from 'node:fs/promises';
const reservation=JSON.parse(await readFile('.recent/reservation.json','utf8'));
const runId=process.env.GITHUB_RUN_ID;
if(reservation.runId!==runId||!/^[a-f0-9]{64}$/.test(reservation.sourceToken||''))throw new Error('Missing private preview reservation');
const sources=['cnsa-policy','hainan-spaceport-project-approvals'].slice(0,reservation.budget);
let requests=0;
for(const source of sources){
 requests++;
 await writeFile('.recent/usage.json',JSON.stringify({runId,requests}));
 try{
   const url=new URL('https://recent-aggregation-preview.space-intel.pages.dev/recent/source-fetch');url.searchParams.set('source',source);
   const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20_000),headers:{Authorization:`Bearer ${reservation.sourceToken}`,Accept:'text/html, application/xhtml+xml'}});
   const text=await response.text();
   console.log(JSON.stringify({sourceProbe:source,status:response.status,transport:response.headers.get('X-Recent-Source-Transport'),bytes:Buffer.byteLength(text),title:text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim().slice(0,100)}));
 }catch(error){console.log(JSON.stringify({sourceProbe:source,status:'unreachable',code:error.cause?.code||error.name}));}
}
const snapshot=JSON.parse(await readFile('public/recent/current.json','utf8'));
snapshot.sources=snapshot.sources.map(source=>({...source,skipped:true}));
await writeFile('public/recent/current.json',JSON.stringify(snapshot));
await writeFile('.recent/run-summary.json',JSON.stringify({requests,successful:0}));
console.log(JSON.stringify({sourceProbeRequests:requests,articleSnapshotChanged:false}));
