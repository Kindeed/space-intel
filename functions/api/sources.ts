import { listEnabledSources, listEnabledSourceTypeStats } from '../../src/db';
import { logApiError, publicError } from './_response';

type Env = {
  DB: D1Database;
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const items = await listEnabledSources(env.DB);
    const stats = await listEnabledSourceTypeStats(env.DB);
    return Response.json({ items, stats });
  } catch (error) {
    logApiError('Failed to list sources', error);
    return publicError();
  }
};
