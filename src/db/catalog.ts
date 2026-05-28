import type { CompanyConfigRecord, TopicConfigRecord } from '../catalog';
import type { SourceConfig } from '../ingestion';
import type { SqlDatabase } from './types';

export type CatalogSyncResult = {
  upserted: number;
};

export type FullCatalogSyncResult = {
  sources: CatalogSyncResult & { configured: number };
  companies: CatalogSyncResult & { configured: number };
  topics: CatalogSyncResult & { configured: number };
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

export async function upsertConfiguredSources(db: SqlDatabase, sources: SourceConfig[]): Promise<CatalogSyncResult> {
  let upserted = 0;

  for (const source of sources) {
    const result = await db
      .prepare(
        `INSERT INTO sources (
          key,
          name,
          type,
          region,
          url,
          credibility,
          enabled,
          purpose,
          expected_content,
          risk_notes,
          dedupe_strategy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          name = excluded.name,
          type = excluded.type,
          region = excluded.region,
          url = excluded.url,
          credibility = excluded.credibility,
          enabled = excluded.enabled,
          purpose = excluded.purpose,
          expected_content = excluded.expected_content,
          risk_notes = excluded.risk_notes,
          dedupe_strategy = excluded.dedupe_strategy`,
      )
      .bind(
        source.key,
        source.name,
        source.type,
        source.region,
        source.url,
        source.credibility,
        source.enabled ? 1 : 0,
        source.purpose,
        source.expected_content,
        source.risk_notes,
        source.dedupe_strategy,
      )
      .run();

    upserted += result.meta?.changes ?? 0;
  }

  return { upserted };
}

export async function syncConfiguredCatalog(
  db: SqlDatabase,
  input: {
    sources: SourceConfig[];
    companies: CompanyConfigRecord[];
    topics: TopicConfigRecord[];
  },
): Promise<FullCatalogSyncResult> {
  const sourceResult = await upsertConfiguredSources(db, input.sources);
  const companyResult = await upsertConfiguredCompanies(db, input.companies);
  const topicResult = await upsertConfiguredTags(db, input.topics);

  return {
    sources: {
      configured: input.sources.length,
      upserted: sourceResult.upserted,
    },
    companies: {
      configured: input.companies.length,
      upserted: companyResult.upserted,
    },
    topics: {
      configured: input.topics.length,
      upserted: topicResult.upserted,
    },
  };
}
