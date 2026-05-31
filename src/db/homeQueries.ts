import {
  articleRelationSelectFields,
  articlePublisherSelectFields,
  articleTranslationSelectFields,
  isMissingArticlePublisherColumnError,
  isMissingArticleTranslationColumnError,
  toArticleSummary,
  type ArticleSummaryDbRow,
  type ArticleSummaryRow,
} from './articleQueries';
import { normalizeBoundedPositiveInteger } from '../number';
import type { SqlDatabase } from './types';

export type RankedHomeArticle = ArticleSummaryRow & {
  curationWeight: number;
  sourceCredibility: number;
};

type RankedHomeArticleDbRow = ArticleSummaryDbRow & {
  curationWeight: number;
  sourceCredibility: number;
};

export type HomeStats = {
  recentArticleCount: number;
  topicCount: number;
  enabledSources: Array<{ key: string; type: string; region: string }>;
};

export type TrendingTag = {
  slug: string;
  name: string;
  count: number;
};

export async function listRankedHomeArticles(db: SqlDatabase, limit = 20): Promise<RankedHomeArticle[]> {
  async function runQuery(includeTranslationFields: boolean, includePublisherField: boolean): Promise<RankedHomeArticle[]> {
    const result = await db
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
        ${articleRelationSelectFields},
        COALESCE(MAX(c.weight), 0) AS curationWeight,
        s.credibility AS sourceCredibility
      FROM articles a
      JOIN sources s ON s.id = a.source_id
      LEFT JOIN curations c ON c.item_url = a.url AND c.enabled = 1 AND c.target_type IN ('home', 'pinned')
      GROUP BY a.id
      ORDER BY curationWeight DESC, a.published_at DESC, sourceCredibility DESC, a.id DESC
      LIMIT ?`,
      )
      .bind(normalizeBoundedPositiveInteger(limit, 20, 50))
      .all?.<RankedHomeArticleDbRow>();

    if (!result) {
      throw new Error('Database statement does not support all()');
    }

    return result.results.map((row) => ({
      ...toArticleSummary(row),
      curationWeight: row.curationWeight,
      sourceCredibility: row.sourceCredibility,
    }));
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

export async function listTrendingTags(db: SqlDatabase, limit = 6): Promise<TrendingTag[]> {
  const result = await db
    .prepare(
      `SELECT
        t.slug,
        t.name,
        COUNT(at.article_id) AS count
      FROM tags t
      JOIN article_tags at ON at.tag_id = t.id
      JOIN articles a ON a.id = at.article_id
      WHERE a.published_at >= datetime('now', '-7 days')
      GROUP BY t.id, t.slug, t.name
      ORDER BY count DESC, t.name ASC
      LIMIT ?`,
    )
    .bind(normalizeBoundedPositiveInteger(limit, 6, 12))
    .all?.<TrendingTag>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function getHomeStats(db: SqlDatabase): Promise<HomeStats> {
  const recentQuery = db
    .prepare("SELECT COUNT(*) AS count FROM articles WHERE published_at >= datetime('now', '-1 day')")
    .first<{ count: number }>();
  const topicsQuery = db.prepare('SELECT COUNT(*) AS count FROM tags').first<{ count: number }>();
  const sourceQuery = db
    .prepare(
      `SELECT key, type, region
       FROM sources
       WHERE enabled = 1
       ORDER BY type ASC, key ASC`,
    )
    .all?.<{ key: string; type: string; region: string }>();

  const [recent, topics, sourceResult] = await Promise.all([recentQuery, topicsQuery, sourceQuery]);

  if (!sourceResult) {
    throw new Error('Database statement does not support all()');
  }

  return {
    recentArticleCount: recent?.count ?? 0,
    topicCount: topics?.count ?? 0,
    enabledSources: sourceResult.results,
  };
}
