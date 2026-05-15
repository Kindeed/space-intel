import { getHomeStats, listRankedHomeArticles, listTrendingTags } from '../../src/db';
import { logApiError, publicError } from './_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get('limit') ?? '20');
    const items = await listRankedHomeArticles(env.DB, Number.isFinite(limitValue) ? limitValue : 20);
    const stats = await getHomeStats(env.DB);
    const trendingTags = await listTrendingTags(env.DB);

    return Response.json({ items, stats, trendingTags });
  } catch (error) {
    logApiError('Failed to load home feed', error);
    return publicError();
  }
};
