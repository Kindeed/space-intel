import { describe, expect, it } from 'vitest';
import type { SqlDatabase, DbRunResult, DbStatement } from './types';
import { createCollectorRegistry, runSourceIngestion, type SourceCollector } from '../ingestion';
import type { SourceConfig } from '../ingestion/types';

type SourceRow = {
  id: number;
  key: string;
  name: string;
  url: string;
  credibility: number;
  enabled: boolean;
};

type ArticleRow = {
  dedupeHash: string;
  title: string;
};

type LogRow = {
  id: number;
  sourceKey: string;
  startedAt: string;
  finishedAt?: string;
  successCount: number;
  failureCount: number;
  error?: string | null;
};

class MemoryStatement implements DbStatement {
  private values: unknown[] = [];

  constructor(
    private readonly database: MemoryDatabase,
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
}

class MemoryDatabase implements SqlDatabase {
  readonly sources: SourceRow[] = [];
  readonly articles: ArticleRow[] = [];
  readonly logs: LogRow[] = [];

  prepare(query: string): DbStatement {
    return new MemoryStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT INTO sources')) {
      const key = String(values[0]);
      const existing = this.sources.find((source) => source.key === key);

      if (existing) {
        existing.name = String(values[1]);
        existing.url = String(values[4]);
        existing.credibility = Number(values[5]);
        existing.enabled = Boolean(values[6]);
        return { meta: { changes: 1 } };
      }

      if (!existing) {
        this.sources.push({
          id: this.sources.length + 1,
          key,
          name: String(values[1]),
          url: String(values[4]),
          credibility: Number(values[5]),
          enabled: Boolean(values[6]),
        });
        return { meta: { changes: 1, last_row_id: this.sources.length } };
      }

      return { meta: { changes: 0 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO articles')) {
      const dedupeHash = String(values[8]);
      if (!this.articles.some((article) => article.dedupeHash === dedupeHash)) {
        this.articles.push({ dedupeHash, title: String(values[1]) });
        return { meta: { changes: 1, last_row_id: this.articles.length } };
      }

      return { meta: { changes: 0 } };
    }

    if (normalized.startsWith('INSERT INTO ingestion_logs')) {
      const id = this.logs.length + 1;
      this.logs.push({
        id,
        sourceKey: String(values[0]),
        startedAt: String(values[1]),
        successCount: 0,
        failureCount: 0,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }

    if (normalized.startsWith('UPDATE ingestion_logs')) {
      const id = Number(values[4]);
      const log = this.logs.find((item) => item.id === id);
      if (!log) {
        return { meta: { changes: 0 } };
      }

      log.finishedAt = String(values[0]);
      log.successCount = Number(values[1]);
      log.failureCount = Number(values[2]);
      log.error = values[3] === null ? null : String(values[3]);
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }

  first(query: string, values: unknown[]): unknown | null {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized === 'SELECT id FROM sources WHERE key = ?') {
      return this.sources.find((source) => source.key === values[0]) ?? null;
    }

    throw new Error(`Unsupported first query: ${query}`);
  }
}

const source: SourceConfig = {
  key: 'snapi',
  name: 'Spaceflight News API',
  type: 'api',
  region: 'global',
  url: 'https://api.spaceflightnewsapi.net/v4/articles/',
  credibility: 5,
  enabled: true,
  purpose: 'Core international commercial space news aggregation.',
  expected_content: 'News metadata and summaries.',
  risk_notes: 'Public API; store summaries and links only.',
  dedupe_strategy: 'url_title_source',
};

const collector: SourceCollector = {
  type: 'api',
  async collect() {
    return [
      {
        sourceKey: 'snapi',
        sourceName: 'Spaceflight Now',
        title: 'Reusable rocket milestone',
        originalTitle: 'Reusable rocket milestone',
        summary: 'Short summary only.',
        url: 'https://example.com/reusable-rocket',
        publishedAt: '2026-05-09T00:00:00Z',
        language: 'en',
        region: 'global',
        rawId: 'article-1',
        relatedLaunchIds: [],
        companies: [],
        tags: [],
      },
    ];
  },
};

describe('D1 persistence flow', () => {
  it('inserts articles once and skips duplicate ingestion runs', async () => {
    const db = new MemoryDatabase();
    const registry = createCollectorRegistry([collector]);
    const context = {
      fetch,
      now: () => new Date('2026-05-09T00:00:00Z'),
    };

    const first = await runSourceIngestion(db, source, registry, context);
    const second = await runSourceIngestion(db, source, registry, context);

    expect(first).toMatchObject({ collected: 1, inserted: 1, skipped: 0, failures: 0 });
    expect(second).toMatchObject({ collected: 1, inserted: 0, skipped: 1, failures: 0 });
    expect(db.sources).toHaveLength(1);
    expect(db.articles).toHaveLength(1);
    expect(db.logs).toHaveLength(2);
    expect(db.logs[1]).toMatchObject({ successCount: 0, failureCount: 0 });
  });

  it('updates source catalog fields on repeat ingestion', async () => {
    const db = new MemoryDatabase();
    const registry = createCollectorRegistry([collector]);
    const context = {
      fetch,
      now: () => new Date('2026-05-09T00:00:00Z'),
    };

    await runSourceIngestion(db, source, registry, context);
    await runSourceIngestion(
      db,
      {
        ...source,
        name: 'Spaceflight News API Updated',
        url: 'https://api.spaceflightnewsapi.net/v4/articles/?ordering=-published_at',
        credibility: 4,
        enabled: false,
      },
      registry,
      context,
    );

    expect(db.sources).toHaveLength(1);
    expect(db.sources[0]).toMatchObject({
      key: 'snapi',
      name: 'Spaceflight News API Updated',
      url: 'https://api.spaceflightnewsapi.net/v4/articles/?ordering=-published_at',
      credibility: 4,
      enabled: false,
    });
  });

  it('records ingestion failures before rethrowing', async () => {
    const db = new MemoryDatabase();
    const registry = createCollectorRegistry([
      {
        type: 'api',
        async collect() {
          throw new Error('upstream unavailable');
        },
      },
    ]);

    await expect(
      runSourceIngestion(db, source, registry, {
        fetch,
        now: () => new Date('2026-05-09T00:00:00Z'),
      }),
    ).rejects.toThrow('upstream unavailable');

    expect(db.logs).toHaveLength(1);
    expect(db.logs[0]).toMatchObject({
      successCount: 0,
      failureCount: 1,
      error: 'upstream unavailable',
    });
  });
});
