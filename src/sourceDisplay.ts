import type { SourceAccessStatus, SourceConfig, SourcePublicCategory, SourceType } from './ingestion/types';
import { defaultDomesticAccess, defaultPublicCategoryByType } from './sourceMetadata';

export type SourceDisplayMetadata = {
  publicCategory: SourcePublicCategory;
  publicCategoryLabel: string;
  accessDomestic: SourceAccessStatus;
  accessGlobal: SourceAccessStatus;
  accessNote: string | null;
  publicBadge: string | null;
};

export type SourceAccessCounts = {
  directCount: number;
  limitedCount: number;
  blockedCount: number;
  unknownCount: number;
};

const publicCategoryLabels: Record<SourcePublicCategory, string> = {
  official: '官方机构',
  media: '专业媒体',
  organization: '行业组织',
  notice: '公告信息',
  data: '数据来源',
  source: '来源',
};

const publicCategoryOrder: SourcePublicCategory[] = ['official', 'media', 'organization', 'notice', 'data', 'source'];
const accessStatusOrder: SourceAccessStatus[] = ['direct', 'limited', 'blocked', 'unknown'];

export function publicCategoryLabel(category: SourcePublicCategory): string {
  return publicCategoryLabels[category];
}

export function publicCategoryRank(category: SourcePublicCategory): number {
  const rank = publicCategoryOrder.indexOf(category);

  return rank >= 0 ? rank : publicCategoryOrder.length;
}

export function accessStatusLabel(status: SourceAccessStatus): string {
  const labels: Record<SourceAccessStatus, string> = {
    direct: '直连',
    limited: '可能受限',
    blocked: '受限',
    unknown: '待验证',
  };

  return labels[status];
}

export function accessStatusRank(status: SourceAccessStatus): number {
  const rank = accessStatusOrder.indexOf(status);

  return rank >= 0 ? rank : accessStatusOrder.length;
}

export function sourceAccessSummaryLabel(source: SourceAccessCounts): string {
  if (source.blockedCount) {
    return '部分受限';
  }

  if (source.limitedCount) {
    return '可能受限';
  }

  if (source.unknownCount) {
    return '待验证';
  }

  return '直连';
}

export function compareDisplayText(left: string, right: string): number {
  return left.localeCompare(right, 'zh-Hans-CN');
}

export function sourceTypeFallbackCategory(type: string): SourcePublicCategory {
  return defaultPublicCategoryByType[type as SourceType] ?? 'source';
}

export function sourceTypeFallbackLabel(type: string): string {
  return publicCategoryLabel(sourceTypeFallbackCategory(type));
}

function normalizeDisplayText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function optionalDisplayText(value: string | undefined): string | null {
  const trimmed = value ? normalizeDisplayText(value) : '';

  return trimmed || null;
}

export function stripAggregatorPrefix(name: string): string {
  let label = normalizeDisplayText(name);

  for (;;) {
    const next = normalizeDisplayText(
      label
        .replace(/^Google News RSS\s*-\s*/i, '')
        .replace(/^Google News\s*-\s*/i, '')
        .replace(/^RSSHub\s*-\s*/i, ''),
    );

    if (next === label) {
      return label;
    }

    label = next;
  }
}

export function sourceDisplayName(source: Pick<SourceConfig, 'name' | 'type' | 'public_category'>): string {
  if (source.public_category === 'source' || source.type === 'google_news_rss' || source.type === 'rsshub') {
    return stripAggregatorPrefix(source.name) || '来源';
  }

  return normalizeDisplayText(source.name) || '来源';
}

export function sourceDisplayMetadata(source: SourceConfig): SourceDisplayMetadata {
  const publicCategory = source.public_category ?? defaultPublicCategoryByType[source.type];

  return {
    publicCategory,
    publicCategoryLabel: publicCategoryLabel(publicCategory),
    accessDomestic: source.access_domestic ?? defaultDomesticAccess(source.region),
    accessGlobal: source.access_global ?? 'direct',
    accessNote: optionalDisplayText(source.access_note),
    publicBadge: optionalDisplayText(source.public_badge),
  };
}

export function articlePublisherLabel(input: {
  publisherName?: string | null;
  sourceName: string;
}): string {
  const publisherName = input.publisherName ? stripAggregatorPrefix(input.publisherName) : '';

  if (publisherName) {
    return publisherName;
  }

  return stripAggregatorPrefix(input.sourceName) || '来源';
}
