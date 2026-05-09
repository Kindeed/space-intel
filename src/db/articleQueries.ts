import type { SqlDatabase } from './types';

export type ArticleSummaryRow = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
  url: string;
  sourceKey: string;
  sourceName: string;
  publishedAt: string;
  language: string;
  region: string;
  fetchStatus: string;
};

export type ArticleDetailRow = ArticleSummaryRow & {
  dedupeHash: string;
};

export type ArticleListFilters = {
  region?: string;
  source?: string;
  tag?: string;
  company?: string;
  query?: string;
  page?: number;
  limit?: number;
};

export type ArticleListResult = {
  items: ArticleSummaryRow[];
  page: number;
  limit: number;
  hasMore: boolean;
};

const maxLimit = 50;
const defaultLimit = 20;

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

export async function listArticles(db: SqlDatabase, filters: ArticleListFilters = {}): Promise<ArticleListResult> {
  const page = normalizePage(filters.page);
  const limit = normalizeLimit(filters.limit);
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.region) {
    conditions.push('a.region = ?');
    values.push(filters.region);
  }

  if (filters.source) {
    conditions.push('s.key = ?');
    values.push(filters.source);
  }

  if (filters.query?.trim()) {
    conditions.push('(LOWER(a.title) LIKE ? OR LOWER(a.summary) LIKE ? OR LOWER(a.original_title) LIKE ?)');
    const query = likeValue(filters.query);
    values.push(query, query, query);
  }

  if (filters.tag) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = a.id AND t.slug = ?
      )`,
    );
    values.push(filters.tag);
  }

  if (filters.company) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM article_companies ac
        JOIN companies c ON c.id = ac.company_id
        WHERE ac.article_id = a.id AND c.slug = ?
      )`,
    );
    values.push(filters.company);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const statement = db.prepare(
    `SELECT
      a.id,
      a.title,
      a.original_title AS originalTitle,
      a.summary,
      a.url,
      s.key AS sourceKey,
      s.name AS sourceName,
      a.published_at AS publishedAt,
      a.language,
      a.region,
      a.fetch_status AS fetchStatus
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    ${whereClause}
    ORDER BY a.published_at DESC, a.id DESC
    LIMIT ? OFFSET ?`,
  );
  const queryResult = await statement.bind(...values, limit + 1, offset).all?.<ArticleSummaryRow>();

  if (!queryResult) {
    throw new Error('Database statement does not support all()');
  }

  const rows = queryResult.results;

  return {
    items: rows.slice(0, limit),
    page,
    limit,
    hasMore: rows.length > limit,
  };
}

export async function getArticleById(db: SqlDatabase, id: number): Promise<ArticleDetailRow | null> {
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  return db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.original_title AS originalTitle,
        a.summary,
        a.url,
        s.key AS sourceKey,
        s.name AS sourceName,
        a.published_at AS publishedAt,
        a.language,
        a.region,
        a.fetch_status AS fetchStatus,
        a.dedupe_hash AS dedupeHash
      FROM articles a
      JOIN sources s ON s.id = a.source_id
      WHERE a.id = ?`,
    )
    .bind(id)
    .first<ArticleDetailRow>();
}
