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

function renderPolicy(path = '/official') {
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

  it('caps oversized limit values before requesting official articles', () => {
    renderPolicy('/official?limit=1000&page=2&query=rocket');

    expect(mockUseArticlesQuery).toHaveBeenCalledWith('/api/articles?query=rocket&category=official&page=2&limit=50');
  });

  it('keeps the legacy policy route compatible with official filtering', () => {
    const html = renderPolicy('/policy?source=国家航天局');

    expect(mockUseArticlesQuery).toHaveBeenCalledWith('/api/articles?source=%E5%9B%BD%E5%AE%B6%E8%88%AA%E5%A4%A9%E5%B1%80&category=official&page=1&limit=12');
    expect(html).toContain('action="/policy"');
    expect(html).toContain('官方筛选');
  });
});
