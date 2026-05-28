import { describe, expect, it } from 'vitest';
import {
  clusterArticleRows,
  getArticleById,
  listArticles,
  type ArticleDetailDbRow,
  type ArticleSummaryDbRow,
  type ArticleSummaryRow,
} from './articleQueries';
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
    this.database.lastQuery = this.query;
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
  allResults: ArticleSummaryDbRow[] = [];
  firstResult: ArticleDetailDbRow | null = null;

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
  sourceType: 'api',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
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

    expect(result).toMatchObject({
      items: [
        {
          ...article,
          relatedSourceCount: 1,
          relatedSources: ['Spaceflight News API'],
        },
      ],
      page: 2,
      limit: 1,
      hasMore: false,
    });
    expect(result.items[0].storyKey).toBe('global:2026-05-09:reusable-rocket-milestone');
    expect(result.items[0].tags).toEqual([{ slug: 'reusable-rockets', name: '可回收火箭' }]);
    expect(result.items[0].companies).toEqual([{ slug: 'rocket-lab', name: 'Rocket Lab' }]);
    expect(db.lastQuery).toContain('a.region = ?');
    expect(db.lastQuery).toContain('s.key = ?');
    expect(db.lastQuery).toContain('LOWER(a.title) LIKE ?');
    expect(db.lastQuery).toContain('JOIN tags t');
    expect(db.lastQuery).toContain('JOIN companies c');
    expect(db.lastQuery).toContain('AS tagsJson');
    expect(db.lastQuery).toContain('AS companiesJson');
    expect(db.lastValues).toEqual(['global', 'snapi', '%rocket%', '%rocket%', '%rocket%', 'reusable-rockets', 'rocket-lab', 5, 1]);
  });

  it('keeps pagination available when clustering leaves more visible stories in the fetched window', async () => {
    const db = new FakeDatabase();
    db.allResults = [
      article,
      { ...article, id: 2, title: 'Satellite financing update' },
      { ...article, id: 3, title: 'Launch provider contract' },
    ];

    const result = await listArticles(db, { limit: 2 });

    expect(result.items.map((item) => item.id)).toEqual([1, 2]);
    expect(result.hasMore).toBe(true);
  });

  it('filters policy articles to official sources only', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    await listArticles(db, { category: 'policy' });

    expect(db.lastQuery).toContain('s.type = ?');
    expect(db.lastValues).toEqual(['official_page', 81, 0]);
  });

  it('clusters repeated story coverage before returning article cards', () => {
    const clustered = clusterArticleRows(
      [
        article,
        {
          ...article,
          id: 2,
          sourceKey: 'google-news-cn-commercial-space',
          sourceName: 'Google News - 商业航天',
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T01:00:00Z',
        },
        {
          ...article,
          id: 3,
          title: 'Satellite financing update',
          sourceName: 'Capital Source',
        },
      ],
      10,
    );

    expect(clustered).toHaveLength(2);
    expect(clustered[0]).toMatchObject({
      id: 2,
      relatedSourceCount: 2,
      relatedSources: ['Spaceflight News API', 'Google News - 商业航天'],
    });
  });

  it('returns article detail by id', async () => {
    const db = new FakeDatabase();
    db.firstResult = {
      ...article,
      launches: [{ id: 9, externalId: 'launch-9', missionName: 'Demo Launch', name: 'Demo Launch' }],
    };

    const result = await getArticleById(db, 1);

    expect(result).toMatchObject({
      id: 1,
      tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
      companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
      launches: [{ id: 9, externalId: 'launch-9', missionName: 'Demo Launch', name: 'Demo Launch' }],
    });
    expect(result && 'dedupeHash' in result).toBe(false);
    expect(db.lastQuery).toContain('FROM article_launches al');
    expect(db.lastValues).toEqual([1]);
  });

  it('returns null for invalid article ids', async () => {
    const db = new FakeDatabase();

    await expect(getArticleById(db, 0)).resolves.toBeNull();
    await expect(getArticleById(db, Number.NaN)).resolves.toBeNull();
  });
});
