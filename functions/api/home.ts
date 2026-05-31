import { getHomeStats, listRankedHomeArticles, listTrendingTags } from '../../src/db';
import { publicArticleSummary } from './_articles';
import { publicHomeStats } from './_home';
import { parsePositiveInteger } from './_request';
import { logApiError, publicError } from './_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const limitValue = parsePositiveInteger(url.searchParams.get('limit'), 20);
    const [items, stats, trendingTags] = await Promise.all([
      listRankedHomeArticles(env.DB, limitValue),
      getHomeStats(env.DB),
      listTrendingTags(env.DB),
    ]);

    return Response.json({ items: items.map(publicArticleSummary), stats: publicHomeStats(stats), trendingTags });
  } catch (error) {
    logApiError('Failed to load home feed', error);
    return publicError();
  }
};
