import React from 'react';
import { ArrowLeft, Moon, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at 50% 35%, rgba(108,142,239,.18), transparent 42%), #07080f'
    }}>
      <section className="glass-panel" style={{ maxWidth: '620px', padding: '42px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
          <Moon size={34} color="#8b9dff" />
          <SearchX size={48} color="#f87171" />
        </div>
        <p style={{ color: '#a78bfa', fontWeight: 800, marginTop: '18px' }}>404 · LOST IN ORBIT</p>
        <h1 style={{ fontSize: '2rem', margin: '8px 0 12px' }}>Không tìm thấy trang này</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Đường dẫn không tồn tại hoặc đã được di chuyển. Trở về Lunar để tiếp tục kiểm tra mã nguồn.
        </p>
        <a href="/" className="btn btn-primary" style={{ marginTop: '22px', display: 'inline-flex', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Về trang chính
        </a>
      </section>
    </main>
  );
}
