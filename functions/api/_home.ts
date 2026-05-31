import type { HomeStats } from '../../src/db/homeQueries';
import sourcesConfig from '../../config/sources.generated.json';
import { defaultDomesticAccess } from '../../src/sourceMetadata';
import { parseSourcesConfig } from '../../src/ingestion/sourceConfig';
import { publicCategoryLabel, publicCategoryRank, sourceAccessSummaryLabel, sourceDisplayMetadata, sourceTypeFallbackCategory } from '../../src/sourceDisplay';
import type { SourcePublicCategory, SourceRegion } from '../../src/ingestion/types';

export type PublicHomeStats = {
  recentArticleCount: number;
  topicCount: number;
  enabledSourceCategories: Array<{ label: string; count: number; accessSummaryLabel: string }>;
};

const homeSourceMetadataByKey = new Map(
  parseSourcesConfig(sourcesConfig).map((source) => [source.key, sourceDisplayMetadata(source)]),
);

export function publicHomeStats(stats: HomeStats): PublicHomeStats {
  const categories = new Map<
    SourcePublicCategory,
    {
      count: number;
      directCount: number;
      limitedCount: number;
      blockedCount: number;
      unknownCount: number;
    }
  >();

  for (const source of stats.enabledSources) {
    const metadata = homeSourceMetadataByKey.get(source.key);
    const category = metadata?.publicCategory ?? sourceTypeFallbackCategory(source.type);
    const accessDomestic = metadata?.accessDomestic ?? defaultDomesticAccess(source.region as SourceRegion);
    const target =
      categories.get(category) ??
      {
        count: 0,
        directCount: 0,
        limitedCount: 0,
        blockedCount: 0,
        unknownCount: 0,
      };

    target.count += 1;
    if (accessDomestic === 'direct') {
      target.directCount += 1;
    } else if (accessDomestic === 'limited') {
      target.limitedCount += 1;
    } else if (accessDomestic === 'blocked') {
      target.blockedCount += 1;
    } else {
      target.unknownCount += 1;
    }
    categories.set(category, target);
  }

  return {
    recentArticleCount: stats.recentArticleCount,
    topicCount: stats.topicCount,
    enabledSourceCategories: Array.from(categories, ([category, counts]) => ({ category, label: publicCategoryLabel(category), ...counts }))
      .sort((left, right) => publicCategoryRank(left.category) - publicCategoryRank(right.category))
      .map(({ directCount, limitedCount, blockedCount, unknownCount, ...source }) => ({
        label: source.label,
        count: source.count,
        accessSummaryLabel: sourceAccessSummaryLabel({
          directCount,
          limitedCount,
          blockedCount,
          unknownCount,
        }),
      })),
  };
}
