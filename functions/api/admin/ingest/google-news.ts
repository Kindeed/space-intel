import sourcesConfig from '../../../../config/sources.generated.json';
import { createCollectorRegistry, googleNewsRssCollector, parseSourcesConfig, runSourceIngestion } from '../../../../src/ingestion';

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const expectedToken = env.ADMIN_TOKEN;
  const providedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!expectedToken || providedToken !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sources = parseSourcesConfig(sourcesConfig).filter((item) => item.type === 'google_news_rss' && item.enabled);
  const registry = createCollectorRegistry([googleNewsRssCollector]);
  const results = [];

  for (const source of sources) {
    try {
      results.push(
        await runSourceIngestion(env.DB, source, registry, {
          fetch: (input, init) => fetch(input, init),
          now: () => new Date(),
        }),
      );
    } catch (error) {
      results.push({
        sourceKey: source.key,
        collected: 0,
        inserted: 0,
        skipped: 0,
        failures: 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return Response.json({ items: results });
};
