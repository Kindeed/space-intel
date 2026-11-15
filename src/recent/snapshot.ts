import { normalizeHttpUrl } from '../config/url';
import type { NormalizedItem, SourceConfig } from '../ingestion/types';
import { recentSnapshotSchema, type RecentItem, type RecentSnapshot } from './types';

const dayMs = 86_400_000;
import { snapshotByteLimit } from './limits';
export { snapshotByteLimit } from './limits';
const unique = (values: string[]) => [...new Set(values)];
const irrelevantTitle = /党组|党建|理论学习|学习贯彻|消防演练|消防培训|大国工匠|好记者|新员工|入职培训|人力资源|党支部|主题党日|招聘.*人员|人员.*招聘|涨停|跌停|融资余额|龙虎榜|盘中|股价|ETF|目标价|券商研报|评级|海钓|马拉松|足球赛|篮球赛|低成本.*实战|开发教程/;
const aerospaceTopic=/航天|卫星|火箭|空天|遥感|测控|遥测|测运控|北斗|星地|发射场|商业发射|有效载荷|星敏感器|太阳敏感器|深空|天问|嫦娥|探月/;
function isRelevant(item: {title:string;summary:string;region:string;category?:string;facilityIds?:string[]}): boolean {
  if (irrelevantTitle.test(item.title)) return false;
  if(item.region==='cn'&&item.category!=='company'&&!item.facilityIds?.length&&!aerospaceTopic.test(`${item.title} ${item.summary}`))return false;
  return item.region !== 'global' || /launch|rocket|satellite|commercial|spacecraft|space.?station|starship|spacex|blue origin|starlink|ariane|artemis|lander|spaceport|payload|crew|space industry|space economy|space policy|spectrum|space regulation|contract|vulcan|falcon|neutron|new glenn/i.test(`${item.title} ${item.summary}`);
}

export function canonicalRecentUrl(input: string): string | null {
  const safe = normalizeHttpUrl(input);
  if (!safe) return null;
  const url = new URL(safe);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|from$|spm$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}

export function recentId(url: string): string {
  // Stable identity is the canonical URL itself: no hash collision or per-run IDs.
  return url;
}

export function isRecentDate(date: string, now: Date, days = 30): boolean {
  const time = Date.parse(date);
  return Number.isFinite(time) && time >= now.getTime() - days * dayMs && time <= now.getTime();
}

export function classifyItem(
  item: NormalizedItem, source: SourceConfig,
  companies: RecentSnapshot['companies'], provinces: RecentSnapshot['provinces'], now: Date,
  facilities: RecentSnapshot['facilities'] = [],
): RecentItem | null {
  const url = canonicalRecentUrl(item.url);
  if (!url || !isRecentDate(item.publishedAt, now) || item.title.trim().length < 5) return null;
  const text = `${item.title} ${item.summary}`;
  const matchedFacilities=facilities.filter((facility)=>facility.aliases.some((alias)=>text.includes(alias)));
  if (!isRelevant({...item,category:source.recent?.category,facilityIds:matchedFacilities.map(facility=>facility.id)})) return null;
  const title = item.title.trim().replace(/\s+20\d{2}[-/]\d{1,2}[-/]\d{1,2}\s*$/, '');
  const companyIds = companies.filter((company) =>
    source.recent?.companies?.includes(company.id)
    || [company.name, ...company.aliases].some((name) => name.length >= 3 && text.toLowerCase().includes(name.toLowerCase())),
  ).map((company) => company.id);
  const nationalPolicy = /国务院|中共中央|国家发展改革委|工业和信息化部/.test(item.title)
    && /政策|意见|办法|通知|规定|规划/.test(item.title);
  const geographyText = text.replace(/吉林一号|酒泉卫星发射中心/g, '');
  const provinceIds = nationalPolicy ? ['全国'] : provinces.filter((province) =>
    province.id !== '全国' && province.id !== '未明确'
    && [province.name, ...province.aliases].some((name) => geographyText.includes(name)),
  ).map((province) => province.id);
  if (!provinceIds.length && source.recent?.publisher_region === '全国' && item.region === 'cn') provinceIds.push('全国');
  if(!nationalPolicy) provinceIds.push(...matchedFacilities.map((facility)=>facility.province));
  const focus: RecentItem['focus']=[];
  if(matchedFacilities.length || /发射场|航天港|海上发射母港|商业航天发射中心/.test(text)) focus.push('spaceport');
  if(/遥测|测运控|测控|地面站|星地通信|星敏感器|深空通信/.test(text) || (source.recent?.category==='company'&&source.recent.focus==='ttc')) focus.push('ttc');
  const rawSummary = item.summary.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return {
    id: recentId(url), title, url,
    publishedAt: new Date(item.publishedAt).toISOString(), fetchedAt: now.toISOString(),
    datePrecision: source.type === 'rss'||source.type==='google_news_rss' ? 'time' : 'date',
    publisher: item.publisherName || source.name, sourceIds: [source.key],
    region: item.region, provinces: item.region === 'cn' ? (provinceIds.length ? unique(provinceIds) : ['未明确']) : [],
    companyIds, category: source.recent?.category ?? 'news',
    summary: rawSummary === `官方发布：${item.title}` ? '' : rawSummary.slice(0, 160),
    ...(item.language === 'en' ? { originalTitle: item.originalTitle || item.title } : {}),
    focus,facilityIds:matchedFacilities.map((facility)=>facility.id),
    milestone: focus.includes('spaceport') || ['approval','procurement'].includes(source.recent?.category??'') ? milestoneFromTitle(item.title) : undefined,
    accessLimited: new URL(url).hostname==='news.google.com',
  };
}

