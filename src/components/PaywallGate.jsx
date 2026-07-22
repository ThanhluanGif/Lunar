import React from 'react';
import { Lock, Sparkles, LogIn, ArrowRight } from 'lucide-react';

export default function PaywallGate({ isLoggedIn, onOpenAuth, children, title = 'Nội Dung Yêu Cầu Đăng Nhập' }) {
  if (isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
      {/* Blurred Content Preview */}
      <div style={{
        filter: 'blur(8px)',
        opacity: 0.35,
        pointerEvents: 'none',
        userSelect: 'none'
      }}>
        {children}
      </div>

      {/* Lock Banner Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle, rgba(10, 13, 20, 0.85) 0%, rgba(10, 13, 20, 0.95) 100%)',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #f43f5e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(244, 63, 94, 0.5)',
          marginBottom: '16px'
        }}>
          <Lock size={28} color="#ffffff" />
        </div>

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
          {title}
        </h3>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '460px', marginBottom: '20px', lineHeight: '1.5' }}>
          Khách vãng lai chỉ xem được điểm số CVSS tổng quan. Để xem <strong>chi tiết từng dòng code</strong>, <strong>gợi ý sửa lỗi AI</strong> và dùng tính năng <strong>1-Click Auto-Fix Patch</strong>, vui lòng Đăng ký / Đăng nhập tài khoản miễn phí.
        </p>

        <button
          onClick={onOpenAuth}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '0.95rem' }}
        >
          <LogIn size={18} />
          Đăng Nhập Hoặc Đăng Ký Miễn Phí <ArrowRight size={16} />
        </button>
      </div>

    </div>
  );
}
