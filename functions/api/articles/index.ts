import { listArticles } from '../../../src/db';
import { publicArticleCategoryFilter, publicArticleListResult, publicArticleRegionFilter } from '../_articles';
import { parseOptionalPositiveInteger, parseOptionalText } from '../_request';
import { logApiError, publicError } from '../_response';
import { publicSourceFilterToKey } from '../_sourceFilters';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const result = await listArticles(env.DB, {
      region: publicArticleRegionFilter(parseOptionalText(url.searchParams.get('region'))),
      source: publicSourceFilterToKey(parseOptionalText(url.searchParams.get('source'))),
      tag: parseOptionalText(url.searchParams.get('tag')),
      company: parseOptionalText(url.searchParams.get('company')),
      query: parseOptionalText(url.searchParams.get('query')),
      category: publicArticleCategoryFilter(parseOptionalText(url.searchParams.get('category'))),
      page: parseOptionalPositiveInteger(url.searchParams.get('page')),
      limit: parseOptionalPositiveInteger(url.searchParams.get('limit')),
    });

    return Response.json(publicArticleListResult(result));
  } catch (error) {
    logApiError('Failed to list articles', error);
    return publicError();
  }
};
