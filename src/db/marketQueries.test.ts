import { describe, expect, it } from 'vitest';
import { listMarketItems, marketNotice, type MarketItemRow } from './marketQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeMarketDatabase,
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
    return { results: this.database.allResults as T[] };
  }
}

class FakeMarketDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  allResults: MarketItemRow[] = [];

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

const marketItem: MarketItemRow = {
  id: 1,
  title: 'Rocket Lab publishes quarterly backlog update',
  itemType: 'filing',
  companyId: 10,
  companyName: 'Rocket Lab',
  companySlug: 'rocket-lab',
  sourceId: 2,
  sourceName: 'SEC Filings - Rocket Lab',
  url: 'https://example.com/filing',
  summary: 'Short filing summary only.',
  publishedAt: '2026-05-09T00:00:00Z',
};

describe('market queries', () => {
  it('lists market items with filters, pagination, and required notice', async () => {
    const db = new FakeMarketDatabase();
    db.allResults = [marketItem, { ...marketItem, id: 2 }];

    const result = await listMarketItems(db, {
      type: 'filing',
      company: 'rocket-lab',
      source: 'sec-rocket-lab',
      query: 'backlog',
      page: 2,
      limit: 1,
    });

    expect(result).toEqual({
      items: [marketItem],
      page: 2,
      limit: 1,
      hasMore: true,
      notice: marketNotice,
    });
    expect(db.lastQuery).toContain('m.item_type = ?');
    expect(db.lastQuery).toContain('c.slug = ?');
    expect(db.lastQuery).toContain('s.key = ?');
    expect(db.lastQuery).toContain('LOWER(m.title) LIKE ?');
    expect(db.lastValues).toEqual(['filing', 'rocket-lab', 'sec-rocket-lab', '%backlog%', '%backlog%', 2, 1]);
  });

  it('uses safe pagination defaults', async () => {
    const db = new FakeMarketDatabase();
    db.allResults = [marketItem];

    const result = await listMarketItems(db, {
      page: -1,
      limit: 100,
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(db.lastValues).toEqual([51, 0]);
  });
});
