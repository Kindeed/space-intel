import { getTopicBySlug } from '../../../src/db';
import { logApiError, publicError } from '../_response';

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
    logApiError('Failed to load topic', error);
    return publicError();
  }
};
