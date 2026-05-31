import { describe, expect, it } from 'vitest';
import { cleanupRetainedData } from './retention';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeRetentionDatabase,
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

class FakeRetentionDatabase implements SqlDatabase {
  readonly deletes: Array<{ table: string; cutoff: string; limit: number }> = [];

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();
    const table = normalized.match(/^DELETE FROM ([a-z_]+)/)?.[1];

    if (!table) {
      throw new Error(`Unsupported query: ${query}`);
    }

    this.deletes.push({
      table,
      cutoff: String(values[0]),
      limit: Number(values[1]),
    });

    return { meta: { changes: table === 'articles' ? 2 : 1 } };
  }
}

describe('retention cleanup', () => {
  it('deletes old operational data in bounded batches', async () => {
    const db = new FakeRetentionDatabase();
    const result = await cleanupRetainedData(db, {
      now: new Date('2026-05-28T00:00:00.000Z'),
      batchLimit: 25,
    });

    expect(result).toEqual({
      articleTagsDeleted: 1,
      articleCompaniesDeleted: 1,
      articleLaunchesDeleted: 1,
      articlesDeleted: 2,
      ingestionLogsDeleted: 1,
      launchesDeleted: 1,
    });
    expect(db.deletes.map((item) => item.table)).toEqual([
      'article_tags',
      'article_companies',
      'article_launches',
      'articles',
      'ingestion_logs',
      'launches',
    ]);
    expect(db.deletes.every((item) => item.limit === 25)).toBe(true);
    expect(db.deletes[0].cutoff).toBe('2024-05-28T00:00:00.000Z');
    expect(db.deletes[4].cutoff).toBe('2026-02-27T00:00:00.000Z');
    expect(db.deletes[5].cutoff).toBe('2024-05-28T00:00:00.000Z');
  });

  it('rejects decimal cleanup batch limits', async () => {
    const db = new FakeRetentionDatabase();

    await cleanupRetainedData(db, {
      now: new Date('2026-05-28T00:00:00.000Z'),
      batchLimit: 25.9,
    });

    expect(db.deletes.every((item) => item.limit === 500)).toBe(true);
  });
});
