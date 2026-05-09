import { describe, expect, it } from 'vitest';
import { getLaunchByIdOrExternalId, listLaunches, type LaunchRow } from './launchQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeLaunchDatabase,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    return { meta: { changes: 0 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    return { results: this.database.allResults as T[] };
  }
}

class FakeLaunchDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  allResults: LaunchRow[] = [];
  firstResult: LaunchRow | null = null;

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

const launch: LaunchRow = {
  id: 1,
  externalId: 'f596ad48-881e-47d6-806d-113c6dd97427',
  mission: 'Commercial rideshare',
  rocket: 'Electron',
  provider: 'Rocket Lab',
  windowStart: '2026-06-01T00:00:00Z',
  site: 'Mahia',
  status: 'Go',
  rawUrl: 'https://example.com/launch',
};

describe('launch queries', () => {
  it('lists launches with filters and pagination', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch, { ...launch, id: 2 }];

    const result = await listLaunches(db, {
      status: 'Go',
      provider: 'Rocket Lab',
      query: 'electron',
      page: 2,
      limit: 1,
    });

    expect(result).toEqual({
      items: [launch],
      page: 2,
      limit: 1,
      hasMore: true,
    });
    expect(db.lastQuery).toContain('status = ?');
    expect(db.lastQuery).toContain('provider = ?');
    expect(db.lastQuery).toContain('LOWER(mission) LIKE ?');
    expect(db.lastValues).toEqual(['Go', 'Rocket Lab', '%electron%', '%electron%', '%electron%', '%electron%', 2, 1]);
  });

  it('loads launch detail by numeric id', async () => {
    const db = new FakeLaunchDatabase();
    db.firstResult = launch;

    const result = await getLaunchByIdOrExternalId(db, '1');

    expect(result).toEqual(launch);
    expect(db.lastQuery).toContain('WHERE id = ?');
    expect(db.lastValues).toEqual([1]);
  });

  it('loads launch detail by external id', async () => {
    const db = new FakeLaunchDatabase();
    db.firstResult = launch;

    const result = await getLaunchByIdOrExternalId(db, launch.externalId);

    expect(result).toEqual(launch);
    expect(db.lastQuery).toContain('WHERE external_id = ?');
    expect(db.lastValues).toEqual([launch.externalId]);
  });

  it('returns null for empty launch ids', async () => {
    const db = new FakeLaunchDatabase();

    await expect(getLaunchByIdOrExternalId(db, '')).resolves.toBeNull();
  });
});
