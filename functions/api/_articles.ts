import type { ArticleDetailRow, ArticleEntityRef, ArticleLaunchRef, ArticleSummaryRow } from '../../src/db/articleQueries';
import { normalizeHttpUrl } from '../../src/config/url';
import type { FeedItem } from '../../src/data';
import type { SourceType } from '../../src/ingestion/types';
import sourcesConfig from '../../config/sources.generated.json';
import { parseSourcesConfig } from '../../src/ingestion/sourceConfig';
import { defaultPublicCategoryByType } from '../../src/sourceMetadata';
import { publicCategoryLabel, sourceDisplayMetadata, sourceDisplayName, stripAggregatorPrefix } from '../../src/sourceDisplay';
import { displayRegion } from '../../src/utils';

export type PublicArticleSummary = Omit<
  ArticleSummaryRow,
  'sourceKey' | 'sourceType' | 'fetchStatus' | 'translationStatus' | 'translationProvider' | 'storyKey' | 'language' | 'region' | 'url'
> & {
  url: string | null;
  sourceCategoryLabel: string;
  regionLabel: FeedItem['region'];
};

export type PublicArticleDetail = PublicArticleSummary & {
  launches: PublicArticleLaunch[];
};

export type PublicArticleLaunch = ArticleLaunchRef;
export type PublicArticleEntity = ArticleEntityRef;

export type PublicArticleListResult = {
  items: PublicArticleSummary[];
  page: number;
  limit: number;
  hasMore: boolean;
};

const articleSources = parseSourcesConfig(sourcesConfig);
const articleSourceByKey = new Map(articleSources.map((source) => [source.key, source]));
const articleSourceMetadataByKey = new Map(articleSources.map((source) => [source.key, sourceDisplayMetadata(source)]));
const domesticRegionFilters = new Set(['cn', 'china', 'domestic', '中国', '国内']);
const globalRegionFilters = new Set(['global', 'international', 'intl', 'overseas', 'foreign', '国际', '国外']);
const policyCategoryFilters = new Set(['policy', '政策', '政策监管', '官方机构', '公告信息']);

function trimmedText(value: string): string {
  return value.trim();
}

function normalizedArticleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizedFilterText(value: string | undefined): string {
  return value ? normalizedArticleText(value).toLowerCase() : '';
}

function publicFilterMatches(values: Set<string>, normalized: string): boolean {
  return values.has(normalized) || values.has(normalized.replace(/\s+/g, ''));
}

function displayText(value: string, fallback: string): string {
  return normalizedArticleText(value) || fallback;
}

function trimmedNullableText(value: string | null | undefined): string | null {
  const trimmed = value ? normalizedArticleText(value) : '';

  return trimmed || null;
}

function publicDisplayLabel(value: string): string {
  return stripAggregatorPrefix(value).replace(/\s+/g, ' ').trim();
}

function publicSourceLabel(value: string): string {
  return publicDisplayLabel(value) || '来源';
}

function publicLabelKey(value: string): string {
  return value.toLocaleLowerCase('en-US');
}

function publicPublisherLabel(value: string | null | undefined, sourceName: string, fallbackSourceName: string): string | null {
  const label = value ? publicDisplayLabel(value) : '';
  const fallbackLabel = publicDisplayLabel(fallbackSourceName);
  const sourceLabel = publicDisplayLabel(sourceName);
  const labelKey = publicLabelKey(label);

  if (!label || labelKey === publicLabelKey(sourceLabel) || labelKey === publicLabelKey(fallbackLabel)) {
    return null;
  }

  return label;
}

function publicRelatedSourceLabels(values: string[] | undefined): string[] | undefined {
  if (!values) {
    return undefined;
  }

  const labels = values.map(publicDisplayLabel).filter(Boolean);
  const seenLabels = new Set<string>();

  return labels.filter((label) => {
    const key = publicLabelKey(label);

    if (seenLabels.has(key)) {
      return false;
    }

    seenLabels.add(key);
    return true;
  });
}

function publicArticleLaunch(row: ArticleLaunchRef): PublicArticleLaunch {
  const externalId = trimmedText(row.externalId);
  const name = normalizedArticleText(row.name) || normalizedArticleText(row.missionName) || externalId || `发射任务 #${row.id}`;
  const missionName = normalizedArticleText(row.missionName) || name;

  return {
    id: row.id,
    externalId,
    missionName,
    name,
  };
}

function publicArticleLaunchKey(launch: PublicArticleLaunch): string {
  return String(launch.id || launch.externalId || launch.name).toLocaleLowerCase('en-US');
}

function hasExplicitLaunchLabel(row: ArticleLaunchRef): boolean {
  return Boolean(normalizedArticleText(row.name) || normalizedArticleText(row.missionName));
}

function hasFallbackLaunchLabel(launch: PublicArticleLaunch): boolean {
  return launch.name === (launch.externalId || `发射任务 #${launch.id}`);
}

