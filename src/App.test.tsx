import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './App';

describe('App', () => {
  it('renders the required dashboard sections', () => {
    const html = renderToString(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(html).toContain('今日重点');
    expect(html).toContain('发射时间线');
    expect(html).toContain('资本市场内容仅作信息聚合，不构成投资建议');
    expect(html).toContain('实时聚合');
    expect(html).not.toContain('来源透明');
    expect(html).not.toContain('Mission Feed');
    expect(html).not.toContain('不存全文');
    expect(html).not.toContain('Content Policy');
  });

  it('does not render fixed design notes as article key points', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/articles/1']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(html).not.toContain('核心要点');
    expect(html).not.toContain('只展示摘要和元数据，避免全文转载。');
    expect(html).not.toContain('实体、标签和发射关系用于快速判断线索价值。');
  });

  it('uses user-facing empty state copy in the launch HUD', () => {
    const html = renderToString(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(html).toContain('暂无发射记录。');
    expect(html).not.toContain('暂无发射缓存。');
  });
});
