import type { SqlDatabase } from './types';

export type LaunchRow = {
  id: number;
  externalId: string;
  mission: string;
  rocket: string | null;
  provider: string | null;
  windowStart: string | null;
  site: string | null;
  status: string;
  rawUrl: string | null;
};

export type LaunchListFilters = {
  status?: string;
  provider?: string;
  query?: string;
  page?: number;
  limit?: number;
};

export type LaunchListResult = {
  items: LaunchRow[];
  page: number;
  limit: number;
  hasMore: boolean;
};

const defaultLimit = 20;
const maxLimit = 50;

function normalizePage(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return defaultLimit;
  }

  return Math.min(Math.floor(value), maxLimit);
}

function likeValue(value: string): string {
  return `%${value.trim().toLowerCase()}%`;
}

export async function listLaunches(db: SqlDatabase, filters: LaunchListFilters = {}): Promise<LaunchListResult> {
  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.status) {
    conditions.push('status = ?');
    values.push(filters.status);
  }

  if (filters.provider) {
    conditions.push('provider = ?');
    values.push(filters.provider);
  }

  if (filters.query?.trim()) {
    conditions.push('(LOWER(mission) LIKE ? OR LOWER(rocket) LIKE ? OR LOWER(provider) LIKE ? OR LOWER(site) LIKE ?)');
    const query = likeValue(filters.query);
    values.push(query, query, query, query);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db
    .prepare(
      `SELECT
        id,
        external_id AS externalId,
        mission,
        rocket,
        provider,
        window_start AS windowStart,
        site,
        status,
        raw_url AS rawUrl
      FROM launches
      ${whereClause}
      ORDER BY COALESCE(window_start, '9999-12-31T23:59:59Z') ASC, id DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(...values, limit + 1, offset)
    .all?.<LaunchRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return {
    items: result.results.slice(0, limit),
    page,
    limit,
    hasMore: result.results.length > limit,
  };
}

export async function getLaunchByIdOrExternalId(db: SqlDatabase, idOrExternalId: string): Promise<LaunchRow | null> {
  if (!idOrExternalId.trim()) {
    return null;
  }

  const numericId = Number(idOrExternalId);
  const isNumericId = Number.isInteger(numericId) && numericId > 0;

  return db
    .prepare(
      `SELECT
        id,
        external_id AS externalId,
        mission,
        rocket,
        provider,
        window_start AS windowStart,
        site,
        status,
        raw_url AS rawUrl
      FROM launches
      WHERE ${isNumericId ? 'id = ?' : 'external_id = ?'}`,
    )
    .bind(isNumericId ? numericId : idOrExternalId)
    .first<LaunchRow>();
}
