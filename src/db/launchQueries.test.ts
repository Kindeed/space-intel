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
      nowIso: '2026-05-28T00:00:00.000Z',
      page: 2,
      limit: 1,
    });

    expect(result).toEqual({
      items: [launch],
      page: 2,
      limit: 1,
      hasMore: true,
    });
    expect(db.lastQuery).toContain('LOWER(status) LIKE ?');
    expect(db.lastQuery).toContain('LOWER(provider) LIKE ?');
    expect(db.lastQuery).toContain('LOWER(mission) LIKE ?');
    expect(db.lastQuery).toContain('window_start >= ?');
    expect(db.lastValues).toEqual([
      '2026-05-28T00:00:00.000Z',
      'go',
      'go %',
      '% go',
      '% go %',
      '%no go%',
      '%no-go%',
      '%rocket lab%',
      '%electron%',
      '%electron%',
      '%electron%',
      '%electron%',
      2,
      1,
    ]);
  });

  it('matches launch provider filters case-insensitively by keyword', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    await listLaunches(db, {
      provider: ' rocket lab ',
      includePast: true,
    });

    expect(db.lastQuery).toContain('LOWER(provider) LIKE ?');
    expect(db.lastValues).toEqual(['%rocket lab%', 21, 0]);
  });

  it('matches launch status filters case-insensitively by keyword', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    await listLaunches(db, {
      status: 'go',
      includePast: true,
    });

    expect(db.lastQuery).toContain('LOWER(status) LIKE ?');
    expect(db.lastQuery).toContain('LOWER(status) NOT LIKE ?');
    expect(db.lastValues).toEqual(['go', 'go %', '% go', '% go %', '%no go%', '%no-go%', 21, 0]);
  });

  it('avoids matching unsuccessful launch statuses through success filters', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    await listLaunches(db, {
      status: 'success',
      includePast: true,
    });

    expect(db.lastQuery).toContain('LOWER(status) NOT LIKE ?');
    expect(db.lastValues).toEqual(['%success%', '%成功%', '%unsuccess%', '%不成功%', 21, 0]);
  });

  it('matches failure status aliases including unsuccessful values', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    await listLaunches(db, {
      status: 'fail',
      includePast: true,
    });

    expect(db.lastQuery).toContain('LOWER(status) LIKE ? OR LOWER(status) LIKE ? OR LOWER(status) LIKE ?');
    expect(db.lastValues).toEqual(['%fail%', '%unsuccess%', '%不成功%', '%失败%', '%异常%', 21, 0]);
  });

  it('matches Chinese aliases for canonical launch status filters', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    await listLaunches(db, {
      status: 'confirm',
      includePast: true,
    });

    expect(db.lastValues).toEqual(['%confirm%', '%tbc%', '%tbd%', '%to be determined%', '%to be confirmed%', '%待确认%', '%确认%', 21, 0]);

    await listLaunches(db, {
      status: 'hold',
      includePast: true,
    });

    expect(db.lastValues).toEqual(['%hold%', '%no go%', '%no-go%', '%等待%', 21, 0]);
  });

  it('omits the future launch filter when explicitly including past launches', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    const result = await listLaunches(db, {
      includePast: true,
      limit: 1,
    });

    expect(result.items).toEqual([launch]);
    expect(db.lastQuery).not.toContain('window_start >= ?');
    expect(db.lastValues).toEqual([2, 0]);
  });

  it('rejects decimal pagination inputs at the query layer', async () => {
    const db = new FakeLaunchDatabase();
    db.allResults = [launch];

    const result = await listLaunches(db, {
      includePast: true,
      page: 2.5,
      limit: 3.9,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(db.lastValues).toEqual([21, 0]);
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
    expect(db.lastQuery).toContain('WHERE LOWER(external_id) = ?');
    expect(db.lastValues).toEqual([launch.externalId]);
  });

  it('matches launch external ids case-insensitively', async () => {
    const db = new FakeLaunchDatabase();
    db.firstResult = launch;

    const result = await getLaunchByIdOrExternalId(db, launch.externalId.toUpperCase());

    expect(result).toEqual(launch);
    expect(db.lastQuery).toContain('WHERE LOWER(external_id) = ?');
    expect(db.lastValues).toEqual([launch.externalId]);
  });

  it('does not coerce non-decimal launch ids into numeric ids', async () => {
    const db = new FakeLaunchDatabase();

    await getLaunchByIdOrExternalId(db, '1e3');

    expect(db.lastQuery).toContain('WHERE LOWER(external_id) = ?');
    expect(db.lastValues).toEqual(['1e3']);
  });

  it('does not coerce unsafe launch ids into numeric ids', async () => {
    const db = new FakeLaunchDatabase();
    const unsafeId = String(Number.MAX_SAFE_INTEGER + 1);

    await getLaunchByIdOrExternalId(db, unsafeId);

    expect(db.lastQuery).toContain('WHERE LOWER(external_id) = ?');
    expect(db.lastValues).toEqual([unsafeId]);
  });

  it('trims launch external ids before querying detail records', async () => {
    const db = new FakeLaunchDatabase();
    db.firstResult = launch;

    await getLaunchByIdOrExternalId(db, ` ${launch.externalId} `);

    expect(db.lastQuery).toContain('WHERE LOWER(external_id) = ?');
    expect(db.lastValues).toEqual([launch.externalId]);
  });

  it('returns null for empty launch ids', async () => {
    const db = new FakeLaunchDatabase();

    await expect(getLaunchByIdOrExternalId(db, '')).resolves.toBeNull();
  });
});
