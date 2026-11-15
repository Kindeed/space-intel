import {describe,expect,it,vi} from 'vitest';
import type {SourceConfig} from '../ingestion/types';
import {publicJsonListingCollector} from './publicJsonListing';
const source:SourceConfig={key:'public-eia',name:'公开环评公示',type:'official_page',region:'cn',url:'https://example.gov.cn/list.json',enabled:false,
  credibility:5,purpose:'test',expected_content:'test',risk_notes:'test',dedupe_strategy:'canonical_url_title',include_terms:['航天'],
  recent:{candidate:true,category:'approval',format:'ningbo_eia_json',article_url_prefix:'https://example.gov.cn/article?InfoID='}};
const record={infoid:'11111111-1111-1111-1111-111111111111',title:'商业航天发射场环评受理公告',updatetime:'2026-11-12',classname:'环评文件受理公告'};
describe('explicit public government JSON lists',()=>{
  it('retains only genuinely dated recent aerospace metadata and the official article URL',async()=>{
    const fetch=vi.fn(async()=>Response.json({success:true,list:[record,{...record,updatetime:'2016-11-12'},{...record,updatetime:'2026-11-16'},
      {...record,updatetime:'unknown'},{...record,title:'普通厂房项目公示'}]}));
    const observeListing=vi.fn();
    const items=await publicJsonListingCollector.collect(source,{fetch,now:()=>new Date('2026-11-15'),observeListing});
    expect(items).toHaveLength(1);expect(items[0].publishedAt).toBe('2026-11-12T00:00:00Z');
    expect(items[0].url).toBe('https://example.gov.cn/article?InfoID=11111111-1111-1111-1111-111111111111');
    expect(fetch).toHaveBeenCalledOnce();expect(observeListing).toHaveBeenCalledWith({links:5,datedLinks:4});
  });
  it('rejects changed schemas and unsafe article prefixes instead of inventing content',async()=>{
    const fetch=vi.fn(async()=>Response.json({success:true,list:[{...record,infoid:'../private'}]}));
    await expect(publicJsonListingCollector.collect(source,{fetch,now:()=>new Date()})).rejects.toThrow('parse_invalid_public_listing');
    await expect(publicJsonListingCollector.collect({...source,recent:{...source.recent!,article_url_prefix:'javascript:alert(1)'}},{fetch,now:()=>new Date()})).rejects.toThrow('parse_invalid_article_prefix');
  });
  it('reads public inline JSON as data and uses releaseTime rather than updateTime',async()=>{
    const company={...source,recent:{...source.recent!,category:'company' as const,format:'nuxt_news' as const,article_url_prefix:'https://example.gov.cn/news?id='}};
    const values=[{id:1,chTitle:2,releaseTime:3,updateTime:4},232,'航天测控服务正式上线','2026-04-16 16:55:40','2026-11-14 18:08:47'];
    const fetch=vi.fn(async()=>new Response(`<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(values)}</script>`));
    const observeListing=vi.fn();
    expect(await publicJsonListingCollector.collect(company,{fetch,now:()=>new Date('2026-11-15'),observeListing})).toHaveLength(0);
    expect(observeListing).toHaveBeenCalledWith({links:1,datedLinks:1});
    values[3]='2026-11-12 12:00:00';
    const items=await publicJsonListingCollector.collect(company,{fetch,now:()=>new Date('2026-11-15')});
    expect(items).toHaveLength(1);expect(items[0].url).toBe('https://example.gov.cn/news?id=232');
    expect(items[0].publishedAt).toBe('2026-11-12T00:00:00Z');
  });
  it('does not execute script blocks or accept malformed inline data',async()=>{
    const company={...source,recent:{...source.recent!,format:'nuxt_news' as const}};
    const fetch=vi.fn(async()=>new Response('<script id="__NUXT_DATA__">throw new Error("never execute")</script>'));
    await expect(publicJsonListingCollector.collect(company,{fetch,now:()=>new Date()})).rejects.toThrow('parse_missing_public_news_data');
  });
});
