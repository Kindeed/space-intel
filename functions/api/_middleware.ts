const publicReadPath = /^\/api\/(?:home|sources|(?:articles|launches|companies|topics)(?:\/[^/]+)?)\/?$/;
const publicCacheSeconds = 120;

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  if (request.method !== 'GET' || !publicReadPath.test(new URL(request.url).pathname)
    || request.headers.has('Authorization') || request.headers.has('Cookie')) {
    return context.next();
  }

  const cache = typeof caches === 'undefined' ? undefined : (caches as CacheStorage & { default?: Cache }).default;
  if (!cache) return context.next();

  // Preserve the complete query string: filters and pagination are distinct data.
  const key = new Request(request.url, { method: 'GET' });
  try {
    const cached = await cache.match(key);
    if (cached) return cached;
  } catch {
    // A cache outage must not prevent the database-backed request.
  }

  const response = await context.next();
  if (response.status !== 200 || response.headers.has('Set-Cookie')
    || !response.headers.get('Content-Type')?.includes('application/json')
    || /private|no-store/i.test(response.headers.get('Cache-Control') ?? '')) {
    return response;
  }

  const cachedResponse = new Response(response.body, response);
  cachedResponse.headers.set('Cache-Control', `public, max-age=0, s-maxage=${publicCacheSeconds}`);
  context.waitUntil(cache.put(key, cachedResponse.clone()).catch(() => undefined));
  return cachedResponse;
};
