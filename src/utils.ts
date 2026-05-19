import { slugify, type FeedItem, type FeedLink } from './data';
import type { ApiArticleDetail, ApiArticleEntity, ApiArticleSummary, FeedStory } from './types';

export function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function displayRegion(region: string): FeedItem['region'] {
  return ['cn', 'china', 'domestic', '中国', '国内'].includes(region.toLowerCase()) ? '国内' : '国际';
}

export function displayTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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
    return value;
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

  return `约 T+${diffDays} 天`;
}

export function displayLaunchStatus(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('success')) {
    return '发射成功';
  }

  if (normalized.includes('go')) {
    return '准备发射';
  }

  if (normalized.includes('confirm')) {
    return '待确认';
  }

  if (normalized.includes('review')) {
    return '任务评审';
  }

  if (normalized.includes('hold')) {
    return '等待窗口';
  }

  if (normalized.includes('fail')) {
    return '发射异常';
  }

  return status || '状态待定';
}

export function friendlyError(error: Error | null, context: string): string | null {
  if (!error) {
    return null;
  }

  if (error.message.includes('404')) {
    return `${context}已更新或暂时不可访问。`;
  }

  return `${context}暂不可用，请稍后重试。`;
}

export function safeLoadMessage(context: string): string {
  return `${context}暂不可用，请稍后重试。`;
}

function articleLinks(values: ApiArticleEntity[] | undefined): FeedLink[] {
  return values?.map((value) => ({ slug: value.slug, name: value.name })) ?? [];
}

export function articleFromApi(row: ApiArticleSummary): FeedStory {
  const region = displayRegion(row.region);

  return {
    slug: String(row.id),
    title: row.title,
    source: row.sourceName,
    sourceKey: row.sourceKey,
    time: displayTime(row.publishedAt),
    category: row.sourceType === 'official_page' ? '政策监管' : region === '国内' ? '国内商业航天' : '国际商业航天',
    region,
    summary: row.summary,
    companies: articleLinks(row.companies),
    tags: articleLinks(row.tags),
    url: row.url,
    relatedSourceCount: row.relatedSourceCount,
    relatedSources: row.relatedSources,
  };
}

export function articleListApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const apiParams = new URLSearchParams();

  for (const key of ['region', 'source', 'tag', 'company', 'query', 'category']) {
    const value = searchParams.get(key);

    if (value?.trim()) {
      apiParams.set(key, value);
    }
  }

  apiParams.set('page', String(page));
  apiParams.set('limit', String(limit));
  return `/api/articles?${apiParams.toString()}`;
}

export function pageHref(searchParams: URLSearchParams, page: number): string {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.set('page', String(page));
  return `/articles?${nextParams.toString()}`;
}

export function tagName(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return value.name;
}

export function tagSlug(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return value.slug;
}

export function companyName(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return value.name;
}

export function companySlug(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return value.slug;
}

export function launchLabel(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return value.missionName || value.name || value.externalId || String(value.id);
}

export function launchSlug(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return String(value.id || value.externalId || slugify(launchLabel(value)));
}
