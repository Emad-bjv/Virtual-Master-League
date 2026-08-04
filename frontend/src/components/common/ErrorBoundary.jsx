import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#330000', color: '#ffaaaa', border: '2px solid red', borderRadius: '10px' }}>
          <h2>شرمنده، خطایی در این بخش رخ داد!</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>نمایش جزئیات خطا (لطفا به توسعه‌دهنده ارسال کنید)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
