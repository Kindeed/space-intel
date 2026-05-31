import { slugify, type FeedItem, type FeedLink } from './data';
import { normalizeHttpUrl } from './config/url';
import { normalizeBoundedPositiveInteger, normalizePositiveInteger } from './number';
import { articlePublisherLabel, stripAggregatorPrefix } from './sourceDisplay';
import type { ApiArticleDetail, ApiArticleEntity, ApiArticleSummary, FeedStory } from './types';

export function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  return normalizePositiveInteger(value, fallback);
}

export function parseBoundedPositiveInteger(value: string | null, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }

  return normalizeBoundedPositiveInteger(value, fallback, max);
}

function normalizeSearchParamText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function compactSearchParamText(value: string): string {
  return value.replace(/\s+/g, '');
}

export function setTrimmedSearchParam(params: URLSearchParams, key: string, value: string | null): void {
  const trimmed = value ? normalizeSearchParamText(value) : '';

  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function trimmedSearchParams(searchParams: URLSearchParams, keys: string[]): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of keys) {
    setTrimmedSearchParam(params, key, searchParams.get(key));
  }

  return params;
}

export function filterFormPath(basePath: string, formData: FormData, keys: string[]): string {
  const submittedParams = new URLSearchParams();

  for (const key of keys) {
    const value = formData.get(key);

    if (typeof value === 'string') {
      submittedParams.set(key, value);
    }
  }

  const params = trimmedSearchParams(submittedParams, keys);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function setPositiveIntegerSearchParam(params: URLSearchParams, key: string, value: string | null, max?: number): void {
  const parsed = parsePositiveInteger(value, 0);

  if (parsed > 0) {
    params.set(key, String(max ? Math.min(parsed, max) : parsed));
  }
}

export function shouldShowEmptyState(isLoading: boolean, error: Error | null | undefined, itemCount: number): boolean {
  return !isLoading && !error && itemCount === 0;
}

export function displayRegion(region: string): FeedItem['region'] {
  const normalized = region.replace(/\s+/g, ' ').trim().toLowerCase();
  const compact = normalized.replace(/\s+/g, '');

  if (['cn', 'china', 'domestic', '中国', '国内'].includes(normalized) || compact === '国内') {
    return '国内';
  }

  if (['global', 'international', 'intl', 'overseas', 'foreign', '国际', '国外'].includes(normalized) || compact === '国际' || compact === '国外') {
    return '国际';
  }

  return '地区待确认';
}

export function displayTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间待定';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatLaunchWindow(value: string | null): string {
  if (!value) {
    return '窗口待定';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '窗口待定';
  }

  const now = new Date();
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
  const nowKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(now);
  const time = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  if (dateKey === nowKey) {
    return `今天 ${time}`;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function launchProximity(value: string | null, fallback?: string): string {
  if (!value) {
    return fallback ?? '待定';
  }

  const date = new Date(value);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  if (!Number.isFinite(diffDays)) {
    return fallback ?? '待定';
  }

  if (diffDays <= -1) {
    return '已完成';
  }

  if (diffDays === 0) {
    return '今天';
  }

  if (diffDays === 1) {
    return '明天';
  }

  return `约 ${diffDays} 天后`;
}

export function displayLaunchStatus(status: string): string {
  const normalized = status.replace(/\s+/g, ' ').trim().toLowerCase();
  const compact = normalized.replace(/\s+/g, '');

  if (
    normalized.includes('fail') ||
    normalized.includes('unsuccess') ||
    compact.includes('不成功') ||
    compact.includes('失败') ||
    compact.includes('异常')
  ) {
    return '发射异常';
  }

  if (normalized.includes('no go') || normalized.includes('no-go') || compact.includes('nogo') || normalized.includes('hold') || compact.includes('等待')) {
    return '等待窗口';
  }

  if (normalized.includes('success') || compact.includes('成功')) {
    return '发射成功';
  }

  if (/(^|[^a-z])go([^a-z]|$)/.test(normalized)) {
    return '准备发射';
  }

  if (normalized.includes('confirm') || compact.includes('确认')) {
    return '待确认';
  }

  if (normalized.includes('tbd') || normalized.includes('tbc') || normalized.includes('to be determined') || normalized.includes('to be confirmed')) {
    return '待确认';
  }

  if (normalized.includes('review') || compact.includes('评审')) {
    return '任务评审';
  }

  return '状态待定';
}

export function isNotFoundError(error: Error): boolean {
  return /\b404\b/.test(error.message);
}

export function friendlyError(error: Error | null, context: string, notFoundMessage?: string): string | null {
  if (!error) {
    return null;
  }

  if (isNotFoundError(error)) {
    return notFoundMessage ?? `${context}已更新或暂时不可访问。`;
  }

  return `${context}暂不可用，请稍后重试。`;
}

export function safeLoadMessage(context: string): string {
  return `${context}暂不可用，请稍后重试。`;
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  return normalizeHttpUrl(value);
}

export function displayCompanyName(name: string | null | undefined, fallback = '公司'): string {
  return name ? normalizeSearchParamText(name) || fallback : fallback;
}

export function displayCompanyMetadata(value: string | null | undefined, fallback: string): string {
  return value ? normalizeSearchParamText(value) || fallback : fallback;
}

export function displayArticleText(value: string | null | undefined, fallback: string): string {
  return value ? normalizeSearchParamText(value) || fallback : fallback;
}

export function displayOptionalArticleText(value: string | null | undefined): string | null {
  const trimmed = value ? normalizeSearchParamText(value) : '';

  return trimmed || null;
}

export function displayTopicName(name: string | null | undefined, fallback = '专题'): string {
  return name ? normalizeSearchParamText(name) || fallback : fallback;
}

export function displayTopicCategory(category: string | null | undefined, fallback = '专题'): string {
  return category ? normalizeSearchParamText(category) || fallback : fallback;
}

function articleLinks(values: ApiArticleEntity[] | undefined): FeedLink[] {
  return values?.map((value) => ({ slug: value.slug, name: value.name })) ?? [];
}

function hasDistinctPublisher(row: Pick<ApiArticleSummary, 'publisherName' | 'sourceName'>): boolean {
  const publisherName = row.publisherName ? stripAggregatorPrefix(row.publisherName) : '';
  const sourceName = stripAggregatorPrefix(row.sourceName) || '来源';

  return Boolean(publisherName && publisherName.toLocaleLowerCase('en-US') !== sourceName.toLocaleLowerCase('en-US'));
}

export function articleSourceFilterValue(row: Pick<ApiArticleSummary, 'publisherName' | 'sourceName'>): string | undefined {
  return hasDistinctPublisher(row) ? undefined : articlePublisherLabel(row);
}

export function articleFromApi(row: ApiArticleSummary): FeedStory {
  const region = displayRegion(row.regionLabel);
  const source = articlePublisherLabel(row);
  const sourceCategoryKey = compactSearchParamText(row.sourceCategoryLabel);
  const isPolicyCategory = ['官方机构', '公告信息'].includes(sourceCategoryKey);
  const sourceFilter = articleSourceFilterValue(row);

  return {
    slug: String(row.id),
    title: displayArticleText(row.title, '标题待确认'),
    source,
    sourceFilter,
    time: displayTime(row.publishedAt),
    category: isPolicyCategory ? '政策监管' : region === '国内' ? '国内商业航天' : region === '国际' ? '国际商业航天' : '商业航天',
    region,
    summary: displayArticleText(row.summary, '摘要待确认'),
    companies: articleLinks(row.companies),
    tags: articleLinks(row.tags),
    url: row.url ?? undefined,
    relatedSourceCount: row.relatedSourceCount,
    relatedSources: row.relatedSources,
  };
}

export function articleSourceFilterPath(source: string | null | undefined): string | null {
  const trimmed = source ? normalizeSearchParamText(source) : '';
  const compact = compactSearchParamText(trimmed);

  if (!trimmed || compact === '来源') {
    return null;
  }

  const params = new URLSearchParams({ source: trimmed });

  return `/articles?${params.toString()}`;
}

export function articleRegionFilterPath(region: string): string | null {
  const displayLabel = displayRegion(region);

  if (displayLabel === '国内') {
    return '/articles?region=cn';
  }

  if (displayLabel === '国际') {
    return '/articles?region=global';
  }

  return null;
}

function normalizedLaunchProvider(provider: string | null | undefined): string | null {
  const trimmed = provider ? normalizeSearchParamText(provider) : '';
  const compact = compactSearchParamText(trimmed);

  if (!trimmed || compact === '待定' || compact === '发射商待定') {
    return null;
  }

  return trimmed;
}

function normalizedLaunchMetadata(value: string | null | undefined): string | null {
  const trimmed = value ? normalizeSearchParamText(value) : '';

  return trimmed || null;
}

export function displayLaunchProvider(provider: string | null | undefined, fallback = '发射商待定'): string {
  return normalizedLaunchProvider(provider) ?? fallback;
}

export function displayLaunchMission(mission: string | null | undefined, fallback = '发射任务'): string {
  return normalizedLaunchMetadata(mission) ?? fallback;
}

export function displayLaunchRocket(rocket: string | null | undefined, fallback = '火箭型号未披露'): string {
  return normalizedLaunchMetadata(rocket) ?? fallback;
}

export function displayLaunchSite(site: string | null | undefined, fallback = '场站待定'): string {
  return normalizedLaunchMetadata(site) ?? fallback;
}

export function launchProviderFilterPath(provider: string | null | undefined): string | null {
  const trimmed = normalizedLaunchProvider(provider);

  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({ provider: trimmed });

  return `/launches?${params.toString()}`;
}

export function articleCompanyFilterPath(company: string | null | undefined): string | null {
  const trimmed = company ? normalizeSearchParamText(company) : '';

  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({ company: trimmed });

  return `/articles?${params.toString()}`;
}

export function articleTopicFilterPath(topic: string | null | undefined): string | null {
  const trimmed = topic ? normalizeSearchParamText(topic) : '';

  if (!trimmed) {
    return null;
  }

  const params = new URLSearchParams({ tag: trimmed });

  return `/articles?${params.toString()}`;
}

export function displayRelatedSourceNames(sources: string[] | null | undefined, limit = 4): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const source of sources ?? []) {
    const label = stripAggregatorPrefix(source);
    const key = label.toLocaleLowerCase('en-US');

    if (!label || seen.has(key)) {
      continue;
    }

    seen.add(key);
    names.push(label);

    if (names.length >= limit) {
      break;
    }
  }

  return names;
}

export function articleListApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const apiParams = trimmedSearchParams(searchParams, ['region', 'source', 'tag', 'company', 'query', 'category']);

  apiParams.set('page', String(page));
  apiParams.set('limit', String(limit));
  return `/api/articles?${apiParams.toString()}`;
}

export function pageHref(searchParams: URLSearchParams, page: number): string {
  const nextParams = trimmedSearchParams(searchParams, ['region', 'source', 'tag', 'company', 'query', 'category']);
  setPositiveIntegerSearchParam(nextParams, 'limit', searchParams.get('limit'), 50);
  nextParams.set('page', String(page));
  return `/articles?${nextParams.toString()}`;
}

export function tagName(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return displayTopicName(value.name, '专题记录');
}

export function tagSlug(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return value.slug;
}

export function companyName(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return displayCompanyName(value.name, '公司档案');
}

export function companySlug(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return value.slug;
}

export function launchLabel(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return displayLaunchMission(value.missionName || value.name || value.externalId || String(value.id), '发射任务');
}

export function launchSlug(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return String(value.id || value.externalId || slugify(launchLabel(value)));
}
