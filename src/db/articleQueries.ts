import { normalizeBoundedPositiveInteger, normalizePositiveInteger } from '../number';
import { stripAggregatorPrefix } from '../sourceDisplay';
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
  originalSummary: string | null;
  url: string;
  sourceKey: string;
  sourceName: string;
  sourceType: string;
  publisherName: string | null;
  publishedAt: string;
  language: string;
  region: string;
  fetchStatus: string;
  translationStatus: 'translated' | 'skipped' | 'failed';
  translationProvider: string | null;
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

export const publicArticleVisibilityCondition = `NOT (
      s.key = 'cnsa-news'
      AND (
        a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'
        OR a.url IN ('https://www.cpeos.org.cn/home', 'https://www.cpeos.org.cn/home/')
        OR a.title IN (
          '咨询建议',
          '意见征集',
          '互动交流',
          '资源服务',
          '国际合作',
          '空间应用',
          '空间科学',
          '宇航产品',
          '重大任务',
          '中国航天',
          '专题专栏',
          '视频点播',
          '精彩图集',
          '图解航天',
          '国际航天',
          '政策公告',
          '信息发布',
          '机构简介',
          '国家遥感数据与应用服务平台'
        )
      )
    )`;

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

export function articleTranslationSelectFields(includeTranslationFields = true): string {
  if (!includeTranslationFields) {
    return `
      NULL AS originalSummary,
      'skipped' AS translationStatus,
      NULL AS translationProvider`;
  }

  return `
      a.original_summary AS originalSummary,
      a.translation_status AS translationStatus,
      a.translation_provider AS translationProvider`;
}

export const articleDetailRelationSelectFields = `${articleRelationSelectFields},
      COALESCE((
        SELECT json_group_array(json_object(
          'id', l.id,
          'externalId', l.external_id,
          'missionName', l.mission,
          'name', l.mission
        ))
        FROM article_launches al
        JOIN launches l ON LOWER(l.external_id) = LOWER(al.launch_external_id)
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
  return normalizePositiveInteger(value, 1);
}

function normalizeLimit(value: number | undefined): number {
  return normalizeBoundedPositiveInteger(value, defaultLimit, maxLimit);
}

function likeValue(value: string): string {
  return `%${value.trim().toLowerCase()}%`;
}

function normalizedEntityFilterValue(value: string): string {
  return value.trim().toLowerCase();
}

export function isMissingArticleTranslationColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  const hasTranslationColumn = ['original_summary', 'translation_status', 'translation_provider', 'translated_at', 'translation_error'].some((column) =>
    normalized.includes(column),
  );

  return hasTranslationColumn && (normalized.includes('no such column') || normalized.includes('has no column named'));
}

export function articlePublisherSelectFields(includePublisherField = true): string {
  return includePublisherField ? 'a.publisher_name AS publisherName' : 'NULL AS publisherName';
}

export function isMissingArticlePublisherColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  return normalized.includes('publisher_name') && (normalized.includes('no such column') || normalized.includes('has no column named'));
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

function relatedSourceKey(label: string): string {
  return stripAggregatorPrefix(label).toLocaleLowerCase('en-US');
}

function mergeEntityRefs(existing: ArticleEntityRef[], next: ArticleEntityRef[]): ArticleEntityRef[] {
  const merged: ArticleEntityRef[] = [];
  const indexByKey = new Map<string, number>();

  for (const entity of [...existing, ...next]) {
    const slug = entity.slug.trim();
    const key = slug.toLocaleLowerCase('en-US');

    if (!slug) {
      continue;
    }

    const existingIndex = indexByKey.get(key);

    if (existingIndex !== undefined) {
      if (!merged[existingIndex].name.trim() && entity.name.trim()) {
        merged[existingIndex] = { ...entity, slug };
      }

      continue;
    }

    indexByKey.set(key, merged.length);
    merged.push({ ...entity, slug });
  }

  return merged;
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
        relatedSources: [row.publisherName ?? row.sourceName],
      });
      continue;
    }

    const publisherLabel = row.publisherName ?? row.sourceName;
    const tags = mergeEntityRefs(existing.tags, row.tags);
    const companies = mergeEntityRefs(existing.companies, row.companies);

    existing.tags = tags;
    existing.companies = companies;

    if (!existing.relatedSources.some((source) => relatedSourceKey(source) === relatedSourceKey(publisherLabel))) {
      existing.relatedSources.push(publisherLabel);
      existing.relatedSourceCount = existing.relatedSources.length;
    }

    if (new Date(row.publishedAt).getTime() > new Date(existing.publishedAt).getTime()) {
      clusters.set(storyKey, {
        ...row,
        storyKey,
        tags,
        companies,
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

  async function runQuery(includeTranslationFields: boolean, includePublisherField: boolean): Promise<ArticleListResult> {
    const conditions: string[] = [publicArticleVisibilityCondition];
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
      conditions.push(
        includeTranslationFields
          ? '(LOWER(a.title) LIKE ? OR LOWER(a.summary) LIKE ? OR LOWER(a.original_title) LIKE ? OR LOWER(a.original_summary) LIKE ?)'
          : '(LOWER(a.title) LIKE ? OR LOWER(a.summary) LIKE ? OR LOWER(a.original_title) LIKE ?)',
      );
      const query = likeValue(filters.query);
      values.push(...(includeTranslationFields ? [query, query, query, query] : [query, query, query]));
    }

    if (filters.tag?.trim()) {
      conditions.push(
        `EXISTS (
        SELECT 1 FROM article_tags at
        JOIN tags t ON t.id = at.tag_id
        WHERE at.article_id = a.id AND (LOWER(t.slug) = ? OR LOWER(t.name) = ?)
      )`,
      );
      const tagFilter = normalizedEntityFilterValue(filters.tag);
      values.push(tagFilter, tagFilter);
    }

    if (filters.company?.trim()) {
      conditions.push(
        `EXISTS (
        SELECT 1 FROM article_companies ac
        JOIN companies c ON c.id = ac.company_id
        WHERE ac.article_id = a.id AND (LOWER(c.slug) = ? OR LOWER(c.name) = ? OR LOWER(c.english_name) = ?)
      )`,
      );
      const companyFilter = normalizedEntityFilterValue(filters.company);
      values.push(companyFilter, companyFilter, companyFilter);
    }

    if (filters.category === 'policy') {
      conditions.push(
        `EXISTS (
          SELECT 1 FROM article_tags at_policy
          JOIN tags t_policy ON t_policy.id = at_policy.tag_id
          WHERE at_policy.article_id = a.id AND t_policy.slug = ?
        )`,
      );
      values.push('policy-and-regulation');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rawFetchLimit = Math.min(limit * 4 + 1, maxLimit * 4 + 1);
    const statement = db.prepare(
      `SELECT
      a.id,
      a.title,
      a.original_title AS originalTitle,
      a.summary,
      ${articleTranslationSelectFields(includeTranslationFields)},
      a.url,
      s.key AS sourceKey,
      s.name AS sourceName,
      s.type AS sourceType,
      ${articlePublisherSelectFields(includePublisherField)},
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

  try {
    return await runQuery(true, true);
  } catch (error) {
    if (isMissingArticleTranslationColumnError(error)) {
      try {
        return await runQuery(false, true);
      } catch (fallbackError) {
        if (isMissingArticlePublisherColumnError(fallbackError)) {
          return runQuery(false, false);
        }

        throw fallbackError;
      }
    }

    if (isMissingArticlePublisherColumnError(error)) {
      try {
        return await runQuery(true, false);
      } catch (fallbackError) {
        if (isMissingArticleTranslationColumnError(fallbackError)) {
          return runQuery(false, false);
        }

        throw fallbackError;
      }
    }

    throw error;
  }
}

