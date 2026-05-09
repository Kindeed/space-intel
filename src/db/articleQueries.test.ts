import { describe, expect, it } from 'vitest';
import { getArticleById, listArticles, type ArticleDetailRow, type ArticleSummaryRow } from './articleQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeDatabase,
    readonly query: string,
  ) {}

  bind(...values: unknown[]): DbStatement {
    this.values = values;
    return this;
  }

  async run(): Promise<DbRunResult> {
    return { meta: { changes: 0 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    this.database.lastValues = this.values;
    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    return { results: this.database.allResults as T[] };
  }
}

class FakeDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  allResults: ArticleSummaryRow[] = [];
  firstResult: ArticleDetailRow | null = null;

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

const article: ArticleSummaryRow = {
  id: 1,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
};

describe('article queries', () => {
  it('lists articles with filters and pagination', async () => {
    const db = new FakeDatabase();
    db.allResults = [article, { ...article, id: 2 }];

    const result = await listArticles(db, {
      region: 'global',
      source: 'snapi',
      query: 'rocket',
      tag: 'reusable-rockets',
      company: 'rocket-lab',
      page: 2,
      limit: 1,
    });

    expect(result).toEqual({
      items: [article],
      page: 2,
      limit: 1,
      hasMore: true,
    });
    expect(db.lastQuery).toContain('a.region = ?');
    expect(db.lastQuery).toContain('s.key = ?');
    expect(db.lastQuery).toContain('LOWER(a.title) LIKE ?');
    expect(db.lastQuery).toContain('JOIN tags t');
    expect(db.lastQuery).toContain('JOIN companies c');
    expect(db.lastValues).toEqual(['global', 'snapi', '%rocket%', '%rocket%', '%rocket%', 'reusable-rockets', 'rocket-lab', 2, 1]);
  });

  it('returns article detail by id', async () => {
    const db = new FakeDatabase();
    db.firstResult = {
      ...article,
      dedupeHash: 'abc123',
    };

    const result = await getArticleById(db, 1);

    expect(result?.id).toBe(1);
    expect(db.lastValues).toEqual([1]);
  });

  it('returns null for invalid article ids', async () => {
    const db = new FakeDatabase();

    await expect(getArticleById(db, 0)).resolves.toBeNull();
    await expect(getArticleById(db, Number.NaN)).resolves.toBeNull();
  });
});
