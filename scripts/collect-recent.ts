import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { parse } from 'yaml';
import { parseSourcesConfig } from '../src/ingestion/sourceConfig';
import { officialPageCollector } from '../src/ingestion/collectors/officialPage';
import { rssCollector } from '../src/ingestion/collectors/rss';
import {googleNewsRssCollector} from '../src/ingestion/collectors/googleNewsRss';
import type { NormalizedItem, SourceConfig } from '../src/ingestion/types';
import { classifyItem, buildRecentSnapshot, isRecentDate } from '../src/recent/snapshot';
import { recentSnapshotSchema, type RecentSnapshot, type RecentSource } from '../src/recent/types';
import { retryAt, scheduleSlot, sourceDue } from '../src/recent/scheduler';
import { expandPublicListingData } from '../src/recent/htmlData';

const replayArg = process.argv.find((arg) => arg.startsWith('--replay='))?.split('=')[1];
if (replayArg && !/^[a-zA-Z0-9_-]+$/.test(replayArg)) throw new Error('Invalid replay identifier');
const replay = replayArg ? JSON.parse(await readFile(`.recent/round-${replayArg}.json`, 'utf8')) as {
  startedAt: string; statuses: RecentSource[]; evidence: Array<{sourceId:string;items:NormalizedItem[];error?:string}>;
} : undefined;
const now = replay ? new Date(replay.startedAt) : new Date();
const roundArg = process.argv.find((arg) => arg.startsWith('--round='));
const round = (roundArg?.split('=')[1] ?? now.toISOString().replace(/[^a-zA-Z0-9_-]/g, '-'));
if (!/^[a-zA-Z0-9_-]+$/.test(round)) throw new Error('Invalid round identifier');
await mkdir('.recent', { recursive: true });
await mkdir('public/recent', { recursive: true });
const config = parseSourcesConfig(parse(await readFile('config/sources.yaml', 'utf8')));
const regions = parse(await readFile('config/regions.yaml', 'utf8')).regions as RecentSnapshot['provinces'];
const facilities=parse(await readFile('config/facilities.yaml','utf8')).facilities as RecentSnapshot['facilities'];
const companyConfig = JSON.parse(await readFile('config/companies.generated.json', 'utf8')).companies as Array<{slug:string;name:string;english_name?:string;country:string}>;
const companies = companyConfig.map((company) => ({ id: company.slug, name: company.name,
  aliases: company.english_name ? [company.english_name] : [], country: company.country }));
