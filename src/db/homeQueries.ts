import type { ArticleSummaryRow } from './articleQueries';
import type { SqlDatabase } from './types';

export type RankedHomeArticle = ArticleSummaryRow & {
  curationWeight: number;
  sourceCredibility: number;
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
        a.published_at AS publishedAt,
        a.language,
        a.region,
        a.fetch_status AS fetchStatus,
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
    .all?.<RankedHomeArticle>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}
