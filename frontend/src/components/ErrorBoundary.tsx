import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl p-6 shadow max-w-md">
            <h1 className="text-red-600 text-lg font-bold mb-2">页面出错了</h1>
            <p className="text-red-500 text-sm mb-4">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500 text-white px-4 py-2 rounded-full text-sm">
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
