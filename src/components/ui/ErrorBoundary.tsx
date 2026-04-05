import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-serif text-brand-900 mb-2">დაფიქსირდა შეცდომა</h3>
            <p className="text-sm text-brand-400 mb-4">გთხოვთ, გვერდი განაახლეთ ან სცადეთ მოგვიანებით.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-brand-900 text-white rounded-xl text-sm font-bold tracking-widest uppercase hover:bg-brand-800 transition-colors"
            >
              განახლება
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
