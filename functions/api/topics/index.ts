import { listTopics } from '../../../src/db';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json({ items: await listTopics(env.DB) });
  } catch (error) {
    logApiError('Failed to list topics', error);
    return publicError();
  }
};
