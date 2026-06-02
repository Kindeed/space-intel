import sourcesConfig from '../../../../config/sources.generated.json';
import {
  createCollectorRegistry,
  googleNewsRssCollector,
  officialPageCollector,
  parseSourcesConfig,
  procurementPageCollector,
  rssCollector,
  rsshubCollector,
  runSourceIngestion,
  spaceflightNewsCollector,
  type SourceConfig,
} from '../../../../src/ingestion';
import type { TranslationEnv } from '../../../../src/translation';
import { adminIngestionFailureMessage, adminSourceNotConfiguredResponse, logAdminError, requireAdminRequest, type AdminEnv } from '../../_admin';
import { findEnabledAdminSourceByKey } from './_sources';

type Env = TranslationEnv & AdminEnv & {
  DB: D1Database;
};

function requestedSourceKey(request: Request): string {
  return new URL(request.url).searchParams.get('key')?.trim() ?? '';
}

function isManualArticleIngestionSource(source: SourceConfig): boolean {
  return (
    source.enabled &&
    (source.key === 'snapi' ||
      source.type === 'rss' ||
      source.type === 'rsshub' ||
      source.type === 'google_news_rss' ||
      source.type === 'official_page' ||
      source.type === 'procurement_page')
  );
}

export function findManualArticleIngestionSourceByKey(sources: SourceConfig[], key: string): SourceConfig | null {
  const source = findEnabledAdminSourceByKey(sources, key);
  return source && isManualArticleIngestionSource(source) ? source : null;
}

const registry = createCollectorRegistry([
  spaceflightNewsCollector,
  rssCollector,
  rsshubCollector,
  googleNewsRssCollector,
  officialPageCollector,
  procurementPageCollector,
]);

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  const source = findManualArticleIngestionSourceByKey(parseSourcesConfig(sourcesConfig), requestedSourceKey(request));

  if (!source) {
    return adminSourceNotConfiguredResponse();
  }

  try {
    const result = await runSourceIngestion(
      env.DB,
      source,
      registry,
      {
        fetch: (input, init) => fetch(input, init),
        now: () => new Date(),
      },
      {
        translationEnv: env,
      },
    );

    return Response.json(result);
  } catch (error) {
    logAdminError(`Failed to run single-source ingestion for ${source.key}`, error);
    return Response.json({
      sourceKey: source.key,
      collected: 0,
      inserted: 0,
      skipped: 0,
      failures: 1,
      error: adminIngestionFailureMessage,
    });
  }
};
