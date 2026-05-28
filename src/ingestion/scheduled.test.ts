import { describe, expect, it } from 'vitest';
import { runScheduledIngestion } from './scheduled';
import type { SourceConfig } from './types';
import type { DbRunResult, DbStatement, SqlDatabase } from '../db/types';
import type { MarketSeedArticle } from '../market';

class MemoryStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: MemoryScheduledDatabase,
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
    return this.database.first(this.query, this.values) as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    return this.database.all(this.query) as { results: T[] };
  }
}

class MemoryScheduledDatabase implements SqlDatabase {
  readonly sources: Array<{ id: number; key: string }> = [];
  readonly companies: string[] = [];
  readonly tags: string[] = [];
  readonly articleHashes = new Set<string>();
  readonly articles: Array<{ id: number; dedupeHash: string; url: string }> = [];
  readonly launches = new Map<string, string>();
  readonly marketRows = new Map<string, string>();
  readonly logs: Array<{ id: number; sourceKey: string; startedAt: string; finishedAt: string | null; successCount: number; failureCount: number; error: string | null }> = [];
  marketArticles: MarketSeedArticle[] = [];
  curationsInserted = 0;

  prepare(query: string): DbStatement {
    return new MemoryStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT INTO sources')) {
      const key = String(values[0]);

      if (!this.sources.some((source) => source.key === key)) {
        this.sources.push({ id: this.sources.length + 1, key });
        return { meta: { changes: 1 } };
      }

      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO companies')) {
      const slug = String(values[0]);

      if (!this.companies.includes(slug)) {
        this.companies.push(slug);
      }

      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO tags')) {
      const slug = String(values[0]);

      if (!this.tags.includes(slug)) {
        this.tags.push(slug);
      }

      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO market_items')) {
      const url = String(values[4]);

      if (this.marketRows.has(url)) {
        return { meta: { changes: 0 } };
      }

      this.marketRows.set(url, String(values[1]));
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO articles')) {
      const dedupeHash = String(values[8]);

      if (this.articleHashes.has(dedupeHash)) {
        return { meta: { changes: 0 } };
      }

      this.articleHashes.add(dedupeHash);
      this.articles.push({ id: this.articles.length + 1, dedupeHash, url: String(values[4]) });
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO article_tags')) {
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO article_companies')) {
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO article_launches')) {
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO launches')) {
      this.launches.set(String(values[0]), String(values[1]));
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('DELETE FROM curations')) {
      this.curationsInserted = 0;
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO curations')) {
      this.curationsInserted += 1;
      return { meta: { changes: 1 } };
    }

    if (normalized.startsWith('INSERT INTO ingestion_logs')) {
      const id = this.logs.length + 1;
      this.logs.push({
        id,
        sourceKey: String(values[0]),
        startedAt: String(values[1]),
        finishedAt: null,
        successCount: 0,
        failureCount: 0,
        error: null,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }

    if (normalized.startsWith('UPDATE ingestion_logs SET finished_at = ?, failure_count = 1')) {
      let changes = 0;
      const staleBefore = String(values[2]);

      for (const log of this.logs) {
        if (!log.finishedAt && log.startedAt <= staleBefore) {
          log.finishedAt = String(values[0]);
          log.failureCount = 1;
          log.error = String(values[1]);
          changes += 1;
        }
      }

      return { meta: { changes } };
    }

    if (normalized.startsWith('UPDATE ingestion_logs')) {
      const log = this.logs.find((item) => item.id === Number(values[4]));

      if (!log) {
        return { meta: { changes: 0 } };
      }

      log.finishedAt = String(values[0]);
      log.successCount = Number(values[1]);
      log.failureCount = Number(values[2]);
      log.error = values[3] ? String(values[3]) : null;
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }

  first(query: string, values: unknown[]): unknown | null {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized === 'SELECT id FROM sources WHERE key = ?') {
      return this.sources.find((source) => source.key === values[0]) ?? null;
    }

    if (normalized === 'SELECT id FROM articles WHERE dedupe_hash = ? OR url = ? ORDER BY id DESC LIMIT 1') {
      return this.articles.find((article) => article.dedupeHash === values[0] || article.url === values[1]) ?? null;
    }

    return null;
  }

  all(query: string): { results: unknown[] } {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.includes('FROM articles a') && normalized.includes('ORDER BY a.published_at DESC')) {
      return { results: this.marketArticles };
    }

    throw new Error(`Unsupported all query: ${query}`);
  }
}

