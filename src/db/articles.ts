import type { IngestionRecord } from '../ingestion/run';
import type { SourceConfig } from '../ingestion/types';
import { isMissingArticleTranslationColumnError } from './articleQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

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

async function runStatements(db: SqlDatabase, statements: DbStatement[]): Promise<void> {
  if (!statements.length) {
    return;
  }

  if (typeof db.batch === 'function') {
    await (db.batch as (items: DbStatement[]) => Promise<unknown[]>)(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
}

async function resolveArticleId(db: SqlDatabase, record: IngestionRecord): Promise<number | null> {
  const row = await db
    .prepare('SELECT id FROM articles WHERE dedupe_hash = ? OR url = ? ORDER BY id DESC LIMIT 1')
    .bind(record.dedupeHash, record.item.url)
    .first<{ id: number }>();

  return row?.id ?? null;
}

async function linkArticleTags(db: SqlDatabase, articleId: number, tags: string[]): Promise<void> {
  const statements = [...new Set(tags.map((value) => value.trim()).filter(Boolean))].map((tag) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_tags (article_id, tag_id)
         SELECT ?, id FROM tags WHERE slug = ?`,
      )
      .bind(articleId, tag),
  );

  await runStatements(db, statements);
}

async function linkArticleCompanies(db: SqlDatabase, articleId: number, companies: string[]): Promise<void> {
  const statements = [...new Set(companies.map((value) => value.trim()).filter(Boolean))].map((company) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_companies (article_id, company_id)
         SELECT ?, id FROM companies WHERE slug = ? OR name = ? OR english_name = ?`,
      )
      .bind(articleId, company, company, company),
  );

  await runStatements(db, statements);
}

async function linkArticleLaunches(db: SqlDatabase, articleId: number, launchExternalIds: string[]): Promise<void> {
  const statements = [...new Set(launchExternalIds.map((value) => value.trim()).filter(Boolean))].map((launchExternalId) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_launches (article_id, launch_external_id)
         VALUES (?, ?)`,
      )
      .bind(articleId, launchExternalId),
  );

  await runStatements(db, statements);
}

async function insertArticleRecord(
  db: SqlDatabase,
  sourceId: number,
  record: IngestionRecord,
  includeTranslationFields: boolean,
): Promise<DbRunResult> {
  if (!includeTranslationFields) {
    return db
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
  }

  return db
    .prepare(
      `INSERT OR IGNORE INTO articles (
        source_id, title, original_title, summary, original_summary, url, published_at, language, region, dedupe_hash,
        fetch_status, translation_status, translation_provider, translated_at, translation_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      sourceId,
      record.item.title,
      record.item.originalTitle ?? null,
      record.item.summary,
      record.item.originalSummary ?? null,
      record.item.url,
      record.item.publishedAt,
      record.item.language,
      record.item.region,
      record.dedupeHash,
      'fetched',
      record.item.translationStatus ?? 'skipped',
      record.item.translationProvider ?? null,
      record.item.translatedAt ?? null,
      record.item.translationError ?? null,
    )
    .run();
}

export async function persistArticleRecords(
  db: SqlDatabase,
  source: SourceConfig,
  records: IngestionRecord[],
): Promise<PersistArticlesResult> {
  const sourceId = await ensureSource(db, source);
  let inserted = 0;
  let includeTranslationFields = true;

  for (const record of records) {
    let result: DbRunResult;

    try {
      result = await insertArticleRecord(db, sourceId, record, includeTranslationFields);
    } catch (error) {
      if (!includeTranslationFields || !isMissingArticleTranslationColumnError(error)) {
        throw error;
      }

      includeTranslationFields = false;
      result = await insertArticleRecord(db, sourceId, record, includeTranslationFields);
    }

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
