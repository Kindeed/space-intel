import type { SourceAccessStatus, SourcePublicCategory, SourceRegion, SourceType } from './ingestion/types';

export const defaultPublicCategoryByType: Record<SourceType, SourcePublicCategory> = {
  api: 'data',
  rss: 'media',
  google_news_rss: 'source',
  rsshub: 'source',
  official_page: 'official',
  procurement_page: 'notice',
};

export function defaultDomesticAccess(region: SourceRegion): SourceAccessStatus {
  return region === 'cn' ? 'direct' : 'unknown';
}
