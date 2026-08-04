import React from 'react';
import { Coins, LogIn, ShieldAlert, LogOut } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Header({ user, coins, unreadNotifications, onAvatarClick, onOpenAuth, onOpenAdmin, onLogout, isAuthenticated, onNavigateTab, activeTab }) {
  const isAdmin = user?.role === 'admin' || user?.isAdminAccess;

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-lg backdrop-blur-xl">
      {/* User / Club Info (Hidden in Admin Mode) */}
      {activeTab !== 'admin' ? (
        isAuthenticated ? (
          <button
            onClick={onAvatarClick}
            className="flex items-center gap-3 text-right hover:opacity-90 transition-opacity group focus:outline-none"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md group-hover:shadow-purple-500/40 transition-shadow">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-base">
                  {user?.clubName ? user.clubName.charAt(0) : 'ا'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                {user?.clubName || 'باشگاه البرز'}
              </h2>
              <p className="text-xs text-slate-400">
                {user?.coachName ? `مربی: ${user.coachName}` : 'مربی: امید رضایی'}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <LogIn size={15} />
            <span>ورود / ثبت‌نام</span>
          </button>
        )
      ) : (
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <ShieldAlert size={20} />
          <span>پنل مدیریت ادمین</span>
        </div>
      )}

      {/* Stats & Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Admin Mode Quick Access Button (Hidden when already in Admin Tab) */}
        {onOpenAdmin && isAuthenticated && isAdmin && activeTab !== 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/50 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            title="ورود به پنل مدیریت ادمین"
          >
            <ShieldAlert size={15} className="text-rose-400" />
            <span className="hidden sm:inline">ادمین</span>
          </button>
        )}

        {/* Coins Badge (Hidden in Admin Mode) */}
        {activeTab !== 'admin' && (
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <Coins size={16} className="text-amber-400 animate-pulse" />
            <span>{(coins || 12450).toLocaleString('fa-IR')}</span>
          </div>
        )}

        {/* Notification Center Dropdown */}
        <NotificationCenter onNavigateTab={onNavigateTab} />

        {/* Logout Button */}
        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 p-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            title="خروج از حساب کاربری (Log out)"
          >
            <LogOut size={18} className="text-rose-400" />
            <span className="hidden md:inline">خروج</span>
          </button>
        )}
      </div>
    </header>
  );
}
