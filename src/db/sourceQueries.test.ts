import { describe, expect, it } from 'vitest';
import { listEnabledSources, type SourceOptionRow } from './sourceQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  constructor(
    private readonly database: FakeDatabase,
    readonly query: string,
  ) {}

  bind(): DbStatement {
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
    return { results: this.database.results as T[] };
  }
}

class FakeDatabase implements SqlDatabase {
  lastQuery = '';
  results: SourceOptionRow[] = [
    {
      key: 'snapi',
      name: 'Spaceflight News API',
      type: 'api',
      region: 'global',
      credibility: 5,
    },
  ];

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

describe('source queries', () => {
  it('lists enabled source metadata for filter controls', async () => {
    const db = new FakeDatabase();
    const result = await listEnabledSources(db);

    expect(result).toEqual(db.results);
    expect(db.lastQuery).toContain('WHERE enabled = 1');
    expect(db.lastQuery).not.toContain('risk_notes');
  });
});
