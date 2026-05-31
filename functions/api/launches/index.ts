import { listLaunches } from '../../../src/db';
import { publicLaunchListResult, publicLaunchStatusFilter } from '../_launches';
import { parseOptionalPositiveInteger, parseOptionalText } from '../_request';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const status = parseOptionalText(url.searchParams.get('status'));
    const result = await listLaunches(env.DB, {
      status: publicLaunchStatusFilter(status),
      provider: parseOptionalText(url.searchParams.get('provider')),
      query: parseOptionalText(url.searchParams.get('query')),
      includePast: url.searchParams.get('includePast') === '1',
      page: parseOptionalPositiveInteger(url.searchParams.get('page')),
      limit: parseOptionalPositiveInteger(url.searchParams.get('limit')),
    });

    return Response.json(publicLaunchListResult(result));
  } catch (error) {
    logApiError('Failed to list launches', error);
    return publicError();
  }
};
