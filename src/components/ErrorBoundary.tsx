import { Component, type ErrorInfo, type ReactNode } from 'react';

export function ErrorBoundaryFallback() {
  return (
    <div className="inline-status inline-status--danger" role="alert">
      页面暂不可用，请稍后重试。
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };

  static getDerivedStateFromError() {
    return { error: 'render-failed' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorBoundaryFallback />;
    }

    return this.props.children;
  }
}