let previous: RecentSnapshot | undefined;
try { previous = recentSnapshotSchema.parse(JSON.parse(await readFile('public/recent/current.json', 'utf8'))); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const pilot = JSON.parse(await readFile('config/recent-pilot.json', 'utf8')) as {sources:string[]};
if (!Array.isArray(pilot.sources) || pilot.sources.length<20 || pilot.sources.length>150 || new Set(pilot.sources).size!==pilot.sources.length) {
  throw new Error('Pilot must contain 20–150 distinct source keys');
}
for (const key of pilot.sources) {
  if (!config.some((source)=>source.key===key && source.recent?.candidate)) throw new Error(`Invalid pilot source: ${key}`);
}
const selectedKeys = process.argv.includes('--discover') ? undefined : new Set(pilot.sources);
const priority=(source:SourceConfig)=>source.recent?.focus==='ttc'||['cn-ttc-discovery','cn-spaceport-discovery','cn-company-discovery'].includes(source.key)?0:
  source.region==='cn'&&source.recent?.category==='company'?1:source.region==='cn'&&source.type!=='google_news_rss'?2:source.region==='cn'?3:4;
const candidates = config.filter((source) => source.recent?.candidate && (!selectedKeys || selectedKeys.has(source.key))).sort((a,b)=>priority(a)-priority(b));
const statuses: RecentSource[] = [];
const incoming: RecentSnapshot['items'] = [];
const evidence: Array<{sourceId:string;items:NormalizedItem[];error?:string}> = [];
let requestCount = 0;
let requestLimit=150;
let budgetDay:string|undefined;
try {
  const reservation=JSON.parse(await readFile('.recent/reservation.json','utf8')) as {budget:number;day:string};
  if(!Number.isInteger(reservation.budget)||reservation.budget<0||reservation.budget>150)throw new Error('Invalid request reservation');
  requestLimit=reservation.budget;
  budgetDay=reservation.day;
}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
if(process.argv.includes('--validate')){
  console.log(JSON.stringify({valid:true,round,sources:candidates.length,facilities:facilities.length,requests:0}));
  process.exit(0);
}
let usageQueue=Promise.resolve();
const usageRunId=process.env.GITHUB_RUN_ID??'local';
async function recordUsage(){
  const count=requestCount;
  usageQueue=usageQueue.then(()=>writeFile('.recent/usage.json',JSON.stringify({runId:usageRunId,requests:count})));
  await usageQueue;
}
class Unchanged extends Error {}
class RateLimited extends Error {constructor(readonly nextAttempt:string){super('rate_limited');}}

async function collect(source: SourceConfig) {
  const started = Date.now();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25_000);
  let requests = 0;
  const old = previous?.sources.find((item) => item.id === source.key);
  if(!sourceDue(source,old,now,process.argv.includes('--force')) && old){
    statuses.push({...old,skipped:true,requests:0,durationMs:0});return;
  }
  const status: RecentSource = {
    id: source.key, name: source.name, url: source.url, region: source.region,
    category: source.recent!.category, publisherRegion: source.recent?.publisher_region,
    companyIds: source.recent?.companies ?? [], selected: true,
    attemptedAt: now.toISOString(), lastSuccessAt: old?.lastSuccessAt ?? null,
    status: 'error', collected: 0, recentCount: 0, requests: 0, durationMs: 0,
    checkedSlot:scheduleSlot(now),
  };
  try {
    const context = {
      now: () => now,
      transformHtml:expandPublicListingData,
      observeListing:(counts:{links:number;datedLinks:number})=>{status.listed=counts.datedLinks;},
      fetch: (async (url, init) => {
        let target=typeof url==='string'?url:url instanceof URL?url.href:url.url;
        let response:Response;
        for(;;){
          if (requestCount >= requestLimit || requests >= 2 || (budgetDay&&new Date().toISOString().slice(0,10)!==budgetDay)) throw new Error('request_budget');
          requestCount += 1; requests += 1;
          await recordUsage();
          const headers=new Headers(init?.headers);
          if(target===source.url){if(old?.etag)headers.set('if-none-match',old.etag);if(old?.lastModified)headers.set('if-modified-since',old.lastModified);}
          response=await fetch(target,{...init,headers,signal:abort.signal,redirect:'manual'});
          if([301,302,303,307,308].includes(response.status)){
            const location=response.headers.get('location');await response.body?.cancel();
            if(!location)throw new Error('invalid_redirect');
            const next=new URL(location,target);
            if(!['http:','https:'].includes(next.protocol))throw new Error('invalid_redirect');
            target=next.href;continue;
          }
          break;
        }
        if(response.status===429){await response.body?.cancel();throw new RateLimited(retryAt(response.headers.get('retry-after'),now));}
        if(response.status===304){await response.body?.cancel();throw new Unchanged();}
        if(!response.ok){await response.body?.cancel();return new Response(null,{status:response.status,headers:response.headers});}
        if(requests===1){
          status.etag=response.headers.get('etag')??undefined;
          status.lastModified=response.headers.get('last-modified')??undefined;
        }
        const contentLength = Number(response.headers.get('content-length') ?? 0);
        if (contentLength > 4 * 1024 * 1024) { await response.body?.cancel(); throw new Error('response_too_large'); }
        const reader = response.body?.getReader();
        if (!reader) return response;
        const chunks: Uint8Array[] = []; let bytes = 0;
        try {
          for (;;) {
            const {done,value} = await reader.read();
            if (done) break;
            bytes += value.length;
            if (bytes > 4 * 1024 * 1024) throw new Error('response_too_large');
            chunks.push(value);
          }
        } finally { await reader.cancel(); }
        const body = new Uint8Array(bytes); let position = 0;
        for (const chunk of chunks) { body.set(chunk,position); position += chunk.length; }
        const charset = response.headers.get('content-type')?.match(/charset\s*=\s*([\w-]+)/i)?.[1];
        const text = new TextDecoder(charset || 'utf-8').decode(body);
        return new Response(text, {status:response.status,headers:response.headers});
      }) as typeof fetch,
    };
    const collector = source.type === 'rss' ? rssCollector : source.type==='google_news_rss'?googleNewsRssCollector:officialPageCollector;
    const items = await collector.collect({ ...source, enabled: true, strict_dates: true, max_items: 30 }, context);
    status.collected = items.length;
    const recent = items.map((item) => classifyItem(item,source,companies,regions,now,facilities)).filter((item) => item !== null);
    status.recentCount = recent.length;
    status.status = items.length || (status.listed??0)>0 ? 'ok' : 'empty';
    status.lastSuccessAt = status.status==='ok' ? now.toISOString() : old?.lastSuccessAt ?? null;
    incoming.push(...recent);
    evidence.push({sourceId:source.key,items:items.filter((item) => isRecentDate(item.publishedAt,now)).slice(0,30)});
  } catch (error) {
    if(error instanceof Unchanged && old){
      Object.assign(status,{...old,requests,attemptedAt:now.toISOString(),checkedSlot:scheduleSlot(now),unchanged:true,skipped:false,
        lastSuccessAt:old.status==='ok'?now.toISOString():old.lastSuccessAt,
        recentCount:previous!.items.filter((item)=>item.sourceIds.includes(source.key)&&isRecentDate(item.publishedAt,now)).length});
      delete status.nextAttemptAt;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    status.errorCategory = error instanceof RateLimited?'rate_limited':/budget/.test(message) ? 'budget' : abort.signal.aborted ? 'timeout'
      : /HTTP \d+/.test(message) ? 'http_error' : /parse|xml|charset/i.test(message) ? 'parse_error' : 'network_error';
    evidence.push({sourceId:source.key,items:[],error:message.slice(0,300)});
    status.nextAttemptAt=error instanceof RateLimited?error.nextAttempt:retryAt(null,now);
  } finally {
    clearTimeout(timeout); status.requests = requests; status.durationMs = Date.now()-started; statuses.push(status);
    console.log(JSON.stringify({source:source.key,status:status.status,parsed:status.collected,recent:status.recentCount,requests,ms:status.durationMs}));
  }
}

let cursor = 0;
if (replay) {
  for (const source of candidates) {
    const status = replay.statuses.find((entry) => entry.id === source.key);
    if (!status) continue;
    const raw = replay.evidence.find((entry) => entry.sourceId === source.key);
    const items = (raw?.items ?? []).map((item) => classifyItem(item,source,companies,regions,now,facilities)).filter((item) => item !== null);
    statuses.push({...status,recentCount:items.length}); incoming.push(...items);
  }
} else {
  await Promise.all(Array.from({length:3}, async () => {
    while (cursor < candidates.length) { const source = candidates[cursor++]; await collect(source); }
  }));
}
statuses.sort((a,b) => a.id.localeCompare(b.id));
const directories:RecentSource[]=config.filter((source)=>source.recent?.directory).map((source)=>({
  id:source.key,name:source.name,url:source.url,region:source.region,category:source.recent!.category,
  publisherRegion:source.recent?.publisher_region,companyIds:[],selected:false,attemptedAt:now.toISOString(),
  lastSuccessAt:null,status:'directory',collected:0,recentCount:0,requests:0,durationMs:0,
}));
const snapshot = buildRecentSnapshot({previous:replay?undefined:previous,incoming,sources:[...statuses,...directories],companies,provinces:regions,facilities,now});
// Atomic local replacement: browser never reads a partially written JSON file.
const json = JSON.stringify(snapshot);
await writeFile('public/recent/current.json.tmp',json);
for (let attempt = 0; ; attempt += 1) {
  try { await rename('public/recent/current.json.tmp','public/recent/current.json'); break; }
  catch (error) {
    // Windows preview watchers / antivirus may briefly hold the destination.
    if (attempt >= 7 || !['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    await new Promise((resolve) => setTimeout(resolve,150));
  }
}
if (!replay) await writeFile(`.recent/round-${round}.json`,JSON.stringify({round,startedAt:now.toISOString(),requests:requestCount,statuses,evidence},null,2));
await writeFile('.recent/run-summary.json',JSON.stringify({round,at:now.toISOString(),requests:requestCount,sources:statuses.length,successful:statuses.filter(s=>s.status==='ok'&&!s.skipped).length,items:snapshot.items.length}));
console.log(JSON.stringify({round,sources:statuses.length,successful:statuses.filter((s)=>s.status==='ok').length,
  withRecent:statuses.filter((s)=>s.recentCount>0).length,articles:snapshot.items.length,bytes:Buffer.byteLength(json),gzipBytes:gzipSync(json).length,requests:requestCount}));
