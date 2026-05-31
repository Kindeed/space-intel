import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ErrorBoundaryFallback } from './ErrorBoundary';

describe('ErrorBoundaryFallback', () => {
  it('announces the application-level render failure state', () => {
    const html = renderToString(<ErrorBoundaryFallback />);

    expect(html).toContain('role="alert"');
    expect(html).toContain('页面暂不可用，请稍后重试。');
  });
});
