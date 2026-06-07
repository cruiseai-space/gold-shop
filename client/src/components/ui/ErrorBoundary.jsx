import React from 'react';

/**
 * Class-based Error Boundary to catch React component tree crashes.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-bg">
          <div className="max-w-md w-full p-8 bg-surface border border-danger/20 rounded-lg shadow-xl text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-display font-bold text-danger mb-4">Something went wrong</h1>
            <p className="text-ink-muted text-sm mb-6 italic">
              The interface encountered an unexpected error. This has been logged.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary px-8"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
