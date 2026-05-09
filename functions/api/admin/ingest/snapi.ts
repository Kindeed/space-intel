import sourcesConfig from '../../../../config/sources.generated.json';
import { createCollectorRegistry, parseSourcesConfig, runSourceIngestion, spaceflightNewsCollector } from '../../../../src/ingestion';

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

  const source = parseSourcesConfig(sourcesConfig).find((item) => item.key === 'snapi');

  if (!source) {
    return Response.json({ error: 'SNAPI source is not configured' }, { status: 500 });
  }

  const registry = createCollectorRegistry([spaceflightNewsCollector]);
  const result = await runSourceIngestion(env.DB, source, registry, {
    fetch,
    now: () => new Date(),
  });

  return Response.json(result);
};
