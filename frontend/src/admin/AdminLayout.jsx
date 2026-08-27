import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import './AdminPortal.css';
import api from '../services/api';
import { ToastProvider } from './components/Toast';
import { 
  LayoutDashboard, Radio, Users, Shield, DollarSign, Settings, 
  FileText, Database, LogOut, ExternalLink, ArrowRight, Newspaper, Gift, ArrowRightLeft 
} from 'lucide-react';

const AdminLayoutContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(null);
  const [adminUser, setAdminUser] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await api.get('/users/me/');
        if (response.data.role === 'admin' || response.data.role === 'superadmin' || response.data.is_superuser || response.data.is_staff) {
          setIsAdmin(true);
          setAdminUser(response.data);
        } else {
          setIsAdmin(false);
          navigate('/dashboard');
        }
      } catch (err) {
        setIsAdmin(false);
        navigate('/');
      }
    };
    checkAdmin();
  }, [navigate]);

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

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="admin-portal" style={{fontFamily: 'Vazirmatn, Tahoma, sans-serif'}}>
      <aside className="admin-sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderRight: 0 }}>
        <div className="flex items-center gap-3 mb-6 pr-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-lg flex items-center justify-center">
            <span className="font-black text-white text-xs font-sport">VML</span>
          </div>
          <div>
            <h2 className="text-base font-black text-white m-0">پورتال ارشد ادمین</h2>
            <span className="text-[10px] text-cyan-400 font-sport">SENIOR ADMIN SUITE</span>
          </div>
        </div>

        <nav className="admin-nav">
          <Link to="/admin" className={`admin-nav-link ${isActive('/admin')}`}>
            <LayoutDashboard size={17} />
            <span>داشبورد اصلی</span>
          </Link>

          <Link to="/admin/squad-transfers" className={`admin-nav-link ${isActive('/admin/squad-transfers')}`}>
            <ArrowRightLeft size={17} className="text-cyan-400" />
            <span>نقل‌وانتقال و ترکیب تیم‌ها</span>
          </Link>

          <Link to="/admin/packs" className={`admin-nav-link ${isActive('/admin/packs')}`}>
            <Gift size={17} className="text-amber-400" />
            <span>مدیریت پک‌ها و کارت‌ها</span>
          </Link>

          <Link to="/admin/transfer-reports" className={`admin-nav-link ${isActive('/admin/transfer-reports')}`}>
            <Newspaper size={17} className="text-cyan-400" />
            <span>اتاق خبر و نقل‌وانتقالات</span>
          </Link>

          <Link to="/admin/live-control" className={`admin-nav-link ${isActive('/admin/live-control')}`}>
            <Radio size={17} className="text-red-400" />
            <span>مدیریت پخش زنده و بازی‌ها</span>
          </Link>

          <Link to="/admin/users" className={`admin-nav-link ${isActive('/admin/users')}`}>
            <Users size={17} />
            <span>مدیریت کاربران</span>
          </Link>

          <Link to="/admin/coaches" className={`admin-nav-link ${isActive('/admin/coaches')}`}>
            <Shield size={17} />
            <span>نظارت بر تیم‌ها و مربیان</span>
          </Link>

          <Link to="/admin/financial" className={`admin-nav-link ${isActive('/admin/financial')}`}>
            <DollarSign size={17} />
            <span>کنترل مالی و تسهیلات</span>
          </Link>

          <Link to="/admin/settings" className={`admin-nav-link ${isActive('/admin/settings')}`}>
            <Settings size={17} />
            <span>تنظیمات سیستم</span>
          </Link>

          <Link to="/admin/audit" className={`admin-nav-link ${isActive('/admin/audit')}`}>
            <FileText size={17} />
            <span>لاگ‌های حسابرسی</span>
          </Link>
          
          <div style={{ margin: '1rem 0', borderBottom: '1px solid var(--admin-border)' }}></div>
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', paddingRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} />
            <span>پایگاه داده مستقیم</span>
          </div>
          
          <Link to="/admin/crud/users" className={`admin-nav-link ${location.pathname.includes('/crud/users') ? 'active' : ''}`}>کاربران</Link>
          <Link to="/admin/crud/teams" className={`admin-nav-link ${location.pathname.includes('/crud/teams') ? 'active' : ''}`}>تیم‌ها</Link>
          <Link to="/admin/crud/matches" className={`admin-nav-link ${location.pathname.includes('/crud/matches') ? 'active' : ''}`}>مسابقات</Link>
          <Link to="/admin/crud/gacha-packs" className={`admin-nav-link ${location.pathname.includes('/crud/gacha') ? 'active' : ''}`}>بسته‌های شانس</Link>
          
          <div style={{flex: 1}}></div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2">
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
        <Outlet />
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
