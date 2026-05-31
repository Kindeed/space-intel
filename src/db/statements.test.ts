import { describe, expect, it } from 'vitest';
import { runDbStatements, sumRunChanges } from './statements';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  runCount = 0;

  constructor(private readonly changes: number) {}

  bind(): DbStatement {
    return this;
  }

  async run(): Promise<DbRunResult> {
    this.runCount += 1;
    return { meta: { changes: this.changes } };
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }
}

class BatchDatabase implements SqlDatabase {
  batchSizes: number[] = [];

  prepare(): DbStatement {
    return new FakeStatement(0);
  }

  async batch(statements: DbStatement[]): Promise<DbRunResult[]> {
    this.batchSizes.push(statements.length);
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

class FallbackDatabase implements SqlDatabase {
  prepare(): DbStatement {
    return new FakeStatement(0);
  }
}

describe('db statement helpers', () => {
  it('returns an empty result without touching batch for empty statement lists', async () => {
    const db = new BatchDatabase();

    await expect(runDbStatements(db, [])).resolves.toEqual([]);
    expect(db.batchSizes).toEqual([]);
  });

  it('uses D1 batch when available', async () => {
    const db = new BatchDatabase();
    const statements = [new FakeStatement(1), new FakeStatement(2)];

    await expect(runDbStatements(db, statements)).resolves.toEqual([
      { meta: { changes: 1 } },
      { meta: { changes: 2 } },
    ]);
    expect(db.batchSizes).toEqual([2]);
    expect(statements.map((statement) => statement.runCount)).toEqual([1, 1]);
  });

  it('runs statements sequentially when batch is unavailable', async () => {
    const db = new FallbackDatabase();
    const statements = [new FakeStatement(1), new FakeStatement(0), new FakeStatement(3)];

    const results = await runDbStatements(db, statements);

    expect(results).toEqual([{ meta: { changes: 1 } }, { meta: { changes: 0 } }, { meta: { changes: 3 } }]);
    expect(statements.map((statement) => statement.runCount)).toEqual([1, 1, 1]);
  });

  it('sums changed rows from run results', () => {
    expect(sumRunChanges([{ meta: { changes: 2 } }, {}, { meta: { changes: 3 } }])).toBe(5);
  });
});
