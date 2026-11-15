import { snapshotByteLimit } from '../recent/limits';
import {fetchPreviewSource} from './sourceTransport';
declare const __RECENT_ALLOWED_SOURCES__:Record<string,string>;
const allowedSources=typeof __RECENT_ALLOWED_SOURCES__==='undefined'?{}:__RECENT_ALLOWED_SOURCES__;

export type RecentPreviewEnv={R2_ASSETS:R2Bucket;ASSETS:Fetcher};
export const previewSnapshotKey='recent/preview/v1/current.json';

export async function readPreviewSnapshot(request:Request,env:Pick<RecentPreviewEnv,'R2_ASSETS'>,context:Pick<ExecutionContext,'waitUntil'>,cache?:Cache,kind:'current.json'|'discovery.json'='current.json'):Promise<Response>{
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  const cacheKey=new Request(new URL(`/recent/${kind}`,request.url),{method:'GET'});
  if(request.method==='GET'&&cache){try{const hit=await cache.match(cacheKey);if(hit){if(request.headers.get('if-none-match')===hit.headers.get('ETag'))return new Response(null,{status:304,headers:hit.headers});return hit;}}catch{/* read the origin */}}
  try{
    const object=await env.R2_ASSETS.get(kind==='current.json'?previewSnapshotKey:'recent/preview/v1/discovery.json');
    if(!object||object.size>snapshotByteLimit)return Response.json({error:'recent_data_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
    const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=600','ETag':object.httpEtag,'X-Content-Type-Options':'nosniff'});
    if(request.headers.get('if-none-match')===object.httpEtag)return new Response(null,{status:304,headers});
    const response=new Response(request.method==='HEAD'?null:object.body,{headers});
    if(request.method==='GET'&&cache)context.waitUntil(cache.put(cacheKey,response.clone()).catch(()=>undefined));
    return response;
  }catch{return Response.json({error:'recent_data_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}

export default {
  async fetch(request:Request,env:RecentPreviewEnv,context:ExecutionContext):Promise<Response>{
    const path=new URL(request.url).pathname;
    if(path==='/')return Response.redirect(new URL('/recent',request.url).href,302);
    if(path==='/recent/source-fetch')return fetchPreviewSource(request,env.R2_ASSETS,allowedSources);
    if(path==='/recent/current.json'||path==='/recent/discovery.json'){
      const cache=typeof caches==='undefined'?undefined:(caches as CacheStorage&{default?:Cache}).default;
      return readPreviewSnapshot(request,env,context,cache,path.endsWith('/discovery.json')?'discovery.json':'current.json');
    }
    // Pages canonicalizes /index.html to /. Fetch the root asset directly so
    // its canonical redirect cannot loop through our / -> /recent redirect.
    if(path==='/recent'||path.startsWith('/recent/'))return env.ASSETS.fetch(new Request(new URL('/',request.url),request));
    if(path.startsWith('/assets/')||path==='/favicon.ico')return env.ASSETS.fetch(request);
    return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  },
} satisfies ExportedHandler<RecentPreviewEnv>;
