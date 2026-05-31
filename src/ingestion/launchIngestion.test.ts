import { describe, expect, it } from 'vitest';
import { launchLibraryCollector, runLaunchIngestion } from './index';
import type { SourceConfig } from './types';
import type { DbRunResult, DbStatement, SqlDatabase } from '../db/types';

type LaunchRow = {
  externalId: string;
  mission: string;
};

type LogRow = {
  id: number;
  sourceKey: string;
  successCount: number;
  failureCount: number;
  error?: string | null;
};

class MemoryStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: MemoryLaunchDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    return this.database.run(this.query, this.values);
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }
}

class MemoryLaunchDatabase implements SqlDatabase {
  readonly launches: LaunchRow[] = [];
  readonly logs: LogRow[] = [];
  readonly batchSizes: number[] = [];

  prepare(query: string): DbStatement {
    return new MemoryStatement(this, query);
  }

  async batch(statements: DbStatement[]): Promise<DbRunResult[]> {
    this.batchSizes.push(statements.length);
    return Promise.all(statements.map((statement) => statement.run()));
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT INTO ingestion_logs')) {
      const id = this.logs.length + 1;
      this.logs.push({
        id,
        sourceKey: String(values[0]),
        successCount: 0,
        failureCount: 0,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }

    if (normalized.startsWith('UPDATE ingestion_logs')) {
      const id = Number(values[4]);
      const log = this.logs.find((item) => item.id === id);

      if (!log) {
        return { meta: { changes: 0 } };
      }

      log.successCount = Number(values[1]);
      log.failureCount = Number(values[2]);
      log.error = values[3] === null ? null : String(values[3]);
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO launches')) {
      const externalId = String(values[0]);
      const existing = this.launches.find((item) => item.externalId === externalId);

      if (existing) {
        existing.mission = String(values[1]);
      } else {
        this.launches.push({ externalId, mission: String(values[1]) });
      }

      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }
}

const launchSource: SourceConfig = {
  key: 'launch-library-2',
  name: 'Launch Library 2',
  type: 'api',
  region: 'global',
  url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/',
  credibility: 5,
  enabled: true,
  purpose: 'Upcoming launch cache.',
  expected_content: 'Launch event metadata.',
  risk_notes: 'Public API metadata only.',
  dedupe_strategy: 'external_id',
};

describe('launch ingestion', () => {
  it('upserts launches and records ingestion logs', async () => {
    const db = new MemoryLaunchDatabase();

    const result = await runLaunchIngestion(db, launchSource, launchLibraryCollector, {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: ' LAUNCH-1 ',
                name: 'Reusable rocket test flight',
                url: 'https://example.com/launch-1',
                net: '2026-05-10T12:00:00Z',
                status: { name: 'Go' },
              },
              {
                id: '   ',
                name: 'Blank id should not be cached',
                url: 'https://example.com/blank',
                net: '2026-05-10T12:00:00Z',
                status: { name: 'Go' },
              },
              {
                id: 'launch-1',
                name: 'Duplicate launch should not be written twice',
                url: 'https://example.com/launch-1-duplicate',
                net: '2026-05-10T12:00:00Z',
                status: { name: 'Go' },
              },
              {
                id: 'launch-2',
                name: 'Commercial rideshare mission',
                url: 'https://example.com/launch-2',
                net: '2026-05-11T12:00:00Z',
                status: { name: 'TBD' },
              },
            ],
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        ),
    });

    expect(result).toEqual({
      sourceKey: 'launch-library-2',
      collected: 4,
      upserted: 2,
      failures: 0,
    });
    expect(db.launches).toEqual([
      { externalId: 'launch-1', mission: 'Reusable rocket test flight' },
      { externalId: 'launch-2', mission: 'Commercial rideshare mission' },
    ]);
    expect(db.batchSizes).toEqual([2]);
    expect(db.logs[0]).toMatchObject({ successCount: 2, failureCount: 0 });
  });
});