const sources: SourceConfig[] = [
  {
    key: 'snapi',
    name: 'Spaceflight News API',
    type: 'api',
    region: 'global',
    url: 'https://api.spaceflightnewsapi.net/v4/articles/',
    credibility: 5,
    enabled: true,
    purpose: 'News.',
    expected_content: 'Metadata.',
    risk_notes: 'Public API.',
    dedupe_strategy: 'url_title_source',
  },
  {
    key: 'launch-library-2',
    name: 'Launch Library 2',
    type: 'api',
    region: 'global',
    url: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/',
    credibility: 5,
    enabled: true,
    purpose: 'Launch cache.',
    expected_content: 'Metadata.',
    risk_notes: 'Public API.',
    dedupe_strategy: 'external_id',
  },
];

describe('scheduled ingestion', () => {
  it('runs hourly ingestion idempotently for articles and caches launches', async () => {
    const db = new MemoryScheduledDatabase();
    const context = {
      now: () => new Date('2026-05-09T00:00:00Z'),
      fetch: async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes('spaceflightnewsapi')) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  id: 1,
                  title: 'Reusable rocket milestone',
                  url: 'https://example.com/article',
                  news_site: 'Spaceflight Now',
                  summary: 'Short summary.',
                  published_at: '2026-05-09T00:00:00Z',
                  launches: [],
                },
              ],
            }),
          );
        }

        return new Response(
          JSON.stringify({
            results: [
              {
                id: 'launch-1',
                name: 'Demo launch',
                status: { name: 'Go' },
              },
            ],
          }),
        );
      },
    };

    await runScheduledIngestion({ db, sources, context, kind: 'hourly' });
    await runScheduledIngestion({ db, sources, context, kind: 'hourly' });

    expect(db.articleHashes.size).toBe(1);
    expect(db.launches.get('launch-1')).toBe('Demo launch');
    expect(db.logs).toHaveLength(4);
  });

  it('continues hourly ingestion when one source fails', async () => {
    const db = new MemoryScheduledDatabase();
    const rssSource: SourceConfig = {
      key: 'demo-rss',
      name: 'Demo RSS',
      type: 'rss',
      region: 'global',
      url: 'https://example.com/feed.xml',
      credibility: 3,
      enabled: true,
      purpose: 'Demo RSS.',
      expected_content: 'Metadata.',
      risk_notes: 'Public feed.',
      dedupe_strategy: 'url_title_source',
    };
    const launchSource = sources.find((source) => source.key === 'launch-library-2');

    if (!launchSource) {
      throw new Error('Missing launch source fixture');
    }

    const result = await runScheduledIngestion({
      db,
      sources: [launchSource, rssSource],
      context: {
        now: () => new Date('2026-05-09T00:00:00Z'),
        fetch: async (input: RequestInfo | URL) => {
          const url = String(input);

          if (url.includes('thespacedevs')) {
            return new Response('temporarily unavailable', { status: 503 });
          }

          return new Response(`<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Demo RSS</title>
                <item>
                  <title>Commercial space funding update</title>
                  <link>https://example.com/funding</link>
                  <description>Funding summary.</description>
                  <guid>funding-1</guid>
                  <pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>
                </item>
              </channel>
            </rss>`);
        },
      },
      kind: 'hourly',
    });

    expect(result.sourceRuns).toEqual([
      expect.objectContaining({
        sourceKey: 'launch-library-2',
        failures: 1,
        upserted: 0,
        error: 'Launch Library 2 request failed with HTTP 503',
      }),
      expect.objectContaining({
        sourceKey: 'demo-rss',
        failures: 0,
        inserted: 1,
      }),
    ]);
    expect(db.articleHashes.size).toBe(1);
    expect(db.logs).toHaveLength(2);
    expect(db.logs[0]).toMatchObject({ sourceKey: 'launch-library-2', failureCount: 1 });
    expect(db.logs[1]).toMatchObject({ sourceKey: 'demo-rss', successCount: 1 });
  });

  it('closes a timed-out source log and continues with later sources', async () => {
    const db = new MemoryScheduledDatabase();
    const hangingSource: SourceConfig = {
      key: 'hanging-rss',
      name: 'Hanging RSS',
      type: 'rss',
      region: 'global',
      url: 'https://example.com/hanging.xml',
      credibility: 3,
      enabled: true,
      purpose: 'Timeout fixture.',
      expected_content: 'Metadata.',
      risk_notes: 'Fixture only.',
      dedupe_strategy: 'url_title_source',
    };
    const healthySource: SourceConfig = {
      ...hangingSource,
      key: 'healthy-rss',
      name: 'Healthy RSS',
      url: 'https://example.com/healthy.xml',
    };

    const result = await runScheduledIngestion({
      db,
      sources: [hangingSource, healthySource],
      sourceTimeoutMs: 10,
      context: {
        now: () => new Date('2026-05-09T01:00:00Z'),
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);

          if (url.includes('hanging')) {
            return new Promise<Response>((_, reject) => {
              init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
            });
          }

          return new Response(`<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>Healthy RSS</title>
                <item>
                  <title>Reusable rocket update</title>
                  <link>https://example.com/reusable</link>
                  <description>Reusable summary.</description>
                  <guid>reusable-1</guid>
                  <pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>
                </item>
              </channel>
            </rss>`);
        },
      },
      kind: 'hourly',
    });

    expect(result.sourceRuns).toEqual([
      expect.objectContaining({
        sourceKey: 'hanging-rss',
        failures: 1,
        error: 'Source ingestion timed out after 10ms',
      }),
      expect.objectContaining({
        sourceKey: 'healthy-rss',
        failures: 0,
        inserted: 1,
      }),
    ]);
    expect(db.logs[0]).toMatchObject({
      sourceKey: 'hanging-rss',
      finishedAt: '2026-05-09T01:00:00.000Z',
      failureCount: 1,
      error: 'Source ingestion timed out after 10ms',
    });
    expect(db.logs[1]).toMatchObject({ sourceKey: 'healthy-rss', successCount: 1, failureCount: 0 });
  });

  it('runs RSS sources with bounded concurrency', async () => {
    const db = new MemoryScheduledDatabase();
    let activeFetches = 0;
    let maxActiveFetches = 0;
    const rssSources: SourceConfig[] = Array.from({ length: 3 }, (_, index) => ({
      key: `rss-${index}`,
      name: `RSS ${index}`,
      type: 'rss',
      region: 'global',
      url: `https://example.com/feed-${index}.xml`,
      credibility: 3,
      enabled: true,
      purpose: 'Concurrency fixture.',
      expected_content: 'Metadata.',
      risk_notes: 'Fixture only.',
      dedupe_strategy: 'url_title_source',
    }));

    await runScheduledIngestion({
      db,
      sources: rssSources,
      context: {
        now: () => new Date('2026-05-09T01:00:00Z'),
        fetch: async (input: RequestInfo | URL) => {
          activeFetches += 1;
          maxActiveFetches = Math.max(maxActiveFetches, activeFetches);
          await new Promise((resolve) => setTimeout(resolve, 5));
          activeFetches -= 1;

          return new Response(`<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <title>RSS</title>
                <item>
                  <title>${String(input)} update</title>
                  <link>${String(input).replace('.xml', '/article')}</link>
                  <description>Summary.</description>
                  <guid>${String(input)}</guid>
                  <pubDate>Sat, 09 May 2026 00:00:00 GMT</pubDate>
                </item>
              </channel>
            </rss>`);
        },
      },
      kind: 'hourly',
    });

    expect(maxActiveFetches).toBeGreaterThan(1);
    expect(maxActiveFetches).toBeLessThanOrEqual(4);
    expect(db.articleHashes.size).toBe(3);
  });

  it('skips Launch Library ingestion outside the six-hour cadence', async () => {
    const db = new MemoryScheduledDatabase();
    let fetchCount = 0;
    const launchSource = sources.find((source) => source.key === 'launch-library-2');

    if (!launchSource) {
      throw new Error('Missing launch source fixture');
    }

    const result = await runScheduledIngestion({
      db,
      sources: [launchSource],
      context: {
        now: () => new Date('2026-05-09T01:00:00Z'),
        fetch: async () => {
          fetchCount += 1;
          return new Response('{}');
        },
      },
      kind: 'hourly',
    });

    expect(fetchCount).toBe(0);
    expect(result.sourceRuns).toEqual([]);
    expect(db.logs).toEqual([]);
  });

  it('seeds market items during hourly runs idempotently', async () => {
    const db = new MemoryScheduledDatabase();
    db.marketArticles = [
      {
        id: 1,
        title: 'Commercial space company closes funding round',
        summary: 'Funding summary.',
        url: 'https://example.com/funding',
        publishedAt: '2026-05-09T00:00:00Z',
        sourceId: 1,
        companyId: null,
      },
    ];
    const input = {
      db,
      sources: [],
      context: {
        now: () => new Date('2026-05-09T00:00:00Z'),
        fetch,
      },
      kind: 'hourly' as const,
    };

    const first = await runScheduledIngestion(input);
    const second = await runScheduledIngestion(input);

    expect(first.marketSeed).toEqual({ candidates: 1, inserted: 1, skipped: 0, failures: 0 });
    expect(second.marketSeed).toEqual({ candidates: 1, inserted: 0, skipped: 1, failures: 0 });
    expect(db.marketRows).toEqual(new Map([['https://example.com/funding', 'financing']]));
  });

  it('syncs configured curations on daily runs', async () => {
    const db = new MemoryScheduledDatabase();
    db.logs.push({
      id: 1,
      sourceKey: 'old-rss',
      finishedAt: null,
      startedAt: '2026-05-08T20:00:00.000Z',
      successCount: 0,
      failureCount: 0,
      error: null,
    });

    const result = await runScheduledIngestion({
      db,
      sources,
      companiesConfig: {
        companies: [
          {
            slug: 'rocket-lab',
            name: 'Rocket Lab',
            country: 'global',
            sector: 'launch',
          },
        ],
      },
      topicsConfig: {
        topics: [
          {
            slug: 'reusable-rockets',
            name: 'Reusable Rockets',
            category: 'technology',
          },
        ],
      },
      context: {
        now: () => new Date('2026-05-09T00:00:00Z'),
        fetch,
      },
      kind: 'daily',
      curationsYaml: `
home_highlights:
  - url: https://example.com/top
    weight: 100
`,
    });

    expect(result.curationsInserted).toBe(1);
    expect(result.catalogSync).toMatchObject({
      sources: { configured: 2 },
      companies: { configured: 1 },
      topics: { configured: 1 },
    });
    expect(result.maintenance).toEqual({ staleIngestionLogsClosed: 1, failures: 0 });
    expect(db.curationsInserted).toBe(1);
    expect(db.logs[0]).toMatchObject({ failureCount: 1, finishedAt: '2026-05-09T00:00:00.000Z' });
  });
});
