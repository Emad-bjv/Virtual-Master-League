import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import './AdminPortal.css';
import api from '../services/api';
import { ToastProvider } from './components/Toast';
import { 
  LayoutDashboard, Radio, Users, Shield, DollarSign, Settings, 
  FileText, Database, LogOut, ExternalLink, ArrowRight, Newspaper, Gift, ArrowRightLeft, Sparkles, Menu, X,
  Key, ShieldCheck, ShieldAlert, Gamepad2, Scale, Lock, LogIn, CheckCircle2, UserCheck, AlertCircle
} from 'lucide-react';
import { hasAdminPermission } from '../utils/adminPermissions';
import ErrorBoundary from '../components/common/ErrorBoundary';

const isUserAdminRole = (u) => {
  if (!u) return false;
  const role = String(u.role || '').toLowerCase().trim();
  const adminRole = String(u.admin_role || u.admin_profile?.admin_role || '').toLowerCase().trim();
  return (
    role === 'admin' ||
    role === 'superadmin' ||
    adminRole === 'admin' ||
    adminRole === 'superadmin' ||
    Boolean(u.is_superuser) ||
    Boolean(u.is_staff) ||
    (Array.isArray(u.admin_permissions) && u.admin_permissions.length > 0)
  );
};

const AdminAuthGate = ({ currentUser, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin_emad');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!username || !password) {
      setError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/users/auth/login/', {
        username: username.trim(),
        password: password.trim()
      });

      const { access, refresh, user: userData } = res.data;
      if (access) {
        localStorage.setItem('vml_token', access);
        localStorage.setItem('access_token', access);
      }
      if (refresh) {
        localStorage.setItem('vml_refresh_token', refresh);
      }
      if (userData) {
        localStorage.setItem('vml_user', JSON.stringify(userData));
      }

      if (isUserAdminRole(userData)) {
        onLoginSuccess(userData);
      } else {
        setError(`حساب کاربری @${userData?.username || username} فاقد نقش ادمین یا مجوزهای سوپرادمین است.`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'نام کاربری یا رمز عبور اشتباه است.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-4 font-sans dir-rtl select-none relative overflow-hidden" style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}>
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-700/70 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-rose-500 p-0.5 mx-auto shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <ShieldAlert className="text-cyan-400" size={32} />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">دروازه ورود به پورتال ارشد ادمین</h1>
            <p className="text-xs text-slate-400 mt-1 font-sport tracking-wider text-cyan-400/80 uppercase">
              VML Senior Admin Suite
            </p>
          </div>
        </div>

        {/* Current User Warning if logged in as coach */}
        {currentUser && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0 text-amber-400" />
              <span>دسترسی محدود: شما در حساب مربی هستید</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              شما هم‌اکنون با نام کاربری <span className="font-bold text-white dir-ltr inline-block">@{currentUser.username}</span> وارد شده‌اید که نقش آن «{currentUser.role || 'مربی'}» است و اجازه ورود به پورتال مدیریت را ندارد.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-200 text-xs font-bold border border-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowRight size={14} />
                <span>بازگشت به برنامه اصلی (داشبورد)</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Fill Chips */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-bold block">انتخاب سریع نام کاربری ادمین:</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUsername('admin_emad')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                username === 'admin_emad'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              admin_emad
            </button>
            <button
              type="button"
              onClick={() => setUsername('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                username === 'admin'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block">نام کاربری مدیر ارشد</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: admin_emad یا admin"
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all dir-ltr text-right"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-bold block">رمز عبور مدیر ارشد</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور حساب ادمین"
                className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-500 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all dir-ltr text-right pl-16"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
              >
                {showPassword ? 'مخفی' : 'نمایش'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                <span>ورود به پورتال مدیریت ارشد</span>
              </>
            )}
          </button>
        </form>

        {/* Helpful promotion hint */}
        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 text-center">
          <p>
            💡 برای ارتقای سریع هر مربی به ادمین، دستور زیر را در سرور اجرا فرمایید:
          </p>
          <code className="block bg-slate-950/90 text-cyan-300 p-2 rounded-xl border border-slate-800 dir-ltr font-mono text-[10px]">
            python backend/promote_user.py &lt;نام_مربی&gt;
          </code>
        </div>
      </div>
    </div>
  );
};

const AdminLayoutContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const checkAdmin = async () => {
    try {
      const response = await api.get('/users/me/');
      const userData = response.data;
      if (isUserAdminRole(userData)) {
        setIsAdmin(true);
        setAdminUser(userData);
      } else {
        setIsAdmin(false);
        setAdminUser(userData);
      }
    } catch (err) {
      setIsAdmin(false);
      setAdminUser(null);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="admin-portal flex items-center justify-center min-h-screen text-slate-400 font-sans dir-rtl">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold">در حال بارگذاری پورتال امن مدیریت ارشد...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <AdminAuthGate
        currentUser={adminUser}
        onLoginSuccess={(userData) => {
          setIsAdmin(true);
          setAdminUser(userData);
        }}
      />
    );
  }

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const isCurrentPathAllowed = () => {
    if (!adminUser) return true;
    if (adminUser.is_superuser || adminUser.role === 'superadmin') return true;

    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') return true;
    if (path.startsWith('/admin/admins')) return hasAdminPermission(adminUser, 'sensitive_admin_rbac_manage') || hasAdminPermission(adminUser, 'panel_admin_admins');
    if (path.startsWith('/admin/squad-transfers')) return hasAdminPermission(adminUser, 'panel_admin_squad_transfers');
    if (path.startsWith('/admin/pes-transfers')) return hasAdminPermission(adminUser, 'panel_admin_squad_transfers') || adminUser?.is_superuser;
    if (path.startsWith('/admin/packs')) return hasAdminPermission(adminUser, 'panel_admin_packs');
    if (path.startsWith('/admin/pes-skills')) return hasAdminPermission(adminUser, 'panel_admin_pes_skills');
    if (path.startsWith('/admin/transfer-reports')) return hasAdminPermission(adminUser, 'panel_admin_newsroom');
    if (path.startsWith('/admin/live-control')) return hasAdminPermission(adminUser, 'panel_admin_live_control');
    if (path.startsWith('/admin/users')) return hasAdminPermission(adminUser, 'panel_admin_users');
    if (path.startsWith('/admin/coaches')) return hasAdminPermission(adminUser, 'panel_admin_coaches');
    if (path.startsWith('/admin/disciplinary')) return hasAdminPermission(adminUser, 'panel_admin_coaches') || adminUser?.is_superuser;
    if (path.startsWith('/admin/financial')) return hasAdminPermission(adminUser, 'panel_admin_financial');
    if (path.startsWith('/admin/settings')) return hasAdminPermission(adminUser, 'panel_admin_settings');
    if (path.startsWith('/admin/audit')) return hasAdminPermission(adminUser, 'panel_admin_audit');
    if (path.startsWith('/admin/crud')) return hasAdminPermission(adminUser, 'panel_admin_database_crud');

    return true;
  };

  return (
    <div className="admin-portal" style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      {/* Mobile Top Header Bar */}
      <header className="lg:hidden flex items-center justify-between p-3.5 bg-slate-950/95 border-b border-cyan-500/20 backdrop-blur-xl sticky top-0 z-30 w-full shadow-lg">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 hover:text-white transition-colors cursor-pointer shadow-sm active:scale-95"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-md flex items-center justify-center">
              <span className="font-black text-white text-[11px] font-sport">VML</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight m-0">پورتال ارشد ادمین</h2>
              <span className="text-[9px] text-cyan-400 font-sport block">ADMIN SUITE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* TWO-WAY SWITCH: Switch to Operational Admin Dashboard */}
          <Link
            to="/dashboard?tab=admin"
            className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-950/80 hover:bg-amber-900 px-3 py-1.5 rounded-xl border border-amber-500/40 shadow-sm transition-all"
            title="سوییچ به داشبورد عملیاتی مسابقات و داوری"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>داشبورد عملیاتی</span>
          </Link>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold bg-cyan-950/90 hover:bg-cyan-900 px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-sm transition-all"
          >
            <ArrowRight size={13} />
            <span className="hidden sm:inline">برنامه اصلی</span>
          </Link>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Persistent / Mobile Slide-Over Drawer) */}
      <aside
        className={`admin-sidebar glass-panel fixed lg:static top-0 right-0 z-50 h-full lg:h-auto overflow-y-auto transition-transform duration-300 ease-in-out ${
          mobileNavOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderRight: 0 }}
      >
        <div className="flex items-center justify-between mb-5 pr-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg flex items-center justify-center">
              <span className="font-black text-white text-xs font-sport">VML</span>
            </div>
            <div>
              <h2 className="text-base font-black text-white m-0">پورتال ارشد ادمین</h2>
              <span className="text-[10px] text-cyan-400 font-sport">SENIOR ADMIN SUITE</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          <Link to="/admin" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin')}`}>
            <LayoutDashboard size={17} />
            <span>داشبورد اصلی</span>
          </Link>

          {(adminUser?.is_superuser || hasAdminPermission(adminUser, 'sensitive_admin_rbac_manage') || hasAdminPermission(adminUser, 'panel_admin_admins')) && (
            <Link to="/admin/admins" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/admins')}`}>
              <ShieldCheck size={17} className="text-cyan-400" />
              <span>مدیریت ادمین‌ها و دسترسی‌ها</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_squad_transfers') && (
            <Link to="/admin/squad-transfers" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/squad-transfers')}`}>
              <ArrowRightLeft size={17} className="text-cyan-400" />
              <span>نقل‌وانتقال و ترکیب تیم‌ها</span>
            </Link>
          )}

          {(adminUser?.is_superuser || hasAdminPermission(adminUser, 'panel_admin_squad_transfers')) && (
            <Link to="/admin/pes-transfers" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/pes-transfers')}`}>
              <Gamepad2 size={17} className="text-emerald-400" />
              <span>نقل‌وانتقالات PES</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_packs') && (
            <Link to="/admin/packs" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/packs')}`}>
              <Gift size={17} className="text-amber-400" />
              <span>مدیریت پک‌ها و کارت‌ها</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_pes_skills') && (
            <Link to="/admin/pes-skills" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/pes-skills')}`}>
              <Sparkles size={17} className="text-purple-400" />
              <span>تقویت مهارت‌های PES</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_newsroom') && (
            <Link to="/admin/transfer-reports" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/transfer-reports')}`}>
              <Newspaper size={17} className="text-cyan-400" />
              <span>اتاق خبر و نقل‌وانتقالات</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_live_control') && (
            <Link to="/admin/live-control" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/live-control')}`}>
              <Radio size={17} className="text-red-400" />
              <span>مدیریت پخش زنده و بازی‌ها</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_users') && (
            <Link to="/admin/users" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/users')}`}>
              <Users size={17} />
              <span>مدیریت کاربران</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_coaches') && (
            <Link to="/admin/coaches" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/coaches')}`}>
              <Shield size={17} />
              <span>نظارت بر تیم‌ها و مربیان</span>
            </Link>
          )}

          {(adminUser?.is_superuser || hasAdminPermission(adminUser, 'panel_admin_coaches')) && (
            <Link to="/admin/disciplinary" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/disciplinary')}`}>
              <Scale size={17} className="text-amber-400" />
              <span>کمیته انضباطی و جرایم</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_financial') && (
            <Link to="/admin/financial" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/financial')}`}>
              <DollarSign size={17} />
              <span>کنترل مالی و تسهیلات</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_settings') && (
            <Link to="/admin/settings" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/settings')}`}>
              <Settings size={17} />
              <span>تنظیمات سیستم</span>
            </Link>
          )}

          {hasAdminPermission(adminUser, 'panel_admin_audit') && (
            <Link to="/admin/audit" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${isActive('/admin/audit')}`}>
              <FileText size={17} />
              <span>لاگ‌های حسابرسی</span>
            </Link>
          )}
          
          {hasAdminPermission(adminUser, 'panel_admin_database_crud') && (
            <>
              <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--admin-border)' }}></div>
              <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', paddingRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={13} />
                <span>پایگاه داده مستقیم</span>
              </div>
              
              <Link to="/admin/crud/users" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${location.pathname.includes('/crud/users') ? 'active' : ''}`}>کاربران</Link>
              <Link to="/admin/crud/teams" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${location.pathname.includes('/crud/teams') ? 'active' : ''}`}>تیم‌ها</Link>
              <Link to="/admin/crud/matches" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${location.pathname.includes('/crud/matches') ? 'active' : ''}`}>مسابقات</Link>
              <Link to="/admin/crud/gacha-packs" onClick={() => setMobileNavOpen(false)} className={`admin-nav-link ${location.pathname.includes('/crud/gacha') ? 'active' : ''}`}>بسته‌های شانس</Link>
            </>
          )}
          
          <div style={{flex: 1, minHeight: '1.5rem'}}></div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2 pb-6 lg:pb-0">
            {/* TWO-WAY SWITCH: Switch to Operational Admin Dashboard */}
            <Link 
              to="/dashboard?tab=admin" 
              className="admin-btn flex items-center justify-center gap-2" 
              style={{width: '100%', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'}}
              title="سوییچ به داشبورد عملیاتی مسابقات و داوری"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>⚡ سوییچ به داشبورد عملیاتی</span>
            </Link>

            <Link 
              to="/dashboard" 
              className="admin-btn flex items-center justify-center gap-2" 
              style={{width: '100%', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)'}}
            >
              <ArrowRight size={14} />
              <span>بازگشت به برنامه اصلی</span>
            </Link>

            <button 
              className="admin-btn flex items-center justify-center gap-2" 
              style={{width: '100%', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)'}} 
              onClick={() => {
                localStorage.removeItem('vml_token');
                localStorage.removeItem('vml_refresh_token');
                navigate('/');
              }}
            >
              <LogOut size={14} />
              <span>خروج از حساب</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="admin-content">
        {isCurrentPathAllowed() ? (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/40">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-black text-white">عدم دسترسی به این بخش</h2>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              شما مجوز دسترسی به این صفحه را ندارید. جهت دریافت دسترسی، با مدیر ارشد سامانه (سوپرادمین) تماس حاصل فرمایید.
            </p>
            <Link
              to="/admin"
              className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all mt-2"
            >
              بازگشت به داشبورد اصلی
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

const AdminLayout = () => (
  <ToastProvider>
    <AdminLayoutContent />
  </ToastProvider>
);

export default AdminLayout;
