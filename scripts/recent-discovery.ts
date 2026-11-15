import {lookup} from 'node:dns/promises';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {readFile,writeFile} from 'node:fs/promises';
import {discoveryStateSchema,discoveryUrl,findSourceCandidates,mergeDiscovery,recordDiscoveryCheck,publicDiscoveryIPv4,type DiscoveryState} from '../src/recent/discovery';
import {stringify} from 'yaml';
import {createHash} from 'node:crypto';
import {officialPageCollector} from '../src/ingestion/collectors/officialPage';
import {expandPublicListingData} from '../src/recent/htmlData';
import {extractHtmlListLinks,extractDate} from '../src/ingestion/htmlList';
import type {SourceConfig} from '../src/ingestion/types';

// Pin a validated public IPv4 address; DNS cannot change between validation and
// the connection. Never follow redirects to another host or an internal address.
async function publicHtml(value:string):Promise<string>{
 const safe=discoveryUrl(value);if(!safe)throw new Error('unsafe discovery URL');
 const url=new URL(safe);
 let dnsTimer:ReturnType<typeof setTimeout>|undefined;
 const addresses=await Promise.race([lookup(url.hostname,{all:true,family:4}),new Promise<never>((_,reject)=>{dnsTimer=setTimeout(()=>reject(new Error('discovery DNS timeout')),8000);})]).finally(()=>clearTimeout(dnsTimer));
 if(!addresses.length||addresses.some(entry=>!publicDiscoveryIPv4(entry.address)))throw new Error('non-public discovery address');
 return new Promise((resolve,reject)=>{
  const send=url.protocol==='https:'?httpsRequest:httpRequest;
  const request=send({hostname:addresses[0].address,servername:url.hostname,port:url.protocol==='https:'?443:80,path:url.pathname+url.search,
    method:'GET',headers:{Host:url.host,Accept:'text/html, application/xhtml+xml','Accept-Encoding':'identity','User-Agent':'SpaceIntelBot/1.0 (+https://space.bytebaud.com)'}},response=>{
    if(response.statusCode!==200){response.resume();reject(new Error('discovery response unavailable'));return;}
    const chunks:Buffer[]=[];let bytes=0;
    response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>1024*1024){request.destroy(new Error('discovery response too large'));return;}chunks.push(chunk);});
    response.on('error',reject);
    response.on('end',()=>{try{const charset=String(response.headers['content-type']||'').match(/charset\s*=\s*([\w-]+)/i)?.[1]||'utf-8';resolve(new TextDecoder(charset).decode(Buffer.concat(chunks)));}catch{reject(new Error('discovery decode failed'));}});
  });
  const timer=setTimeout(()=>request.destroy(new Error('discovery timeout')),12_000);
  request.on('close',()=>clearTimeout(timer));request.on('error',reject);request.end();
 });
}
export async function loadDiscovery():Promise<DiscoveryState>{
 try{return discoveryStateSchema.parse(JSON.parse(await readFile('.recent/discovery.json','utf8')));}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;return {version:1,seedCursor:0,requestsLastRun:0,candidates:[]};}
}
export async function runDiscovery(options:{state:DiscoveryState;hints:Array<{html:string;source:SourceConfig}>;config:SourceConfig[];now:Date;budget:number;consume:()=>Promise<void>;fetchHtml?:(url:string)=>Promise<string>;persist?:boolean}):Promise<DiscoveryState>{
 const {config,now}=options;const known=new Set(config.map(source=>discoveryUrl(source.url)).filter((url):url is string=>!!url));
 let state=mergeDiscovery(options.state,options.hints.flatMap(({html,source})=>findSourceCandidates(html,source,known,now)),now);
 const persist=async()=>{
   if(options.persist===false)return;
   await writeFile('.recent/discovery.json',JSON.stringify(state));
   await writeFile('.recent/source-proposals.yaml',stringify({sources:state.candidates.filter(candidate=>candidate.status==='ready').map(candidate=>({key:`discovered-${createHash('sha256').update(candidate.url).digest('hex').slice(0,12)}`,name:candidate.name,url:candidate.url,type:'official_page',region:'cn',credibility:1,enabled:false,purpose:'待核对的来源接入建议',expected_content:'带日期的航天相关资讯',risk_notes:`发现依据：${candidate.parentUrl}；需核对发布方与正文链接。`,dedupe_strategy:'canonical_url_title',recent:{candidate:true,category:/招标|采购/.test(candidate.name)?'procurement':/环评|审批|公示/.test(candidate.name)?'approval':/政策/.test(candidate.name)?'policy':'news',cadence:'twice'}}))}));
 };
 if(state.lastRunDay===now.toISOString().slice(0,10)||options.budget<=0){await persist();return state;}
 const max=Math.min(10,options.budget);let requests=0;
 const fetch=async(url:string)=>{if(requests>=max)throw new Error('discovery budget');await options.consume();requests++;return (options.fetchHtml??publicHtml)(url);};
 const seeds=config.filter(source=>source.recent?.directory&&discoveryUrl(source.url));
 for(let index=0;index<Math.min(4,max,seeds.length);index++){
  const source=seeds[state.seedCursor%seeds.length];state.seedCursor++;
  try{const html=await fetch(source.url);state=mergeDiscovery(state,findSourceCandidates(html,source,known,now),now);}catch{/* keep existing evidence */}
 }
 const today=now.toISOString().slice(0,10);
 const priority={observing:0,pending:1,ready:2,unavailable:3,review:4};
 const queue=state.candidates.filter(candidate=>candidate.sameSite&&candidate.checkedAt?.slice(0,10)!==today&&
    (!['ready','unavailable'].includes(candidate.status)||!candidate.checkedAt||Date.parse(candidate.checkedAt)<=now.getTime()-7*86400000))
  .sort((a,b)=>priority[a.status]-priority[b.status]||(a.checkedAt??'').localeCompare(b.checkedAt??'')||a.firstSeen.localeCompare(b.firstSeen));
 for(const candidate of queue){
  if(requests>=max)break;
  let dated=0,related=0;
  try{
   const html=await fetch(candidate.url);
   const links=extractHtmlListLinks(expandPublicListingData(html),candidate.url);
   dated=links.filter(link=>extractDate(`${link.title} ${link.contextText}`)).length;
   const source:SourceConfig={key:'discovery-trial',name:candidate.name,url:candidate.url,type:'official_page',region:'cn',credibility:1,enabled:false,purpose:'Candidate trial',expected_content:'Dated aerospace links',risk_notes:'Not admitted',dedupe_strategy:'canonical_url_title',include_terms:['航天','卫星','火箭','发射场','测控','遥测'],exclude_terms:[]};
   const items=await officialPageCollector.collect(source,{now:()=>now,fetch:async()=>new Response(html),transformHtml:expandPublicListingData});
   related=items.filter(item=>Date.parse(item.publishedAt)>=now.getTime()-30*86400000&&Date.parse(item.publishedAt)<=now.getTime()&&/航天|卫星|火箭|发射场|测控|遥测/.test(item.title)).length;
  }catch{/* failed checks do not become valid sources */}
  Object.assign(candidate,recordDiscoveryCheck(candidate,dated,related,now));
 }
 state={...state,lastRunDay:today,lastCheckedAt:now.toISOString(),requestsLastRun:requests};
 state=discoveryStateSchema.parse(state);
 while(Buffer.byteLength(JSON.stringify(state))>256*1024&&state.candidates.length)state.candidates.pop();
 await persist();
 console.log(JSON.stringify({discoveryCandidates:state.candidates.length,discoveryRequests:requests,ready:state.candidates.filter(candidate=>candidate.status==='ready').length}));
 return state;
}
