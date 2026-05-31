import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArticleDetailQuery } from '../hooks/queries';
import type { ApiArticleDetail } from '../types';
import { ArticleDetailPage } from './ArticleDetailPage';

vi.mock('../hooks/queries', () => ({
  useArticleDetailQuery: vi.fn(),
}));

const mockUseArticleDetailQuery = vi.mocked(useArticleDetailQuery);

function renderArticleDetail(path = '/articles/missing') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/articles/:slug" element={<ArticleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const articleDetail: ApiArticleDetail = {
  id: 42,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'A short article summary.',
  originalSummary: 'A short article summary.',
  url: 'https://example.com/article',
  sourceName: 'Spaceflight News',
  sourceCategoryLabel: '数据来源',
  publisherName: null,
  publishedAt: '2026-05-30T00:00:00Z',
  regionLabel: '国际',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [{ slug: 'rocket-lab', name: 'Rocket Lab' }],
  relatedSourceCount: 1,
  launches: [],
};

describe('ArticleDetailPage', () => {
  beforeEach(() => {
    mockUseArticleDetailQuery.mockReset();
  });

  it('shows article not-found copy without placeholder metadata', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 404'),
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail();

    expect(html).toContain('文章详情已更新或暂时不可访问。');
    expect(html).not.toContain('来源暂不可用');
    expect(html).not.toContain('时间暂不可用');
    expect(html).not.toContain('地区暂不可用');
    expect(html).not.toContain('单来源线索');
    expect(html).not.toContain('当前文章详情暂不可用。');
  });

  it('shows a visible loading state before article details are available', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('文章详情加载中');
    expect(html).not.toContain('文章详情已更新或暂时不可访问。');
    expect(html).not.toContain('阅读原文');
  });

  it('renders metadata only for loaded article details', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: articleDetail,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('Reusable rocket milestone');
    expect(html).toContain('A short article summary.');
    expect(html).toContain('Spaceflight News');
    expect(html).toContain('href="/articles?source=Spaceflight+News"');
    expect(html).toContain('href="/articles?region=global"');
    expect(html).toContain('单来源线索');
    expect(html).toContain('阅读原文');
  });

  it('normalizes legacy article title and summary text before rendering details', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        title: ' Reusable   rocket\tmilestone ',
        originalTitle: ' Original   reusable\trocket ',
        summary: ' Short\nsummary   only. ',
        originalSummary: ' Original\nsummary\t only. ',
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('Reusable rocket milestone');
    expect(html).toContain('Original reusable rocket');
    expect(html).toContain('Short summary only.');
    expect(html).toContain('Original summary only.');
    expect(html).not.toContain(' Reusable   rocket');
    expect(html).not.toContain('Short\nsummary');
  });

  it('does not link aggregator publisher labels to configured source filters', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        sourceName: '商业航天来源',
        publisherName: '新华社',
        regionLabel: '地区待确认',
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('新华社');
    expect(html).not.toContain('href="/articles?source=');
    expect(html).not.toContain('href="/articles?region=');
  });

  it('keeps source filter links for legacy empty publisher labels', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        sourceName: 'Google News RSS - 商业航天',
        publisherName: 'Google News RSS -    ',
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('商业航天');
    expect(html).toContain('href="/articles?source=%E5%95%86%E4%B8%9A%E8%88%AA%E5%A4%A9"');
  });

  it('normalizes legacy region labels before rendering detail filter links', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        regionLabel: '国   内' as ApiArticleDetail['regionLabel'],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('国内');
    expect(html).not.toContain('国   内');
    expect(html).toContain('href="/articles?region=cn"');
  });

  it('shows cleaned related source names when article details have multi-source coverage', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        relatedSourceCount: 3,
        relatedSources: ['商业航天', '新华社', '央视新闻'],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('3 源覆盖');
    expect(html).toContain('相关来源');
    expect(html).toContain('商业航天 / 新华社 / 央视新闻');
  });

  it('normalizes legacy related source names before rendering detail coverage', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        relatedSourceCount: 4,
        relatedSources: ['Google News RSS - 商业   航天', '商业 航天', ' Spaceflight\tNow ', '   '],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('相关来源');
    expect(html).toContain('商业 航天 / Spaceflight Now');
    expect(html).not.toContain('商业 航天 / 商业 航天');
    expect(html).not.toContain('Google News RSS');
    expect(html).not.toContain('商业   航天');
  });

  it('does not render related source names for single-source details', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        relatedSourceCount: 1,
        relatedSources: ['Spaceflight News'],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('单来源线索');
    expect(html).not.toContain('相关来源');
  });

  it('encodes related entity and launch identifiers in detail links', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        companies: [{ slug: 'rocket lab/us', name: 'Rocket Lab US' }],
        tags: [{ slug: 'reusable rockets', name: 'Reusable rockets' }],
        launches: [{ id: 0, externalId: 'll2/demo id', missionName: 'Demo launch', name: 'Demo launch' }],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('href="/companies/rocket%20lab%2Fus"');
    expect(html).toContain('href="/topics/reusable%20rockets"');
    expect(html).toContain('href="/launches/ll2%2Fdemo%20id"');
  });

  it('normalizes legacy related entity and launch labels before rendering chips', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: {
        ...articleDetail,
        companies: [{ slug: 'rocket-lab', name: ' Rocket   Lab ' }],
        tags: [{ slug: 'reusable-rockets', name: ' 可回收   火箭 ' }],
        launches: [{ id: 1, externalId: 'll2/demo', missionName: ' Demo   launch ', name: null }],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const html = renderArticleDetail('/articles/42');

    expect(html).toContain('Rocket Lab');
    expect(html).toContain('可回收 火箭');
    expect(html).toContain('Demo launch');
    expect(html).not.toContain(' Rocket   Lab ');
    expect(html).not.toContain(' 可回收   火箭 ');
    expect(html).not.toContain(' Demo   launch ');
  });

  it('does not render unsafe original article links', () => {
    mockUseArticleDetailQuery.mockReturnValue({
      data: { ...articleDetail, url: 'javascript:alert(1)' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const javascriptHtml = renderArticleDetail('/articles/42');

    mockUseArticleDetailQuery.mockReturnValue({
      data: { ...articleDetail, url: 'https://user:pass@example.com/article' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useArticleDetailQuery>);

    const credentialedHtml = renderArticleDetail('/articles/42');
    const html = `${javascriptHtml}${credentialedHtml}`;

    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('阅读原文');
  });
});
