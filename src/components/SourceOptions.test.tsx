import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSourcesQuery } from '../hooks/queries';
import { SourceOptions } from './SourceOptions';

vi.mock('../hooks/queries', () => ({
  useSourcesQuery: vi.fn(),
}));

const mockUseSourcesQuery = vi.mocked(useSourcesQuery);

function renderSourceOptions(props?: Parameters<typeof SourceOptions>[0]) {
  return renderToString(
    <select>
      <SourceOptions {...props} />
    </select>,
  );
}

describe('SourceOptions', () => {
  beforeEach(() => {
    mockUseSourcesQuery.mockReset();
  });

  it('shows a loading option when source metadata is still pending', () => {
    mockUseSourcesQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderSourceOptions();

    expect(html).toContain('来源加载中');
    expect(html).toContain('disabled');
    expect(html).not.toContain('来源暂不可用');
  });

  it('shows an unavailable option when source metadata fails without data', () => {
    mockUseSourcesQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 500'),
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderSourceOptions();

    expect(html).toContain('来源暂不可用');
    expect(html).toContain('disabled');
    expect(html).not.toContain('来源加载中');
  });

  it('shows an empty option when loaded sources do not match the requested type', () => {
    mockUseSourcesQuery.mockReturnValue({
      data: {
        items: [
          {
            name: 'Spaceflight News',
            categoryLabel: '数据来源',
            domesticAccessLabel: '可能受限',
            globalAccessLabel: '直连',
            accessNote: null,
            publicBadge: null,
          },
        ],
        publicStats: [],
        accessStats: [],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderSourceOptions({ categoryLabel: '官方机构' });

    expect(html).toContain('暂无可选来源');
    expect(html).toContain('disabled');
    expect(html).not.toContain('Spaceflight News');
  });

  it('keeps public source names and badges for loaded options', () => {
    mockUseSourcesQuery.mockReturnValue({
      data: {
        items: [
          {
            name: '国家航天局',
            categoryLabel: '官方机构',
            domesticAccessLabel: '直连',
            globalAccessLabel: '直连',
            accessNote: null,
            publicBadge: '官方机构',
          },
        ],
        publicStats: [],
        accessStats: [],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderSourceOptions({ categoryLabels: ['官方机构', '专业媒体'] });

    expect(html).toContain('value="国家航天局"');
    expect(html).toContain('国家航天局（官方机构）');
    expect(html).not.toContain('cnsa-news');
    expect(html).not.toContain('official_page');
    expect(html).not.toContain('来源加载中');
  });

  it('matches legacy source category label whitespace variants', () => {
    mockUseSourcesQuery.mockReturnValue({
      data: {
        items: [
          {
            name: ' 国家   航天局 ',
            categoryLabel: ' 官方   机构 ',
            domesticAccessLabel: '直连',
            globalAccessLabel: '直连',
            accessNote: null,
            publicBadge: ' 官方   机构 ',
          },
        ],
        publicStats: [],
        accessStats: [],
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSourcesQuery>);

    const html = renderSourceOptions({ categoryLabels: ['官方机构'] });

    expect(html).toContain('value="国家 航天局"');
    expect(html).toContain('国家 航天局（官方 机构）');
    expect(html).not.toContain(' 国家   航天局 ');
    expect(html).not.toContain(' 官方   机构 ');
    expect(html).not.toContain('暂无可选来源');
  });
});
