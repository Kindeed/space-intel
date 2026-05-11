import companiesConfig from '../../../../config/companies.generated.json';
import topicsConfig from '../../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../../src/catalog';
import { matchArticlesEntities } from '../../../../src/enrichment';
import { listArticlesForEntityMatching, replaceConfiguredEntityLinks } from '../../../../src/db';

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
  const articles = await listArticlesForEntityMatching(env.DB);
  const matches = matchArticlesEntities(articles, companies, topics);
  const result = await replaceConfiguredEntityLinks(env.DB, matches);

  return Response.json(result);
};
