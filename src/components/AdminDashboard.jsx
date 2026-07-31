import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, CreditCard, DollarSign, TrendingUp, Sparkles,
  Search, Filter, CheckCircle2, Clock, XCircle, RefreshCw, Send, Lock, 
  Crown, ArrowUpRight, Zap, AlertTriangle, Eye, UserCheck, ShieldAlert, Inbox, PlusCircle, BarChart3, Activity
} from 'lucide-react';
import { lunarApi } from '../services/lunarApi';

export default function AdminDashboard({ currentUser, onUpgradeUserTier }) {
  const [activeSubTab, setActiveSubTab] = useState('analytics'); // 'analytics' | 'users' | 'transactions' | 'audit'
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState('ALL');
  const [userTierFilter, setUserTierFilter] = useState('ALL');
  const [actionNotice, setActionNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [daysRange, setDaysRange] = useState(14);

  const loadAdminData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [overviewData, usersData, paymentsData, auditData, analyticsData] = await Promise.all([
        lunarApi.getAdminOverview(),
        lunarApi.getAdminUsers(),
        lunarApi.getAdminPayments(),
        lunarApi.getAdminAuditLog(),
        lunarApi.getAdminAnalytics(daysRange)
      ]);
      setOverview(overviewData);
      setAnalytics(analyticsData);
      setUsers(usersData.users.map((user) => ({
        ...user,
        github: user.nickname?.replace(/^@/, '') || '',
        dailyScans: user.dailyScansUsed,
        joined: new Date(user.createdAt).toLocaleDateString(),
        lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Chưa đăng nhập'
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
      setAuditLogs(auditData.logs.map((log) => ({
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
  }, [daysRange]);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 3500);
  };

  const handleApproveTransaction = async (tx) => {
    try {
      await lunarApi.updateAdminPayment(tx.id, 'SUCCESS', 'Duyệt thủ công từ Admin Dashboard.');
      await loadAdminData();
      showNotice(`Đã duyệt giao dịch ${tx.id} thành công.`);
    } catch (error) {
      showNotice(`Lỗi duyệt giao dịch: ${error.message}`);
    }
  };

  const handleChangeUserTier = async (userId, newTier) => {
    try {
      await lunarApi.updateAdminUser(userId, { tier: newTier }, `Admin cấp quyền tài khoản sang ${newTier}.`);
      await loadAdminData();
      showNotice(`Đã chuyển tài khoản sang gói ${newTier} thành công.`);
    } catch (error) {
      showNotice(`Lỗi thay đổi gói: ${error.message}`);
    }
  };

  const handleChangeUserStatus = async (userId, newStatus) => {
    try {
      await lunarApi.updateAdminUser(userId, { status: newStatus }, `Admin cập nhật trạng thái sang ${newStatus}.`);
      await loadAdminData();
      showNotice(`Đã cập nhật trạng thái người dùng thành ${newStatus}.`);
    } catch (error) {
      showNotice(`Lỗi cập nhật trạng thái: ${error.message}`);
    }
  };

  const handleResetQuota = async (userId) => {
    try {
      await lunarApi.resetAdminQuota(userId, 'Reset quota lượt quét từ Admin Dashboard.');
      await loadAdminData();
      showNotice(`Đã khôi phục lượt quét cho người dùng.`);
    } catch (error) {
      showNotice(`Lỗi reset quota: ${error.message}`);
    }
  };

  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = txFilter === 'ALL' || t.status === txFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.github.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = userTierFilter === 'ALL' || u.tier === userTierFilter;
    return matchesSearch && matchesTier;
  });

  const maxChartValue = Math.max(
    1,
    ...(analytics?.dailyActivity || []).map(d => Math.max(d.newUsers || 0, d.scansCount || 0, d.vulnsFound || 0))
  );

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
              Bảng Quản Trị & Cấp Quyền Người Dùng Lunar.dev
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              Giám sát truy cập real-time, biểu đồ thời gian qua, cấp quyền Pro/Enterprise và quản lý giao dịch VietQR.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Đồng Bộ Dữ Liệu
            </button>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Trực Tiếp</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#38bdf8' }}>{currentUser?.name || 'Root Administrator'}</div>
            </div>
          </div>
        </div>

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
          Lỗi kết nối dữ liệu quản trị: {loadError}
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
            <TrendingUp size={14} /> {overview?.metrics?.revenueGrowthPercent ?? '0'}% tăng trưởng
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Tổng Người Dùng Đã Vào</span>
            <Users size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{users.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '4px' }}>
            {users.filter(u => u.tier === 'PRO').length} Pro · {users.filter(u => u.tier === 'ENTERPRISE').length} Enterprise
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Tổng Lượt Quét Mã Nguồn</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{overview?.metrics?.totalScans || 0}</div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '4px' }}>
            {overview?.metrics?.patchedFindings || 0} bản vá lỗ hổng hoàn tất
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ea4335' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span>Nhật Ký Quản Trị Audited</span>
            <ShieldAlert size={18} color="#ea4335" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>{auditLogs.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '4px' }}>
            Lưu vết PostgreSQL immutable
          </div>
        </div>
      </div>

      {/* Main Admin Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('analytics')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'analytics' ? '3px solid #10b981' : '3px solid transparent',
            color: activeSubTab === 'analytics' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BarChart3 size={18} color="#10b981" /> Biểu Đồ Lượng Truy Cập & Tính Năng
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
          <Users size={18} color="#38bdf8" /> Quản Lý & Cấp Quyền Pro ({users.length})
        </button>

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
          <CreditCard size={18} color="#a855f7" /> Quản Lý Giao Dịch VietQR ({transactions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          style={{
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'audit' ? '3px solid #ea4335' : '3px solid transparent',
            color: activeSubTab === 'audit' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={18} color="#ea4335" /> Nhật Ký Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: ANALYTICS & TRAFFIC TRENDS */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Visual Trend Chart */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="#10b981" /> Biểu Đồ Truy Cập & Quét Mã Nguồn ({daysRange} Ngày Qua)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Thống kê số lượng đăng ký mới, số bài quét mã nguồn và lỗi được phát hiện.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {[7, 14, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDaysRange(d)}
                    className={`btn btn-sm ${daysRange === d ? 'btn-emerald' : 'btn-secondary'}`}
                  >
                    {d} ngày
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Visual Bar Chart */}
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '24px 16px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', fontSize: '0.78rem', marginBottom: '16px' }}>
                <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>● Lượt đăng ký mới</span>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>● Lượt quét code</span>
                <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>● Lỗi phát hiện</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {(analytics?.dailyActivity || []).map((item, idx) => {
                  const usersH = Math.max(8, Math.round(((item.newUsers || 0) / maxChartValue) * 140));
                  const scansH = Math.max(8, Math.round(((item.scansCount || 0) / maxChartValue) * 140));
                  const vulnsH = Math.max(8, Math.round(((item.vulnsFound || 0) / maxChartValue) * 140));
                  const dateLabel = new Date(item.date).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });

                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                        <div title={`Tài khoản mới: ${item.newUsers}`} style={{ width: '8px', height: `${usersH}px`, background: '#38bdf8', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                        <div title={`Lượt quét: ${item.scansCount}`} style={{ width: '8px', height: `${scansH}px`, background: '#10b981', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                        <div title={`Lỗi phát hiện: ${item.vulnsFound}`} style={{ width: '8px', height: `${vulnsH}px`, background: '#f87171', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px', whiteSpace: 'nowrap' }}>{dateLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Logins Table */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#38bdf8" /> Người Dùng Vừa Đăng Nhập & Truy Cập Gần Đây
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Tài Khoản</th>
                    <th style={{ padding: '10px' }}>Email</th>
                    <th style={{ padding: '10px' }}>Gói Hiện Tại</th>
                    <th style={{ padding: '10px' }}>Lượt Quét Đã Dùng</th>
                    <th style={{ padding: '10px' }}>Đăng Nhập Cuối</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Thao Tác Nhanh Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.recentLogins || []).map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: '#ffffff' }}>
                        {u.name || u.nickname}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span className={`badge ${u.tier === 'ENTERPRISE' ? 'badge-cyan' : u.tier === 'PRO' ? 'badge-purple' : 'badge-yellow'}`}>
                          {u.tier}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>{u.dailyScansUsed} scans</td>
                      <td style={{ padding: '12px 10px', color: '#34d399' }}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Vừa vào'}
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {u.tier !== 'PRO' && (
                            <button onClick={() => handleChangeUserTier(u.id, 'PRO')} className="btn btn-purple btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                              + Cấp Pro
                            </button>
                          )}
                          {u.tier !== 'ENTERPRISE' && (
                            <button onClick={() => handleChangeUserTier(u.id, 'ENTERPRISE')} className="btn btn-cyan btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                              + Enterprise
                            </button>
                          )}
                          <button onClick={() => handleResetQuota(u.id)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                            Reset Quota
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS TOOLBAR (For Users & Transactions) */}
      {(activeSubTab === 'users' || activeSubTab === 'transactions') && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email hoặc mã đơn..."
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
      )}

      {/* TAB 2: USER MANAGEMENT & TIER DELEGATION */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 18px' }}>Tài Khoản & Mail</th>
                <th style={{ padding: '14px 18px' }}>Vai Trò</th>
                <th style={{ padding: '14px 18px' }}>Gói Hiện Tại</th>
                <th style={{ padding: '14px 18px' }}>Lượt Quét Trong Ngày</th>
                <th style={{ padding: '14px 18px' }}>Trạng Thái</th>
                <th style={{ padding: '14px 18px' }}>Lần Cuối Vào Web</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Cấp Quyền & Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: '700', color: '#ffffff' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${user.role === 'ADMIN' ? 'badge-rose' : 'badge-slate'}`}>
                      {user.role === 'ADMIN' ? '👑 ADMIN' : 'USER'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${user.tier === 'ENTERPRISE' ? 'badge-cyan' : user.tier === 'PRO' ? 'badge-purple' : 'badge-yellow'}`}>
                      {user.tier}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                    {user.dailyScans} lượt
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: '#34d399' }}>
                    {user.lastLogin}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      
                      {/* Tier Change Dropdown */}
                      <select
                        value={user.tier}
                        onChange={(e) => handleChangeUserTier(user.id, e.target.value)}
                        style={{
                          background: 'rgba(15, 23, 42, 0.9)',
                          color: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="FREE">Gói FREE</option>
                        <option value="PRO">Gói PRO ⭐</option>
                        <option value="ENTERPRISE">Gói ENTERPRISE 🤖</option>
                      </select>

                      <button
                        onClick={() => handleResetQuota(user.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        Reset Quota
                      </button>

                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleChangeUserStatus(user.id, 'SUSPENDED')}
                          className="btn btn-rose btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          Khóa Tài Khoản
                        </button>
                      ) : (
                        <button
                          onClick={() => handleChangeUserStatus(user.id, 'ACTIVE')}
                          className="btn btn-emerald btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          Mở Khóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: VIETQR TRANSACTIONS TABLE */}
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
                <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 18px' }}>Mã Đơn / Order Code</th>
                  <th style={{ padding: '14px 18px' }}>Người Đăng Ký</th>
                  <th style={{ padding: '14px 18px' }}>Gói Mục Tiêu</th>
                  <th style={{ padding: '14px 18px' }}>Số Tiền</th>
                  <th style={{ padding: '14px 18px' }}>Hình Thức</th>
                  <th style={{ padding: '14px 18px' }}>Trạng Thái</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#a855f7', fontWeight: 'bold' }}>{tx.id}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '700', color: '#ffffff' }}>{tx.userName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{tx.userEmail}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}><span className="badge badge-purple">{tx.planName}</span></td>
                    <td style={{ padding: '14px 18px', fontWeight: '800', color: '#38bdf8' }}>{tx.amount}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>{tx.method}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`badge ${tx.status === 'SUCCESS' ? 'badge-emerald' : tx.status === 'PENDING' ? 'badge-yellow' : 'badge-rose'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      {tx.status === 'PENDING' ? (
                        <button onClick={() => handleApproveTransaction(tx)} className="btn btn-emerald btn-sm">
                          <CheckCircle2 size={14} /> Duyệt Cấp Pro
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã Xử Lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '16px' }}>
            Nhật Ký Thao Tác Quản Trị Hệ Thống (Admin Audit Trail)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px' }}>Thời Gian</th>
                  <th style={{ padding: '10px' }}>Admin Thực Hiện</th>
                  <th style={{ padding: '10px' }}>Hành Động</th>
                  <th style={{ padding: '10px' }}>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{log.sentAt}</td>
                    <td style={{ padding: '10px', fontWeight: '600', color: '#38bdf8' }}>{log.to}</td>
                    <td style={{ padding: '10px', color: '#ffffff' }}>{log.subject}</td>
                    <td style={{ padding: '10px' }}><span className="badge badge-emerald">{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