export async function getArticleById(db: SqlDatabase, id: number): Promise<ArticleDetailRow | null> {
  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  async function runQuery(includeTranslationFields: boolean, includePublisherField: boolean): Promise<ArticleDetailRow | null> {
    const row = await db
      .prepare(
        `SELECT
        a.id,
        a.title,
        a.original_title AS originalTitle,
        a.summary,
        ${articleTranslationSelectFields(includeTranslationFields)},
        a.url,
        s.key AS sourceKey,
        s.name AS sourceName,
        s.type AS sourceType,
        ${articlePublisherSelectFields(includePublisherField)},
        a.published_at AS publishedAt,
        a.language,
        a.region,
        a.fetch_status AS fetchStatus,
        ${articleDetailRelationSelectFields}
      FROM articles a
      JOIN sources s ON s.id = a.source_id
      WHERE a.id = ? AND ${publicArticleVisibilityCondition}`,
      )
      .bind(id)
      .first<ArticleDetailDbRow>();

    return toArticleDetail(row);
  }

  try {
    return await runQuery(true, true);
  } catch (error) {
    if (isMissingArticleTranslationColumnError(error)) {
      try {
        return await runQuery(false, true);
      } catch (fallbackError) {
        if (isMissingArticlePublisherColumnError(fallbackError)) {
          return runQuery(false, false);
        }

        throw fallbackError;
      }
    }

    if (isMissingArticlePublisherColumnError(error)) {
      try {
        return await runQuery(true, false);
      } catch (fallbackError) {
        if (isMissingArticleTranslationColumnError(fallbackError)) {
          return runQuery(false, false);
        }

        throw fallbackError;
      }
    }

    throw error;
  }
}
