import {describe,it,expect} from 'vitest';
import {discoveryUrl,findSourceCandidates,recordDiscoveryCheck,mergeDiscovery,publicDiscoveryIPv4} from './discovery';
import {runDiscovery} from '../../scripts/recent-discovery';
import type {SourceConfig} from '../ingestion/types';
describe('source discovery',()=>{
 const now=new Date('2026-11-15T00:00:00Z');
 const parent={url:'https://example.gov.cn/',name:'政府'};
 it('does not send candidate requests to private or special-use IPv4 addresses',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','100.64.0.1','198.18.0.1','203.0.113.1'])expect(publicDiscoveryIPv4(ip)).toBe(false);
  expect(publicDiscoveryIPv4('8.8.8.8')).toBe(true);
 });
 it('shares a bounded daily request allowance and never retries the same day',async()=>{
  const source={...parent,recent:{directory:true}} as SourceConfig;
  const state={version:1 as const,seedCursor:0,requestsLastRun:0,candidates:[]};
  let consumed=0;
  const options={state,hints:[],config:[source],now,budget:1,consume:async()=>{consumed++;},fetchHtml:async()=>'<a href="/news/">新闻动态</a>',persist:false};
  const result=await runDiscovery(options);
  expect(consumed).toBe(1);expect(result.candidates).toHaveLength(1);
  await runDiscovery({...options,state:result});expect(consumed).toBe(1);
 });
 it('rechecks promising candidates before new ones so a large pool can complete cross-day validation',async()=>{
  const candidates=findSourceCandidates('<a href="/new/">政策公告</a><a href="/promising/">新闻动态</a>',parent,new Set(),now);
  candidates[1]=recordDiscoveryCheck(candidates[1],1,1,now);
  const visited:string[]=[];
  const result=await runDiscovery({state:{version:1,seedCursor:0,requestsLastRun:0,candidates},config:[],hints:[],now:new Date('2026-11-16'),budget:1,persist:false,
    consume:async()=>{},fetchHtml:async url=>{visited.push(url);return '<li><a href="/article/202611/123.html">商业航天产业项目公告</a><span>2026-11-15</span></li>';}});
  expect(visited).toEqual(['https://example.gov.cn/promising/']);
  expect(result.candidates.find(candidate=>candidate.url.endsWith('/promising/'))?.status).toBe('ready');
 });
 it('finds new columns while excluding scripts, articles, login and configured URLs',()=>{
  const html='<a href="/notice/">公示公告</a><a href="/known/">政策文件</a><a href="/202611/article.html">航天新闻</a><a href="/login/">公告办理</a><script><a href="/fake/">招标公告</a></script>';
  expect(findSourceCandidates(html,parent,new Set(['https://example.gov.cn/known/']),now).map(c=>c.url)).toEqual(['https://example.gov.cn/notice/']);
 });
 it('rejects credentials, network-local targets and credential-like query strings',()=>{
  for(const url of ['http://127.0.0.1/a','http://[::1]/','http://localhost/x','https://example.local/x','https://user:pass@example.com/','https://example.com:8080/a','https://example.com/?token=abc'])expect(discoveryUrl(url)).toBeNull();
 });
 it('requires successful checks on distinct days and keeps cross-site links in review',()=>{
  const candidate=findSourceCandidates('<a href="/news/">新闻动态</a>',parent,new Set(),now)[0];
  const one=recordDiscoveryCheck(candidate,3,1,now);
  expect(recordDiscoveryCheck(one,3,1,now).status).toBe('observing');
  expect(recordDiscoveryCheck(one,3,1,new Date('2026-11-16')).status).toBe('ready');
  expect(recordDiscoveryCheck({...one,sameSite:false},3,1,new Date('2026-11-16')).status).toBe('review');
  expect(recordDiscoveryCheck(one,0,0,new Date('2026-11-16')).status).toBe('unavailable');
 });
 it('bounds and expires the candidate pool without losing observations on rediscovery',()=>{
  const candidate=findSourceCandidates('<a href="/news/">新闻动态</a>',parent,new Set(),now)[0];
  const state={version:1 as const,seedCursor:0,requestsLastRun:0,candidates:[recordDiscoveryCheck(candidate,1,1,now)]};
  expect(mergeDiscovery(state,[candidate],now).candidates[0].successDays).toHaveLength(1);
  expect(mergeDiscovery(state,[],new Date('2027-01-01')).candidates).toHaveLength(0);
 });
});
