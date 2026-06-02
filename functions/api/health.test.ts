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

    if (this.query.includes('COUNT(*) AS upcomingLaunchCount')) {
      return { upcomingLaunchCount: 12 } as T;
    }

    if (this.query.includes("source_key = 'launch-library-2'")) {
      return {
        sourceKey: 'launch-library-2',
        startedAt: '2026-05-18T06:00:00Z',
        finishedAt: '2026-05-18T06:00:03Z',
        successCount: 25,
        failureCount: 0,
        hasError: 0,
        error: null,
      } as T;
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
        error: null,
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
            error: 'Source ingestion timed out after 25000ms',
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
      checks: {
        database: true,
        assets: true,
      },
      diagnostics: {
        latestArticlePublishedAt: '2026-05-18T08:00:00Z',
        openIngestionLogCount: 2,
        upcomingLaunchCount: 12,
        latestSuccessfulIngestionAt: '2026-05-18T08:00:05Z',
        recentFailedIngestionLogs: [
          {
            sourceName: '来源',
            startedAt: '2026-05-18T07:00:00Z',
            finishedAt: '2026-05-18T07:00:02Z',
            successCount: 0,
            failureCount: 1,
            hasError: true,
            errorCategory: 'timeout',
            durationMs: 2000,
          },
        ],
        latestIngestionLog: {
          sourceName: '商业航天来源',
          startedAt: '2026-05-18T08:00:00Z',
          finishedAt: '2026-05-18T08:00:05Z',
          successCount: 3,
          failureCount: 0,
          hasError: false,
          errorCategory: null,
          durationMs: 5000,
        },
        latestLaunchIngestionLog: {
          sourceName: 'Launch Library 2',
          startedAt: '2026-05-18T06:00:00Z',
          finishedAt: '2026-05-18T06:00:03Z',
          successCount: 25,
          failureCount: 0,
          hasError: false,
          errorCategory: null,
          durationMs: 3000,
        },
      },
    });
  });

  it('does not expose internal source keys in diagnostics', async () => {
    const response = await onRequestGet({
      env: {
        DB: new FakeHealthDatabase() as unknown as D1Database,
        R2_ASSETS: {} as R2Bucket,
      },
    } as Parameters<typeof onRequestGet>[0]);

    const payload = JSON.stringify(await response.json());

    expect(payload).not.toContain('sourceKey');
    expect(payload).not.toContain('google-news-cn-commercial-space');
    expect(payload).not.toContain('demo-rss');
    expect(payload).not.toContain('launch-library-2');
    expect(payload).not.toContain('Source ingestion timed out');
  });

  it('uses generic health check names instead of platform binding names', async () => {
    const response = await onRequestGet({
      env: {
        DB: new FakeHealthDatabase() as unknown as D1Database,
        R2_ASSETS: {} as R2Bucket,
      },
    } as Parameters<typeof onRequestGet>[0]);

    const payload = JSON.stringify(await response.json());

    expect(payload).toContain('"checks"');
    expect(payload).toContain('"database"');
    expect(payload).toContain('"assets"');
    expect(payload).not.toContain('"bindings"');
    expect(payload).not.toContain('"d1"');
    expect(payload).not.toContain('"r2"');
  });
});
