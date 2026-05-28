import { describe, expect, it } from 'vitest';
import { onRequestGet } from './health';

class FakeHealthStatement {
  constructor(private readonly query: string) {}

  bind(): FakeHealthStatement {
    return this;
  }

  async run() {
    return { meta: { changes: 0 } };
  }

  async first<T = unknown>(): Promise<T | null> {
    if (this.query.includes('MAX(published_at)')) {
      return { latestArticlePublishedAt: '2026-05-18T08:00:00Z' } as T;
    }

    if (this.query.includes('COUNT(*) AS openIngestionLogCount')) {
      return { openIngestionLogCount: 2 } as T;
    }

    if (this.query.includes('MAX(finished_at)')) {
      return { latestSuccessfulIngestionAt: '2026-05-18T08:00:05Z' } as T;
    }

    if (this.query.includes('FROM ingestion_logs') && this.query.includes('ORDER BY finished_at DESC')) {
      expect(this.query).toContain('finished_at IS NOT NULL');
      return {
        sourceKey: 'google-news-cn-commercial-space',
        startedAt: '2026-05-18T08:00:00Z',
        finishedAt: '2026-05-18T08:00:05Z',
        successCount: 3,
        failureCount: 0,
        hasError: 0,
      } as T;
    }

    return null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    if (this.query.includes('failure_count > 0')) {
      return {
        results: [
          {
            sourceKey: 'demo-rss',
            startedAt: '2026-05-18T07:00:00Z',
            finishedAt: '2026-05-18T07:00:02Z',
            successCount: 0,
            failureCount: 1,
            hasError: 1,
          } as T,
        ],
      };
    }

    return { results: [] };
  }
}

class FakeHealthDatabase {
  prepare(query: string): FakeHealthStatement {
    return new FakeHealthStatement(query);
  }
}

describe('health API', () => {
  it('returns safe ingestion diagnostics without internal error details', async () => {
    const response = await onRequestGet({
      env: {
        DB: new FakeHealthDatabase() as unknown as D1Database,
        R2_ASSETS: {} as R2Bucket,
      },
    } as Parameters<typeof onRequestGet>[0]);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: 'space-intel',
      bindings: {
        d1: true,
        r2: true,
      },
      diagnostics: {
        latestArticlePublishedAt: '2026-05-18T08:00:00Z',
        openIngestionLogCount: 2,
        latestSuccessfulIngestionAt: '2026-05-18T08:00:05Z',
        recentFailedIngestionLogs: [
          {
            sourceKey: 'demo-rss',
            startedAt: '2026-05-18T07:00:00Z',
            finishedAt: '2026-05-18T07:00:02Z',
            successCount: 0,
            failureCount: 1,
            hasError: true,
          },
        ],
        latestIngestionLog: {
          sourceKey: 'google-news-cn-commercial-space',
          startedAt: '2026-05-18T08:00:00Z',
          finishedAt: '2026-05-18T08:00:05Z',
          successCount: 3,
          failureCount: 0,
          hasError: false,
        },
      },
    });
  });
});
