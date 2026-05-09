import { describe, expect, it } from 'vitest';
import { runScheduledIngestion } from './scheduled';
import type { SourceConfig } from './types';
import type { DbRunResult, DbStatement, SqlDatabase } from '../db/types';

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
}

class MemoryScheduledDatabase implements SqlDatabase {
  readonly sources: Array<{ id: number; key: string }> = [];
  readonly articleHashes = new Set<string>();
  readonly launches = new Map<string, string>();
  readonly logs: Array<{ id: number; sourceKey: string; successCount: number; failureCount: number }> = [];
  curationsInserted = 0;

  prepare(query: string): DbStatement {
    return new MemoryStatement(this, query);
  }

  run(query: string, values: unknown[]): DbRunResult {
    const normalized = query.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('INSERT OR IGNORE INTO sources')) {
      const key = String(values[0]);

      if (!this.sources.some((source) => source.key === key)) {
        this.sources.push({ id: this.sources.length + 1, key });
        return { meta: { changes: 1 } };
      }

      return { meta: { changes: 0 } };
    }

    if (normalized.startsWith('INSERT OR IGNORE INTO articles')) {
      const dedupeHash = String(values[8]);

      if (this.articleHashes.has(dedupeHash)) {
        return { meta: { changes: 0 } };
      }

      this.articleHashes.add(dedupeHash);
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
      this.logs.push({ id, sourceKey: String(values[0]), successCount: 0, failureCount: 0 });
      return { meta: { changes: 1, last_row_id: id } };
    }

    if (normalized.startsWith('UPDATE ingestion_logs')) {
      const log = this.logs.find((item) => item.id === Number(values[4]));

      if (!log) {
        return { meta: { changes: 0 } };
      }

      log.successCount = Number(values[1]);
      log.failureCount = Number(values[2]);
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unsupported query: ${query}`);
  }

  first(query: string, values: unknown[]): unknown | null {
    if (query.trim() === 'SELECT id FROM sources WHERE key = ?') {
      return this.sources.find((source) => source.key === values[0]) ?? null;
    }

    return null;
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

  it('syncs configured curations on daily runs', async () => {
    const db = new MemoryScheduledDatabase();

    const result = await runScheduledIngestion({
      db,
      sources: [],
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
    expect(db.curationsInserted).toBe(1);
  });
});
