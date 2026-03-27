import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Inline variant renders a card instead of a full-page overlay */
  inline?: boolean;
  /** Optional label for context, e.g. "Tasks" */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        const label = this.props.label ?? 'This section';
        return (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <p className="font-sans text-sm font-medium text-primary">
              {label} couldn&apos;t load
            </p>
            <p className="mt-1 font-sans text-xs text-secondary max-w-xs">
              An unexpected error occurred. You can try again or reload the page.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-3 py-1.5 font-sans text-xs font-medium text-primary transition-colors hover:bg-surface-hover"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        );
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-surface p-6">
          <div className="max-w-md w-full rounded-2xl border border-border-light bg-surface-secondary p-8 text-center shadow-modal">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle size={24} className="text-danger" />
            </div>
            <h1 className="font-sans text-lg font-semibold text-primary">
              Something went wrong
            </h1>
            <p className="mt-2 font-sans text-sm text-secondary">
              An unexpected error occurred. Try reloading the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
