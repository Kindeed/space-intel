import { slugify, type FeedItem } from './data';
import type { ApiArticleDetail, ApiArticleSummary, FeedStory } from './types';

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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function articleFromApi(row: ApiArticleSummary): FeedStory {
  const region = displayRegion(row.region);

  return {
    slug: String(row.id),
    title: row.title,
    source: row.sourceName,
    sourceKey: row.sourceKey,
    time: displayTime(row.publishedAt),
    category: region === '国内' ? '国内商业航天' : '国际商业航天',
    region,
    summary: row.summary,
    companies: [],
    tags: [row.sourceKey, row.language].filter(Boolean),
    url: row.url,
    relatedSourceCount: row.relatedSourceCount,
    relatedSources: row.relatedSources,
  };
}

export function articleListApiPath(searchParams: URLSearchParams, page: number, limit: number): string {
  const apiParams = new URLSearchParams();

  for (const key of ['region', 'source', 'tag', 'company', 'query']) {
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
  return typeof value === 'string' ? value : value.name;
}

export function tagSlug(value: NonNullable<ApiArticleDetail['tags']>[number]): string {
  return typeof value === 'string' ? slugify(value) : value.slug;
}

export function companyName(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return typeof value === 'string' ? value : value.name;
}

export function companySlug(value: NonNullable<ApiArticleDetail['companies']>[number]): string {
  return typeof value === 'string' ? slugify(value) : value.slug;
}

export function launchLabel(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return typeof value === 'string' ? value : (value.missionName ?? value.name ?? value.externalId ?? String(value.id ?? 'launch'));
}

export function launchSlug(value: NonNullable<ApiArticleDetail['launches']>[number]): string {
  return typeof value === 'string' ? slugify(value) : String(value.id ?? value.externalId ?? slugify(launchLabel(value)));
}
