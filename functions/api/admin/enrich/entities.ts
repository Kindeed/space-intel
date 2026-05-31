import companiesConfig from '../../../../config/companies.generated.json';
import topicsConfig from '../../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../../src/catalog';
import { matchArticlesEntities } from '../../../../src/enrichment';
import { listArticlesForEntityMatching, upsertConfiguredEntityLinks } from '../../../../src/db';
import { adminOperationFailureResponse, requireAdminRequest, type AdminEnv } from '../../_admin';

type Env = AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const companies = parseCompaniesConfig(companiesConfig);
    const topics = parseTopicsConfig(topicsConfig);
    const articles = await listArticlesForEntityMatching(env.DB);
    const matches = matchArticlesEntities(articles, companies, topics);
    const result = await upsertConfiguredEntityLinks(env.DB, matches);

    return Response.json(result);
  } catch (error) {
    return adminOperationFailureResponse('Failed to enrich entity links', error);
  }
};
