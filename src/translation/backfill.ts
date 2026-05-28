import type { SqlDatabase } from '../db/types';
import type { CollectorContext } from '../ingestion/types';
import { translateArticleFields, type TranslationEnv, type TranslationStatus } from './index';

export type TranslationBackfillResult = {
  candidates: number;
  translated: number;
  failed: number;
  skipped: number;
};

type TranslationCandidate = {
  id: number;
  title: string;
  originalTitle: string | null;
  summary: string;
  originalSummary: string | null;
  language: 'zh' | 'en' | 'unknown';
};

function normalizeLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return 20;
  }

  return Math.min(Math.floor(value), 50);
}

async function listTranslationCandidates(db: SqlDatabase, limit: number): Promise<TranslationCandidate[]> {
  const result = await db
    .prepare(
      `SELECT
        id,
        title,
        original_title AS originalTitle,
        summary,
        original_summary AS originalSummary,
        language
      FROM articles
      WHERE language = 'en'
        AND translation_status IN ('skipped', 'failed')
        AND (title != '' OR summary != '')
      ORDER BY published_at DESC, id DESC
      LIMIT ?`,
    )
    .bind(limit)
    .all?.<TranslationCandidate>();

  if (!result) {
    throw new Error('Database statement does not support all()');
  }

  return result.results;
}

async function updateArticleTranslation(
  db: SqlDatabase,
  id: number,
  input: {
    title: string;
    originalTitle: string | null;
    summary: string;
    originalSummary: string | null;
    translationStatus: TranslationStatus;
    translationProvider: string | null;
    translatedAt: string | null;
    translationError: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `UPDATE articles
       SET title = ?,
           original_title = ?,
           summary = ?,
           original_summary = ?,
           translation_status = ?,
           translation_provider = ?,
           translated_at = ?,
           translation_error = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      input.title,
      input.originalTitle,
      input.summary,
      input.originalSummary,
      input.translationStatus,
      input.translationProvider,
      input.translatedAt,
      input.translationError,
      id,
    )
    .run();
}

export async function backfillArticleTranslations(
  db: SqlDatabase,
  env: TranslationEnv,
  context: CollectorContext,
  limit?: number,
): Promise<TranslationBackfillResult> {
  const candidates = await listTranslationCandidates(db, normalizeLimit(limit));
  const result: TranslationBackfillResult = {
    candidates: candidates.length,
    translated: 0,
    failed: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    const translation = await translateArticleFields(candidate, env, context);
    await updateArticleTranslation(db, candidate.id, translation);

    if (translation.translationStatus === 'translated') {
      result.translated += 1;
    } else if (translation.translationStatus === 'failed') {
      result.failed += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}
