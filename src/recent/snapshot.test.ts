import { describe, expect, it } from 'vitest';
import { buildRecentSnapshot, canonicalRecentUrl, classifyItem, filterRecentItems } from './snapshot';
import type { RecentItem, RecentSnapshot, RecentSource } from './types';
import type { NormalizedItem, SourceConfig } from '../ingestion/types';

const now = new Date('2026-11-14T12:00:00Z');
const companies = [{id:'minospace',name:'微纳星空',aliases:['Minospace'],country:'China'}];
const provinces = [{id:'北京',name:'北京',aliases:['亦庄']},{id:'湖北',name:'湖北',aliases:['武汉']},{id:'全国',name:'全国',aliases:[]}];
const source: SourceConfig = {key:'company',name:'微纳星空',type:'official_page',region:'cn',url:'https://example.com/news',credibility:5,
  enabled:false,purpose:'test',expected_content:'test',risk_notes:'test',dedupe_strategy:'canonical_url_title',
  recent:{candidate:true,category:'company',companies:['minospace'],publisher_region:'北京'}};
function raw(overrides: Partial<NormalizedItem> = {}): NormalizedItem {
  return {sourceKey:'company',sourceName:'微纳星空',title:'微纳星空武汉项目投入运行',summary:'',url:'https://example.com/articles/1',
    publishedAt:'2026-11-12T10:00:00Z',language:'zh',region:'cn',relatedLaunchIds:[],companies:[],tags:[],...overrides};
}
function item(overrides: Partial<RecentItem> = {}): RecentItem { return {...classifyItem(raw(),source,companies,provinces,now)!,...overrides}; }
function status(overrides: Partial<RecentSource> = {}): RecentSource {
  return {id:'company',name:'微纳星空',url:source.url,region:'cn',category:'company',companyIds:['minospace'],selected:true,
    attemptedAt:now.toISOString(),lastSuccessAt:now.toISOString(),status:'ok',collected:1,recentCount:1,requests:1,durationMs:30,...overrides};
}
function build(incoming: RecentItem[], previous?: RecentSnapshot, sources=[status()]) {
  return buildRecentSnapshot({incoming,previous,sources,companies,provinces,now});
}

describe('recent news snapshots', () => {
  it('retains spaceport firefighting equipment tenders while excluding fire drills',()=>{
    const procurement={...source,recent:{...source.recent!,category:'procurement' as const}};
    expect(classifyItem(raw({title:'海南商业航天发射场（二期）消防车采购项目招标公告'}),procurement,companies,provinces,now)?.milestone).toBe('tender');
    expect(classifyItem(raw({title:'商业航天公司组织消防演练'}),source,companies,provinces,now)).toBeNull();
  });
  it('retains genuine payload and deep-space notices without admitting generic schemes',()=>{
    const policy={...source,recent:{...source.recent!,category:'policy' as const}};
    const notice=classifyItem(raw({title:'关于开展天问四号任务有效载荷研制方案征集工作的通知'}),policy,companies,provinces,now);
    expect(notice?.category).toBe('policy');
    expect(build([notice!]).items).toHaveLength(1);
    expect(classifyItem(raw({title:'关于征集充电设施研制方案的通知'}),policy,companies,provinces,now)).toBeNull();
  });
  it('uses project locations rather than the company publisher headquarters', () => {
    expect(item().provinces).toEqual(['湖北']);
    expect(item({}).companyIds).toEqual(['minospace']);
    expect(classifyItem(raw({title:'微纳星空完成卫星在轨交付'}),source,companies,provinces,now)?.provinces).toEqual(['未明确']);
    expect(classifyItem(raw({title:'吉林一号卫星完成新任务'}),source,companies,[...provinces,{id:'吉林',name:'吉林',aliases:[]}],now)?.provinces).toEqual(['未明确']);
  });
  it('keeps national policy reposts national even on a provincial publisher', () => {
    const classified=classifyItem(raw({title:'国务院关于推动商业航天发展的意见（北京转载）'}),source,companies,provinces,now)!;
    expect(classified.provinces).toEqual(['全国']);
  });
  it('keeps a single canonical article with multiple sources and is idempotent', () => {
    const first=build([item()]);
    const duplicate=item({url:'https://example.com/articles/1?utm_source=feed#top',sourceIds:['other']});
    const second=build([duplicate],first,[status(),status({id:'other'})]);
    expect(second.items).toHaveLength(1);
    expect(second.items[0].sourceIds).toEqual(['company','other']);
    expect(build(second.items,second,[status(),status({id:'other'})]).items).toEqual(second.items);
  });
  it('preserves eligible last-good records and their timestamp when every source fails', () => {
    const previous=build([item()]); previous.lastDataUpdatedAt='2026-11-12T10:00:00.000Z';
    previous.items.push(item({id:'old',url:'https://example.com/old',publishedAt:'2026-10-01T00:00:00.000Z'}));
    const failed=build([],previous,[status({status:'error',errorCategory:'timeout'})]);
    expect(failed.items).toHaveLength(1);
    expect(failed.lastDataUpdatedAt).toBe(previous.lastDataUpdatedAt);
  });
  it('rejects old/future items and irrelevant corporate activities without inventing a fresh date', () => {
    expect(classifyItem(raw({publishedAt:'2026-10-01T00:00:00Z'}),source,companies,provinces,now)).toBeNull();
    expect(classifyItem(raw({publishedAt:'2026-11-15T00:00:00Z'}),source,companies,provinces,now)).toBeNull();
    expect(classifyItem(raw({title:'微纳星空组织新员工入职培训'}),source,companies,provinces,now)).toBeNull();
    expect(classifyItem(raw({region:'global',title:'Astronomers discover a distant dark matter galaxy'}),source,companies,provinces,now)).toBeNull();
  });
  it('caps count, records actual coverage, and does not retain removed sources', () => {
    const result=build(Array.from({length:2003},(_,i)=>item({id:String(i),url:`https://example.com/${i}`})));
    expect(result.items).toHaveLength(2000); expect(result.truncated).toBe(true);
    expect(result.coverageStart).toBe(result.items.at(-1)?.publishedAt);
    expect(build([],result,[status({selected:false})]).items).toEqual([]);
  });
  it('applies province/company/time/type/keyword filters together and rechecks the window while offline', () => {
    const data=build([item(),item({url:'https://example.com/2',companyIds:[],category:'policy'})]);
    expect(filterRecentItems(data,{province:'湖北',company:'minospace',category:'company',query:'武汉',days:7},now)).toHaveLength(1);
    expect(filterRecentItems(data,{province:'北京',company:'minospace',days:30},now)).toEqual([]);
    expect(filterRecentItems(data,{days:30},new Date('2026-12-30T00:00:00Z'))).toEqual([]);
  });
  it('rejects non-public link protocols and removes tracking without dropping content parameters', () => {
    expect(canonicalRecentUrl('javascript:alert(1)')).toBeNull();
    expect(canonicalRecentUrl('https://example.com/article?id=123&utm_medium=x#top')).toBe('https://example.com/article?id=123');
  });
});
