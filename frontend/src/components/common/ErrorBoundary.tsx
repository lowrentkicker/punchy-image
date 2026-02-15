import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-base px-6">
          <div className="max-w-md rounded-2xl border border-[--border-subtle] bg-surface-1 p-8 text-center">
            <h2 className="text-lg font-semibold text-[--text-primary]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[--text-secondary]">
              An unexpected error occurred. Try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[--color-accent] px-6 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
