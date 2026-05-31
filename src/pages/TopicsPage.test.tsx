import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTopicsQuery } from '../hooks/queries';
import { TopicsPage } from './TopicsPage';

vi.mock('../hooks/queries', () => ({
  useTopicsQuery: vi.fn(),
}));

const mockUseTopicsQuery = vi.mocked(useTopicsQuery);

function renderTopics() {
  return renderToString(
    <MemoryRouter initialEntries={['/topics']}>
      <TopicsPage />
    </MemoryRouter>,
  );
}

describe('TopicsPage', () => {
  beforeEach(() => {
    mockUseTopicsQuery.mockReset();
  });

  it('shows a visible loading state before topic records are available', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useTopicsQuery>);

    const html = renderTopics();

    expect(html).toContain('专题记录加载中');
    expect(html).not.toContain('暂无专题记录。');
    expect(html).not.toContain('专题列表暂不可用');
  });

  it('does not mix topic API errors with the empty-state copy', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 500'),
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);

    const html = renderTopics();

    expect(html).toContain('专题列表暂不可用，请稍后重试。');
    expect(html).not.toContain('暂无专题记录。');
    expect(html).not.toContain('专题记录加载中');
  });

  it('keeps the empty-state copy for successful empty topic results', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: { items: [] },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);

    expect(renderTopics()).toContain('暂无专题记录。');
  });

  it('encodes topic slugs before linking topic cards', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'reusable rockets',
            name: 'Reusable rockets',
            categoryLabel: '技术路线',
            articleCount: 4,
            curationCount: 1,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);

    const html = renderTopics();

    expect(html).toContain('Reusable rockets');
    expect(html).toContain('技术路线');
    expect(html).not.toContain('Technology');
    expect(html).toContain('href="/topics/reusable%20rockets"');
  });

  it('normalizes legacy topic card labels before rendering', () => {
    mockUseTopicsQuery.mockReturnValue({
      data: {
        items: [
          {
            slug: 'reusable-rockets',
            name: ' 可回收   火箭 ',
            categoryLabel: ' 技术   路线 ',
            articleCount: 4,
            curationCount: 1,
          },
        ],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useTopicsQuery>);

    const html = renderTopics();

    expect(html).toContain('可回收 火箭');
    expect(html).toContain('技术 路线');
    expect(html).not.toContain(' 可回收   火箭 ');
    expect(html).not.toContain(' 技术   路线 ');
  });
});
