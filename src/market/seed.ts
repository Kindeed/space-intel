import type { SqlDatabase } from '../db/types';

export type MarketSeedArticle = {
  id: number;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  sourceId: number;
  companyId: number | null;
};

export type MarketSeedResult = {
  candidates: number;
  inserted: number;
  skipped: number;
};

const marketTerms = [
  '融资',
  '天使轮',
  'ipo',
  '上市',
  '公告',
  '财报',
  '季报',
  '年报',
  'sec',
  'filing',
  'earnings',
  'funding',
  'financing',
  'shares',
  'stock',
  '股',
  'etf',
  '涨停',
  '股价',
  '融资余额',
];

function classifyMarketItem(title: string, summary: string): string {
  const text = `${title}\n${summary}`.toLowerCase();

  if (/融资|天使轮|funding|financing/.test(text)) {
    return 'financing';
  }

  if (/公告|财报|季报|年报|sec|filing|earnings/.test(text)) {
    return 'filing';
  }

  if (/ipo|上市/.test(text)) {
    return 'ipo';
  }

  return 'market';
}

export async function listMarketSeedArticles(db: SqlDatabase): Promise<MarketSeedArticle[]> {
  const conditions = marketTerms.map(() => '(LOWER(a.title) LIKE ? OR LOWER(a.summary) LIKE ?)').join(' OR ');
  const values = marketTerms.flatMap((term) => [`%${term.toLowerCase()}%`, `%${term.toLowerCase()}%`]);
  const result = await db
    .prepare(
      `SELECT
        a.id,
        a.title,
        a.summary,
        a.url,
        a.published_at AS publishedAt,
        a.source_id AS sourceId,
        (
          SELECT ac.company_id
          FROM article_companies ac
          WHERE ac.article_id = a.id
          ORDER BY ac.company_id ASC
          LIMIT 1
        ) AS companyId
      FROM articles a
      WHERE ${conditions}
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 300`,
    )
    .bind(...values)
    .all?.<MarketSeedArticle>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

export async function seedMarketItemsFromArticles(db: SqlDatabase): Promise<MarketSeedResult> {
  const articles = await listMarketSeedArticles(db);
  let inserted = 0;

  for (const article of articles) {
    const result = await db
      .prepare(
        `INSERT OR IGNORE INTO market_items (
          title,
          item_type,
          company_id,
          source_id,
          url,
          summary,
          published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        article.title,
        classifyMarketItem(article.title, article.summary),
        article.companyId,
        article.sourceId,
        article.url,
        article.summary,
        article.publishedAt,
      )
      .run();

    inserted += result.meta?.changes ?? 0;
  }

  return {
    candidates: articles.length,
    inserted,
    skipped: articles.length - inserted,
  };
}
