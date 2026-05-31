import { getTopicBySlug } from '../../../src/db';
import { publicTopicDetail } from '../_topics';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const topic = await getTopicBySlug(env.DB, slug ?? '');

    if (!topic) {
      return publicError('专题不存在或已更新。', 404);
    }

    return Response.json(publicTopicDetail(topic));
  } catch (error) {
    logApiError('Failed to load topic', error);
    return publicError();
  }
};
