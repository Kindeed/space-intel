import companiesConfig from '../../../config/companies.generated.json';
import topicsConfig from '../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../src/catalog';
import { upsertConfiguredCompanies, upsertConfiguredTags } from '../../../src/db';

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

  const companies = parseCompaniesConfig(companiesConfig);
  const topics = parseTopicsConfig(topicsConfig);
  const companyResult = await upsertConfiguredCompanies(env.DB, companies);
  const tagResult = await upsertConfiguredTags(env.DB, topics);

  return Response.json({
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
