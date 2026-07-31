import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
  Zap
} from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { lunarApi } from '../services/lunarApi';
import { getPurchasableUpgradePlans } from '../services/quotaUpgrade';

function formatPlanPrice(plan) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: plan.currency || 'VND',
    maximumFractionDigits: 0
  }).format(Number(plan.amount || 0));
}

export default function QuotaDepletedModal({
  isOpen,
  onClose,
  onOpenPricing,
  currentUser,
  quota
}) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const dialogRef = useModalFocusTrap({ isOpen, onClose });

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return undefined;

    setLoadingPlans(true);
    setLoadError('');
    lunarApi.getPaymentPlans()
      .then(({ plans: serverPlans }) => {
        if (cancelled) return;
        setPlans(getPurchasableUpgradePlans(serverPlans, currentUser?.tier || quota?.tier));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Không thể tải bảng giá nâng cấp.');
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.tier, isOpen, quota?.tier, reloadKey]);

  if (!isOpen) return null;

  const userNickname = currentUser?.nickname || currentUser?.name || 'Lunar developer';
  const quotaLimit = quota?.limit ?? currentUser?.dailyScansUsed ?? 0;
  const quotaLabel = quota?.quotaType === 'VERIFIED_SCAN' ? 'lượt quét bảo mật' : 'lượt AI review';

  const choosePlan = (planId) => {
    onOpenPricing(planId);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 140,
      background: 'radial-gradient(circle at 50% 15%, rgba(245, 158, 11, 0.18), transparent 38%), rgba(3, 6, 15, 0.94)',
      backdropFilter: 'blur(18px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div
        ref={dialogRef}
        className="glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quota-depleted-dialog-title"
        aria-describedby="quota-depleted-dialog-description"
        data-testid="quota-upgrade-dialog"
        tabIndex={-1}
        style={{
          maxWidth: '960px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 'clamp(24px, 4vw, 42px)',
          position: 'relative',
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.65), 0 0 70px rgba(245, 158, 11, 0.16)',
          border: '1px solid rgba(245, 158, 11, 0.36)',
          background: 'linear-gradient(145deg, rgba(19, 22, 38, 0.98), rgba(8, 11, 23, 0.98))'
        }}
      >
        <button
          onClick={onClose}
          aria-label="Đóng bảng nâng cấp khi hết lượt"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <X size={19} />
        </button>

        <div style={{ maxWidth: '720px', margin: '0 auto 30px', textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 52%, #facc15 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            boxShadow: '0 18px 45px rgba(245, 158, 11, 0.32)',
            transform: 'rotate(-4deg)'
          }}>
            <Zap size={35} color="#fff" fill="rgba(255,255,255,.22)" />
          </div>

          <div style={{
            color: '#fbbf24',
            fontSize: '0.74rem',
            fontWeight: '900',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '9px'
          }}>
            Free quota completed
          </div>
          <h2
            id="quota-depleted-dialog-title"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.7rem, 4vw, 2.55rem)',
              lineHeight: 1.08,
              fontWeight: '900',
              color: '#fff',
              marginBottom: '12px'
            }}
          >
            Đừng để lượt quét cuối cùng ngắt mạch công việc.
          </h2>
          <p
            id="quota-depleted-dialog-description"
            style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}
          >
            Tài khoản <strong style={{ color: '#67e8f9' }}>{userNickname}</strong> đã dùng hết{' '}
            <strong style={{ color: '#fbbf24' }}>{quotaLimit || 'toàn bộ'} {quotaLabel}</strong> hôm nay.
            Chọn gói phù hợp để tiếp tục ngay và mở khóa bộ công cụ bảo mật đầy đủ.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#94a3b8',
          fontSize: '0.78rem',
          marginBottom: '24px'
        }}>
          <Clock3 size={15} color="#fbbf24" />
          Gói FREE tự làm mới quota theo ngày; nâng cấp sẽ mở quyền sử dụng cao hơn ngay sau khi thanh toán được xác nhận.
        </div>

        {loadingPlans && (
          <div
            data-testid="quota-upgrade-loading"
            style={{ padding: '46px 20px', textAlign: 'center', color: '#cbd5e1' }}
          >
            <Loader2 size={30} color="#fbbf24" style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
            <div>Đang tải bảng giá đã xác minh từ Lunar API...</div>
          </div>
        )}

        {!loadingPlans && loadError && (
          <div style={{
            padding: '22px',
            borderRadius: '14px',
            textAlign: 'center',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.28)',
            color: '#fda4af'
          }}>
            <div style={{ marginBottom: '12px' }}>{loadError}</div>
            <button onClick={() => setReloadKey((value) => value + 1)} className="btn btn-secondary btn-sm">
              Tải lại bảng giá
            </button>
          </div>
        )}

        {!loadingPlans && !loadError && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '18px'
          }}>
            {plans.map((plan) => {
              const isPro = plan.id === 'PRO';
              return (
                <article
                  key={plan.id}
                  data-testid={`quota-plan-${plan.id.toLowerCase()}`}
                  style={{
                    position: 'relative',
                    minHeight: '390px',
                    padding: '26px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: isPro
                      ? 'linear-gradient(155deg, rgba(124, 58, 237, 0.24), rgba(15, 23, 42, 0.86))'
                      : 'linear-gradient(155deg, rgba(8, 145, 178, 0.2), rgba(15, 23, 42, 0.86))',
                    border: isPro ? '1px solid rgba(167, 139, 250, 0.55)' : '1px solid rgba(34, 211, 238, 0.42)',
                    boxShadow: isPro ? '0 18px 50px rgba(109, 40, 217, 0.2)' : '0 18px 50px rgba(8, 145, 178, 0.14)'
                  }}
                >
                  {plan.popular && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      background: '#f59e0b',
                      color: '#111827',
                      fontSize: '0.68rem',
                      fontWeight: '900',
                      textTransform: 'uppercase'
                    }}>
                      Khuyên dùng
                    </div>
                  )}

                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '13px',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: '20px',
                    background: isPro ? 'rgba(139, 92, 246, 0.25)' : 'rgba(6, 182, 212, 0.2)',
                    color: isPro ? '#c4b5fd' : '#67e8f9'
                  }}>
                    {isPro ? <Sparkles size={23} /> : <Crown size={23} />}
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: '850', color: '#fff', marginBottom: '6px' }}>
                    {plan.name}
                  </h3>
                  <div style={{ marginBottom: '22px' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: '900', color: '#fff' }}>
                      {formatPlanPrice(plan)}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}> / tháng</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: '11px' }}>
                    {(plan.features || []).map((feature) => (
                      <li key={feature} style={{ display: 'flex', gap: '9px', color: '#dbeafe', fontSize: '0.82rem', lineHeight: 1.45 }}>
                        <Check size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => choosePlan(plan.id)}
                    className={isPro ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ width: '100%', padding: '12px 14px', marginTop: 'auto' }}
                  >
                    <ShieldCheck size={17} /> Chọn {plan.id} <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
