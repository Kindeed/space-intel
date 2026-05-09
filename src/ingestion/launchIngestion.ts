import { finishIngestionLog, persistLaunchRecords, startIngestionLog, type SqlDatabase } from '../db';
import type { CollectorContext, SourceConfig } from './types';
import type { LaunchLibraryCollectorResult } from './collectors/launchLibrary';

export type LaunchIngestionResult = {
  sourceKey: string;
  collected: number;
  upserted: number;
  failures: number;
};

export async function runLaunchIngestion(
  db: SqlDatabase,
  source: SourceConfig,
  collector: LaunchLibraryCollectorResult,
  context: CollectorContext,
): Promise<LaunchIngestionResult> {
  const startedAt = context.now().toISOString();
  const logId = await startIngestionLog(db, {
    sourceKey: source.key,
    startedAt,
  });

  try {
    const launches = source.enabled ? await collector.collectLaunches(source, context) : [];
    const persistence = await persistLaunchRecords(db, launches);

    await finishIngestionLog(db, {
      id: logId,
      finishedAt: context.now().toISOString(),
      successCount: persistence.upserted,
      failureCount: 0,
    });

    return {
      sourceKey: source.key,
      collected: launches.length,
      upserted: persistence.upserted,
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
