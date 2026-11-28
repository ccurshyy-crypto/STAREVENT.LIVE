import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let displayMsg = error.message || 'Unexpected synchronization error.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; path?: string };
      if (parsed?.error) {
        displayMsg = parsed.path
          ? `${parsed.error} (${parsed.path})`
          : parsed.error;
      }
    } catch {
      // Standard error string
    }
    return { hasError: true, message: displayMsg };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-orange-500/40 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 text-[#FF8C00] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-bold">Scoreboard Sync Interrupted</h2>
            <p className="text-xs text-slate-300 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF8C00] hover:bg-[#EA580C] text-white text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Resume Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