function publicArticleLaunches(values: ArticleLaunchRef[]): PublicArticleLaunch[] {
  const launches: PublicArticleLaunch[] = [];
  const indexByKey = new Map<string, number>();

  for (const value of values) {
    const launch = publicArticleLaunch(value);
    const key = publicArticleLaunchKey(launch);
    const existingIndex = indexByKey.get(key);

    if (existingIndex !== undefined) {
      if (hasFallbackLaunchLabel(launches[existingIndex]) && hasExplicitLaunchLabel(value)) {
        launches[existingIndex] = { ...launch, externalId: launches[existingIndex].externalId };
      }

      continue;
    }

    indexByKey.set(key, launches.length);
    launches.push(launch);
  }

  return launches;
}

function publicArticleEntity(row: ArticleEntityRef): PublicArticleEntity | null {
  const slug = trimmedText(row.slug);

  if (!slug) {
    return null;
  }

  const name = normalizedArticleText(row.name) || slug;

  return {
    slug,
    name,
  };
}

function publicArticleEntities(values: ArticleEntityRef[]): PublicArticleEntity[] {
  const entities: PublicArticleEntity[] = [];
  const indexBySlug = new Map<string, number>();

  for (const value of values) {
    const entity = publicArticleEntity(value);

    if (!entity) {
      continue;
    }

    const key = entity.slug.toLocaleLowerCase('en-US');
    const existingIndex = indexBySlug.get(key);

    if (existingIndex !== undefined) {
      const existing = entities[existingIndex];
      const explicitName = normalizedArticleText(value.name);

      if (existing.name === existing.slug && explicitName) {
        entities[existingIndex] = { ...entity, slug: existing.slug };
      }

      continue;
    }

    indexBySlug.set(key, entities.length);
    entities.push(entity);
  }

  return entities;
}

export function publicArticleRegionFilter(value: string | undefined): string | undefined {
  const normalized = normalizedFilterText(value);

  if (!normalized) {
    return undefined;
  }

  if (publicFilterMatches(domesticRegionFilters, normalized)) {
    return 'cn';
  }

  if (publicFilterMatches(globalRegionFilters, normalized)) {
    return 'global';
  }

  return normalized;
}

export function publicArticleCategoryFilter(value: string | undefined): string | undefined {
  const normalized = normalizedFilterText(value);

  if (!normalized) {
    return undefined;
  }

  return publicFilterMatches(policyCategoryFilters, normalized) ? 'policy' : normalized;
}

export function publicArticleSummary(row: ArticleSummaryRow): PublicArticleSummary {
  const configuredSource = articleSourceByKey.get(row.sourceKey);
  const sourceMetadata = articleSourceMetadataByKey.get(row.sourceKey);
  const fallbackCategory = defaultPublicCategoryByType[row.sourceType as SourceType] ?? 'source';
  const sourceCategoryLabel = sourceMetadata?.publicCategoryLabel ?? publicCategoryLabel(fallbackCategory);
  const sourceName = configuredSource ? sourceDisplayName(configuredSource) : publicSourceLabel(row.sourceName);
  const publisherName = publicPublisherLabel(row.publisherName, sourceName, row.sourceName);
  const relatedSourceLabels = publicRelatedSourceLabels(row.relatedSources);
  const relatedSourceCount = relatedSourceLabels ? relatedSourceLabels.length : row.relatedSourceCount;
  const relatedSources = relatedSourceLabels && relatedSourceLabels.length > 1 ? relatedSourceLabels : undefined;

  return {
    id: row.id,
    title: displayText(row.title, '标题待确认'),
    originalTitle: trimmedNullableText(row.originalTitle),
    summary: displayText(row.summary, '摘要待确认'),
    originalSummary: trimmedNullableText(row.originalSummary),
    url: normalizeHttpUrl(row.url),
    sourceName,
    sourceCategoryLabel,
    publisherName,
    publishedAt: trimmedText(row.publishedAt),
    regionLabel: displayRegion(row.region),
    tags: publicArticleEntities(row.tags),
    companies: publicArticleEntities(row.companies),
    relatedSourceCount,
    relatedSources,
  };
}

export function publicArticleDetail(row: ArticleDetailRow): PublicArticleDetail {
  return {
    ...publicArticleSummary(row),
    launches: publicArticleLaunches(row.launches),
  };
}

export function publicArticleListResult(result: { items: ArticleSummaryRow[]; page: number; limit: number; hasMore: boolean }): PublicArticleListResult {
  return {
    ...result,
    items: result.items.map(publicArticleSummary),
  };
}

export function publicArticleCollection<T extends { articles: ArticleSummaryRow[] }>(value: T): Omit<T, 'articles'> & { articles: PublicArticleSummary[] } {
  return {
    ...value,
    articles: value.articles.map(publicArticleSummary),
  };
}
