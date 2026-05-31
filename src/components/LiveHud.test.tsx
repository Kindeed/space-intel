import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useArticlesQuery, useLaunchesQuery, useSourcesQuery } from '../hooks/queries';
import type { ApiHomeStats, ApiLaunch } from '../types';
import { LiveHud } from './LiveHud';

vi.mock('../hooks/queries', () => ({
  useArticlesQuery: vi.fn(),
  useLaunchesQuery: vi.fn(),
  useSourcesQuery: vi.fn(),
}));

const mockUseArticlesQuery = vi.mocked(useArticlesQuery);
const mockUseLaunchesQuery = vi.mocked(useLaunchesQuery);
const mockUseSourcesQuery = vi.mocked(useSourcesQuery);

function queryState<T>(state: { data?: T; error?: Error | null; isLoading?: boolean }) {
  return {
    data: state.data,
    error: state.error ?? null,
    isLoading: state.isLoading ?? false,
  };
}

function renderHud(stats?: ApiHomeStats) {
  return renderToString(
    <MemoryRouter>
      <LiveHud stats={stats} />
    </MemoryRouter>,
  );
}

const fallbackLaunch: ApiLaunch = {
  id: 0,
  externalId: 'fallback-window',
  mission: 'Fallback launch window',
  rocket: null,
  provider: 'Launch provider',
  windowStart: null,
  site: null,
  statusLabel: '状态待定',
  sourceUrl: null,
  isFallback: true,
};

const linkedLaunch: ApiLaunch = {
  id: 42,
  externalId: 'linked-window',
  mission: 'Linked launch window',
  rocket: null,
  provider: 'Launch provider',
  windowStart: null,
  site: null,
  statusLabel: '准备发射',
  sourceUrl: null,
};

const externalIdLaunch: ApiLaunch = {
  ...linkedLaunch,
  id: 0,
  externalId: 'll2/demo id',
  mission: 'External id launch',
};

describe('LiveHud', () => {
  beforeEach(() => {
    mockUseArticlesQuery.mockReset();
    mockUseLaunchesQuery.mockReset();
    mockUseSourcesQuery.mockReset();
  });

  it('separates loading states from empty and unavailable states', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ isLoading: true }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ isLoading: true }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ isLoading: true }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('发射记录加载中。');
    expect(html).toContain('官方信息加载中。');
    expect(html).toContain('来源状态加载中。');
    expect(html).toContain('aria-label="实时概览"');
    expect(html).not.toContain('实时情报 HUD');
    expect(html).not.toContain('暂无发射记录。');
    expect(html).not.toContain('暂无官方信息。');
    expect(html).not.toContain('来源状态暂不可用。');
  });

  it('keeps empty states for successful empty responses', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ data: { items: [], publicStats: [], accessStats: [] } }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('暂无发射记录。');
    expect(html).toContain('暂无官方信息。');
    expect(html).toContain('暂无来源状态。');
    expect(html).not.toContain('加载中');
    expect(html).not.toContain('暂不可用');
  });

  it('shows unavailable states for failed responses without stale data', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ error: new Error('HTTP 500') }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ error: new Error('HTTP 500') }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ error: new Error('HTTP 500') }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('发射记录暂不可用。');
    expect(html).toContain('官方信息暂不可用。');
    expect(html).toContain('来源状态暂不可用。');
    expect(html).not.toContain('暂无发射记录。');
    expect(html).not.toContain('暂无官方信息。');
    expect(html).not.toContain('暂无来源状态。');
  });

  it('uses public home source categories when source metadata is still pending', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ isLoading: true }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud({
      recentArticleCount: 2,
      topicCount: 3,
      enabledSourceCategories: [{ label: '专业媒体', count: 12, accessSummaryLabel: '可能受限' }],
    });

    expect(html).toContain('专业媒体');
    expect(html).toContain('12');
    expect(html).toContain('可能受限');
    expect(html).not.toContain('>可用<');
    expect(html).not.toContain('rss');
    expect(html).not.toContain('来源状态加载中。');
  });

  it('uses public access labels from source metadata', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(
      queryState({
        data: {
          items: [],
          publicStats: [{ label: '专业媒体', count: 2, accessSummaryLabel: '可能受限' }],
          accessStats: [{ label: '可能受限', count: 2 }],
        },
      }) as unknown as ReturnType<typeof useSourcesQuery>,
    );

    const html = renderHud();

    expect(html).toContain('专业媒体');
    expect(html).toContain('可能受限');
    expect(html).not.toContain('limited');
    expect(html).not.toContain('direct');
  });

  it('does not reuse global access totals as a per-category fallback', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(
      queryState({
        data: {
          items: [],
          publicStats: [{ label: '专业媒体', count: 2 }],
          accessStats: [
            { label: '直连', count: 1 },
            { label: '可能受限', count: 1 },
          ],
        },
      }) as unknown as ReturnType<typeof useSourcesQuery>,
    );

    const html = renderHud();

    expect(html).toContain('专业媒体');
    expect(html).toContain('待验证');
    expect(html).not.toContain('直连 1 / 可能受限 1');
  });

  it('links official source categories to the official article filter only when the category is precise', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(
      queryState({
        data: {
          items: [],
          publicStats: [
            { label: '官方机构', count: 2, accessSummaryLabel: '直连' },
            { label: '公告信息', count: 1, accessSummaryLabel: '直连' },
            { label: '专业媒体', count: 3, accessSummaryLabel: '可能受限' },
          ],
          accessStats: [],
        },
      }) as unknown as ReturnType<typeof useSourcesQuery>,
    );

    const html = renderHud();

    expect(html).toContain('href="/articles?category=official"');
    expect(html.match(/href="\/articles\?category=official"/g)).toHaveLength(2);
    expect(html).toContain('href="/articles"');
  });

  it('does not link fallback launch records to detail routes', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [fallbackLaunch, linkedLaunch], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ data: { items: [], publicStats: [], accessStats: [] } }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('Fallback launch window');
    expect(html).toContain('Linked launch window');
    expect(html).not.toContain('href="/launches/fallback-window"');
    expect(html).toContain('href="/launches/42"');
  });

  it('encodes launch external ids before linking HUD launch records', () => {
    mockUseLaunchesQuery.mockReturnValue(queryState({ data: { items: [externalIdLaunch], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>);
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ data: { items: [], publicStats: [], accessStats: [] } }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('External id launch');
    expect(html).toContain('href="/launches/ll2%2Fdemo%20id"');
  });

  it('normalizes launch provider labels in HUD launch records', () => {
    mockUseLaunchesQuery.mockReturnValue(
      queryState({ data: { items: [{ ...linkedLaunch, provider: ' Rocket   Lab ' }], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>,
    );
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ data: { items: [], publicStats: [], accessStats: [] } }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('Rocket Lab');
    expect(html).not.toContain(' Rocket   Lab ');
  });

  it('normalizes launch mission labels in HUD launch records', () => {
    mockUseLaunchesQuery.mockReturnValue(
      queryState({ data: { items: [{ ...linkedLaunch, mission: ' Demo   launch ' }], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useLaunchesQuery>,
    );
    mockUseArticlesQuery.mockReturnValue(queryState({ data: { items: [], page: 1, limit: 4, hasMore: false } }) as unknown as ReturnType<typeof useArticlesQuery>);
    mockUseSourcesQuery.mockReturnValue(queryState({ data: { items: [], publicStats: [], accessStats: [] } }) as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderHud();

    expect(html).toContain('Demo launch');
    expect(html).not.toContain(' Demo   launch ');
  });
});
