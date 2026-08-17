import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Basic role check
  if (!user || (!user.is_staff && user.role !== 'admin')) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center p-8 bg-gray-800 rounded-xl shadow-lg border border-red-500/30">
          <h1 className="text-3xl font-bold text-red-400 mb-4">دسترسی غیرمجاز</h1>
          <p className="mb-6 text-gray-300">شما اجازه دسترسی به این بخش را ندارید.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            بازگشت به داشبورد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans rtl" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            VML Admin
          </h2>
          <p className="text-xs text-gray-400 mt-2">کنترل پنل مدیریت</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link to="/admin" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">داشبورد</span>
          </Link>
          <Link to="/admin/matches" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">مدیریت مسابقات</span>
          </Link>
          <Link to="/admin/players" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">مدیریت بازیکنان</span>
          </Link>
          <Link to="/admin/teams" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">تیم‌ها و اختصاص مربی</span>
          </Link>
          <Link to="/admin/users" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">کاربران</span>
          </Link>
          <Link to="/admin/facilities-budget" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">بودجه و تسهیلات</span>
          </Link>
          <Link to="/admin/livestream" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">پخش زنده (آپارات)</span>
          </Link>
          <Link to="/admin/database" className="block px-4 py-2.5 rounded-xl bg-blue-900/30 border border-blue-500/30 hover:bg-blue-800/40 text-blue-300 transition-all font-semibold">
            <span className="font-medium">🗄️ کاوشگر دیتابیس (Django Admin)</span>
          </Link>
          <Link to="/admin/settings" className="block px-4 py-2.5 rounded-xl hover:bg-gray-800 text-gray-300 hover:text-white transition-all">
            <span className="font-medium">تنظیمات سراسری لیگ</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold uppercase">
              {user?.username ? user.username.substring(0, 2) : 'AD'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-200">ادمین سیستم</p>
              <p className="text-xs text-gray-500 dir-ltr text-right">@{user?.username}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            خروج از پنل ادمین
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
