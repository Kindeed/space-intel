import { listLaunches } from '../../../src/db';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const result = await listLaunches(env.DB, {
      status: url.searchParams.get('status') ?? undefined,
      provider: url.searchParams.get('provider') ?? undefined,
      query: url.searchParams.get('query') ?? undefined,
      page: parsePositiveInteger(url.searchParams.get('page')),
      limit: parsePositiveInteger(url.searchParams.get('limit')),
    });

    return Response.json(result);
  } catch (error) {
    logApiError('Failed to list launches', error);
    return publicError();
  }
};
