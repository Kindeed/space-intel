import type { IngestionRecord } from '../ingestion/run';
import type { SourceConfig } from '../ingestion/types';
import type { SqlDatabase } from './types';

export type PersistArticlesResult = {
  inserted: number;
  skipped: number;
};

export async function ensureSource(db: SqlDatabase, source: SourceConfig): Promise<number> {
  await db
    .prepare(
      `INSERT INTO sources (
        key, name, type, region, url, credibility, enabled, purpose, expected_content, risk_notes, dedupe_strategy
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

  const row = await db.prepare('SELECT id FROM sources WHERE key = ?').bind(source.key).first<{ id: number }>();

  if (!row) {
    throw new Error(`Failed to resolve source id for ${source.key}`);
  }

  return row.id;
}

async function resolveArticleId(db: SqlDatabase, record: IngestionRecord): Promise<number | null> {
  const row = await db
    .prepare('SELECT id FROM articles WHERE dedupe_hash = ? OR url = ? ORDER BY id DESC LIMIT 1')
    .bind(record.dedupeHash, record.item.url)
    .first<{ id: number }>();

  return row?.id ?? null;
}

async function linkArticleTags(db: SqlDatabase, articleId: number, tags: string[]): Promise<void> {
  for (const tag of new Set(tags.map((value) => value.trim()).filter(Boolean))) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO article_tags (article_id, tag_id)
         SELECT ?, id FROM tags WHERE slug = ?`,
      )
      .bind(articleId, tag)
      .run();
  }
}

async function linkArticleCompanies(db: SqlDatabase, articleId: number, companies: string[]): Promise<void> {
  for (const company of new Set(companies.map((value) => value.trim()).filter(Boolean))) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO article_companies (article_id, company_id)
         SELECT ?, id FROM companies WHERE slug = ? OR name = ? OR english_name = ?`,
      )
      .bind(articleId, company, company, company)
      .run();
  }
}

async function linkArticleLaunches(db: SqlDatabase, articleId: number, launchExternalIds: string[]): Promise<void> {
  for (const launchExternalId of new Set(launchExternalIds.map((value) => value.trim()).filter(Boolean))) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO article_launches (article_id, launch_external_id)
         VALUES (?, ?)`,
      )
      .bind(articleId, launchExternalId)
      .run();
  }
}

export async function persistArticleRecords(
  db: SqlDatabase,
  source: SourceConfig,
  records: IngestionRecord[],
): Promise<PersistArticlesResult> {
  const sourceId = await ensureSource(db, source);
  let inserted = 0;

  for (const record of records) {
    const result = await db
      .prepare(
        `INSERT OR IGNORE INTO articles (
          source_id, title, original_title, summary, url, published_at, language, region, dedupe_hash, fetch_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        sourceId,
        record.item.title,
        record.item.originalTitle ?? null,
        record.item.summary,
        record.item.url,
        record.item.publishedAt,
        record.item.language,
        record.item.region,
        record.dedupeHash,
        'fetched',
      )
      .run();

    inserted += result.meta?.changes ?? 0;

    const articleId = await resolveArticleId(db, record);

    if (articleId) {
      await linkArticleTags(db, articleId, record.item.tags);
      await linkArticleCompanies(db, articleId, record.item.companies);
      await linkArticleLaunches(db, articleId, record.item.relatedLaunchIds);
    }
  }

  return {
    inserted,
    skipped: records.length - inserted,
  };
}
