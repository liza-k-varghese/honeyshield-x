import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CHRONOS UI Error caught by boundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#0D1117] text-[#F0E9DD]">
          <div className="max-w-md w-full bg-[#1C2730] p-6 rounded-lg border border-[rgba(200,170,115,0.3)] blueprint-frame space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[rgba(200,170,115,0.12)] border border-[rgba(200,170,115,0.3)] flex items-center justify-center mx-auto text-[#C8AA73]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#C8AA73] uppercase block">
                Temporal Render Exception
              </span>
              <h3 className="font-cinzel text-lg font-bold text-[#F0E9DD] mt-1">
                {this.props.fallbackTitle || 'Spatial Stage Interrupted'}
              </h3>
            </div>
            <p className="text-xs text-[#AEB8BC] leading-relaxed font-sans">
              An unexpected graphics or interface interruption occurred. The underlying horological state has been preserved.
            </p>
            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="btn-gold !py-2 !px-4 text-xs inline-flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restore Exhibition View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
