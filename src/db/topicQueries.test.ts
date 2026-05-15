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
      return { results: this.database.articleResults as T[] };
    }

    return { results: this.database.curationResults as T[] };
  }
}

class FakeTopicDatabase implements SqlDatabase {
  queries: string[] = [];
  values: unknown[][] = [];
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
  url: 'https://example.com/reusable',
  sourceKey: 'snapi',
  sourceName: 'Spaceflight News API',
  sourceType: 'api',
  publishedAt: '2026-05-09T00:00:00Z',
  language: 'en',
  region: 'global',
  fetchStatus: 'fetched',
};

const curation: TopicCurationRow = {
  id: 20,
  targetType: 'topic',
  targetKey: 'reusable-rockets',
  itemUrl: 'https://example.com/curated',
  weight: 90,
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
    expect(db.values).toEqual([['reusable-rockets'], [topic.id], [topic.slug]]);
  });

  it('returns null for blank or missing topic slugs', async () => {
    const db = new FakeTopicDatabase();

    await expect(getTopicBySlug(db, '')).resolves.toBeNull();
    await expect(getTopicBySlug(db, 'missing')).resolves.toBeNull();
  });
});
