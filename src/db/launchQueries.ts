import { normalizeBoundedPositiveInteger, normalizePositiveInteger } from '../number';
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
  includePast?: boolean;
  nowIso?: string;
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
  return normalizePositiveInteger(value, 1);
}

function normalizeLimit(value: number | undefined): number {
  return normalizeBoundedPositiveInteger(value, defaultLimit, maxLimit);
}

function likeValue(value: string): string {
  return `%${value.trim().toLowerCase()}%`;
}

function statusFilterCondition(status: string): { clause: string; values: string[] } {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'go') {
    return {
      clause:
        "((LOWER(status) = ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ?) AND LOWER(status) NOT LIKE ? AND LOWER(status) NOT LIKE ?)",
      values: ['go', 'go %', '% go', '% go %', '%no go%', '%no-go%'],
    };
  }

  if (normalized === 'success') {
    return {
      clause: '((LOWER(status) LIKE ? OR LOWER(status) LIKE ?) AND LOWER(status) NOT LIKE ? AND LOWER(status) NOT LIKE ?)',
      values: ['%success%', '%成功%', '%unsuccess%', '%不成功%'],
    };
  }

  if (normalized === 'fail') {
    return {
      clause: '(LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ?)',
      values: ['%fail%', '%unsuccess%', '%不成功%', '%失败%', '%异常%'],
    };
  }

  if (normalized === 'hold') {
    return {
      clause: '(LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ?)',
      values: ['%hold%', '%no go%', '%no-go%', '%等待%'],
    };
  }

  if (normalized === 'confirm') {
    return {
      clause: '(LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ?)',
      values: ['%confirm%', '%tbc%', '%tbd%', '%to be determined%', '%to be confirmed%', '%待确认%', '%确认%'],
    };
  }

  if (normalized === 'review') {
    return {
      clause: '(LOWER(status) LIKE ? OR LOWER(status) LIKE ?)',
      values: ['%review%', '%评审%'],
    };
  }

  return {
    clause: 'LOWER(status) LIKE ?',
    values: [likeValue(status)],
  };
}

export async function listLaunches(db: SqlDatabase, filters: LaunchListFilters = {}): Promise<LaunchListResult> {
  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (!filters.includePast) {
    conditions.push('window_start >= ?');
    values.push(filters.nowIso ?? new Date().toISOString());
  }

  if (filters.status) {
    const statusCondition = statusFilterCondition(filters.status);
    conditions.push(statusCondition.clause);
    values.push(...statusCondition.values);
  }

  if (filters.provider) {
    conditions.push('LOWER(provider) LIKE ?');
    values.push(likeValue(filters.provider));
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
  const normalizedId = idOrExternalId.trim();

  if (!normalizedId) {
    return null;
  }

  const numericId = normalizePositiveInteger(normalizedId, 0);
  const isNumericId = numericId > 0;
  const lookupValue = isNumericId ? numericId : normalizedId.toLowerCase();

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
      WHERE ${isNumericId ? 'id = ?' : 'LOWER(external_id) = ?'}`,
    )
    .bind(lookupValue)
    .first<LaunchRow>();
}
