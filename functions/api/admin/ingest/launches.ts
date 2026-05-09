import sourcesConfig from '../../../../config/sources.generated.json';
import { launchLibraryCollector, parseSourcesConfig, runLaunchIngestion } from '../../../../src/ingestion';

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

  const source = parseSourcesConfig(sourcesConfig).find((item) => item.key === 'launch-library-2');

  if (!source) {
    return Response.json({ error: 'Launch Library 2 source is not configured' }, { status: 500 });
  }

  const result = await runLaunchIngestion(env.DB, source, launchLibraryCollector, {
    fetch,
    now: () => new Date(),
  });

  return Response.json(result);
};
