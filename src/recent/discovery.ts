import {z} from 'zod';
export function discoveryUrl(value:string,base?:string):string|null{
 if(value.length>2048)return null;
 try{
  const url=new URL(value,base);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)||/^[\d.]+$/.test(host)||/\.(?:localhost|local|internal|lan|test|invalid|onion)$/.test(host))return null;
  if([...url.searchParams.keys()].some(key=>/token|auth|session|csrf|sign|password|secret|key/i.test(key)))return null;
  url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|from$|spm$)/i.test(key))url.searchParams.delete(key);
  return url.href;
 }catch{return null;}
}
const urlSchema=z.string().refine(value=>discoveryUrl(value)===value);
export const discoveryCandidateSchema=z.object({url:urlSchema,name:z.string().min(2).max(100),parentUrl:urlSchema,parentName:z.string().max(100),
 sameSite:z.boolean(),firstSeen:z.string().datetime(),lastSeen:z.string().datetime(),checkedAt:z.string().datetime().optional(),
 successDays:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(3).default([]),
 status:z.enum(['pending','observing','ready','review','unavailable']),dated:z.number().int().nonnegative().default(0),related:z.number().int().nonnegative().default(0),
});
export const discoveryStateSchema=z.object({version:z.literal(1),lastRunDay:z.string().optional(),seedCursor:z.number().int().nonnegative().default(0),
 lastCheckedAt:z.string().datetime().optional(),requestsLastRun:z.number().int().min(0).max(10).default(0),candidates:z.array(discoveryCandidateSchema).max(120)});
export type DiscoveryState=z.infer<typeof discoveryStateSchema>;
export type DiscoveryCandidate=z.infer<typeof discoveryCandidateSchema>;
export function publicDiscoveryIPv4(address:string):boolean{
 if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address))return false;
 const parts=address.split('.').map(Number);if(parts.some(value=>value>255))return false;
 const [a,b,c]=parts;
 return a>0&&a<224&&a!==10&&a!==127&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19||b===51&&c===100))&&!(a===203&&b===0&&c===113);
}
export function findSourceCandidates(html:string,parent:{url:string;name:string},known:Set<string>,now:Date):DiscoveryCandidate[]{
 const parentUrl=discoveryUrl(parent.url);if(!parentUrl)return [];
 const result=new Map<string,DiscoveryCandidate>();
 const visible=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 for(const match of visible.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const name=match[2].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  if(name.length>70||!/政策|公告|公示|新闻|动态|招标|采购|环评|审批|项目建设/.test(name))continue;
  const url=discoveryUrl(match[1].replace(/&amp;/g,'&'),parentUrl);
  if(!url||known.has(url)||url===parentUrl||/\/(?:sso|login|signin|oauth)(?:\/|$)|\/(?:20\d{2})(?:\/|\d{2})|\.(?:pdf|docx?|xlsx?|zip|png|jpe?g)$/i.test(new URL(url).pathname))continue;
  const sameSite=new URL(url).origin===new URL(parentUrl).origin;
  if(!sameSite&&!/航天|卫星|火箭|发射|测控|招标|采购|环评/.test(name))continue;
  result.set(url,{url,name,parentUrl,parentName:parent.name.slice(0,100),sameSite,firstSeen:now.toISOString(),lastSeen:now.toISOString(),successDays:[],status:sameSite?'pending':'review',dated:0,related:0});
 }
 return [...result.values()].slice(0,20);
}
export function mergeDiscovery(state:DiscoveryState,incoming:DiscoveryCandidate[],now:Date):DiscoveryState{
 const entries=new Map(state.candidates.filter(candidate=>Date.parse(candidate.lastSeen)>=now.getTime()-30*86400000).map(candidate=>[candidate.url,candidate]));
 for(const candidate of incoming){const old=entries.get(candidate.url);entries.set(candidate.url,old?{...old,lastSeen:candidate.lastSeen}:candidate);}
 return {...state,candidates:[...entries.values()].sort((a,b)=>Number(b.sameSite)-Number(a.sameSite)||b.lastSeen.localeCompare(a.lastSeen)||a.url.localeCompare(b.url)).slice(0,120)};
}
export function recordDiscoveryCheck(candidate:DiscoveryCandidate,dated:number,related:number,now:Date):DiscoveryCandidate{
 const day=now.toISOString().slice(0,10);
 const successDays=dated>0&&related>0?[...new Set([...candidate.successDays.filter(value=>Date.parse(value)>=now.getTime()-7*86400000),day])].slice(-3):[];
 return {...candidate,dated,related,successDays,checkedAt:now.toISOString(),status:!candidate.sameSite?'review':dated>0&&related>0?(successDays.length>=2?'ready':'observing'):'unavailable'};
}
