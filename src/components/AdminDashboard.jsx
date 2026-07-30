import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, CreditCard, Mail, DollarSign, TrendingUp, Sparkles, 
  Search, Filter, CheckCircle2, Clock, XCircle, RefreshCw, Send, Lock, 
  Crown, ArrowUpRight, Zap, AlertTriangle, Eye, UserCheck, ShieldAlert, Inbox, PlusCircle
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function AdminDashboard({ currentUser, onUpgradeUserTier }) {
  const [activeSubTab, setActiveSubTab] = useState('transactions'); // 'transactions' | 'users' | 'emails' | 'sast'
  const [transactions, setTransactions] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState('ALL');
  const [userTierFilter, setUserTierFilter] = useState('ALL');
  const [actionNotice, setActionNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [overviewData, usersData, paymentsData, auditData] = await Promise.all([
        lunarApi.getAdminOverview(),
        lunarApi.getAdminUsers(),
        lunarApi.getAdminPayments(),
        lunarApi.getAdminAuditLog()
      ]);
      setOverview(overviewData);
      setUsers(usersData.users.map((user) => ({
        ...user,
        github: user.nickname?.replace(/^@/, '') || '',
        karma: user.karmaPoints,
        dailyScans: user.dailyScansUsed,
        joined: new Date(user.createdAt).toLocaleDateString()
      })));
      setTransactions(paymentsData.payments.map((payment) => ({
        id: payment.orderCode,
        userName: payment.userName || 'Unknown user',
        userEmail: payment.userEmail || 'Unknown email',
        planName: payment.tierTarget,
        amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: payment.currency || 'VND' }).format(Number(payment.amount)),
        method: payment.paymentMethod || 'VietQR',
        status: payment.status
      })));
      setEmailLogs(auditData.logs.map((log) => ({
        id: log.id,
        to: log.actorEmail || 'system',
        subject: `${log.actionType}: ${log.targetType}`,
        status: 'AUDITED',
        type: 'ADMIN_AUDIT',
        timestamp: log.createdAt,
        sentAt: new Date(log.createdAt).toLocaleString()
      })));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Helper Toast Notification
  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3500);
  };

  // Duyệt nâng cấp Pro thủ công cho giao dịch đang chờ
  const handleApproveTransaction = async (tx) => {
    try {
      await lunarApi.updateAdminPayment(tx.id, 'SUCCESS', 'Approved from the Lunar admin dashboard.');
      await loadAdminData();
      showNotice(`Payment ${tx.id} approved and audited.`);
    } catch (error) {
      showNotice(`Cannot approve payment: ${error.message}`);
    }
  };

  // Thay đổi Hạng người dùng trực tiếp
  const handleChangeUserTier = async (userId, newTier) => {
    try {
      await lunarApi.updateAdminUser(userId, { tier: newTier }, `Tier changed to ${newTier} from the admin dashboard.`);
      await loadAdminData();
      showNotice(`User ${userId} is now ${newTier}.`);
    } catch (error) {
      showNotice(`Cannot update user: ${error.message}`);
    }
  };

  // Reset Lượt quét Daily Quota của người dùng
  const handleResetQuota = async (userId) => {
    try {
      await lunarApi.resetAdminQuota(userId, 'Daily quota reset from the Lunar admin dashboard.');
      await loadAdminData();
      showNotice(`Quota reset for ${userId}.`);
    } catch (error) {
      showNotice(`Cannot reset quota: ${error.message}`);
    }
  };

  // Lọc dữ liệu giao dịch
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = txFilter === 'ALL' || t.status === txFilter;
    return matchesSearch && matchesStatus;
  });

  // Lọc danh sách người dùng
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.github.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = userTierFilter === 'ALL' || u.tier === userTierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '20px' }}>
      
      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(234, 67, 53, 0.15) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        marginBottom: '28px',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Crown size={14} color="#f59e0b" /> SYSTEM ADMIN DASHBOARD
              </span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>● LIVE OPERATIONAL</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>
              Bảng Quản Trị Hệ Thống Lunar.dev
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              Giám sát doanh thu, quản lý người dùng, giao dịch VietQR và nhật ký hành động quản trị
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Hiện Tại</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#38bdf8' }}>{currentUser?.name || 'Root Administrator'}</div>
            </div>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div style={{
            position: 'absolute',
            bottom: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: '700',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} /> {actionNotice}
          </div>
        )}
      </div>
      {loadError && (
        <div style={{ padding: '12px 16px', marginBottom: '18px', color: '#fca5a5', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '8px' }}>
          Không thể tải dữ liệu quản trị đã xác minh: {loadError}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Doanh Thu Tháng (MRR)</span>
            <DollarSign size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(overview?.metrics?.revenueCurrentMonth || 0)}</div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {overview?.metrics?.revenueGrowthPercent ?? '—'}% so với tháng trước
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Tổng Người Dùng</span>
            <Users size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{overview?.metrics?.totalUsers || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {(overview?.usersByTier || []).filter((item) => item.tier !== 'FREE').reduce((sum, item) => sum + Number(item.count), 0)} tài khoản Pro & Enterprise
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ea4335' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Hành Động Admin Gần Đây</span>
            <Mail size={18} color="#ea4335" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{emailLogs.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '4px' }}>
            Được ghi trong audit log PostgreSQL
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Tổng Lượt Quét Code</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{overview?.metrics?.totalScans || 0}</div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px' }}>
            {overview?.metrics?.patchedFindings || 0} lỗi an ninh được vá
          </div>
        </div>
      </div>

      {/* Main Admin Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '12px' }}>
        <button
          onClick={() => setActiveSubTab('transactions')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'transactions' ? '3px solid #a855f7' : '3px solid transparent',
            color: activeSubTab === 'transactions' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CreditCard size={18} color="#a855f7" /> Quản Lý Thanh Toán VietQR ({transactions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'users' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeSubTab === 'users' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} color="#38bdf8" /> Quản Lý Người Dùng ({users.length})
        </button>

        <button
          onClick={() => setActiveSubTab('emails')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'emails' ? '3px solid #ea4335' : '3px solid transparent',
            color: activeSubTab === 'emails' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={18} color="#ea4335" /> Nhật Ký Quản Trị ({emailLogs.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, Gmail hoặc mã đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              fontSize: '0.88rem'
            }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {activeSubTab === 'transactions' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setTxFilter('ALL')} className={`btn btn-sm ${txFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}>Tất Cả</button>
            <button onClick={() => setTxFilter('SUCCESS')} className={`btn btn-sm ${txFilter === 'SUCCESS' ? 'btn-emerald' : 'btn-secondary'}`}>Đã Hoàn Tất</button>
            <button onClick={() => setTxFilter('PENDING')} className={`btn btn-sm ${txFilter === 'PENDING' ? 'btn-yellow' : 'btn-secondary'}`}>Đang Chờ Duyệt</button>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setUserTierFilter('ALL')} className={`btn btn-sm ${userTierFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}>Tất Cả</button>
            <button onClick={() => setUserTierFilter('FREE')} className={`btn btn-sm ${userTierFilter === 'FREE' ? 'btn-yellow' : 'btn-secondary'}`}>Free</button>
            <button onClick={() => setUserTierFilter('PRO')} className={`btn btn-sm ${userTierFilter === 'PRO' ? 'btn-purple' : 'btn-secondary'}`}>Pro</button>
            <button onClick={() => setUserTierFilter('ENTERPRISE')} className={`btn btn-sm ${userTierFilter === 'ENTERPRISE' ? 'btn-cyan' : 'btn-secondary'}`}>Enterprise</button>
          </div>
        )}
      </div>

      {/* TAB 1: TRANSACTIONS TABLE */}
      {activeSubTab === 'transactions' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {filteredTxs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <Inbox size={48} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <h4 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '6px' }}>
                Chưa Có Dữ Liệu Giao Dịch Nào (0 Record)
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px auto' }}>
                PostgreSQL chưa ghi nhận giao dịch chuyển khoản VietQR nào.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.8)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '14px 18px' }}>Mã Đơn Hàng</th>
                  <th style={{ padding: '14px 18px' }}>Khách Hàng (Gmail)</th>
                  <th style={{ padding: '14px 18px' }}>Gói Đăng Ký</th>
                  <th style={{ padding: '14px 18px' }}>Số Tiền</th>
                  <th style={{ padding: '14px 18px' }}>Phương Thức</th>
                  <th style={{ padding: '14px 18px' }}>Trạng Thái</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#c084fc' }}>{tx.id}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '600', color: '#ffffff' }}>{tx.userName}</div>
                      <div style={{ fontSize: '0.78rem', color: '#38bdf8' }}>{tx.userEmail}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#f43f5e' }}>{tx.planName}</td>
                    <td style={{ padding: '14px 18px', fontWeight: '800', color: '#ffffff' }}>{tx.amount}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{tx.method}</td>
                    <td style={{ padding: '14px 18px' }}>
                      {tx.status === 'SUCCESS' ? (
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> THÀNH CÔNG
                        </span>
                      ) : (
                        <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> ĐANG CHỜ CHUYỂN KHOẢN
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      {tx.status === 'PENDING' ? (
                        <button
                          onClick={() => handleApproveTransaction(tx)}
                          className="btn btn-emerald btn-sm"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          <CheckCircle2 size={14} /> Duyệt Thanh Toán
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT TABLE */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.8)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px' }}>Người Dùng</th>
                <th style={{ padding: '14px 18px' }}>Gmail / Auth</th>
                <th style={{ padding: '14px 18px' }}>Cấp Độ (Tier)</th>
                <th style={{ padding: '14px 18px' }}>Karma Points</th>
                <th style={{ padding: '14px 18px' }}>Lượt Quét Dùng Hôn Nay</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Quản Lý Cấp Bậc & Quota</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.4)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: '700', color: '#ffffff' }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>GitHub: @{u.github}</div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#38bdf8' }}>{u.email}</td>
                  <td style={{ padding: '14px 18px' }}>
                    {u.tier === 'ENTERPRISE' && <span className="badge badge-cyan">BOT ENTERPRISE</span>}
                    {u.tier === 'PRO' && <span className="badge badge-purple">PRO</span>}
                    {u.tier === 'FREE' && <span className="badge badge-yellow">FREE</span>}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: '700', color: '#fbbf24' }}>{u.karma} pts</td>
                  <td style={{ padding: '14px 18px' }}>{u.dailyScans} / {u.tier === 'FREE' ? '5' : '∞'}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {u.tier !== 'PRO' && (
                        <button onClick={() => handleChangeUserTier(u.id, 'PRO')} className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                          + Up Pro
                        </button>
                      )}
                      {u.tier !== 'ENTERPRISE' && (
                        <button onClick={() => handleChangeUserTier(u.id, 'ENTERPRISE')} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                          + Up Enterprise
                        </button>
                      )}
                      <button onClick={() => handleResetQuota(u.id)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.72rem' }}>
                        <RefreshCw size={12} /> Reset Quota
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: GMAIL LOGS */}
      {activeSubTab === 'emails' && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', color: '#ea4335', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} /> Nhật Ký Hành Động Quản Trị
          </h3>

          {emailLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Chưa có hành động quản trị nào được ghi nhận.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {emailLogs.map((log) => (
                <div key={log.id} style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ea4335', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#ffffff', fontSize: '0.95rem' }}>{log.subject}</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>AUDITED</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: '20px' }}>
                    <span>Người nhận: <strong style={{ color: '#38bdf8' }}>{log.to}</strong></span>
                    <span>Loại: <strong style={{ color: '#c084fc' }}>{log.type}</strong></span>
                    <span>Thời gian: {new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
