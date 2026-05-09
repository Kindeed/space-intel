import { getTopicBySlug } from '../../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const topic = await getTopicBySlug(env.DB, slug ?? '');

    if (!topic) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    return Response.json(topic);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load topic',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
