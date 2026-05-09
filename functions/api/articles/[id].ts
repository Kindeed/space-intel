import { getArticleById } from '../../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const id = Number(rawId);
    const article = await getArticleById(env.DB, id);

    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    return Response.json(article);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load article',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
