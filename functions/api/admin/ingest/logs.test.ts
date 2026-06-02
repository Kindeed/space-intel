import { describe, expect, it } from 'vitest';
import { adminUnauthorizedMessage } from '../../_admin';
import { onRequestGet } from './logs';

class FakeLogStatement {
  constructor(private readonly query: string) {}

  bind(...values: unknown[]): FakeLogStatement {
    expect(values).toEqual([5]);
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    return null;
  }

  async run() {
    return { meta: { changes: 0 } };
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    expect(this.query).toContain('FROM ingestion_logs');
    expect(this.query).toContain('LIMIT ?');

    return {
      results: [
        {
          sourceKey: 'cnsa-policy',
          startedAt: '2026-06-02T06:02:37.248Z',
          finishedAt: '2026-06-02T06:03:02.428Z',
          successCount: 0,
          failureCount: 1,
          error: 'Source ingestion timed out after 25000ms',
        } as T,
      ],
    };
  }
}

class FakeLogDatabase {
  prepare(query: string): FakeLogStatement {
    return new FakeLogStatement(query);
  }
}

function adminRequest(token = 'expected-token'): Request {
  return new Request('https://space.example.test/api/admin/ingest/logs?limit=5', {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe('admin ingestion logs API', () => {
  it('requires admin authorization', async () => {
    const response = await onRequestGet({
      env: { DB: new FakeLogDatabase() as unknown as D1Database, ADMIN_TOKEN: 'expected-token' },
      request: new Request('https://space.example.test/api/admin/ingest/logs'),
    } as Parameters<typeof onRequestGet>[0]);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: adminUnauthorizedMessage });
  });

  it('returns recent ingestion errors with source keys and raw errors for protected diagnostics', async () => {
    const response = await onRequestGet({
      env: { DB: new FakeLogDatabase() as unknown as D1Database, ADMIN_TOKEN: 'expected-token' },
      request: adminRequest(),
    } as Parameters<typeof onRequestGet>[0]);

    await expect(response.json()).resolves.toEqual({
      items: [
        {
          sourceKey: 'cnsa-policy',
          sourceName: '国家航天局政策公告',
          startedAt: '2026-06-02T06:02:37.248Z',
          finishedAt: '2026-06-02T06:03:02.428Z',
          durationMs: 25180,
          successCount: 0,
          failureCount: 1,
          errorCategory: 'timeout',
          error: 'Source ingestion timed out after 25000ms',
        },
      ],
    });
  });
});
