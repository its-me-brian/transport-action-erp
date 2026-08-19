import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-surface rounded-xl border border-outline-variant m-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Algo salió mal
          </h2>
          <p className="text-sm text-on-surface-variant text-center max-w-md mb-4">
            Ha ocurrido un error inesperado. Por favor, intentá de nuevo o recargá la página.
          </p>
          {this.state.error && (
            <details className="w-full max-w-md mb-4">
              <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface">
                Ver detalles del error
              </summary>
              <pre className="mt-2 p-3 bg-surface-container rounded-lg text-xs text-on-surface overflow-auto max-h-40">
                {this.state.error.message}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Intentar de nuevo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg text-sm font-medium hover:bg-surface-dim transition-colors cursor-pointer"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
