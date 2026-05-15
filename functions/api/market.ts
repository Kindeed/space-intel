import { listMarketItems } from '../../src/db';
import { logApiError, publicError } from './_response';

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
    const result = await listMarketItems(env.DB, {
      type: url.searchParams.get('type') ?? undefined,
      company: url.searchParams.get('company') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
      query: url.searchParams.get('query') ?? undefined,
      page: parsePositiveInteger(url.searchParams.get('page')),
      limit: parsePositiveInteger(url.searchParams.get('limit')),
    });

    return Response.json(result);
  } catch (error) {
    logApiError('Failed to list market items', error);
    return publicError();
  }
};
