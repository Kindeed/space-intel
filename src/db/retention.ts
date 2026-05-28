import type { SqlDatabase } from './types';

export type RetentionCleanupInput = {
  now: Date;
  batchLimit?: number;
  articleRetentionDays?: number;
  ingestionLogRetentionDays?: number;
  marketItemRetentionDays?: number;
  launchRetentionDays?: number;
};

export type RetentionCleanupResult = {
  articleTagsDeleted: number;
  articleCompaniesDeleted: number;
  articleLaunchesDeleted: number;
  articlesDeleted: number;
  ingestionLogsDeleted: number;
  marketItemsDeleted: number;
  launchesDeleted: number;
};

const defaultBatchLimit = 500;
const defaultArticleRetentionDays = 730;
const defaultIngestionLogRetentionDays = 90;
const defaultMarketItemRetentionDays = 1095;
const defaultLaunchRetentionDays = 730;

function cutoff(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

function normalizeBatchLimit(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return defaultBatchLimit;
  }

  return Math.min(Math.floor(value), 2_000);
}

async function runDelete(db: SqlDatabase, query: string, values: unknown[]): Promise<number> {
  const result = await db.prepare(query).bind(...values).run();
  return result.meta?.changes ?? 0;
}

function oldArticleSubquery(): string {
  return `SELECT id
          FROM articles
          WHERE published_at < ?
          ORDER BY published_at ASC, id ASC
          LIMIT ?`;
}

export async function cleanupRetainedData(
  db: SqlDatabase,
  input: RetentionCleanupInput,
): Promise<RetentionCleanupResult> {
  const batchLimit = normalizeBatchLimit(input.batchLimit);
  const articleCutoff = cutoff(input.now, input.articleRetentionDays ?? defaultArticleRetentionDays);
  const ingestionLogCutoff = cutoff(input.now, input.ingestionLogRetentionDays ?? defaultIngestionLogRetentionDays);
  const marketItemCutoff = cutoff(input.now, input.marketItemRetentionDays ?? defaultMarketItemRetentionDays);
  const launchCutoff = cutoff(input.now, input.launchRetentionDays ?? defaultLaunchRetentionDays);

  const articleTagsDeleted = await runDelete(
    db,
    `DELETE FROM article_tags
     WHERE article_id IN (${oldArticleSubquery()})`,
    [articleCutoff, batchLimit],
  );
  const articleCompaniesDeleted = await runDelete(
    db,
    `DELETE FROM article_companies
     WHERE article_id IN (${oldArticleSubquery()})`,
    [articleCutoff, batchLimit],
  );
  const articleLaunchesDeleted = await runDelete(
    db,
    `DELETE FROM article_launches
     WHERE article_id IN (${oldArticleSubquery()})`,
    [articleCutoff, batchLimit],
  );
  const articlesDeleted = await runDelete(
    db,
    `DELETE FROM articles
     WHERE id IN (${oldArticleSubquery()})`,
    [articleCutoff, batchLimit],
  );
  const ingestionLogsDeleted = await runDelete(
    db,
    `DELETE FROM ingestion_logs
     WHERE id IN (
       SELECT id
       FROM ingestion_logs
       WHERE started_at < ?
       ORDER BY started_at ASC, id ASC
       LIMIT ?
     )`,
    [ingestionLogCutoff, batchLimit],
  );
  const marketItemsDeleted = await runDelete(
    db,
    `DELETE FROM market_items
     WHERE id IN (
       SELECT id
       FROM market_items
       WHERE published_at < ?
       ORDER BY published_at ASC, id ASC
       LIMIT ?
     )`,
    [marketItemCutoff, batchLimit],
  );
  const launchesDeleted = await runDelete(
    db,
    `DELETE FROM launches
     WHERE id IN (
       SELECT id
       FROM launches
       WHERE window_start IS NOT NULL
         AND window_start < ?
       ORDER BY window_start ASC, id ASC
       LIMIT ?
     )`,
    [launchCutoff, batchLimit],
  );

  return {
    articleTagsDeleted,
    articleCompaniesDeleted,
    articleLaunchesDeleted,
    articlesDeleted,
    ingestionLogsDeleted,
    marketItemsDeleted,
    launchesDeleted,
  };
}
