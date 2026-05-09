import { finishIngestionLog, persistArticleRecords, startIngestionLog, type SqlDatabase } from '../db';
import { collectSource } from './run';
import type { CollectorContext, SourceConfig } from './types';
import type { CollectorRegistry } from './registry';

export type PersistedIngestionResult = {
  sourceKey: string;
  collected: number;
  inserted: number;
  skipped: number;
  failures: number;
};

export async function runSourceIngestion(
  db: SqlDatabase,
  source: SourceConfig,
  registry: CollectorRegistry,
  context: CollectorContext,
): Promise<PersistedIngestionResult> {
  const startedAt = context.now().toISOString();
  const logId = await startIngestionLog(db, {
    sourceKey: source.key,
    startedAt,
  });

  try {
    const records = await collectSource(source, registry, context);
    const persistence = await persistArticleRecords(db, source, records);

    await finishIngestionLog(db, {
      id: logId,
      finishedAt: context.now().toISOString(),
      successCount: persistence.inserted,
      failureCount: 0,
    });

    return {
      sourceKey: source.key,
      collected: records.length,
      inserted: persistence.inserted,
      skipped: persistence.skipped,
      failures: 0,
    };
  } catch (error) {
    await finishIngestionLog(db, {
      id: logId,
      finishedAt: context.now().toISOString(),
      successCount: 0,
      failureCount: 1,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
