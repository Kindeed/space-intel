import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArticlesQuery, useSourcesQuery } from '../hooks/queries';
import { PolicyPage } from './PolicyPage';

vi.mock('../hooks/queries', () => ({
  useArticlesQuery: vi.fn(),
  useSourcesQuery: vi.fn(),
}));

const mockUseArticlesQuery = vi.mocked(useArticlesQuery);
const mockUseSourcesQuery = vi.mocked(useSourcesQuery);

function renderPolicy(path = '/policy') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <PolicyPage />
    </MemoryRouter>,
  );
}

describe('PolicyPage', () => {
  beforeEach(() => {
    mockUseArticlesQuery.mockReset();
    mockUseSourcesQuery.mockReset();
    mockUseArticlesQuery.mockReturnValue({
      data: { items: [], page: 1, limit: 12, hasMore: false },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue({
      data: { items: [], publicStats: [], accessStats: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);
  });

  it('caps oversized limit values before requesting policy articles', () => {
    renderPolicy('/policy?limit=1000&page=2&query=rocket');

    expect(mockUseArticlesQuery).toHaveBeenCalledWith('/api/articles?query=rocket&category=policy&page=2&limit=50');
  });
});
