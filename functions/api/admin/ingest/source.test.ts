import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runSourceIngestion } from '../../../../src/ingestion';
import { adminIngestionFailureMessage, adminSourceNotConfiguredMessage, adminUnauthorizedMessage } from '../../_admin';
import { onRequestPost } from './source';

vi.mock('../../../../src/ingestion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/ingestion')>();

  return {
    ...actual,
    runSourceIngestion: vi.fn(async (_db, source) => ({
      sourceKey: source.key,
      collected: 2,
      inserted: 1,
      skipped: 1,
      failures: 0,
    })),
  };
});

function adminRequest(url: string, token = 'expected-token'): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe('admin single-source ingestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires admin authorization', async () => {
    const response = await onRequestPost({
      env: { DB: {} as D1Database, ADMIN_TOKEN: 'expected-token' },
      request: new Request('https://space.example.test/api/admin/ingest/source?key=cnsa-news', { method: 'POST' }),
    } as Parameters<typeof onRequestPost>[0]);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: adminUnauthorizedMessage });
    expect(runSourceIngestion).not.toHaveBeenCalled();
  });

  it('runs one enabled article source selected by key', async () => {
    const response = await onRequestPost({
      env: { DB: {} as D1Database, ADMIN_TOKEN: 'expected-token' },
      request: adminRequest('https://space.example.test/api/admin/ingest/source?key=cnsa-news'),
    } as Parameters<typeof onRequestPost>[0]);

    await expect(response.json()).resolves.toEqual({
      sourceKey: 'cnsa-news',
      collected: 2,
      inserted: 1,
      skipped: 1,
      failures: 0,
    });
    expect(runSourceIngestion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(runSourceIngestion).mock.calls[0]?.[1]).toMatchObject({
      key: 'cnsa-news',
      type: 'official_page',
      enabled: true,
    });
  });

  it('rejects missing, disabled, and non-article source keys', async () => {
    for (const key of ['', 'missing-source', 'launch-library-2']) {
      const response = await onRequestPost({
        env: { DB: {} as D1Database, ADMIN_TOKEN: 'expected-token' },
        request: adminRequest(`https://space.example.test/api/admin/ingest/source?key=${encodeURIComponent(key)}`),
      } as Parameters<typeof onRequestPost>[0]);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: adminSourceNotConfiguredMessage });
    }

    expect(runSourceIngestion).not.toHaveBeenCalled();
  });

  it('keeps raw ingestion failures out of the admin response', async () => {
    vi.mocked(runSourceIngestion).mockRejectedValueOnce(new Error('private upstream path failed'));

    const response = await onRequestPost({
      env: { DB: {} as D1Database, ADMIN_TOKEN: 'expected-token' },
      request: adminRequest('https://space.example.test/api/admin/ingest/source?key=cnsa-news'),
    } as Parameters<typeof onRequestPost>[0]);
    const payload = await response.json();

    expect(payload).toEqual({
      sourceKey: 'cnsa-news',
      collected: 0,
      inserted: 0,
      skipped: 0,
      failures: 1,
      error: adminIngestionFailureMessage,
    });
    expect(JSON.stringify(payload)).not.toContain('private upstream path');
  });
});
