import { listArticles } from '../../../src/db';
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
    const result = await listArticles(env.DB, {
      region: url.searchParams.get('region') ?? undefined,
      source: url.searchParams.get('source') ?? undefined,
      tag: url.searchParams.get('tag') ?? undefined,
      company: url.searchParams.get('company') ?? undefined,
      query: url.searchParams.get('query') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      page: parsePositiveInteger(url.searchParams.get('page')),
      limit: parsePositiveInteger(url.searchParams.get('limit')),
    });

    return Response.json(result);
  } catch (error) {
    logApiError('Failed to list articles', error);
    return publicError();
  }
};
