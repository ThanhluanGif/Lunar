import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled Lunar UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#07080f'
      }}>
        <section className="glass-panel" role="alert" style={{ maxWidth: '620px', padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={46} color="#fb7185" />
          <p style={{ color: '#fb7185', fontWeight: 800, marginTop: '16px' }}>500 · APPLICATION ERROR</p>
          <h1 style={{ margin: '8px 0 12px' }}>Lunar không thể hiển thị màn hình này</h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Dữ liệu của bạn chưa bị gửi lại. Hãy tải lại ứng dụng; nếu lỗi tiếp diễn, cung cấp thời điểm xảy ra lỗi cho quản trị viên.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Tải lại ứng dụng
          </button>
        </section>
      </main>
    );
  }
}