export function milestoneFromTitle(title:string):RecentItem['milestone'] {
  if(/不予批准|撤销|终止|取消.{0,8}招标/.test(title)) return 'withdrawn';
  if(/中标候选|成交候选/.test(title))return 'award_candidate';
  if(/中标|成交|定标/.test(title)) return 'award';
  if(/招标|采购|询价|遴选|比选/.test(title)) return 'tender';
  if(/环评|环境影响/.test(title)) return /拟|受理|征求意见|报批前/.test(title)?'eia_notice':/批复|审批决定|准予许可/.test(title)?'eia_approved':'eia_notice';
  if(/用地|选址|土地|海域使用/.test(title)) return 'land_notice';
  if(/规划/.test(title)&&/公示|公告|征求意见/.test(title)) return 'planning_notice';
  if(/开工|施工|建设进展|竣工|主体结构|封顶/.test(title)) return 'construction_update';
  if(/投运|投入使用|首次发射|成功发射/.test(title)) return 'operational_update';
  return undefined;
}

export function buildRecentSnapshot(input: {
  previous?: RecentSnapshot; incoming: RecentItem[]; sources: RecentSnapshot['sources'];
  companies: RecentSnapshot['companies']; provinces: RecentSnapshot['provinces']; now: Date;
  facilities?:RecentSnapshot['facilities'];
}): RecentSnapshot {
  const merged = new Map<string, RecentItem>();
  const allowedSources = new Set(input.sources.filter((source) => source.selected).map((source) => source.id));
  for (const item of [...(input.previous?.items ?? []), ...input.incoming]) {
    const url = canonicalRecentUrl(item.url);
    const sourceIds = item.sourceIds.filter((id) => allowedSources.has(id));
    if (!url || !sourceIds.length || !isRelevant(item) || !isRecentDate(item.publishedAt, input.now)) continue;
    const previous = merged.get(url);
    merged.set(url, { ...item, url, id: recentId(url),
      sourceIds: unique([...(previous?.sourceIds ?? []), ...sourceIds]),
      companyIds: unique([...(previous?.companyIds ?? []), ...item.companyIds]),
      provinces: unique([...(previous?.provinces ?? []), ...item.provinces]).filter((id, _, all) => id !== '未明确' || all.length === 1),
      focus:unique([...(previous?.focus??[]),...item.focus]) as RecentItem['focus'],
      facilityIds:unique([...(previous?.facilityIds??[]),...item.facilityIds]),
    });
  }
  // New project aliases also apply to metadata already in the rolling window.
  // This links construction components without refetching their articles.
  if(input.facilities){
    const validIds=new Set(input.facilities.map(facility=>facility.id));
    for(const item of merged.values()){
      const matched=input.facilities.filter(facility=>facility.aliases.some(alias=>`${item.title} ${item.summary}`.includes(alias)));
      item.facilityIds=unique([...item.facilityIds.filter(id=>validIds.has(id)),...matched.map(facility=>facility.id)]);
      if(item.facilityIds.length)item.focus=unique([...item.focus,'spaceport']) as RecentItem['focus'];
    }
  }
  const all = [...merged.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
  const items = all.slice(0, 2000);
  let lastDataUpdatedAt = input.previous?.lastDataUpdatedAt ?? null;
  if (input.sources.some((source) => source.selected && source.status === 'ok' && source.recentCount > 0)) lastDataUpdatedAt = input.now.toISOString();
  const snapshot: RecentSnapshot = {
    schemaVersion: 1, builtAt: input.now.toISOString(), lastDataUpdatedAt,
    retentionDays: 30, limit: 2000, coverageStart: items.at(-1)?.publishedAt ?? null,
    truncated: all.length > items.length, items, sources: input.sources,
    companies: input.companies, provinces: input.provinces,
    facilities:input.facilities??[],
    lastCheckedAt:input.sources.some((source)=>source.selected&&!source.skipped&&['ok','empty'].includes(source.status))?input.now.toISOString():input.previous?.lastCheckedAt??null,
  };
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > snapshotByteLimit) {
    snapshot.items = snapshot.items.map((item) => ({ ...item, summary: '' }));
  }
  while (new TextEncoder().encode(JSON.stringify(snapshot)).length > snapshotByteLimit && snapshot.items.length) {
    snapshot.items.pop(); snapshot.truncated = true;
  }
  snapshot.coverageStart = snapshot.items.at(-1)?.publishedAt ?? null;
  return recentSnapshotSchema.parse(snapshot);
}

export function filterRecentItems(snapshot: RecentSnapshot, filters: {
  region?: string; province?: string; company?: string; category?: string; query?: string; days?: number; focus?:string; facility?:string;
}, now = new Date()): RecentItem[] {
  const query = filters.query?.trim().toLowerCase() || '';
  const companyNames = new Map(snapshot.companies.map((company) => [company.id, company.name]));
  return snapshot.items.filter((item) => isRecentDate(item.publishedAt, now, Math.min(30, Math.max(1, filters.days || 7)))
    && (!filters.region || filters.region === 'all' || item.region === filters.region)
    && (!filters.province || item.provinces.includes(filters.province))
    && (!filters.company || item.companyIds.includes(filters.company))
    && (!filters.category || item.category === filters.category)
    && (!filters.focus || item.focus.includes(filters.focus as 'spaceport'|'ttc'))
    && (!filters.facility || item.facilityIds.includes(filters.facility))
    && (!query || `${item.title} ${item.publisher} ${item.companyIds.map((id) => companyNames.get(id)).join(' ')}`.toLowerCase().includes(query)));
}
