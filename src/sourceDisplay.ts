import type { SourceAccessStatus, SourceConfig, SourcePublicCategory, SourceType } from './ingestion/types';

export type SourceDisplayMetadata = {
  publicCategory: SourcePublicCategory;
  publicCategoryLabel: string;
  accessDomestic: SourceAccessStatus;
  accessGlobal: SourceAccessStatus;
  accessNote: string | null;
  publicBadge: string | null;
};

const publicCategoryLabels: Record<SourcePublicCategory, string> = {
  official: '官方机构',
  media: '专业媒体',
  organization: '行业组织',
  notice: '公告信息',
  data: '数据来源',
  source: '来源',
};

const defaultCategoryByType: Record<SourceType, SourcePublicCategory> = {
  api: 'data',
  rss: 'media',
  google_news_rss: 'source',
  rsshub: 'source',
  official_page: 'official',
  procurement_page: 'notice',
};

export function publicCategoryLabel(category: SourcePublicCategory): string {
  return publicCategoryLabels[category];
}

export function sourceDisplayName(source: Pick<SourceConfig, 'name' | 'type' | 'public_category'>): string {
  if (source.public_category === 'source' || source.type === 'google_news_rss') {
    return source.name.replace(/^Google News RSS\s*-\s*/i, '').replace(/^Google News\s*-\s*/i, '').trim() || '来源';
  }

  return source.name;
}

export function sourceDisplayMetadata(source: SourceConfig): SourceDisplayMetadata {
  const publicCategory = source.public_category ?? defaultCategoryByType[source.type];

  return {
    publicCategory,
    publicCategoryLabel: publicCategoryLabel(publicCategory),
    accessDomestic: source.access_domestic ?? (source.region === 'cn' ? 'direct' : 'unknown'),
    accessGlobal: source.access_global ?? 'direct',
    accessNote: source.access_note ?? null,
    publicBadge: source.public_badge ?? null,
  };
}

export function articlePublisherLabel(input: {
  publisherName?: string | null;
  sourceName: string;
  sourceType: string;
}): string {
  if (input.publisherName?.trim()) {
    return input.publisherName.trim();
  }

  if (input.sourceType === 'google_news_rss') {
    return input.sourceName.replace(/^Google News RSS\s*-\s*/i, '').replace(/^Google News\s*-\s*/i, '').trim() || '来源';
  }

  return input.sourceName;
}
