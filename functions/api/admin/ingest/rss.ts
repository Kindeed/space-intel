import sourcesConfig from '../../../../config/sources.generated.json';
import { createCollectorRegistry, parseSourcesConfig, rssCollector, rsshubCollector, runSourceIngestion, type SourceConfig } from '../../../../src/ingestion';
import type { TranslationEnv } from '../../../../src/translation';
import { adminIngestionFailureMessage, logAdminError, requireAdminRequest, type AdminEnv } from '../../_admin';

type Env = TranslationEnv & AdminEnv & {
  DB: D1Database;
};

export function isManualRssIngestionSource(source: SourceConfig): boolean {
  return (source.type === 'rss' || source.type === 'rsshub') && source.enabled;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  const sources = parseSourcesConfig(sourcesConfig).filter(isManualRssIngestionSource);
  const registry = createCollectorRegistry([rssCollector, rsshubCollector]);
  const results = [];

  for (const source of sources) {
    try {
      results.push(
        await runSourceIngestion(
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
        ),
      );
    } catch (error) {
      logAdminError(`Failed to run RSS ingestion for ${source.key}`, error);
      results.push({
        sourceKey: source.key,
        collected: 0,
        inserted: 0,
        skipped: 0,
        failures: 1,
        error: adminIngestionFailureMessage,
      });
    }
  }

  return Response.json({ items: results });
};
