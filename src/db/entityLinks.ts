import type { ArticleEntityMatch, EnrichmentArticle } from '../enrichment';
import { isMissingArticleTranslationColumnError } from './articleQueries';
import { runDbStatements } from './statements';
import type { DbStatement, SqlDatabase } from './types';

export type EntityLinkResult = {
  articleCount: number;
  companyLinks: number;
  tagLinks: number;
};

type EntityLinkStatement = {
  type: 'company' | 'tag';
  statement: DbStatement;
};

function uniqueLookupSlugs(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export async function listArticlesForEntityMatching(db: SqlDatabase): Promise<EnrichmentArticle[]> {
  async function runQuery(includeTranslationFields: boolean): Promise<EnrichmentArticle[]> {
    const result = await db
      .prepare(
        `SELECT
          id,
          title,
          original_title AS originalTitle,
          summary,
          ${includeTranslationFields ? 'original_summary AS originalSummary' : 'NULL AS originalSummary'}
        FROM articles
        ORDER BY id ASC`,
      )
      .all?.<EnrichmentArticle>();

    if (!result) {
      throw new Error('Database statement does not support all()');
    }

    return result.results;
  }

  try {
    return await runQuery(true);
  } catch (error) {
    if (isMissingArticleTranslationColumnError(error)) {
      return runQuery(false);
    }

    throw error;
  }
}

export async function upsertConfiguredEntityLinks(
  db: SqlDatabase,
  matches: ArticleEntityMatch[],
): Promise<EntityLinkResult> {
  const statements: EntityLinkStatement[] = [];

  for (const match of matches) {
    for (const slug of uniqueLookupSlugs(match.companySlugs)) {
      statements.push({
        type: 'company',
        statement: db
          .prepare(
            `INSERT OR IGNORE INTO article_companies (article_id, company_id)
             SELECT ?, id FROM companies WHERE LOWER(slug) = ?`,
          )
          .bind(match.articleId, slug),
      });
    }

    for (const slug of uniqueLookupSlugs(match.topicSlugs)) {
      statements.push({
        type: 'tag',
        statement: db
          .prepare(
            `INSERT OR IGNORE INTO article_tags (article_id, tag_id)
             SELECT ?, id FROM tags WHERE LOWER(slug) = ?`,
          )
          .bind(match.articleId, slug),
      });
    }
  }

  const results = await runDbStatements(
    db,
    statements.map((item) => item.statement),
  );
  let companyLinks = 0;
  let tagLinks = 0;

  for (const [index, result] of results.entries()) {
    const changes = result.meta?.changes ?? 0;
    if (statements[index]?.type === 'company') {
      companyLinks += changes;
    } else {
      tagLinks += changes;
    }
  }

  return {
    articleCount: matches.length,
    companyLinks,
    tagLinks,
  };
}

export const replaceConfiguredEntityLinks = upsertConfiguredEntityLinks;
