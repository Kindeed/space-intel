import { describe, expect, it, vi } from 'vitest';
import { logApiError, publicError } from './_response';

describe('public API errors', () => {
  it('does not expose internal error details in response JSON', async () => {
    const response = publicError();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: '数据暂不可用，请稍后重试。' });
  });

  it('uses safe custom messages and statuses for public errors', async () => {
    const response = publicError('文章不存在或已更新。', 404);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: '文章不存在或已更新。' });
  });

  it('logs internal errors without adding details to public payloads', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('SQLITE internal detail');

    logApiError('test scope', error);

    expect(spy).toHaveBeenCalledWith('test scope', error);
    spy.mockRestore();
  });
});
