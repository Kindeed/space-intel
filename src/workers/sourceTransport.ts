const controlKey='recent/preview/v1/control.json';
const byteLimit=4*1024*1024;
const authPattern=/^Bearer ([a-f0-9]{64})$/;
function sameToken(left:string,right:string){
  if(left.length!==right.length)return false;
  let difference=0;for(let index=0;index<left.length;index++)difference|=left.charCodeAt(index)^right.charCodeAt(index);
  return difference===0;
}
const errorResponse=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});

// Private CI transport for a fixed list of public source URLs. It cannot fetch
// caller-supplied URLs, forward credentials, follow redirects or write storage.
export async function fetchPreviewSource(request:Request,bucket:R2Bucket,allowed:Record<string,string>,fetcher:typeof fetch=fetch):Promise<Response>{
  if(request.method!=='GET')return errorResponse(405);
  const token=request.headers.get('Authorization')?.match(authPattern)?.[1];
  if(!token)return errorResponse(401);
  const key=new URL(request.url).searchParams.get('source')??'';
  const target=Object.hasOwn(allowed,key)?allowed[key]:undefined;
  if(!target)return errorResponse(404);
  try{
    const control=await bucket.get(controlKey);
    if(!control||control.size>4096)return errorResponse(503);
    const stored=await control.json<{sourceTokenHash?:string}>();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    const hash=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,'0')).join('');
    if(!stored.sourceTokenHash||!sameToken(hash,stored.sourceTokenHash))return errorResponse(403);
    const headers=new Headers({'User-Agent':'SpaceIntelBot/1.0 (+https://space.bytebaud.com)'});
    for(const header of ['Accept','If-None-Match','If-Modified-Since']){const value=request.headers.get(header);if(value)headers.set(header,value);}
    const response=await fetcher(target,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15_000)});
    if(Number(response.headers.get('Content-Length')??0)>byteLimit){await response.body?.cancel();return errorResponse(413);}
    const output=new Headers({'Cache-Control':'no-store','X-Recent-Source-Transport':'v1'});
    for(const header of ['Content-Type','Content-Encoding','Content-Length','ETag','Last-Modified','Location','Retry-After']){
      const value=response.headers.get(header);if(value)output.set(header,value);
    }
    return new Response(response.body,{status:response.status,headers:output});
  }catch{return errorResponse(502);}
}
