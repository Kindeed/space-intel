import { listTopics } from '../../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    return Response.json({ items: await listTopics(env.DB) });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to list topics',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
