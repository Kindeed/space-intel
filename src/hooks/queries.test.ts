import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

import { useHomeQuery, useSourcesQuery } from './queries';

describe('API query hooks', () => {
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
