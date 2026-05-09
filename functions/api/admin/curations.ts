import curationsConfig from '../../../config/curations.generated.json';
import { parseCurationsConfig } from '../../../src/curations/config';
import { replaceConfiguredCurations } from '../../../src/db';

type Env = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const expectedToken = env.ADMIN_TOKEN;
  const providedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!expectedToken || providedToken !== expectedToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const records = parseCurationsConfig(curationsConfig);
  const result = await replaceConfiguredCurations(env.DB, records);

  return Response.json({
    configured: records.length,
    inserted: result.inserted,
  });
};
