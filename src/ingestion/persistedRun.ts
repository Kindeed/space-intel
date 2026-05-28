import { finishIngestionLog, persistArticleRecords, startIngestionLog, type SqlDatabase } from '../db';
import { translateIngestionRecords, type TranslationEnv } from '../translation';
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

export const defaultSourceIngestionTimeoutMs = 25_000;

function sourceTimeoutError(timeoutMs: number): Error {
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
          reject(sourceTimeoutError(timeoutMs));
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

export async function runSourceIngestion(
  db: SqlDatabase,
  source: SourceConfig,
  registry: CollectorRegistry,
  context: CollectorContext,
  options: { timeoutMs?: number; translationEnv?: TranslationEnv } = {},
): Promise<PersistedIngestionResult> {
  const startedAt = context.now().toISOString();
  const logId = await startIngestionLog(db, {
    sourceKey: source.key,
    startedAt,
  });
  const timeoutMs = options.timeoutMs ?? defaultSourceIngestionTimeoutMs;
  const controller = new AbortController();
  const boundedContext = timeoutContext(context, controller.signal);

  try {
    const records = await runWithTimeout(
      async () => translateIngestionRecords(await collectSource(source, registry, boundedContext), options.translationEnv, boundedContext),
      timeoutMs,
      controller,
    );
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
