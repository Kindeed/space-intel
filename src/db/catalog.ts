import type { CompanyConfigRecord, TopicConfigRecord } from '../catalog';
import type { SqlDatabase } from './types';

export type CatalogSyncResult = {
  upserted: number;
};

export async function upsertConfiguredCompanies(
  db: SqlDatabase,
  companies: CompanyConfigRecord[],
): Promise<CatalogSyncResult> {
  let upserted = 0;

  for (const company of companies) {
    const result = await db
      .prepare(
        `INSERT INTO companies (
          slug,
          name,
          english_name,
          country,
          sector,
          website,
          profile,
          stock_symbol,
          logo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          name = excluded.name,
          english_name = excluded.english_name,
          country = excluded.country,
          sector = excluded.sector,
          website = excluded.website,
          profile = excluded.profile,
          stock_symbol = excluded.stock_symbol,
          logo_url = excluded.logo_url`,
      )
      .bind(
        company.slug,
        company.name,
        company.englishName || null,
        company.country,
        company.sector,
        company.website || null,
        company.profile,
        company.stockSymbol || null,
        company.logoUrl || null,
      )
      .run();

    upserted += result.meta?.changes ?? 0;
  }

  return { upserted };
}

export async function upsertConfiguredTags(db: SqlDatabase, topics: TopicConfigRecord[]): Promise<CatalogSyncResult> {
  let upserted = 0;

  for (const topic of topics) {
    const result = await db
      .prepare(
        `INSERT INTO tags (slug, name, category)
         VALUES (?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
          name = excluded.name,
          category = excluded.category`,
      )
      .bind(topic.slug, topic.name, topic.category)
      .run();

    upserted += result.meta?.changes ?? 0;
  }

  return { upserted };
}
