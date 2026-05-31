import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompaniesQuery } from '../hooks/queries';
import { CompaniesPage } from './CompaniesPage';

vi.mock('../hooks/queries', () => ({
  useCompaniesQuery: vi.fn(),
}));

const mockUseCompaniesQuery = vi.mocked(useCompaniesQuery);

function renderCompanies() {
  return renderToString(
    <MemoryRouter initialEntries={['/companies']}>
      <CompaniesPage />
    </MemoryRouter>,
  );
}

describe('CompaniesPage', () => {
  beforeEach(() => {
    mockUseCompaniesQuery.mockReset();
  });

  it('shows a visible loading state before company records are available', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderCompanies();

    expect(html).toContain('公司档案加载中');
    expect(html).not.toContain('暂无公司档案。');
    expect(html).not.toContain('公司列表暂不可用');
  });

  it('does not mix company API errors with the empty-state copy', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 500'),
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderCompanies();

    expect(html).toContain('公司列表暂不可用，请稍后重试。');
    expect(html).not.toContain('暂无公司档案。');
    expect(html).not.toContain('公司档案加载中');
  });

  it('keeps the empty-state copy for successful empty company results', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: { items: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    expect(renderCompanies()).toContain('暂无公司档案。');
  });

  it('encodes company slugs before linking company cards', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'rocket lab/us',
            name: 'Rocket Lab US',
            englishName: null,
            countryLabel: '美国',
            sectorLabel: '发射服务',
            website: null,
            profile: '',
            stockSymbol: null,
            logoUrl: null,
            articleCount: 2,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderCompanies();

    expect(html).toContain('Rocket Lab US');
    expect(html).toContain('美国');
    expect(html).toContain('发射服务');
    expect(html).not.toContain('United States / Launch');
    expect(html).toContain('href="/companies/rocket%20lab%2Fus"');
  });

  it('normalizes legacy company names before rendering company cards', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'rocket-lab',
            name: ' Rocket   Lab ',
            englishName: null,
            countryLabel: '美国',
            sectorLabel: '发射服务',
            website: null,
            profile: '',
            stockSymbol: null,
            logoUrl: null,
            articleCount: 2,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderCompanies();

    expect(html).toContain('Rocket Lab');
    expect(html).not.toContain(' Rocket   Lab ');
  });

  it('normalizes legacy company metadata before rendering company cards', () => {
    mockUseCompaniesQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'rocket-lab',
            name: 'Rocket Lab',
            englishName: null,
            countryLabel: ' 美   国 ',
            sectorLabel: ' 发射   服务 ',
            website: null,
            profile: '',
            stockSymbol: null,
            logoUrl: null,
            articleCount: 2,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompaniesQuery>);

    const html = renderCompanies();

    expect(html).toContain('美 国');
    expect(html).toContain('发射 服务');
    expect(html).not.toContain(' 美   国 ');
    expect(html).not.toContain(' 发射   服务 ');
  });
});
