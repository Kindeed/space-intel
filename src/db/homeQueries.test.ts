import { describe, expect, it } from 'vitest';
import { listRankedHomeArticles, type RankedHomeArticle } from './homeQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeHomeDatabase,
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
    return null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    return { results: this.database.results as T[] };
  }
}

class FakeHomeDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  results: RankedHomeArticle[] = [];

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

describe('home ranking queries', () => {
  it('orders by manual weight, publish time, and source credibility', async () => {
    const db = new FakeHomeDatabase();

    await listRankedHomeArticles(db, 100);

    expect(db.lastQuery).toContain('COALESCE(MAX(c.weight), 0) AS curationWeight');
    expect(db.lastQuery).toContain('ORDER BY curationWeight DESC, a.published_at DESC, sourceCredibility DESC');
    expect(db.lastValues).toEqual([50]);
  });
});
