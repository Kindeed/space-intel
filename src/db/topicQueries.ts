import type { ArticleSummaryRow } from './articleQueries';
import type { SqlDatabase } from './types';

export type TopicRow = {
  id: number;
  slug: string;
  name: string;
  category: string;
  articleCount: number;
  curationCount: number;
};

export type TopicCurationRow = {
  id: number;
  targetType: string;
  targetKey: string;
  itemUrl: string;
  weight: number;
  note: string | null;
  enabled: number;
  createdAt: string;
};

export type TopicDetail = TopicRow & {
  articles: ArticleSummaryRow[];
  curations: TopicCurationRow[];
};

export async function listTopics(db: SqlDatabase): Promise<TopicRow[]> {
  const result = await db
    .prepare(
      `SELECT
        t.id,
        t.slug,
        t.name,
        t.category,
        COUNT(DISTINCT at.article_id) AS articleCount,
        COUNT(DISTINCT c.id) AS curationCount
      FROM tags t
      LEFT JOIN article_tags at ON at.tag_id = t.id
      LEFT JOIN curations c ON c.target_type = 'topic' AND c.target_key = t.slug AND c.enabled = 1
      GROUP BY t.id
      ORDER BY articleCount DESC, t.name ASC`,
    )
    .all?.<TopicRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function getTopicBySlug(db: SqlDatabase, slug: string): Promise<TopicDetail | null> {
  if (!slug.trim()) {
    return null;
  }

  const topic = await db
    .prepare(
      `SELECT
        t.id,
        t.slug,
        t.name,
        t.category,
        COUNT(DISTINCT at.article_id) AS articleCount,
        COUNT(DISTINCT c.id) AS curationCount
      FROM tags t
      LEFT JOIN article_tags at ON at.tag_id = t.id
      LEFT JOIN curations c ON c.target_type = 'topic' AND c.target_key = t.slug AND c.enabled = 1
      WHERE t.slug = ?
      GROUP BY t.id`,
    )
    .bind(slug)
    .first<TopicRow>();

  if (!topic) {
    return null;
  }

  const articleResult = await db
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
        a.fetch_status AS fetchStatus
      FROM articles a
      JOIN article_tags at ON at.article_id = a.id
      JOIN sources s ON s.id = a.source_id
      WHERE at.tag_id = ?
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 20`,
    )
    .bind(topic.id)
    .all?.<ArticleSummaryRow>();

  if (!articleResult) {
    throw new Error('Database statement does not support all()');
  }

  const curationResult = await db
    .prepare(
      `SELECT
        id,
        target_type AS targetType,
        target_key AS targetKey,
        item_url AS itemUrl,
        weight,
        note,
        enabled,
        created_at AS createdAt
      FROM curations
      WHERE target_type = 'topic' AND target_key = ? AND enabled = 1
      ORDER BY weight DESC, created_at DESC`,
    )
    .bind(topic.slug)
    .all?.<TopicCurationRow>();

  if (!curationResult) {
    throw new Error('Database statement does not support all()');
  }

  return {
    ...topic,
    articles: articleResult.results,
    curations: curationResult.results,
  };
}
