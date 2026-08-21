import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fc-card p-8 rounded-3xl border border-rose-500/50 bg-gradient-to-b from-rose-950/80 to-[#080d1a] text-center space-y-4 max-w-lg mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">خطا در بارگذاری بخش</h3>
            <p className="text-xs text-slate-400 mt-1">
              مشکلی در نمایش این بخش رخ داد. با فشردن دکمه زیر می‌توانید مجدداً تلاش کنید.
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 mx-auto transition-all shadow-[0_0_15px_rgba(0,243,255,0.4)] cursor-pointer active:scale-95 font-sport"
          >
            <RefreshCw size={14} />
            <span>تلاش مجدد و بازیابی صفحه</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
