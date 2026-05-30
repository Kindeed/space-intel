import sourcesConfig from '../../config/sources.generated.json';
import { listEnabledSources, listEnabledSourceTypeStats } from '../../src/db';
import { parseSourcesConfig, type SourceAccessStatus, type SourcePublicCategory } from '../../src/ingestion';
import { sourceDisplayMetadata, sourceDisplayName } from '../../src/sourceDisplay';
import { logApiError, publicError } from './_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const configuredSources = parseSourcesConfig(sourcesConfig);
    const metadataByKey = new Map(configuredSources.map((source) => [source.key, source]));
    const items = (await listEnabledSources(env.DB)).map((source) => {
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
        ...source,
        name: configured ? sourceDisplayName(configured) : source.name,
        ...metadata,
      };
    });
    const stats = await listEnabledSourceTypeStats(env.DB);
    const publicStats = items.reduce<
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
    const accessStats = items.reduce<Array<{ status: SourceAccessStatus; count: number }>>((acc, source) => {
      const existing = acc.find((item) => item.status === source.accessDomestic);

      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status: source.accessDomestic, count: 1 });
      }

      return acc;
    }, []);

    return Response.json({ items, stats, publicStats, accessStats });
  } catch (error) {
    logApiError('Failed to list sources', error);
    return publicError();
  }
};
