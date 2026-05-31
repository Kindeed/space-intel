import { getArticleById } from '../../../src/db';
import { publicArticleDetail } from '../_articles';
import { parseOptionalPositiveInteger } from '../_request';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const id = parseOptionalPositiveInteger(rawId ?? null);
    if (!id) {
      return publicError('文章不存在或已更新。', 404);
    }

    const article = await getArticleById(env.DB, id);

    if (!article) {
      return publicError('文章不存在或已更新。', 404);
    }

    return Response.json(publicArticleDetail(article));
  } catch (error) {
    logApiError('Failed to load article', error);
    return publicError();
  }
};
