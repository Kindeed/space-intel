import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCompanyDetailQuery } from '../hooks/queries';
import type { ApiCompanyDetail } from '../types';
import { CompanyDetailPage } from './CompanyDetailPage';

vi.mock('../hooks/queries', () => ({
  useCompanyDetailQuery: vi.fn(),
}));

const mockUseCompanyDetailQuery = vi.mocked(useCompanyDetailQuery);

function renderCompanyDetail(path = '/companies/missing') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/companies/:slug" element={<CompanyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const companyDetail: ApiCompanyDetail = {
  slug: 'rocket-lab',
  name: 'Rocket Lab',
  englishName: 'Rocket Lab',
  countryLabel: '美国',
  sectorLabel: '发射服务',
  website: null,
  profile: '',
  stockSymbol: null,
  logoUrl: null,
  articleCount: 0,
  articles: [],
};

const relatedArticle = {
  id: 11,
  title: 'Rocket Lab milestone',
  originalTitle: 'Rocket Lab milestone',
  summary: 'A short company update.',
  originalSummary: 'A short company update.',
  url: 'https://example.com/rocket-lab',
  sourceName: 'SpaceNews',
  sourceCategoryLabel: '专业媒体',
  publisherName: null,
  publishedAt: '2026-05-30T00:00:00Z',
  regionLabel: '国际',
  tags: [],
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
};

describe('CompanyDetailPage', () => {
  beforeEach(() => {
    mockUseCompanyDetailQuery.mockReset();
  });

  it('shows a not-found detail message without unrelated empty-news copy', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 404'),
      isLoading: false,
    } as unknown as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail();

    expect(html).toContain('公司详情已更新或暂时不可访问。');
    expect(html).not.toContain('暂无相关新闻。');
  });

  it('shows a visible loading state before company details are available', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('公司详情加载中');
    expect(html).not.toContain('公司详情已更新或暂时不可访问。');
    expect(html).not.toContain('暂无相关新闻。');
  });

  it('keeps the related-news empty state for loaded company records', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: companyDetail,
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('Rocket Lab');
    expect(html).toContain('美国');
    expect(html).toContain('发射服务');
    expect(html).not.toContain('United States');
    expect(html).toContain('暂无相关新闻。');
  });

  it('does not render unsafe company website links', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, website: 'javascript:alert(1)' },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const javascriptHtml = renderCompanyDetail('/companies/rocket-lab');

    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, website: 'https://user:pass@example.com/company' },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const credentialedHtml = renderCompanyDetail('/companies/rocket-lab');
    const html = `${javascriptHtml}${credentialedHtml}`;

    expect(html).toContain('官网未披露');
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('href="https://user');
  });

  it('normalizes legacy company profile text before rendering', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, profile: '   Commercial   launch\nprovider.  ' },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('Commercial launch provider.');
    expect(html).not.toContain('Commercial   launch');
    expect(html).not.toContain('暂无公开简介。');
  });

  it('normalizes legacy company names before rendering detail titles', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, name: ' Rocket   Lab ' },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('Rocket Lab');
    expect(html).not.toContain(' Rocket   Lab ');
  });

  it('normalizes legacy company metadata before rendering detail metadata', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: {
        ...companyDetail,
        countryLabel: ' 美   国 ',
        sectorLabel: ' 发射   服务 ',
        stockSymbol: ' NASDAQ:   RKLB ',
      },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('美 国');
    expect(html).toContain('发射 服务');
    expect(html).toContain('NASDAQ: RKLB');
    expect(html).not.toContain(' 美   国 ');
    expect(html).not.toContain(' 发射   服务 ');
    expect(html).not.toContain('NASDAQ:   RKLB');
  });

  it('uses company metadata fallbacks for blank legacy values', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: {
        ...companyDetail,
        countryLabel: '   ',
        sectorLabel: '   ',
        stockSymbol: '   ',
      },
      error: null,
      isLoading: false,
    } as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('地区待确认');
    expect(html).toContain('赛道待确认');
    expect(html).toContain('未披露/未上市');
  });

  it('links to the full company article filter when related articles are truncated', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, articleCount: 21, articles: [relatedArticle] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('Rocket Lab milestone');
    expect(html).toContain('查看全部相关新闻');
    expect(html).toContain('href="/articles?company=rocket-lab"');
  });

  it('does not render a redundant full-company article link when all related articles fit', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, articleCount: 1, articles: [relatedArticle] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).not.toContain('查看全部相关新闻');
    expect(html).not.toContain('/articles?company=rocket-lab');
  });

  it('does not show an empty-news state when articleCount points to more filtered results', () => {
    mockUseCompanyDetailQuery.mockReturnValue({
      data: { ...companyDetail, articleCount: 2, articles: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useCompanyDetailQuery>);

    const html = renderCompanyDetail('/companies/rocket-lab');

    expect(html).toContain('查看全部相关新闻');
    expect(html).toContain('href="/articles?company=rocket-lab"');
    expect(html).not.toContain('暂无相关新闻。');
  });
});
