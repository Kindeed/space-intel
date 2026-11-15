import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {rmSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {controlSchema,reserveBudget,releaseUnused,type PreviewControl} from '../src/recent/scheduler';
import {recentSnapshotSchema} from '../src/recent/types';
import {isRecentDate} from '../src/recent/snapshot';
import {discoveryStateSchema} from '../src/recent/discovery';

const prefix='space-intel-assets/recent/preview/v1/';
const wrangler=resolve('node_modules/wrangler/bin/wrangler.js');
const runId=process.env.GITHUB_RUN_ID||`local-${Date.now()}`;
const operation=process.argv.includes('prepare')?'prepare':process.argv.includes('publish')?'publish':process.argv.includes('finalize')?'finalize':null;
if(!operation)throw new Error('Expected prepare, publish or finalize');
await mkdir('.recent',{recursive:true});await mkdir('public/recent',{recursive:true});
function remote(kind:'get'|'put',key:string,file:string,missing=false):boolean{
  if(!['control.json','current.json','previous.json','discovery.json'].includes(key))throw new Error('Object is outside preview scope');
  const result=spawnSync(process.execPath,[wrangler,'r2','object',kind,`${prefix}${key}`,'--file',file,'--remote','--config','wrangler.preview.toml'],{encoding:'utf8',maxBuffer:2*1024*1024,windowsHide:true});
  if(result.status===0)return true;
  const message=`${result.stdout||''}\n${result.stderr||''}`;
  if(missing && /(?:specified key does not exist|NoSuchKey|object.*not found|key.*does not exist)/i.test(message)){
    // Wrangler may create an empty destination before it reports a missing key.
    // Remove only this task's incomplete local download, never a published object.
    rmSync(file,{force:true});
    return false;
  }
  const token=process.env.CLOUDFLARE_API_TOKEN;
  throw new Error((token?message.replaceAll(token,'[redacted]'):message).slice(-2500));
}
if(operation==='prepare'){
  let control:PreviewControl|undefined;
  if(remote('get','control.json','.recent/control.json',true))control=controlSchema.parse(JSON.parse(await readFile('.recent/control.json','utf8')));
  const reservation=reserveBudget(control,new Date(),runId);
  // Persist only a digest. The asset bucket's public-access setting must not
  // determine whether a source transport credential stays private.
  const sourceToken=randomBytes(32).toString('hex');
  reservation.control.sourceTokenHash=createHash('sha256').update(sourceToken).digest('hex');
  await writeFile('.recent/control.json',JSON.stringify(reservation.control));
  remote('put','control.json','.recent/control.json');
  await writeFile('.recent/reservation.json',JSON.stringify({runId,budget:reservation.budget,day:reservation.control.day,sourceToken}));
  await writeFile('.recent/usage.json',JSON.stringify({runId,requests:0}));
  if(remote('get','current.json','.recent/previous.json',true)){
    const previous=recentSnapshotSchema.parse(JSON.parse(await readFile('.recent/previous.json','utf8')));
    await writeFile('public/recent/current.json',JSON.stringify(previous));
  }
  remote('get','discovery.json','.recent/discovery.json',true);
  console.log(JSON.stringify({previewBudget:reservation.budget,runId,prefix:'recent/preview/v1/'}));
}else if(operation==='publish'){
  try{
    const discovery=discoveryStateSchema.parse(JSON.parse(await readFile('.recent/discovery.json','utf8')));
    if(Buffer.byteLength(JSON.stringify(discovery))>256*1024)throw new Error('Discovery state exceeds limit');
    await writeFile('.recent/discovery.json',JSON.stringify(discovery));remote('put','discovery.json','.recent/discovery.json');
  }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const current=recentSnapshotSchema.parse(JSON.parse(await readFile('public/recent/current.json','utf8')));
  const summary=JSON.parse(await readFile('.recent/run-summary.json','utf8')) as {requests:number;successful:number};
    // An all-failed run cannot replace the published last-good data.
    const healthy=current.sources.some(source=>source.selected&&!source.skipped&&source.status==='ok');
    if(healthy){
      try{
        const previous=recentSnapshotSchema.parse(JSON.parse(await readFile('.recent/previous.json','utf8')));
        previous.items=previous.items.filter(item=>isRecentDate(item.publishedAt,new Date()));
        previous.coverageStart=previous.items.at(-1)?.publishedAt??null;
        await writeFile('.recent/previous.json',JSON.stringify(previous));remote('put','previous.json','.recent/previous.json');
      }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
      remote('put','current.json','public/recent/current.json');
      console.log(JSON.stringify({published:true,items:current.items.length,sources:current.sources.filter(source=>source.selected).length,requests:summary.requests}));
    }else console.log(JSON.stringify({published:false,reason:'No healthy sources completed; retained last-good snapshot',requests:summary.requests}));
}else{
  let reservation:{runId:string;budget:number};
  try{reservation=JSON.parse(await readFile('.recent/reservation.json','utf8'));}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){console.log('No reservation was created.');process.exit(0);}throw error;}
  if(reservation.runId!==runId)throw new Error('Reservation identity mismatch');
  const control=controlSchema.parse(JSON.parse(await readFile('.recent/control.json','utf8')));
  const usage=JSON.parse(await readFile('.recent/usage.json','utf8')) as {runId:string;requests:number};
  if(usage.runId!==runId)throw new Error('Usage identity mismatch');
  const completed=releaseUnused(control,runId,reservation.budget,usage.requests);
  await writeFile('.recent/control.json',JSON.stringify(completed));remote('put','control.json','.recent/control.json');
  console.log(JSON.stringify({dailyRequestsAccounted:completed.reserved,usedThisRun:usage.requests}));
}
