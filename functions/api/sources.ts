import sourcesConfig from '../../config/sources.generated.json';
import { listEnabledSources } from '../../src/db';
import { parseSourcesConfig, type SourceAccessStatus, type SourcePublicCategory } from '../../src/ingestion';
import {
  accessStatusLabel,
  accessStatusRank,
  compareDisplayText,
  publicCategoryRank,
  sourceAccessSummaryLabel,
  sourceDisplayMetadata,
  sourceDisplayName,
  stripAggregatorPrefix,
} from '../../src/sourceDisplay';
import { logApiError, publicError } from './_response';

type Env = {
  DB: D1Database;
};

function fallbackSourceDisplayName(name: string): string {
  return stripAggregatorPrefix(name) || '来源';
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const configuredSources = parseSourcesConfig(sourcesConfig);
    const metadataByKey = new Map(configuredSources.map((source) => [source.key, source]));
    const configuredEnabledKeys = new Set(configuredSources.filter((source) => source.enabled).map((source) => source.key));
    const enabledSources = (await listEnabledSources(env.DB)).filter((source) => configuredEnabledKeys.has(source.key));
    const items = enabledSources.map((source) => {
      const configured = metadataByKey.get(source.key);
      const metadata = configured
        ? sourceDisplayMetadata(configured)
        : {
            publicCategory: 'source' as SourcePublicCategory,
            publicCategoryLabel: '来源',
            accessDomestic: 'unknown' as SourceAccessStatus,
            accessGlobal: 'unknown' as SourceAccessStatus,
            accessNote: null,
            publicBadge: null,
          };

      return {
        name: configured ? sourceDisplayName(configured) : fallbackSourceDisplayName(source.name),
        publicCategory: metadata.publicCategory,
        publicCategoryLabel: metadata.publicCategoryLabel,
        domesticAccessLabel: accessStatusLabel(metadata.accessDomestic),
        globalAccessLabel: accessStatusLabel(metadata.accessGlobal),
        accessNote: metadata.accessNote,
        publicBadge: metadata.publicBadge,
        accessDomestic: metadata.accessDomestic,
      };
    });
    const publicStatsWithCounts = items.reduce<
      Array<{
        category: SourcePublicCategory;
        label: string;
        count: number;
        directCount: number;
        limitedCount: number;
        blockedCount: number;
        unknownCount: number;
      }>
    >((acc, source) => {
      const existing = acc.find((item) => item.category === source.publicCategory);
      const target =
        existing ??
        {
          category: source.publicCategory,
          label: source.publicCategoryLabel,
          count: 0,
          directCount: 0,
          limitedCount: 0,
          blockedCount: 0,
          unknownCount: 0,
        };

      target.count += 1;

      if (source.accessDomestic === 'direct') {
        target.directCount += 1;
      } else if (source.accessDomestic === 'limited') {
        target.limitedCount += 1;
      } else if (source.accessDomestic === 'blocked') {
        target.blockedCount += 1;
      } else {
        target.unknownCount += 1;
      }

      if (!existing) {
        acc.push(target);
      }

      return acc;
    }, []);
    const publicStats = publicStatsWithCounts
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
      }));
    const accessStatsWithStatus = items.reduce<Array<{ status: SourceAccessStatus; label: string; count: number }>>((acc, source) => {
      const label = accessStatusLabel(source.accessDomestic);
      const existing = acc.find((item) => item.status === source.accessDomestic);

      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status: source.accessDomestic, label, count: 1 });
      }

      return acc;
    }, []);
    const accessStats = accessStatsWithStatus
      .sort((left, right) => accessStatusRank(left.status) - accessStatusRank(right.status))
      .map(({ label, count }) => ({ label, count }));
    const publicItems = items
      .sort((left, right) => publicCategoryRank(left.publicCategory) - publicCategoryRank(right.publicCategory) || compareDisplayText(left.name, right.name))
      .map((source) => ({
        name: source.name,
        categoryLabel: source.publicCategoryLabel,
        domesticAccessLabel: source.domesticAccessLabel,
        globalAccessLabel: source.globalAccessLabel,
        accessNote: source.accessNote,
        publicBadge: source.publicBadge,
      }));

    return Response.json({ items: publicItems, publicStats, accessStats });
  } catch (error) {
    logApiError('Failed to list sources', error);
    return publicError();
  }
};
