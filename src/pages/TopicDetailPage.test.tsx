import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopicDetailQuery } from '../hooks/queries';
import type { ApiTopicDetail } from '../types';
import { TopicDetailPage } from './TopicDetailPage';

vi.mock('../hooks/queries', () => ({
  useTopicDetailQuery: vi.fn(),
}));

const mockUseTopicDetailQuery = vi.mocked(useTopicDetailQuery);

function renderTopicDetail(path = '/topics/missing') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/topics/:slug" element={<TopicDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const topicDetail: ApiTopicDetail = {
  slug: 'reusable-rockets',
  name: '可回收火箭',
  categoryLabel: '技术路线',
  articleCount: 0,
  curationCount: 0,
  articles: [],
  curations: [],
};

const relatedArticle = {
  id: 12,
  title: 'Reusable rocket milestone',
  originalTitle: 'Reusable rocket milestone',
  summary: 'A short topic update.',
  originalSummary: 'A short topic update.',
  url: 'https://example.com/reusable',
  sourceName: 'SpaceNews',
  sourceCategoryLabel: '专业媒体',
  publisherName: null,
  publishedAt: '2026-05-30T00:00:00Z',
  regionLabel: '国际',
  tags: [{ slug: 'reusable-rockets', name: '可回收火箭' }],
  companies: [],
};

describe('TopicDetailPage', () => {
  beforeEach(() => {
    mockUseTopicDetailQuery.mockReset();
  });

  it('shows topic not-found copy without unrelated empty-news copy', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 404'),
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail();

    expect(html).toContain('专题不存在或已调整。');
    expect(html).not.toContain('该专题暂无相关新闻。');
  });

  it('shows a visible loading state before topic details are available', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('专题详情加载中');
    expect(html).not.toContain('专题不存在或已调整。');
    expect(html).not.toContain('该专题暂无相关新闻。');
  });

  it('keeps the related-news empty state for loaded topic records', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: topicDetail,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('可回收火箭');
    expect(html).toContain('该专题暂无相关新闻。');
  });

  it('normalizes legacy topic names before rendering detail titles', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: { ...topicDetail, name: ' 可回收   火箭 ' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('可回收 火箭');
    expect(html).not.toContain(' 可回收   火箭 ');
  });

  it('does not render unsafe curation links', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: {
        ...topicDetail,
        curations: [
          {
            itemUrl: 'javascript:alert(1)',
            note: 'Unsafe curation',
            createdAt: '2026-05-30T00:00:00Z',
          },
          {
            itemUrl: 'https://user:pass@example.com/reference',
            note: 'Unsafe curation',
            createdAt: '2026-05-30T00:00:00Z',
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('Unsafe curation');
    expect(html).not.toContain('精选资料');
  });

  it('uses a domain label instead of a raw URL when curation notes are missing', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: {
        ...topicDetail,
        curations: [
          {
            itemUrl: 'https://www.example.com/reference/path',
            note: null,
            createdAt: '2026-05-30T00:00:00Z',
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('href="https://www.example.com/reference/path"');
    expect(html).toContain('<strong>example.com</strong>');
    expect(html).not.toContain('<strong>https://www.example.com/reference/path</strong>');
  });

  it('normalizes legacy curation notes before rendering labels', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: {
        ...topicDetail,
        curations: [
          {
            itemUrl: 'https://www.example.com/reference/path',
            note: ' 精选   资料 ',
            createdAt: '2026-05-30T00:00:00Z',
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('<strong>精选 资料</strong>');
    expect(html).not.toContain(' 精选   资料 ');
  });

  it('links to the full topic article filter when related articles are truncated', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: { ...topicDetail, articleCount: 21, articles: [relatedArticle] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('Reusable rocket milestone');
    expect(html).toContain('查看全部专题文章');
    expect(html).toContain('href="/articles?tag=reusable-rockets"');
  });

  it('does not render a redundant full-topic article link when all related articles fit', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: { ...topicDetail, articleCount: 1, articles: [relatedArticle] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).not.toContain('查看全部专题文章');
    expect(html).not.toContain('/articles?tag=reusable-rockets');
  });

  it('does not show an empty-news state when articleCount points to more filtered results', () => {
    mockUseTopicDetailQuery.mockReturnValue({
      data: { ...topicDetail, articleCount: 2, articles: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicDetailQuery>);

    const html = renderTopicDetail('/topics/reusable-rockets');

    expect(html).toContain('查看全部专题文章');
    expect(html).toContain('href="/articles?tag=reusable-rockets"');
    expect(html).not.toContain('该专题暂无相关新闻。');
  });
});
