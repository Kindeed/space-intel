import { describe, expect, it, vi } from 'vitest';
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
    if (this.query === 'SELECT 1 AS healthy') return { healthy: 1 } as T;
    if (this.query.includes('MAX(published_at)')) {
      return { latestArticlePublishedAt: '2026-05-18T08:00:00Z' } as T;
    }

    if (this.query.includes('COUNT(*) AS openIngestionLogCount')) {
      return { openIngestionLogCount: 2 } as T;
    }

    if (this.query.includes('COUNT(*) AS upcomingLaunchCount')) {
      return { upcomingLaunchCount: 12 } as T;
    }

    return null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    if (this.query.includes('FROM ingestion_logs')) {
      return {
        results: [
          {
            id: 100,
            sourceKey: 'google-news-cn-commercial-space',
            startedAt: '2026-05-18T08:00:00Z',
            finishedAt: '2026-05-18T08:00:05Z',
            successCount: 3, failureCount: 0, hasError: 0, error: null,
          } as T,
          {
            id: 99,
            sourceKey: 'demo-rss',
            startedAt: '2026-05-18T07:00:00Z',
            finishedAt: '2026-05-18T07:00:02Z',
            successCount: 0,
            failureCount: 1,
            hasError: 1,
            error: 'Source ingestion timed out after 25000ms',
          } as T,
          {
            id: 98,
            sourceKey: 'launch-library-2',
            startedAt: '2026-05-18T06:00:00Z',
            finishedAt: '2026-05-18T06:00:03Z',
            successCount: 25, failureCount: 0, hasError: 0, error: null,
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
  it('checks connectivity with one constant query and no application-table reads by default', async () => {
    const prepare = vi.fn((query: string) => new FakeHealthStatement(query));
    const response = await onRequestGet({
      env: { DB: { prepare } }, request: new Request('https://example.test/api/health'),
    } as unknown as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(200);
    expect(prepare.mock.calls).toEqual([['SELECT 1 AS healthy']]);
    expect(await response.json()).toMatchObject({ ok: true, diagnostics: { diagnosticsAvailable: false, diagnosticsRequested: false } });
  });

  it('returns 503 when D1 rejects diagnostics without exposing quota details', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await onRequestGet({ env: { DB: {
        prepare() { throw new Error('Internal D1 daily row-read quota details'); },
      } } } as unknown as Parameters<typeof onRequestGet>[0]);
      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const payload = await response.json();
      expect(payload).toMatchObject({ ok: false, checks: { database: false }, diagnostics: { diagnosticsAvailable: false } });
      expect(JSON.stringify(payload)).not.toContain('quota details');
    } finally { errorLog.mockRestore(); }
  });

  it('returns 503 when the database binding is absent', async () => {
    const response = await onRequestGet({ env: {} } as Parameters<typeof onRequestGet>[0]);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, checks: { database: false }, diagnostics: { diagnosticsAvailable: false } });
  });

  it('returns safe ingestion diagnostics without internal error details', async () => {
    const response = await onRequestGet({
      request: new Request('https://example.test/api/health?diagnostics=1'),
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
        ingestionLogScope: 'recent_log_ids',
        ingestionLogIdWindow: 240,
        latestArticlePublishedAt: '2026-05-18T08:00:00Z',
        openIngestionLogCount: 2,
        openIngestionLogCountExact: true,
        upcomingLaunchCount: 12,
        upcomingLaunchCountExact: true,
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
      request: new Request('https://example.test/api/health?diagnostics=1'),
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
