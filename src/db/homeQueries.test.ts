import { describe, expect, it } from 'vitest';
import { getHomeStats, listRankedHomeArticles, listTrendingTags } from './homeQueries';
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
    this.database.queries.push(this.query);

    if (this.query.includes("published_at >= datetime('now', '-1 day')")) {
      return { count: 7 } as T;
    }

    if (this.query.includes('SELECT COUNT(*) AS count FROM tags')) {
      return { count: 4 } as T;
    }

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
  results: unknown[] = [];

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

  it('rejects decimal home article limits', async () => {
    const db = new FakeHomeDatabase();

    await listRankedHomeArticles(db, 3.9);

    expect(db.lastValues).toEqual([20]);
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

  it('rejects decimal trending tag limits', async () => {
    const db = new FakeHomeDatabase();

    await listTrendingTags(db, 3.9);

    expect(db.lastValues).toEqual([6]);
  });

  it('returns home stats from independent article, topic, and source queries', async () => {
    const db = new FakeHomeDatabase();
    db.results = [
      { key: 'nasa-spaceflight-rss', type: 'rss', region: 'global' },
      { key: 'cnsa-news', type: 'official_page', region: 'cn' },
    ];

    const result = await getHomeStats(db);

    expect(result).toEqual({
      recentArticleCount: 7,
      topicCount: 4,
      enabledSources: [
        { key: 'nasa-spaceflight-rss', type: 'rss', region: 'global' },
        { key: 'cnsa-news', type: 'official_page', region: 'cn' },
      ],
    });
    expect(db.queries.some((query) => query.includes("published_at >= datetime('now', '-1 day')"))).toBe(true);
    expect(db.queries.some((query) => query.includes('SELECT COUNT(*) AS count FROM tags'))).toBe(true);
    expect(db.queries.some((query) => query.includes('SELECT key, type, region'))).toBe(true);
    expect(db.queries.some((query) => query.includes('GROUP BY type'))).toBe(false);
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
