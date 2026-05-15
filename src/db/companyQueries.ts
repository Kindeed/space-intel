import type { ArticleSummaryRow } from './articleQueries';
import type { SqlDatabase } from './types';

export type CompanyRow = {
  id: number;
  slug: string;
  name: string;
  englishName: string | null;
  country: string;
  sector: string;
  website: string | null;
  profile: string;
  stockSymbol: string | null;
  logoUrl: string | null;
  articleCount: number;
};

export type CompanyDetail = CompanyRow & {
  articles: ArticleSummaryRow[];
};

export async function listCompanies(db: SqlDatabase): Promise<CompanyRow[]> {
  const result = await db
    .prepare(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.english_name AS englishName,
        c.country,
        c.sector,
        c.website,
        c.profile,
        c.stock_symbol AS stockSymbol,
        c.logo_url AS logoUrl,
        COUNT(ac.article_id) AS articleCount
      FROM companies c
      LEFT JOIN article_companies ac ON ac.company_id = c.id
      GROUP BY c.id
      ORDER BY articleCount DESC, c.name ASC`,
    )
    .all?.<CompanyRow>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function getCompanyBySlug(db: SqlDatabase, slug: string): Promise<CompanyDetail | null> {
  if (!slug.trim()) {
    return null;
  }

  const company = await db
    .prepare(
      `SELECT
        c.id,
        c.slug,
        c.name,
        c.english_name AS englishName,
        c.country,
        c.sector,
        c.website,
        c.profile,
        c.stock_symbol AS stockSymbol,
        c.logo_url AS logoUrl,
        COUNT(ac.article_id) AS articleCount
      FROM companies c
      LEFT JOIN article_companies ac ON ac.company_id = c.id
      WHERE c.slug = ?
      GROUP BY c.id`,
    )
    .bind(slug)
    .first<CompanyRow>();

  if (!company) {
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
      JOIN article_companies ac ON ac.article_id = a.id
      JOIN sources s ON s.id = a.source_id
      WHERE ac.company_id = ?
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 20`,
    )
    .bind(company.id)
    .all?.<ArticleSummaryRow>();

  if (!articleResult) {
    throw new Error('Database statement does not support all()');
  }

  return {
    ...company,
    articles: articleResult.results,
  };
}
