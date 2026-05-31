import { listCompanies } from '../../../src/db';
import { publicCompanyListResult } from '../_companies';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json(publicCompanyListResult({ items: await listCompanies(env.DB) }));
  } catch (error) {
    logApiError('Failed to list companies', error);
    return publicError();
  }
};
