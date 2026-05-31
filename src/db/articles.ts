import type { IngestionRecord } from '../ingestion/run';
import type { SourceConfig } from '../ingestion/types';
import { isMissingArticlePublisherColumnError, isMissingArticleTranslationColumnError } from './articleQueries';
import { runDbStatements } from './statements';
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

async function resolveArticleId(db: SqlDatabase, record: IngestionRecord): Promise<number | null> {
  const row = await db
    .prepare('SELECT id FROM articles WHERE dedupe_hash = ? OR url = ? ORDER BY id DESC LIMIT 1')
    .bind(record.dedupeHash, record.item.url)
    .first<{ id: number }>();

  return row?.id ?? null;
}

function uniqueLookupValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function uniqueNormalizedExternalIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function articleTagStatements(db: SqlDatabase, articleId: number, tags: string[]): DbStatement[] {
  return uniqueLookupValues(tags).map((tag) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_tags (article_id, tag_id)
         SELECT ?, id FROM tags WHERE LOWER(slug) = ?`,
      )
      .bind(articleId, tag),
  );
}

function articleCompanyStatements(db: SqlDatabase, articleId: number, companies: string[]): DbStatement[] {
  return uniqueLookupValues(companies).map((company) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_companies (article_id, company_id)
         SELECT ?, id FROM companies WHERE LOWER(slug) = ? OR LOWER(name) = ? OR LOWER(english_name) = ?`,
      )
      .bind(articleId, company, company, company),
  );
}

function articleLaunchStatements(db: SqlDatabase, articleId: number, launchExternalIds: string[]): DbStatement[] {
  return uniqueNormalizedExternalIds(launchExternalIds).map((launchExternalId) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO article_launches (article_id, launch_external_id)
         VALUES (?, ?)`,
      )
      .bind(articleId, launchExternalId),
  );
}

async function linkArticleRelations(db: SqlDatabase, articleId: number, record: IngestionRecord): Promise<void> {
  await runDbStatements(db, [
    ...articleTagStatements(db, articleId, record.item.tags),
    ...articleCompanyStatements(db, articleId, record.item.companies),
    ...articleLaunchStatements(db, articleId, record.item.relatedLaunchIds),
  ]);
}

async function insertArticleRecord(
  db: SqlDatabase,
  sourceId: number,
  record: IngestionRecord,
  includeTranslationFields: boolean,
  includePublisherField: boolean,
): Promise<DbRunResult> {
  if (!includeTranslationFields && !includePublisherField) {
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

  if (!includeTranslationFields) {
    return db
      .prepare(
        `INSERT OR IGNORE INTO articles (
          source_id, title, original_title, summary, publisher_name, url, published_at, language, region, dedupe_hash, fetch_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        sourceId,
        record.item.title,
        record.item.originalTitle ?? null,
        record.item.summary,
        record.item.publisherName ?? null,
        record.item.url,
        record.item.publishedAt,
        record.item.language,
        record.item.region,
        record.dedupeHash,
        'fetched',
      )
      .run();
  }

  if (!includePublisherField) {
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

  return db
    .prepare(
      `INSERT OR IGNORE INTO articles (
        source_id, title, original_title, summary, original_summary, url, published_at, language, region, dedupe_hash,
        fetch_status, translation_status, translation_provider, translated_at, translation_error, publisher_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      record.item.publisherName ?? null,
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
  let includePublisherField = true;

  for (const record of records) {
    let result: DbRunResult | null = null;

    while (!result) {
      try {
        result = await insertArticleRecord(db, sourceId, record, includeTranslationFields, includePublisherField);
      } catch (error) {
        if (includeTranslationFields && isMissingArticleTranslationColumnError(error)) {
          includeTranslationFields = false;
          continue;
        }

        if (includePublisherField && isMissingArticlePublisherColumnError(error)) {
          includePublisherField = false;
          continue;
        }

        throw error;
      }
    }

    inserted += result.meta?.changes ?? 0;

    const articleId = await resolveArticleId(db, record);

    if (articleId) {
      await linkArticleRelations(db, articleId, record);
    }
  }

  return {
    inserted,
    skipped: records.length - inserted,
  };
}
