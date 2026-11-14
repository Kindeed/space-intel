import {describe,expect,it,vi} from 'vitest';
import worker,{readPreviewSnapshot,type RecentPreviewEnv} from './recentPreview';

function environment(body='{"items":[]}'){
  const get=vi.fn(async()=>({size:body.length,httpEtag:'"revision-one"',body:new Response(body).body}));
  const assets=vi.fn(async()=>new Response('<html>preview</html>',{headers:{'Content-Type':'text/html'}}));
  return {env:{R2_ASSETS:{get},ASSETS:{fetch:assets}} as unknown as RecentPreviewEnv,get,assets};
}
const context={waitUntil:vi.fn(),passThroughOnException:vi.fn(),props:{}};
describe('isolated recent preview worker',()=>{
  it('serves one fixed R2 object and respects client validators without a database',async()=>{
    const {env,get}=environment();
    const response=await readPreviewSnapshot(new Request('https://preview.example/recent/current.json'),env,context);
    expect(response.status).toBe(200);expect(await response.json()).toEqual({items:[]});
    expect(get).toHaveBeenCalledWith('recent/preview/v1/current.json');
    expect((await readPreviewSnapshot(new Request('https://preview.example/recent/current.json',{headers:{'if-none-match':'"revision-one"'}}),env,context)).status).toBe(304);
  });
  it('returns a safe uncached error for unavailable R2 and never falls back to legacy APIs',async()=>{
    const {env,get}=environment();get.mockRejectedValueOnce(new Error('private detail'));
    const response=await readPreviewSnapshot(new Request('https://preview.example/recent/current.json'),env,context);
    expect(response.status).toBe(503);expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).not.toContain('private detail');
    expect((await worker.fetch(new Request('https://preview.example/api/health'),env,context as ExecutionContext)).status).toBe(404);
  });
  it('redirects the preview home to the new app and blocks writes',async()=>{
    const {env,assets}=environment();
    const home=await worker.fetch(new Request('https://preview.example/'),env,context as ExecutionContext);
    expect(home.headers.get('Location')).toBe('https://preview.example/recent');
    await worker.fetch(new Request('https://preview.example/recent'),env,context as ExecutionContext);
    expect(assets).toHaveBeenCalledOnce();
    expect((await readPreviewSnapshot(new Request('https://preview.example/recent/current.json',{method:'POST'}),env,context)).status).toBe(405);
  });
});
