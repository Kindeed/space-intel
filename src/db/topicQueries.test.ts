import { describe, expect, it } from 'vitest';
import type { ArticleSummaryRow } from './articleQueries';
import { getTopicBySlug, listTopics, type TopicCurationRow, type TopicRow } from './topicQueries';
import type { DbRunResult, DbStatement, SqlDatabase } from './types';

class FakeStatement implements DbStatement {
  values: unknown[] = [];

  constructor(
    private readonly database: FakeTopicDatabase,
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
    this.database.values.push(this.values);
    return this.database.firstResult as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    this.database.queries.push(this.query);
    this.database.values.push(this.values);

    if (this.query.includes('FROM tags t')) {
      return { results: this.database.topicResults as T[] };
    }

    if (this.query.includes('FROM articles a')) {
      if (this.database.failTranslationColumns && this.query.includes('a.original_summary')) {
        throw new Error('D1_ERROR: no such column: a.original_summary');
      }

      return { results: this.database.articleResults as T[] };
    }

    return { results: this.database.curationResults as T[] };
  }
}

class FakeTopicDatabase implements SqlDatabase {
  queries: string[] = [];
  values: unknown[][] = [];
  failTranslationColumns = false;
  topicResults: TopicRow[] = [];
  articleResults: ArticleSummaryRow[] = [];
  curationResults: TopicCurationRow[] = [];
  firstResult: TopicRow | null = null;

  prepare(query: string): DbStatement {
    return new FakeStatement(this, query);
  }
}

const topic: TopicRow = {
  id: 1,
  slug: 'reusable-rockets',
  name: '可回收火箭',
  category: 'technology',
  articleCount: 3,
  curationCount: 1,
};

const article: ArticleSummaryRow = {
  id: 10,
  title: 'Reusable booster completes another landing',
  originalTitle: 'Reusable booster completes another landing',
  summary: 'Short metadata summary only.',
  originalSummary: 'Short metadata summary only.',
  url: 'https://example.com/reusable',
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

const curation: TopicCurationRow = {
  id: 20,
  targetType: 'topic',
  targetKey: 'reusable-rockets',
  itemUrl: 'https://example.com/curated',
  note: 'Manual topic highlight.',
  enabled: 1,
  createdAt: '2026-05-09T00:00:00Z',
};

describe('topic queries', () => {
  it('lists topics with automatic article counts and manual curation counts', async () => {
    const db = new FakeTopicDatabase();
    db.topicResults = [topic];

    const result = await listTopics(db);

    expect(result).toEqual([topic]);
    expect(db.queries[0]).toContain('COUNT(DISTINCT at.article_id) AS articleCount');
    expect(db.queries[0]).toContain("c.target_type = 'topic'");
    expect(db.queries[0]).toContain('ORDER BY articleCount DESC');
  });

  it('returns topic detail with recent articles and enabled curations', async () => {
    const db = new FakeTopicDatabase();
    db.firstResult = topic;
    db.articleResults = [article];
    db.curationResults = [curation];

    const result = await getTopicBySlug(db, 'reusable-rockets');

    expect(result).toEqual({
      ...topic,
      articles: [article],
      curations: [curation],
    });
    expect(db.queries[1]).toContain('AS tagsJson');
    expect(db.queries[1]).toContain('AS companiesJson');
    expect(db.queries[1]).toContain("s.key = 'cnsa-news'");
    expect(db.queries[1]).toContain("a.url LIKE 'https://www.cnsa.gov.cn/%/index.html'");
    expect(db.queries[1]).toContain("s.type = 'official_page'");
    expect(db.queries[1]).toContain("ABS((julianday(a.published_at) - julianday(a.created_at)) * 86400) < 300");
    expect(db.queries[2]).not.toContain('weight,');
    expect(db.values).toEqual([['reusable-rockets'], [topic.id], [topic.slug]]);
  });

  it('trims topic slugs before querying detail records', async () => {
    const db = new FakeTopicDatabase();
    db.firstResult = topic;

    await getTopicBySlug(db, ' reusable-rockets ');

    expect(db.values[0]).toEqual(['reusable-rockets']);
  });

  it('matches topic detail slugs case-insensitively', async () => {
    const db = new FakeTopicDatabase();
    db.firstResult = topic;
    db.curationResults = [curation];

    await getTopicBySlug(db, ' Reusable-Rockets ');

    expect(db.queries[0]).toContain('LOWER(t.slug) = ?');
    expect(db.values[0]).toEqual(['reusable-rockets']);
  });

  it('falls back to legacy topic article queries when translation columns are missing', async () => {
    const db = new FakeTopicDatabase();
    db.failTranslationColumns = true;
    db.firstResult = topic;
    db.articleResults = [{ ...article, originalSummary: null, translationStatus: 'skipped', translationProvider: null }];
    db.curationResults = [curation];

    const result = await getTopicBySlug(db, 'reusable-rockets');

    expect(result?.articles[0]).toMatchObject({
      id: 10,
      originalSummary: null,
      translationStatus: 'skipped',
    });
    expect(db.queries).toHaveLength(4);
    expect(db.queries[1]).toContain('a.original_summary AS originalSummary');
    expect(db.queries.some((query) => query.includes('NULL AS originalSummary'))).toBe(true);
    expect(db.queries.some((query) => query.includes('FROM curations'))).toBe(true);
  });

  it('returns null for blank or missing topic slugs', async () => {
    const db = new FakeTopicDatabase();

    await expect(getTopicBySlug(db, '')).resolves.toBeNull();
    await expect(getTopicBySlug(db, 'missing')).resolves.toBeNull();
  });
});
