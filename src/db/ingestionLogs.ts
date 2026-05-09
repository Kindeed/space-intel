import type { SqlDatabase } from './types';

export type StartIngestionLogInput = {
  sourceKey: string;
  startedAt: string;
};

export type FinishIngestionLogInput = {
  id: number;
  finishedAt: string;
  successCount: number;
  failureCount: number;
  error?: string;
};

export async function startIngestionLog(db: SqlDatabase, input: StartIngestionLogInput): Promise<number> {
  const result = await db
    .prepare('INSERT INTO ingestion_logs (source_key, started_at) VALUES (?, ?)')
    .bind(input.sourceKey, input.startedAt)
    .run();
  const id = result.meta?.last_row_id;

  if (!id) {
    throw new Error(`Failed to create ingestion log for ${input.sourceKey}`);
  }

  return id;
}

export async function finishIngestionLog(db: SqlDatabase, input: FinishIngestionLogInput): Promise<void> {
  await db
    .prepare(
      `UPDATE ingestion_logs
       SET finished_at = ?, success_count = ?, failure_count = ?, error = ?
       WHERE id = ?`,
    )
    .bind(input.finishedAt, input.successCount, input.failureCount, input.error ?? null, input.id)
    .run();
}
