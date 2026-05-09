import type { SqlDatabase } from './types';

export type MarketItemRow = {
  id: number;
  title: string;
  itemType: string;
  companyId: number | null;
  companyName: string | null;
  companySlug: string | null;
  sourceId: number | null;
  sourceName: string | null;
  url: string;
  summary: string;
  publishedAt: string;
};

export type MarketListFilters = {
  type?: string;
  company?: string;
  source?: string;
  query?: string;
  page?: number;
  limit?: number;
};

export type MarketListResult = {
  items: MarketItemRow[];
  page: number;
  limit: number;
  hasMore: boolean;
  notice: string;
};

const defaultLimit = 20;
const maxLimit = 50;
export const marketNotice = '资本市场内容仅作信息聚合，不构成投资建议。';

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

export async function listMarketItems(db: SqlDatabase, filters: MarketListFilters = {}): Promise<MarketListResult> {
  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.type) {
    conditions.push('m.item_type = ?');
    values.push(filters.type);
  }

  if (filters.company) {
    conditions.push('c.slug = ?');
    values.push(filters.company);
  }

  if (filters.source) {
    conditions.push('s.key = ?');
    values.push(filters.source);
  }

  if (filters.query?.trim()) {
    conditions.push('(LOWER(m.title) LIKE ? OR LOWER(m.summary) LIKE ?)');
    const query = likeValue(filters.query);
    values.push(query, query);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db
    .prepare(
      `SELECT
        m.id,
        m.title,
        m.item_type AS itemType,
        m.company_id AS companyId,
        c.name AS companyName,
        c.slug AS companySlug,
        m.source_id AS sourceId,
        s.name AS sourceName,
        m.url,
        m.summary,
        m.published_at AS publishedAt
      FROM market_items m
      LEFT JOIN companies c ON c.id = m.company_id
      LEFT JOIN sources s ON s.id = m.source_id
      ${whereClause}
      ORDER BY m.published_at DESC, m.id DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(...values, limit + 1, offset)
    .all?.<MarketItemRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return {
    items: result.results.slice(0, limit),
    page,
    limit,
    hasMore: result.results.length > limit,
    notice: marketNotice,
  };
}
