import type { NormalizedLaunch } from '../ingestion/collectors/launchLibrary';
import { runDbStatements, sumRunChanges } from './statements';
import type { SqlDatabase } from './types';

export type PersistLaunchesResult = {
  upserted: number;
};

function normalizeLaunchExternalId(value: string): string {
  return value.trim().toLowerCase();
}

export async function persistLaunchRecords(db: SqlDatabase, launches: NormalizedLaunch[]): Promise<PersistLaunchesResult> {
  const launchByExternalId = new Map<string, NormalizedLaunch>();

  for (const launch of launches) {
    const externalId = normalizeLaunchExternalId(launch.externalId);

    if (!externalId) {
      continue;
    }

    if (!launchByExternalId.has(externalId)) {
      launchByExternalId.set(externalId, launch);
    }
  }

  const statements = [...launchByExternalId.entries()].map(([externalId, launch]) =>
    db
      .prepare(
        `INSERT INTO launches (
          external_id, mission, rocket, provider, window_start, site, status, raw_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(external_id) DO UPDATE SET
          mission = excluded.mission,
          rocket = excluded.rocket,
          provider = excluded.provider,
          window_start = excluded.window_start,
          site = excluded.site,
          status = excluded.status,
          raw_url = excluded.raw_url`,
      )
      .bind(
        externalId,
        launch.mission,
        launch.rocket,
        launch.provider,
        launch.windowStart,
        launch.site,
        launch.status,
        launch.rawUrl,
      ),
  );
  const results = await runDbStatements(db, statements);
  const upserted = sumRunChanges(results);

  return { upserted };
}
