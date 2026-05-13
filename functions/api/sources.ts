import { listEnabledSources } from '../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const items = await listEnabledSources(env.DB);
    return Response.json({ items });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to list sources',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
