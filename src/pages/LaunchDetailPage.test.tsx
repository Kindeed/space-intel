import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLaunchDetailQuery } from '../hooks/queries';
import type { ApiLaunch } from '../types';
import { LaunchDetailPage } from './LaunchDetailPage';

vi.mock('../hooks/queries', () => ({
  useLaunchDetailQuery: vi.fn(),
}));

const mockUseLaunchDetailQuery = vi.mocked(useLaunchDetailQuery);

function renderLaunchDetail(path = '/launches/missing') {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/launches/:slug" element={<LaunchDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const launchDetail: ApiLaunch = {
  id: 7,
  externalId: 'll2-demo',
  mission: 'Demo launch',
  rocket: 'Long March 8',
  provider: 'CASC',
  windowStart: '2026-06-01T02:30:00Z',
  site: 'Wenchang',
  statusLabel: '准备发射',
  sourceUrl: 'https://example.com/launch',
};

describe('LaunchDetailPage', () => {
  beforeEach(() => {
    mockUseLaunchDetailQuery.mockReset();
  });

  it('shows not-found copy without placeholder launch fields', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: undefined,
      error: new Error('HTTP 404'),
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail();

    expect(html).toContain('该发射记录已更新或暂时不可访问。');
    expect(html).toContain('返回发射列表');
    expect(html).not.toContain('发射窗口：记录暂时不可访问');
    expect(html).not.toContain('火箭型号：未披露');
    expect(html).not.toContain('任务状态：');
    expect(html).not.toContain('发射商：');
    expect(html).not.toContain('发射场：');
    expect(html).not.toContain('查看发射来源');
  });

  it('shows a visible loading state before launch details are available', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('发射记录加载中');
    expect(html).not.toContain('该发射记录已更新或暂时不可访问。');
    expect(html).not.toContain('发射窗口：');
    expect(html).toContain('返回发射列表');
  });

  it('renders launch fields only for loaded launch details', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: launchDetail,
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('Demo launch');
    expect(html).toContain('发射窗口：');
    expect(html).toContain('任务状态：');
    expect(html).toContain('准备发射');
    expect(html).not.toContain('任务状态：Go');
    expect(html).toContain('发射商：');
    expect(html).toContain('CASC');
    expect(html).toContain('href="/launches?provider=CASC"');
    expect(html).toContain('火箭型号：');
    expect(html).toContain('Long March 8');
    expect(html).toContain('发射场：');
    expect(html).toContain('Wenchang');
    expect(html).toContain('查看发射来源');
    expect(html).toContain('返回发射列表');
  });

  it('renders pending metadata fallbacks for incomplete launch details', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, provider: null, rocket: null, site: null, statusLabel: '状态待定' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('任务状态：');
    expect(html).toContain('状态待定');
    expect(html).toContain('发射商：');
    expect(html).not.toContain('/launches?provider=');
    expect(html).toContain('火箭型号：');
    expect(html).toContain('未披露');
    expect(html).toContain('发射场：');
    expect(html).toContain('待定');
  });

  it('normalizes legacy mission labels before rendering detail titles', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, mission: ' Demo   launch ' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('Demo launch');
    expect(html).not.toContain(' Demo   launch ');
  });

  it('normalizes legacy provider labels before rendering detail filter links', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, provider: ' Rocket   Lab ' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('Rocket Lab');
    expect(html).not.toContain(' Rocket   Lab ');
    expect(html).toContain('href="/launches?provider=Rocket+Lab"');
  });

  it('normalizes legacy rocket and site labels before rendering detail metadata', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, rocket: ' Falcon   9 ', site: ' Cape   Canaveral ' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const html = renderLaunchDetail('/launches/ll2-demo');

    expect(html).toContain('Falcon 9');
    expect(html).toContain('Cape Canaveral');
    expect(html).not.toContain(' Falcon   9 ');
    expect(html).not.toContain(' Cape   Canaveral ');
  });

  it('does not render unsafe launch source links', () => {
    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, sourceUrl: 'data:text/html,hi' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const dataUrlHtml = renderLaunchDetail('/launches/ll2-demo');

    mockUseLaunchDetailQuery.mockReturnValue({
      data: { ...launchDetail, sourceUrl: 'https://user:pass@example.com/launch' },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLaunchDetailQuery>);

    const credentialedHtml = renderLaunchDetail('/launches/ll2-demo');
    const html = `${dataUrlHtml}${credentialedHtml}`;

    expect(html).not.toContain('data:text/html');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('查看发射来源');
  });
});
