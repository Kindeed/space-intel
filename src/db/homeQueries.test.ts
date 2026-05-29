import { describe, expect, it } from 'vitest';
import { listRankedHomeArticles, listTrendingTags, type RankedHomeArticle, type TrendingTag } from './homeQueries';
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
    this.database.queries.push(this.query);

    if (this.database.failTranslationColumns && this.query.includes('a.original_summary')) {
      throw new Error('D1_ERROR: no such column: a.original_summary');
    }

    return { results: this.database.results as T[] };
  }
}

class FakeHomeDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  queries: string[] = [];
  failTranslationColumns = false;
  results: Array<RankedHomeArticle | TrendingTag> = [];

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

  it('lists recent tags by article frequency with a bounded limit', async () => {
    const db = new FakeHomeDatabase();
    db.results = [
      { slug: 'satellite-internet', name: '卫星互联网', count: 8 },
      { slug: 'reusable-rockets', name: '可回收火箭', count: 5 },
    ];

    const result = await listTrendingTags(db, 100);

    expect(result).toEqual(db.results);
    expect(db.lastQuery).toContain('JOIN article_tags at ON at.tag_id = t.id');
    expect(db.lastQuery).toContain("WHERE a.published_at >= datetime('now', '-7 days')");
    expect(db.lastQuery).toContain('ORDER BY count DESC, t.name ASC');
    expect(db.lastValues).toEqual([12]);
  });

  it('falls back to legacy home article queries when translation columns are missing', async () => {
    const db = new FakeHomeDatabase();
    db.failTranslationColumns = true;

    await listRankedHomeArticles(db, 4);

    expect(db.queries).toHaveLength(2);
    expect(db.queries[0]).toContain('a.original_summary AS originalSummary');
    expect(db.queries[1]).toContain('NULL AS originalSummary');
    expect(db.lastValues).toEqual([4]);
  });
});
