import { describe, expect, it } from 'vitest';
import { onRequestGet } from './articles/[id]';

class ThrowingDatabase {
  prepare(): never {
    throw new Error('database should not be queried for invalid article ids');
  }
}

describe('article detail route', () => {
  it('rejects non-decimal article ids without querying the database', async () => {
    const response = await onRequestGet({
      env: { DB: new ThrowingDatabase() as unknown as D1Database },
      params: { id: '1e3' },
    } as unknown as Parameters<typeof onRequestGet>[0]);

    await expect(response.json()).resolves.toEqual({ error: '文章不存在或已更新。' });
    expect(response.status).toBe(404);
  });

  it('rejects unsafe article ids without querying the database', async () => {
    const response = await onRequestGet({
      env: { DB: new ThrowingDatabase() as unknown as D1Database },
      params: { id: String(Number.MAX_SAFE_INTEGER + 1) },
    } as unknown as Parameters<typeof onRequestGet>[0]);

    await expect(response.json()).resolves.toEqual({ error: '文章不存在或已更新。' });
    expect(response.status).toBe(404);
  });
});
