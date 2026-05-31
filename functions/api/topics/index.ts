import { listTopics } from '../../../src/db';
import { publicTopicListResult } from '../_topics';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json(publicTopicListResult({ items: await listTopics(env.DB) }));
  } catch (error) {
    logApiError('Failed to list topics', error);
    return publicError();
  }
};
