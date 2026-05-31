import companiesConfig from '../../../config/companies.generated.json';
import sourcesConfig from '../../../config/sources.generated.json';
import topicsConfig from '../../../config/topics.generated.json';
import { parseCompaniesConfig, parseTopicsConfig } from '../../../src/catalog';
import { parseSourcesConfig } from '../../../src/ingestion';
import { syncConfiguredCatalog } from '../../../src/db';
import { adminOperationFailureResponse, requireAdminRequest, type AdminEnv } from '../_admin';

type Env = AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const sources = parseSourcesConfig(sourcesConfig);
    const companies = parseCompaniesConfig(companiesConfig);
    const topics = parseTopicsConfig(topicsConfig);
    return Response.json(await syncConfiguredCatalog(env.DB, { sources, companies, topics }));
  } catch (error) {
    return adminOperationFailureResponse('Failed to sync configured catalog', error);
  }
};
