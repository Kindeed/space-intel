import type { SqlDatabase } from './types';

export type ArticleEntityRef = {
  slug: string;
  name: string;
};

export type ArticleLaunchRef = {
  id: number;
  externalId: string;
  missionName: string;
  name: string;
};

export type ArticleSummaryRow = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
  url: string;
  sourceKey: string;
  sourceName: string;
  sourceType: string;
  publishedAt: string;
  language: string;
  region: string;
  fetchStatus: string;
  tags: ArticleEntityRef[];
  companies: ArticleEntityRef[];
  storyKey?: string;
  relatedSourceCount?: number;
  relatedSources?: string[];
};

export type ArticleDetailRow = ArticleSummaryRow & {
  launches: ArticleLaunchRef[];
};

export type ArticleSummaryDbRow = Omit<ArticleSummaryRow, 'tags' | 'companies'> & {
  tags?: ArticleEntityRef[];
  companies?: ArticleEntityRef[];
  tagsJson?: string | null;
  companiesJson?: string | null;
};

export type ArticleDetailDbRow = ArticleSummaryDbRow & {
  launches?: ArticleLaunchRef[];
  launchesJson?: string | null;
};

export type ArticleListFilters = {
  region?: string;
  source?: string;
  tag?: string;
  company?: string;
  query?: string;
  category?: string;
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

export const articleRelationSelectFields = `
      COALESCE((
        SELECT json_group_array(json_object('slug', t.slug, 'name', t.name))
        FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = a.id
      ), '[]') AS tagsJson,
      COALESCE((
        SELECT json_group_array(json_object('slug', c.slug, 'name', c.name))
        FROM article_companies ac
        JOIN companies c ON c.id = ac.company_id
        WHERE ac.article_id = a.id
      ), '[]') AS companiesJson`;

export const articleDetailRelationSelectFields = `${articleRelationSelectFields},
      COALESCE((
        SELECT json_group_array(json_object(
          'id', l.id,
          'externalId', l.external_id,
          'missionName', l.mission,
          'name', l.mission
        ))
        FROM article_launches al
        JOIN launches l ON l.external_id = al.launch_external_id
        WHERE al.article_id = a.id
      ), '[]') AS launchesJson`;

function isEntityRef(value: unknown): value is ArticleEntityRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ArticleEntityRef).slug === 'string' &&
    typeof (value as ArticleEntityRef).name === 'string'
  );
}

function isLaunchRef(value: unknown): value is ArticleLaunchRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ArticleLaunchRef).id === 'number' &&
    typeof (value as ArticleLaunchRef).externalId === 'string' &&
    typeof (value as ArticleLaunchRef).missionName === 'string' &&
    typeof (value as ArticleLaunchRef).name === 'string'
  );
}

function parseJsonArray<T>(value: T[] | string | null | undefined, predicate: (item: unknown) => item is T): T[] {
  if (Array.isArray(value)) {
    return value.filter(predicate);
  }

  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(predicate) : [];
  } catch {
    return [];
  }
}

export function toArticleSummary(row: ArticleSummaryDbRow): ArticleSummaryRow {
  const { tagsJson, companiesJson, ...base } = row;

  return {
    ...base,
    tags: parseJsonArray(row.tags ?? tagsJson, isEntityRef),
    companies: parseJsonArray(row.companies ?? companiesJson, isEntityRef),
  };
}

export function toArticleDetail(row: ArticleDetailDbRow | null): ArticleDetailRow | null {
  if (!row) {
    return null;
  }

  const { launchesJson, launches, ...summaryRow } = row;

  return {
    ...toArticleSummary(summaryRow),
    launches: parseJsonArray(launches ?? launchesJson, isLaunchRef),
  };
}

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

function normalizeStoryText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+-\s+[^-]+$/, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an|to|of|and|for|in|on|with|by|from|after|as|at|is|are)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createStoryKey(row: Pick<ArticleSummaryRow, 'title' | 'publishedAt' | 'region'>): string {
  const date = row.publishedAt.slice(0, 10);
  const normalizedTitle = normalizeStoryText(row.title);
  const compactTitle = normalizedTitle.replace(/\s/g, '');
  const titleKey = /[\u3400-\u9fff]/.test(compactTitle)
    ? compactTitle.slice(0, 18)
    : normalizedTitle.split(' ').filter((word) => word.length > 2).slice(0, 8).join('-');

  return `${row.region}:${date}:${titleKey || compactTitle.slice(0, 18)}`;
}

export function clusterArticleRows(rows: ArticleSummaryRow[], limit: number): ArticleSummaryRow[] {
  const clusters = new Map<string, ArticleSummaryRow & { relatedSources: string[] }>();

  for (const row of rows) {
    const storyKey = createStoryKey(row);
    const existing = clusters.get(storyKey);

    if (!existing) {
      clusters.set(storyKey, {
        ...row,
        storyKey,
        relatedSourceCount: 1,
        relatedSources: [row.sourceName],
      });
      continue;
    }

    if (!existing.relatedSources.includes(row.sourceName)) {
      existing.relatedSources.push(row.sourceName);
      existing.relatedSourceCount = existing.relatedSources.length;
    }

    if (new Date(row.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
      clusters.set(storyKey, {
        ...row,
        storyKey,
        relatedSourceCount: existing.relatedSourceCount,
        relatedSources: existing.relatedSources,
      });
    }
  }

  return Array.from(clusters.values()).slice(0, limit);
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

  if (filters.category === 'policy') {
    conditions.push('s.type = ?');
    values.push('official_page');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rawFetchLimit = Math.min(limit * 4 + 1, maxLimit * 4 + 1);
  const statement = db.prepare(
    `SELECT
      a.id,
      a.title,
      a.original_title AS originalTitle,
      a.summary,
      a.url,
      s.key AS sourceKey,
      s.name AS sourceName,
      s.type AS sourceType,
      a.published_at AS publishedAt,
      a.language,
      a.region,
      a.fetch_status AS fetchStatus,
      ${articleRelationSelectFields}
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    ${whereClause}
    ORDER BY a.published_at DESC, a.id DESC
    LIMIT ? OFFSET ?`,
  );
  const queryResult = await statement.bind(...values, rawFetchLimit, offset).all?.<ArticleSummaryDbRow>();

  if (!queryResult) {
    throw new Error('Database statement does not support all()');
  }

  const rows = queryResult.results.map(toArticleSummary);
  const clusteredRows = clusterArticleRows(rows, rawFetchLimit);

  return {
    items: clusteredRows.slice(0, limit),
    page,
    limit,
    hasMore: rows.length === rawFetchLimit || clusteredRows.length > limit,
  };
}

export async function getArticleById(db: SqlDatabase, id: number): Promise<ArticleDetailRow | null> {
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  const row = await db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.original_title AS originalTitle,
        a.summary,
        a.url,
        s.key AS sourceKey,
        s.name AS sourceName,
        s.type AS sourceType,
        a.published_at AS publishedAt,
        a.language,
        a.region,
        a.fetch_status AS fetchStatus,
        ${articleDetailRelationSelectFields}
      FROM articles a
      JOIN sources s ON s.id = a.source_id
      WHERE a.id = ?`,
    )
    .bind(id)
    .first<ArticleDetailDbRow>();

  return toArticleDetail(row);
}
