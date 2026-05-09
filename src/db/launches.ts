import type { NormalizedLaunch } from '../ingestion/collectors/launchLibrary';
import type { SqlDatabase } from './types';

export type PersistLaunchesResult = {
  upserted: number;
};

export async function persistLaunchRecords(db: SqlDatabase, launches: NormalizedLaunch[]): Promise<PersistLaunchesResult> {
  let upserted = 0;

  for (const launch of launches) {
    const result = await db
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
        launch.externalId,
        launch.mission,
        launch.rocket,
        launch.provider,
        launch.windowStart,
        launch.site,
        launch.status,
        launch.rawUrl,
      )
      .run();

    upserted += result.meta?.changes ?? 0;
  }

  return { upserted };
}
