import { listRankedHomeArticles } from '../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get('limit') ?? '20');
    const items = await listRankedHomeArticles(env.DB, Number.isFinite(limitValue) ? limitValue : 20);

    return Response.json({ items });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load home feed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
