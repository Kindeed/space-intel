import type { SqlDatabase } from './types';

export type SourceOptionRow = {
  key: string;
  name: string;
  type: string;
  region: string;
  credibility: number;
};

export type SourceTypeStatRow = {
  type: string;
  count: number;
};

export async function listEnabledSources(db: SqlDatabase): Promise<SourceOptionRow[]> {
  const result = await db
    .prepare(
      `SELECT key, name, type, region, credibility
      FROM sources
      WHERE enabled = 1
      ORDER BY type ASC, credibility DESC, name ASC`,
    )
    .all?.<SourceOptionRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function listEnabledSourceTypeStats(db: SqlDatabase): Promise<SourceTypeStatRow[]> {
  const result = await db
    .prepare(
      `SELECT type, COUNT(*) AS count
       FROM sources
       WHERE enabled = 1
       GROUP BY type
       ORDER BY type ASC`,
    )
    .all?.<SourceTypeStatRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}
