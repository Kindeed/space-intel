import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

import { fetchJson, useHomeQuery, useSourcesQuery } from './queries';

describe('API query hooks', () => {
  it('passes cancellation from the query to the network request', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [] }));
    vi.stubGlobal('fetch', request);
    try {
      useHomeQuery();
      const options = mocks.useQuery.mock.calls.at(-1)?.[0];
      const controller = new AbortController();
      await options.queryFn({ signal: controller.signal });
      expect(request).toHaveBeenCalledWith('/api/home?limit=12', { signal: controller.signal });
      controller.abort();
      expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not turn an HTTP failure into successful query data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    try {
      await expect(fetchJson('/api/home')).rejects.toThrow('HTTP 503');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('does not retry the source catalog query', () => {
    useSourcesQuery();

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['sources'],
        retry: false,
      }),
    );
  });

  it('keeps default retry behavior for other public queries', () => {
    useHomeQuery();

    expect(mocks.useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['home'],
        retry: undefined,
      }),
    );
  });
});
