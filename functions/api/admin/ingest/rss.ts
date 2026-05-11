import sourcesConfig from '../../../../config/sources.generated.json';
import { createCollectorRegistry, parseSourcesConfig, rssCollector, runSourceIngestion } from '../../../../src/ingestion';

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

  const sources = parseSourcesConfig(sourcesConfig).filter((item) => item.type === 'rss' && item.enabled);
  const registry = createCollectorRegistry([rssCollector]);
  const results = [];

  for (const source of sources) {
    results.push(
      await runSourceIngestion(env.DB, source, registry, {
        fetch: (input, init) => fetch(input, init),
        now: () => new Date(),
      }),
    );
  }

  return Response.json({ items: results });
};
