import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from './_middleware';

afterEach(() => vi.unstubAllGlobals());

function setup(url = 'https://example.com/api/home?limit=12', init?: RequestInit) {
  const storage = new Map<string, Response>();
  const match = vi.fn(async (request: Request) => storage.get(request.url)?.clone());
  const put = vi.fn(async (request: Request, response: Response) => { storage.set(request.url, response); });
  vi.stubGlobal('caches', { default: { match, put } });
  const next = vi.fn(async () => Response.json({ items: [{ id: 1 }] }));
  const pending: Promise<unknown>[] = [];
  const context = {
    request: new Request(url, init), next,
    waitUntil: (promise: Promise<unknown>) => { pending.push(promise); },
  };
  const run = () => onRequest(context as unknown as Parameters<typeof onRequest>[0]);
  return { run, context, next, match, put, pending };
}

describe('public API edge cache', () => {
  it('serves repeated reads without re-running the database-backed handler', async () => {
    const { run, next, pending } = setup();
    const first = await run();
    await Promise.all(pending);
    const second = await run();
    expect(next).toHaveBeenCalledTimes(1);
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=0, s-maxage=120');
    expect(await second.json()).toEqual(await first.json());
  });

  it('keeps filter and pagination variants separate', async () => {
    const { run, context, next, pending } = setup('https://example.com/api/articles?region=cn&page=1');
    await run();
    await Promise.all(pending);
    context.request = new Request('https://example.com/api/articles?region=global&page=2');
    await run();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['/api/health', undefined],
    ['/api/admin/ingest/logs', undefined],
    ['/api/home', { method: 'POST' }],
    ['/api/home', { headers: { Authorization: 'Bearer test-only-token' } }],
    ['/api/home', { headers: { Cookie: 'session=test-only' } }],
  ] satisfies Array<[string, RequestInit | undefined]>)('bypasses caching for %s %j', async (path, init) => {
    const { run, match, put } = setup(`https://example.com${path}`, init);
    await run();
    expect(match).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it.each([503, 404, 429])('does not cache HTTP %s failures', async (status) => {
    const { run, next, put } = setup();
    next.mockImplementation(async () => Response.json({ error: 'Unavailable' }, { status }));
    expect((await run()).status).toBe(status);
    expect(put).not.toHaveBeenCalled();
  });

  it('falls through when the cache itself is unavailable', async () => {
    const { run, match, put, pending } = setup();
    match.mockRejectedValue(new Error('Cache unavailable'));
    put.mockRejectedValue(new Error('Cache unavailable'));
    expect((await run()).status).toBe(200);
    await expect(Promise.all(pending)).resolves.toBeDefined();
  });
});
