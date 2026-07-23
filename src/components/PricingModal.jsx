import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Sparkles, Zap, Bot, CreditCard, QrCode, ArrowRight, Loader2, Award } from 'lucide-react';

export default function PricingModal({ isOpen, onClose, currentTier = 'FREE', onUpgradeSuccess }) {
  const [selectedPlan, setSelectedPlan] = useState('PRO'); // 'PRO' | 'ENTERPRISE'
  const [paymentStep, setPaymentStep] = useState('select'); // 'select' | 'qr_payment' | 'success'
  const [paymentMethod, setPaymentMethod] = useState('vietqr'); // 'vietqr' | 'momo' | 'card'
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 minutes timer

  useEffect(() => {
    let timer;
    if (paymentStep === 'qr_payment' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [paymentStep, countdown]);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'FREE',
      name: 'Gói Miễn Phí (Free)',
      price: '0đ',
      period: 'mãi mãi',
      badge: 'Cơ Bản',
      color: 'var(--text-secondary)',
      features: [
        '3 Lượt Quét Mã Nguồn / Ngày',
        'Xem Điểm CVSS v3.1 Tổng Quan',
        'Xem Đếm Số Lượng Lỗi (Critical/High)',
        'Tham Gia Thảo Luận Cộng Đồng Cyber'
      ],
      cta: 'Đang Sử Dụng'
    },
    {
      id: 'PRO',
      name: 'Gói Chuyên Nghiệp (Pro)',
      price: '290.000đ',
      period: '/ tháng',
      badge: 'Khuyên Dùng',
      popular: true,
      color: 'var(--accent-purple)',
      features: [
        'Không Giới Hạn Lượt Quét Mã Nguồn',
        'Mở Khóa Chi Tiết Dòng Code & Line AI Warning',
        'Bộ Công Cụ Vá Code Tự Động (AI Code Repair Workbench)',
        'Side-by-Side Diff & Tinh Chỉnh Prompt AI Fix',
        'Xuất Báo Cáo Audit PDF & Badge README'
      ],
      cta: 'Nâng Cấp Gói Pro'
    },
    {
      id: 'ENTERPRISE',
      name: 'Gói Enterprise Git Bot',
      price: '690.000đ',
      period: '/ tháng',
      badge: 'Doanh Nghiệp / Bot',
      color: 'var(--accent-cyan)',
      features: [
        'Tất cả tính năng của gói Pro',
        'GitHub Security Bot Tự Động Tạo Pull Request',
        'Tích Hợp Webhook & CI/CD Action Workflow',
        'Tự Động Vá Lỗi Mã Nguồn Mỗi Khi Push Code',
        'Hỗ Trợ Ưu Tiên 24/7 Qua Channel Riêng'
      ],
      cta: 'Mua Gói Enterprise Bot'
    }
  ];

  const handleSelectPlan = (planId) => {
    if (planId === 'FREE') return;
    setSelectedPlan(planId);
    setPaymentStep('qr_payment');
  };

  const handleConfirmPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setPaymentStep('success');
      onUpgradeSuccess(selectedPlan);
    }, 1500);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 130,
      background: 'rgba(5, 8, 14, 0.92)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: paymentStep === 'select' ? '1000px' : '520px',
        width: '100%',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 0 60px rgba(168, 85, 247, 0.35)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        maxHeight: '90vh',
        overflowY: 'auto'
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

        {/* STEP 1: SELECT PLAN */}
        {paymentStep === 'select' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div className="badge badge-purple" style={{ marginBottom: '10px' }}>
                <Sparkles size={14} /> Nâng Cấp Quyền Hạn Lunar AI
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: '800' }}>
                Chọn Gói Cước Phù Hợp Với Bạn
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Mở khóa tính năng Tự Động Vá Lỗi Mã Nguồn & GitHub Security Bot
              </p>
            </div>

            {/* Plan Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              {plans.map((plan) => {
                const isCurrent = currentTier === plan.id;

                return (
                  <div
                    key={plan.id}
                    className="glass-card"
                    style={{
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      border: plan.popular ? '2px solid var(--accent-purple)' : '1px solid var(--border-color)',
                      background: plan.popular ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-card)',
                      boxShadow: plan.popular ? '0 0 30px rgba(168, 85, 247, 0.25)' : 'none'
                    }}
                  >
                    {plan.popular && (
                      <div style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--gradient-brand)',
                        color: '#ffffff',
                        padding: '4px 14px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        🔥 Phổ Biến Nhất
                      </div>
                    )}

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: plan.color }}>
                          {plan.name}
                        </h3>
                        <span className="badge badge-purple">{plan.badge}</span>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2.2rem', fontWeight: '800', color: '#ffffff' }}>
                          {plan.price}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}> {plan.period}</span>
                      </div>

                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {plan.features.map((feat, idx) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            <Check size={16} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ width: '100%', padding: '12px' }}
                    >
                      {isCurrent ? 'Đang Sử Dụng Gói Này' : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: QR PAYMENT SCREEN */}
        {paymentStep === 'qr_payment' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <QrCode size={24} color="var(--accent-purple)" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: '800' }}>
                  Thanh Toán Nâng Cấp Gói {selectedPlan}
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Quét mã QR bằng ứng dụng Ngân hàng / MoMo để tự động kích hoạt tài khoản tức thì.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button
                onClick={() => setPaymentMethod('vietqr')}
                className={`btn btn-sm ${paymentMethod === 'vietqr' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Mã VietQR Ngân Hàng
              </button>
              <button
                onClick={() => setPaymentMethod('momo')}
                className={`btn btn-sm ${paymentMethod === 'momo' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Ví MoMo
              </button>
            </div>

            {/* QR Code Container */}
            <div className="glass-card" style={{
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
              border: '1px solid var(--border-highlight)',
              background: 'rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-block',
                marginBottom: '14px',
                boxShadow: '0 0 25px rgba(255, 255, 255, 0.15)'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=LUNAR_${selectedPlan}_PAYMENT_290000`}
                  alt="Payment QR Code"
                  style={{ width: '170px', height: '170px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                Số tiền thanh toán: {selectedPlan === 'PRO' ? '290.000 VNĐ' : '690.000 VNĐ'}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Nội dung chuyển khoản: <strong style={{ color: '#fbbf24' }}>LUNAR {selectedPlan} USER_DEV</strong>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: '600' }}>
                ⏱️ Mã QR có hiệu lực trong: {formatTime(countdown)}
              </div>
            </div>

            {/* Verification Actions */}
            {isVerifying ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)' }}>
                <Loader2 size={24} color="var(--accent-purple)" style={{ animation: 'spin 1s linear infinite', marginBottom: '6px' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--accent-purple)' }}>
                  Đang kiểm tra giao dịch chuyển khoản trên Ngân Hàng...
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={handleConfirmPayment} className="btn btn-emerald" style={{ width: '100%', padding: '12px' }}>
                  <Check size={18} />
                  Tôi Đã Chuyển Khoản (Xác Nhận Kích Hoạt)
                </button>
                <button onClick={() => setPaymentStep('select')} className="btn btn-secondary" style={{ width: '100%' }}>
                  Quay Lại Chọn Gói Cước khác
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SUCCESS SCREEN */}
        {paymentStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
            }}>
              <Award size={36} color="#34d399" />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: '800', color: '#34d399', marginBottom: '8px' }}>
              Nâng Cấp Thành Công Gói {selectedPlan}!
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              Tài khoản của bạn đã được chuyển sang hạng <strong>Lunar {selectedPlan}</strong>. Bạn có thể sử dụng trọn bộ tính năng AI Code Repair Workbench và GitHub Security Bot.
            </p>

            <button onClick={onClose} className="btn btn-primary" style={{ padding: '12px 28px' }}>
              Bắt Đầu Sử Dụng Tính Năng Pro <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
