import companiesConfig from '../../../config/companies.generated.json';
import sourcesConfig from '../../../config/sources.generated.json';
import topicsConfig from '../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../src/catalog';
import { parseSourcesConfig } from '../../../src/ingestion';
import { upsertConfiguredCompanies, upsertConfiguredSources, upsertConfiguredTags } from '../../../src/db';

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
  const sourceResult = await upsertConfiguredSources(env.DB, sources);
  const companyResult = await upsertConfiguredCompanies(env.DB, companies);
  const tagResult = await upsertConfiguredTags(env.DB, topics);

  return Response.json({
    sources: {
      configured: sources.length,
      upserted: sourceResult.upserted,
    },
    companies: {
      configured: companies.length,
      upserted: companyResult.upserted,
    },
    topics: {
      configured: topics.length,
      upserted: tagResult.upserted,
    },
  });
};
