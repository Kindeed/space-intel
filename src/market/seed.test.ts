import { describe, expect, it } from 'vitest';
import type { DbRunResult, DbStatement, SqlDatabase } from '../db/types';
import { seedMarketItemsFromArticles, type MarketSeedArticle } from './seed';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeMarketSeedDatabase,
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

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    return { results: this.database.articles as T[] };
  }
}

class FakeMarketSeedDatabase implements SqlDatabase {
  articles: MarketSeedArticle[] = [];
  rows: { url: string; itemType: string }[] = [];
  lastQuery = '';

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    if (!query.includes('INSERT OR IGNORE INTO market_items')) {
      throw new Error(`Unsupported query: ${query}`);
    }

    const url = String(values[4]);
    if (this.rows.some((row) => row.url === url)) {
      return { meta: { changes: 0 } };
    }

    this.rows.push({ url, itemType: String(values[1]) });
    return { meta: { changes: 1 } };
  }
}

describe('market seed', () => {
  it('extracts market items from article metadata and skips duplicates', async () => {
    const db = new FakeMarketSeedDatabase();
    db.articles = [
      {
        id: 1,
        title: '北辰航天完成数千万元天使轮融资',
        summary: '融资新闻摘要',
        url: 'https://example.com/funding',
        publishedAt: '2026-05-11T00:00:00Z',
        sourceId: 1,
        companyId: null,
      },
      {
        id: 2,
        title: 'Rocket Lab files SEC report',
        summary: 'Quarterly filing summary.',
        url: 'https://example.com/filing',
        publishedAt: '2026-05-10T00:00:00Z',
        sourceId: 1,
        companyId: 2,
      },
    ];

    const first = await seedMarketItemsFromArticles(db);
    const second = await seedMarketItemsFromArticles(db);

    expect(first).toEqual({ candidates: 2, inserted: 2, skipped: 0 });
    expect(second).toEqual({ candidates: 2, inserted: 0, skipped: 2 });
    expect(db.rows).toEqual([
      { url: 'https://example.com/funding', itemType: 'financing' },
      { url: 'https://example.com/filing', itemType: 'filing' },
    ]);
    expect(db.lastQuery).toContain('LOWER(a.title) LIKE ?');
  });
});
