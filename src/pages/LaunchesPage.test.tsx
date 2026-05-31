import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLaunchesQuery } from '../hooks/queries';
import { LaunchesPage } from './LaunchesPage';

vi.mock('../hooks/queries', () => ({
  useLaunchesQuery: vi.fn(),
}));

const mockUseLaunchesQuery = vi.mocked(useLaunchesQuery);

function renderLaunches(path = '/launches') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <LaunchesPage />
    </MemoryRouter>,
  );
}

describe('LaunchesPage', () => {
  beforeEach(() => {
    mockUseLaunchesQuery.mockReset();
  });

  it('does not mix launch API errors with the empty-state copy', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 500'),
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('发射数据暂不可用，请稍后重试。');
    expect(html).not.toContain('暂无发射记录。');
    expect(html).not.toContain('发射记录加载中');
  });

  it('shows a timeline loading state before launch records are available', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('发射记录加载中');
    expect(html).not.toContain('暂无发射记录。');
    expect(html).not.toContain('发射数据暂不可用');
  });

  it('keeps the empty-state copy for successful empty launch results', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: { items: [], page: 1, limit: 12, hasMore: false },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    expect(renderLaunches()).toContain('暂无发射记录。');
  });

  it('encodes launch external ids before linking launch cards', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 0,
            externalId: 'll2/demo id',
            mission: 'Encoded launch',
            rocket: null,
            provider: null,
            windowStart: null,
            site: null,
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 1,
        limit: 12,
        hasMore: false,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('Encoded launch');
    expect(html).toContain('href="/launches/ll2%2Fdemo%20id"');
  });

  it('does not render persistent filter instruction copy for paginated results', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            externalId: 'launch-1',
            mission: 'Visible launch',
            rocket: null,
            provider: 'Rocket Lab',
            windowStart: null,
            site: null,
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 1,
        limit: 12,
        hasMore: true,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('Visible launch');
    expect(html).not.toContain('可用关键词、发射商或状态继续筛选');
  });

  it('normalizes launch provider labels in timeline cards', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            externalId: 'launch-1',
            mission: 'Visible launch',
            rocket: null,
            provider: ' Rocket   Lab ',
            windowStart: null,
            site: null,
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 1,
        limit: 12,
        hasMore: false,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('Rocket Lab');
    expect(html).not.toContain(' Rocket   Lab ');
  });

  it('normalizes launch mission labels in timeline cards', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            externalId: 'launch-1',
            mission: ' Demo   launch ',
            rocket: null,
            provider: null,
            windowStart: null,
            site: null,
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 1,
        limit: 12,
        hasMore: false,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('Demo launch');
    expect(html).not.toContain(' Demo   launch ');
  });

  it('normalizes launch rocket and site labels in timeline cards', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            externalId: 'launch-1',
            mission: 'Visible launch',
            rocket: ' Falcon   9 ',
            provider: null,
            windowStart: null,
            site: ' Cape   Canaveral ',
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 1,
        limit: 12,
        hasMore: false,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches();

    expect(html).toContain('Falcon 9');
    expect(html).toContain('Cape Canaveral');
    expect(html).not.toContain(' Falcon   9 ');
    expect(html).not.toContain(' Cape   Canaveral ');
  });

  it('passes sanitized pagination parameters to the launch API', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: { items: [], page: 2, limit: 24, hasMore: true },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    renderLaunches('/launches?provider= Rocket Lab &status= 准备发射 &query= demo &page=2&limit=24&debug=1');

    expect(mockUseLaunchesQuery).toHaveBeenCalledWith('/api/launches?status=%E5%87%86%E5%A4%87%E5%8F%91%E5%B0%84&provider=Rocket+Lab&query=demo&page=2&limit=24');
  });

  it('renders launch pagination links with current filters', () => {
    mockUseLaunchesQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            externalId: 'launch-1',
            mission: 'Visible launch',
            rocket: null,
            provider: 'Rocket Lab',
            windowStart: null,
            site: null,
            statusLabel: '准备发射',
            sourceUrl: null,
          },
        ],
        page: 2,
        limit: 12,
        hasMore: true,
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchesQuery>);

    const html = renderLaunches('/launches?provider=Rocket+Lab&status=go&page=2');

    expect(html).toContain('aria-label="发射分页"');
    expect(html).toContain('第 <!-- -->2<!-- --> 页');
    expect(html).toContain('href="/launches?status=go&amp;provider=Rocket+Lab&amp;page=1"');
    expect(html).toContain('href="/launches?status=go&amp;provider=Rocket+Lab&amp;page=3"');
  });
});
