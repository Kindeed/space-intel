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
    expect(html).toContain('即将发射');
    expect(html).toContain('资本市场内容仅作信息聚合，不构成投资建议');
    expect(html).toContain('国内商业航天');
    expect(html).toContain('国际商业航天');
  });
});
