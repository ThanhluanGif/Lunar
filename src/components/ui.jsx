import React, { useEffect, useId, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  X,
  XCircle
} from 'lucide-react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="ui-spin" size={16} aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function IconButton({ label, icon: Icon, variant = 'ghost', className, ...props }) {
  return (
    <button
      type="button"
      className={cx('ui-icon-button', `ui-icon-button--${variant}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

const STATUS_ICONS = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
  success: CheckCircle2,
  resolved: CheckCircle2,
  passing: CheckCircle2,
  completed: CheckCircle2,
  running: Loader2,
  queued: Loader2,
  failed: XCircle,
  error: XCircle,
  cancelled: XCircle,
  ignored: Info,
  neutral: Info
};

export function StatusBadge({ status, label, showIcon = true, className }) {
  const normalized = String(status || 'neutral').toLowerCase().replace(/\s+/g, '-');
  const Icon = STATUS_ICONS[normalized] || Info;
  return (
    <span className={cx('ui-status-badge', `ui-status-badge--${normalized}`, className)}>
      {showIcon && <Icon className={normalized === 'running' || normalized === 'queued' ? 'ui-spin' : ''} size={13} aria-hidden="true" />}
      {label || String(status || 'Info')}
    </span>
  );
}

export function SeverityBadge({ severity, count }) {
  const value = String(severity || 'info').toLowerCase();
  return <StatusBadge status={value} label={`${value.charAt(0).toUpperCase()}${value.slice(1)}${count === undefined ? '' : ` · ${count}`}`} />;
}

export function Card({ as: Element = 'section', className, children, ...props }) {
  return <Element className={cx('ui-card', className)} {...props}>{children}</Element>;
}

export function MetricCard({ label, value, hint, icon: Icon, tone = 'default', trend }) {
  return (
    <Card className={cx('ui-metric', `ui-metric--${tone}`)}>
      <div className="ui-metric__header">
        <span>{label}</span>
        {Icon && <span className="ui-metric__icon"><Icon size={17} aria-hidden="true" /></span>}
      </div>
      <strong className="ui-metric__value">{value}</strong>
      <div className="ui-metric__footer">
        {trend && <span className={cx('ui-metric__trend', trend.tone && `is-${trend.tone}`)}>{trend.label}</span>}
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  );
}

export function Skeleton({ className, lines = 1 }) {
  return (
    <div className={cx('ui-skeleton-group', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => <span className="ui-skeleton" key={index} />)}
    </div>
  );
}

export function EmptyState({ icon: Icon = Info, title, description, action }) {
  return (
    <div className="ui-state" role="status">
      <span className="ui-state__icon"><Icon size={22} aria-hidden="true" /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Không thể tải dữ liệu', description, onRetry }) {
  return (
    <div className="ui-state ui-state--error" role="alert">
      <span className="ui-state__icon"><AlertTriangle size={22} aria-hidden="true" /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}

export function Progress({ value = 0, label, detail }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="ui-progress">
      <div className="ui-progress__label">
        <span>{label}</span>
        <span>{detail || `${safeValue}%`}</span>
      </div>
      <div className="ui-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={safeValue} aria-label={label}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'danger',
  loading = false,
  requireReason = false,
  reason,
  onReasonChange,
  onConfirm,
  onClose
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open, loading, onClose]);

  if (!open) return null;
  const blocked = loading || (requireReason && !String(reason || '').trim());

  return (
    <div className="ui-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose?.()}>
      <div
        ref={dialogRef}
        className="ui-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="ui-dialog__header">
          <span className={cx('ui-dialog__icon', `is-${tone}`)}><AlertTriangle size={20} aria-hidden="true" /></span>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <IconButton label="Đóng hộp thoại" icon={X} onClick={onClose} disabled={loading} />
        </div>
        {requireReason && (
          <div className="ui-field">
            <label htmlFor={`${titleId}-reason`}>Lý do <span aria-hidden="true">*</span></label>
            <textarea
              id={`${titleId}-reason`}
              value={reason || ''}
              onChange={(event) => onReasonChange?.(event.target.value)}
              placeholder="Nhập lý do để lưu trong audit log"
              rows={3}
              required
            />
          </div>
        )}
        <div className="ui-dialog__actions">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading} disabled={blocked}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

