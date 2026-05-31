import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArticlesQuery, useCompaniesQuery, useSourcesQuery, useTopicsQuery } from '../hooks/queries';
import { ArticlesPage } from './ArticlesPage';

vi.mock('../hooks/queries', () => ({
  useArticlesQuery: vi.fn(),
  useCompaniesQuery: vi.fn(),
  useSourcesQuery: vi.fn(),
  useTopicsQuery: vi.fn(),
}));

const mockUseArticlesQuery = vi.mocked(useArticlesQuery);
const mockUseCompaniesQuery = vi.mocked(useCompaniesQuery);
const mockUseSourcesQuery = vi.mocked(useSourcesQuery);
const mockUseTopicsQuery = vi.mocked(useTopicsQuery);

function renderArticles(path = '/articles') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <ArticlesPage />
    </MemoryRouter>,
  );
}

describe('ArticlesPage', () => {
  beforeEach(() => {
    mockUseArticlesQuery.mockReset();
    mockUseCompaniesQuery.mockReset();
    mockUseSourcesQuery.mockReset();
    mockUseTopicsQuery.mockReset();
    mockUseArticlesQuery.mockReturnValue({
      data: { items: [], page: 1, limit: 12, hasMore: false },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseCompaniesQuery.mockReturnValue({
      data: { items: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);
    mockUseSourcesQuery.mockReturnValue({
      data: { items: [], publicStats: [], accessStats: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);
    mockUseTopicsQuery.mockReturnValue({
      data: { items: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);
  });

  it('caps oversized limit values before requesting articles', () => {
    renderArticles('/articles?limit=1000&page=2&source=snapi');

    expect(mockUseArticlesQuery).toHaveBeenCalledWith('/api/articles?source=snapi&page=2&limit=50');
  });

  it('uses public names for topic and company filter suggestions', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: { items: [{ slug: 'reusable-rockets', name: ' 可回收   火箭 ', categoryLabel: '技术路线', description: '' }] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);
    mockUseCompaniesQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'rocket-lab',
            name: ' Rocket   Lab ',
            englishName: 'Rocket Lab',
            countryLabel: '美国',
            sectorLabel: '发射服务',
            description: '',
            website: null,
            logoUrl: null,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderArticles();

    expect(html).toContain('value="可回收 火箭"');
    expect(html).toContain('value="Rocket Lab"');
    expect(html).not.toContain(' 可回收   火箭 ');
    expect(html).not.toContain(' Rocket   Lab ');
    expect(html).not.toContain('value="reusable-rockets"');
    expect(html).not.toContain('value="rocket-lab"');
  });
});
