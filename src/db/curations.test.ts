import { describe, expect, it } from 'vitest';
import { replaceConfiguredCurations } from './curations';
import type { CurationConfigRecord } from '../curations';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeCurationDatabase,
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

class FakeCurationDatabase implements SqlDatabase {
  readonly records: CurationConfigRecord[] = [];
  readonly batchSizes: number[] = [];
  deleteCount = 0;

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }

  async batch(statements: DbStatement[]): Promise<DbRunResult[]> {
    this.batchSizes.push(statements.length);
    return Promise.all(statements.map((statement) => statement.run()));
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('DELETE FROM curations')) {
      this.deleteCount += 1;
      this.records.length = 0;
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO curations')) {
      this.records.push({
        targetType: values[0] as CurationConfigRecord['targetType'],
        targetKey: String(values[1]),
        itemUrl: String(values[2]),
        weight: Number(values[3]),
        note: String(values[4]),
        enabled: Number(values[5]),
      });
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }
}

describe('curation persistence', () => {
  it('replaces configured curations with one insert batch', async () => {
    const db = new FakeCurationDatabase();
    const records: CurationConfigRecord[] = [
      {
        targetType: 'home',
        targetKey: 'highlights',
        itemUrl: 'https://example.com/top',
        weight: 100,
        note: '',
        enabled: 1,
      },
      {
        targetType: 'topic',
        targetKey: 'reusable-rockets',
        itemUrl: 'https://example.com/reusable',
        weight: 60,
        note: 'Reusable focus',
        enabled: 1,
      },
    ];

    const result = await replaceConfiguredCurations(db, records);

    expect(result).toEqual({ inserted: 2 });
    expect(db.deleteCount).toBe(1);
    expect(db.records).toEqual(records);
    expect(db.batchSizes).toEqual([2]);
  });
});
