import type { CurationConfigRecord } from '../curations/config';
import type { SqlDatabase } from './types';

export type PersistCurationsResult = {
  inserted: number;
};

export async function replaceConfiguredCurations(
  db: SqlDatabase,
  records: CurationConfigRecord[],
): Promise<PersistCurationsResult> {
  await db.prepare("DELETE FROM curations WHERE target_type IN ('home', 'pinned', 'topic')").run();

  let inserted = 0;

  for (const record of records) {
    const result = await db
      .prepare(
        `INSERT INTO curations (
          target_type, target_key, item_url, weight, note, enabled
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(record.targetType, record.targetKey, record.itemUrl, record.weight, record.note, record.enabled)
      .run();

    inserted += result.meta?.changes ?? 0;
  }

  return { inserted };
}
