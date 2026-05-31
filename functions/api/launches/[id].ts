import { getLaunchByIdOrExternalId } from '../../../src/db';
import { publicLaunch } from '../_launches';
import { logApiError, publicError } from '../_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const launch = await getLaunchByIdOrExternalId(env.DB, id ?? '');

    if (!launch) {
      return publicError('发射记录不存在或已更新。', 404);
    }

    return Response.json(publicLaunch(launch));
  } catch (error) {
    logApiError('Failed to load launch', error);
    return publicError();
  }
};
