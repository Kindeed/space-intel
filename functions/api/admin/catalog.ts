import companiesConfig from '../../../config/companies.generated.json';
import sourcesConfig from '../../../config/sources.generated.json';
import topicsConfig from '../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../src/catalog';
import { parseSourcesConfig } from '../../../src/ingestion';
import { syncConfiguredCatalog } from '../../../src/db';

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

  const sources = parseSourcesConfig(sourcesConfig);
  const companies = parseCompaniesConfig(companiesConfig);
  const topics = parseTopicsConfig(topicsConfig);
  return Response.json(await syncConfiguredCatalog(env.DB, { sources, companies, topics }));
};
