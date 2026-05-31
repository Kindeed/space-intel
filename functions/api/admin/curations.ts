import curationsConfig from '../../../config/curations.generated.json';
import { parseCurationsConfig } from '../../../src/curations/config';
import { replaceConfiguredCurations } from '../../../src/db';
import { adminOperationFailureResponse, requireAdminRequest, type AdminEnv } from '../_admin';

type Env = AdminEnv & {
  DB: D1Database;
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const unauthorized = requireAdminRequest(request, env);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const records = parseCurationsConfig(curationsConfig);
    const result = await replaceConfiguredCurations(env.DB, records);

    return Response.json({
      configured: records.length,
      inserted: result.inserted,
    });
  } catch (error) {
    return adminOperationFailureResponse('Failed to replace configured curations', error);
  }
};
