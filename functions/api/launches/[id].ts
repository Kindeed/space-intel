import { getLaunchByIdOrExternalId } from '../../../src/db';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const launch = await getLaunchByIdOrExternalId(env.DB, id ?? '');

    if (!launch) {
      return Response.json({ error: 'Launch not found' }, { status: 404 });
    }

    return Response.json(launch);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to load launch',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
};
