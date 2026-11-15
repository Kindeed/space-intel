import {describe,it,expect,vi} from 'vitest';
import {fetchPreviewSource} from './sourceTransport';
const token='a'.repeat(64);
const allowed={notice:'https://example.gov.cn/notices'};
function request(query='source=notice',value=token){return new Request(`https://preview.example/recent/source-fetch?${query}`,{headers:{Authorization:`Bearer ${value}`,Accept:'application/json'}});}
function environment(){const get=vi.fn(async()=>({size:150,json:async()=>({sourceToken:token})}));return {get,bucket:{get} as unknown as R2Bucket};}
describe('private preview source transport',()=>{
  it('rejects anonymous and unknown targets before reading private state',async()=>{
    const {bucket,get}=environment();const fetch=vi.fn();
    expect((await fetchPreviewSource(new Request('https://preview.example/recent/source-fetch'),bucket,allowed,fetch)).status).toBe(401);
    expect((await fetchPreviewSource(request('source=__proto__&url=https://unrelated.test'),bucket,allowed,fetch)).status).toBe(404);
    expect(get).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });
  it('does not forward the caller token or cookies, follow redirects or expose upstream cookies',async()=>{
    const {bucket}=environment();const fetch=vi.fn(async()=>new Response('public',{status:302,headers:{Location:'/notice','Set-Cookie':'private-value'}}));
    const response=await fetchPreviewSource(request(),bucket,allowed,fetch);
    expect(response.status).toBe(302);expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(response.headers.get('X-Recent-Source-Transport')).toBe('v1');
    const [url,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe(allowed.notice);expect(init.redirect).toBe('manual');
    const headers=new Headers(init.headers);expect(headers.get('Authorization')).toBeNull();expect(headers.get('Cookie')).toBeNull();
    expect(headers.get('Accept')).toBe('application/json');
  });
  it('blocks invalid credentials and oversized replies without leaking state',async()=>{
    const {bucket}=environment();const fetch=vi.fn(async()=>new Response('large',{headers:{'Content-Length':'5000000'}}));
    expect((await fetchPreviewSource(request('source=notice','b'.repeat(64)),bucket,allowed,fetch)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    expect((await fetchPreviewSource(request(),bucket,allowed,fetch)).status).toBe(413);
  });
});
