import { finishIngestionLog, persistLaunchRecords, startIngestionLog, type SqlDatabase } from '../db';
import type { CollectorContext, SourceConfig } from './types';
import type { LaunchLibraryCollectorResult } from './collectors/launchLibrary';

export type LaunchIngestionResult = {
  sourceKey: string;
  collected: number;
  upserted: number;
  failures: number;
};

const defaultLaunchIngestionTimeoutMs = 25_000;

function launchTimeoutError(timeoutMs: number): Error {
  return new Error(`Source ingestion timed out after ${timeoutMs}ms`);
}

function timeoutContext(context: CollectorContext, signal: AbortSignal): CollectorContext {
  return {
    ...context,
    fetch: (input, init) => context.fetch(input, { ...init, signal }),
  };
}

async function runWithTimeout<T>(action: () => Promise<T>, timeoutMs: number, controller: AbortController): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(launchTimeoutError(timeoutMs));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function runLaunchIngestion(
  db: SqlDatabase,
  source: SourceConfig,
  collector: LaunchLibraryCollectorResult,
  context: CollectorContext,
  options: { timeoutMs?: number } = {},
): Promise<LaunchIngestionResult> {
  const startedAt = context.now().toISOString();
  const logId = await startIngestionLog(db, {
    sourceKey: source.key,
    startedAt,
  });
  const timeoutMs = options.timeoutMs ?? defaultLaunchIngestionTimeoutMs;
  const controller = new AbortController();
  const boundedContext = timeoutContext(context, controller.signal);

  try {
    const launches = source.enabled
      ? await runWithTimeout(() => collector.collectLaunches(source, boundedContext), timeoutMs, controller)
      : [];
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
