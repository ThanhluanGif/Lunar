import React from 'react';
import { X, Zap, RefreshCw, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function QuotaDepletedModal({ isOpen, onClose, onRenewFreeQuota, onOpenPricing, currentUser }) {
  if (!isOpen) return null;

  const userNickname = currentUser?.nickname || '@dev';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 130,
      background: 'rgba(5, 8, 14, 0.9)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 0 60px rgba(248, 113, 113, 0.35)',
        border: '1px solid rgba(248, 113, 113, 0.4)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Icon & Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #fbbf24 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 0 30px rgba(244, 63, 94, 0.5)'
          }}>
            <Zap size={32} color="#fff" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: '800', color: '#fff' }}>
            Hết Lượt AI Scan Hôm Nay!
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Tài khoản <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{userNickname}</span> đã dùng hết 5/5 lượt Scan Free trong ngày.
          </p>
        </div>

        {/* Options Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          
          {/* Option 1: Free Renewal via Community Contribution */}
          <div style={{
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.94rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> Gia Hạn Miễn Phí (+3 Lượt)
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Gửi bài review hoặc chia sẻ kết quả audit để nhận ngay 3 lượt scan & +50 Karma.
              </p>
            </div>
            <button
              onClick={() => {
                onRenewFreeQuota();
                onClose();
              }}
              className="btn btn-emerald btn-sm"
              style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}
            >
              Gia Hạn Ngay
            </button>
          </div>

          {/* Option 2: Upgrade to Pro (Unlimited) */}
          <div style={{
            background: 'rgba(124, 58, 237, 0.12)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.94rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Nâng Cấp Pro Member ($29/tháng)
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Không giới hạn lượt scan, hỗ trợ file 10.000 dòng code & tự động tạo GitHub PR.
              </p>
            </div>
            <button
              onClick={() => {
                onOpenPricing();
                onClose();
              }}
              className="btn btn-primary btn-sm"
              style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}
            >
              Xem Gói Pro
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Quota 5 lượt Free sẽ tự động làm mới vào 00:00 UTC mỗi ngày.
        </div>

      </div>
    </div>
  );
}
