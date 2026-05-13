import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mission Control render failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="inline-status inline-status--danger">
          Mission Control 视图暂不可用：{this.state.error}
        </div>
      );
    }

    return this.props.children;
  }
}
