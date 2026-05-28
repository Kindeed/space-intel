import type { ArticleEntityMatch, EnrichmentArticle } from '../enrichment';
import type { SqlDatabase } from './types';

export type EntityLinkResult = {
  articleCount: number;
  companyLinks: number;
  tagLinks: number;
};

export async function listArticlesForEntityMatching(db: SqlDatabase): Promise<EnrichmentArticle[]> {
  const result = await db
    .prepare(
      `SELECT
        id,
        title,
        original_title AS originalTitle,
        summary,
        original_summary AS originalSummary
      FROM articles
      ORDER BY id ASC`,
    )
    .all?.<EnrichmentArticle>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function replaceConfiguredEntityLinks(
  db: SqlDatabase,
  matches: ArticleEntityMatch[],
): Promise<EntityLinkResult> {
  let companyLinks = 0;
  let tagLinks = 0;

  await db.prepare('DELETE FROM article_companies').run();
  await db.prepare('DELETE FROM article_tags').run();

  for (const match of matches) {
    for (const slug of match.companySlugs) {
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO article_companies (article_id, company_id)
           SELECT ?, id FROM companies WHERE slug = ?`,
        )
        .bind(match.articleId, slug)
        .run();
      companyLinks += result.meta?.changes ?? 0;
    }

    for (const slug of match.topicSlugs) {
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO article_tags (article_id, tag_id)
           SELECT ?, id FROM tags WHERE slug = ?`,
        )
        .bind(match.articleId, slug)
        .run();
      tagLinks += result.meta?.changes ?? 0;
    }
  }

  return {
    articleCount: matches.length,
    companyLinks,
    tagLinks,
  };
}
