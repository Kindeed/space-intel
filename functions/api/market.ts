import { listMarketItems } from '../../src/db';

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
    return Response.json(
      {
        error: 'Failed to list market items',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
