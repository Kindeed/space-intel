import { describe, expect, it } from 'vitest';
import {
  clusterArticleRows,
  getArticleById,
  isMissingArticleTranslationColumnError,
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
    this.database.queries.push(this.query);

    if (this.database.failTranslationColumns && this.query.includes('a.original_summary')) {
      throw new Error('D1_ERROR: no such column: a.original_summary');
    }

    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.lastQuery = this.query;
    this.database.lastValues = this.values;
    this.database.queries.push(this.query);

    if (this.database.failTranslationColumns && this.query.includes('a.original_summary')) {
      throw new Error('D1_ERROR: no such column: a.original_summary');
    }

    return { results: this.database.allResults as T[] };
  }
}

class FakeDatabase implements SqlDatabase {
  lastQuery = '';
  lastValues: unknown[] = [];
  queries: string[] = [];
  failTranslationColumns = false;
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
  originalSummary: 'Short summary only.',
  url: 'https://example.com/article',
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  sourceType: 'api',
  publisherName: 'Spaceflight News API',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
  translationStatus: 'skipped',
  translationProvider: null,
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
};

describe('article queries', () => {
  it('recognizes missing translation columns in select and insert errors', () => {
    expect(isMissingArticleTranslationColumnError(new Error('D1_ERROR: no such column: a.original_summary'))).toBe(true);
    expect(isMissingArticleTranslationColumnError(new Error('D1_ERROR: table articles has no column named original_summary'))).toBe(true);
  });

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
    expect(db.lastQuery).toContain('LOWER(t.slug) = ?');
    expect(db.lastQuery).toContain('LOWER(c.slug) = ?');
    expect(db.lastQuery).toContain('AS tagsJson');
    expect(db.lastQuery).toContain('AS companiesJson');
    expect(db.lastQuery).toContain("s.key = 'cnsa-news'");
    expect(db.lastQuery).toContain("a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'");
    expect(db.lastQuery).toContain("s.type = 'official_page'");
    expect(db.lastQuery).toContain("ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300");
    expect(db.lastValues).toEqual([
      'global',
      'snapi',
      '%rocket%',
      '%rocket%',
      '%rocket%',
      '%rocket%',
      'reusable-rockets',
      'reusable-rockets',
      'rocket-lab',
      'rocket-lab',
      'rocket-lab',
      5,
      1,
    ]);
  });

  it('matches article entity filters by public display names', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    await listArticles(db, {
      tag: ' 可回收火箭 ',
      company: ' Rocket Lab ',
      limit: 1,
    });

    expect(db.lastQuery).toContain('LOWER(t.name) = ?');
    expect(db.lastQuery).toContain('LOWER(c.name) = ?');
    expect(db.lastQuery).toContain('LOWER(c.english_name) = ?');
    expect(db.lastValues).toEqual(['可回收火箭', '可回收火箭', 'rocket lab', 'rocket lab', 'rocket lab', 5, 0]);
  });

  it('matches article entity slug filters case-insensitively', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    await listArticles(db, {
      tag: ' Reusable-Rockets ',
      company: ' Rocket-Lab ',
      limit: 1,
    });

    expect(db.lastQuery).toContain('LOWER(t.slug) = ?');
    expect(db.lastQuery).toContain('LOWER(c.slug) = ?');
    expect(db.lastValues).toEqual(['reusable-rockets', 'reusable-rockets', 'rocket-lab', 'rocket-lab', 'rocket-lab', 5, 0]);
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

  it('rejects decimal pagination inputs at the query layer', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    const result = await listArticles(db, { page: 2.5, limit: 3.9 });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(db.lastValues).toEqual([81, 0]);
  });

  it('filters policy articles by policy tag across source types', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    await listArticles(db, { category: 'policy' });

    expect(db.lastQuery).not.toContain('s.type = ?');
    expect(db.lastQuery).toContain('t_policy.slug = ?');
    expect(db.lastValues).toEqual(['policy-and-regulation', 81, 0]);
  });

  it('filters official articles to official and procurement source records', async () => {
    const db = new FakeDatabase();
    db.allResults = [article];

    await listArticles(db, { category: 'official' });

    expect(db.lastQuery).toContain("s.type IN ('official_page', 'procurement_page')");
    expect(db.lastQuery).toContain('t_official.slug IN (?, ?)');
    expect(db.lastValues).toEqual(['policy-and-regulation', 'space-procurement', 81, 0]);
  });

  it('falls back to legacy article list queries when translation columns are missing', async () => {
    const db = new FakeDatabase();
    db.failTranslationColumns = true;
    db.allResults = [{ ...article, originalSummary: null, translationStatus: 'skipped', translationProvider: null }];

    const result = await listArticles(db, { query: 'rocket', limit: 1 });

    expect(result.items[0]).toMatchObject({
      id: 1,
      originalSummary: null,
      translationStatus: 'skipped',
      translationProvider: null,
    });
    expect(db.queries).toHaveLength(2);
    expect(db.queries[0]).toContain('a.original_summary AS originalSummary');
    expect(db.queries[1]).toContain('NULL AS originalSummary');
    expect(db.queries[1]).not.toContain('LOWER(a.original_summary)');
    expect(db.lastValues).toEqual(['%rocket%', '%rocket%', '%rocket%', 5, 0]);
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
          publisherName: '新华社',
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T01:00:00Z',
        },
        {
          ...article,
          id: 3,
          title: 'Satellite financing update',
          sourceName: 'Policy Source',
        },
      ],
      10,
    );

    expect(clustered).toHaveLength(2);
    expect(clustered[0]).toMatchObject({
      id: 2,
      relatedSourceCount: 2,
      relatedSources: ['Spaceflight News API', '新华社'],
    });
  });

  it('deduplicates clustered related sources after public label cleanup', () => {
    const clustered = clusterArticleRows(
      [
        article,
        {
          ...article,
          id: 2,
          sourceName: 'spaceflight news api',
          publisherName: 'spaceflight news api',
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T01:00:00Z',
        },
        {
          ...article,
          id: 3,
          sourceName: 'Google News RSS - Spaceflight News API',
          publisherName: 'Google News RSS - Spaceflight News API',
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T02:00:00Z',
        },
        {
          ...article,
          id: 4,
          sourceName: 'Google News - 商业航天',
          publisherName: '新华社',
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T03:00:00Z',
        },
      ],
      10,
    );

    expect(clustered).toHaveLength(1);
    expect(clustered[0]).toMatchObject({
      id: 4,
      relatedSourceCount: 2,
      relatedSources: ['Spaceflight News API', '新华社'],
    });
  });

  it('preserves entity links across clustered duplicate story rows', () => {
    const clustered = clusterArticleRows(
      [
        {
          ...article,
          tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
          companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
        },
        {
          ...article,
          id: 2,
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T01:00:00Z',
          tags: [{ slug: 'launch-market', name: '发射市场' }],
          companies: [],
        },
      ],
      10,
    );

    expect(clustered).toHaveLength(1);
    expect(clustered[0]).toMatchObject({
      id: 2,
      tags: [
        { slug: 'reusable-rockets', name: '可回收火箭' },
        { slug: 'launch-market', name: '发射市场' },
      ],
      companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
    });
  });

  it('uses later entity labels when clustered duplicates first provide blank names', () => {
    const clustered = clusterArticleRows(
      [
        {
          ...article,
          tags: [{ slug: ' reusable-rockets ', name: '   ' }],
          companies: [{ slug: ' rocket-lab ', name: '   ' }],
        },
        {
          ...article,
          id: 2,
          title: 'Reusable rocket milestone',
          publishedAt: '2026-05-09T01:00:00Z',
          tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
          companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
        },
      ],
      10,
    );

    expect(clustered).toHaveLength(1);
    expect(clustered[0]).toMatchObject({
      id: 2,
      tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
      companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
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
    expect(db.lastQuery).toContain('LOWER(l.external_id) = LOWER(al.launch_external_id)');
    expect(db.lastValues).toEqual([1]);
  });

  it('falls back to legacy article detail queries when translation columns are missing', async () => {
    const db = new FakeDatabase();
    db.failTranslationColumns = true;
    db.firstResult = {
      ...article,
      originalSummary: null,
      translationStatus: 'skipped',
      translationProvider: null,
      launches: [],
    };

    const result = await getArticleById(db, 1);

    expect(result).toMatchObject({
      id: 1,
      originalSummary: null,
      translationStatus: 'skipped',
      translationProvider: null,
    });
    expect(db.queries).toHaveLength(2);
    expect(db.queries[0]).toContain('a.original_summary AS originalSummary');
    expect(db.queries[1]).toContain('NULL AS originalSummary');
  });

  it('returns null for invalid article ids', async () => {
    const db = new FakeDatabase();

    await expect(getArticleById(db, 0)).resolves.toBeNull();
    await expect(getArticleById(db, Number.NaN)).resolves.toBeNull();
  });
});
