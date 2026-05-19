import { articleRelationSelectFields, toArticleSummary, type ArticleSummaryDbRow, type ArticleSummaryRow } from './articleQueries';
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
  enabledSourcesByType: Array<{ type: string; count: number }>;
};

export type TrendingTag = {
  slug: string;
  name: string;
  count: number;
};

export async function listRankedHomeArticles(db: SqlDatabase, limit = 20): Promise<RankedHomeArticle[]> {
  const result = await db
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
    .bind(Math.max(1, Math.min(Math.floor(limit), 50)))
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
    .bind(Math.max(1, Math.min(Math.floor(limit), 12)))
    .all?.<TrendingTag>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function getHomeStats(db: SqlDatabase): Promise<HomeStats> {
  const recent = await db
    .prepare("SELECT COUNT(*) AS count FROM articles WHERE published_at >= datetime('now', '-1 day')")
    .first<{ count: number }>();
  const topics = await db.prepare('SELECT COUNT(*) AS count FROM tags').first<{ count: number }>();
  const sourceResult = await db
    .prepare(
      `SELECT type, COUNT(*) AS count
       FROM sources
       WHERE enabled = 1
       GROUP BY type
       ORDER BY type ASC`,
    )
    .all?.<{ type: string; count: number }>();

  if (!sourceResult) {
    throw new Error('Database statement does not support all()');
  }

  return {
    recentArticleCount: recent?.count ?? 0,
    topicCount: topics?.count ?? 0,
    enabledSourcesByType: sourceResult.results,
  };
}
