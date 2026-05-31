import type { CurationConfigRecord } from '../curations/config';
import { runDbStatements, sumRunChanges } from './statements';
import type { SqlDatabase } from './types';

export type PersistCurationsResult = {
  inserted: number;
};

export async function replaceConfiguredCurations(
  db: SqlDatabase,
  records: CurationConfigRecord[],
): Promise<PersistCurationsResult> {
  await db.prepare("DELETE FROM curations WHERE target_type IN ('home', 'pinned', 'topic')").run();

  const statements = records.map((record) =>
    db
      .prepare(
        `INSERT INTO curations (
          target_type, target_key, item_url, weight, note, enabled
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(record.targetType, record.targetKey, record.itemUrl, record.weight, record.note, record.enabled)
  );
  const results = await runDbStatements(db, statements);
  const inserted = sumRunChanges(results);

  return { inserted };
}
