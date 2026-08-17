import React from 'react';
import { Coins, LogIn, ShieldAlert, LogOut, Gem, Sparkles } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function Header({ user: propUser, coins, unreadNotifications, onAvatarClick, onOpenAuth, onOpenAdmin, onLogout: propOnLogout, isAuthenticated: propIsAuth, onNavigateTab, activeTab }) {
  const { user: contextUser, isAuthenticated: contextIsAuth, logout: contextLogout } = useAuth();
  const { team } = useTeam();
  
  const user = contextUser || propUser;
  const isAuthenticated = contextIsAuth || propIsAuth;
  const onLogout = contextLogout || propOnLogout;

  const isAdmin = user?.role === 'admin' || user?.is_superuser || user?.isAdminAccess;
  const userTeamName = team?.name || user?.team_name || user?.team?.name;
  const userTeamLogo = getTeamLogoUrl(team || user?.team || userTeamName);

  const displayDollars = team?.budget !== undefined
    ? Number(team.budget).toLocaleString('fa-IR')
    : user?.virtual_dollars !== undefined
    ? Number(user.virtual_dollars).toLocaleString('fa-IR')
    : (coins || 1000000).toLocaleString('fa-IR');

  const displayGems = Number(team?.gems ?? user?.gems ?? 0).toLocaleString('fa-IR');

  return (
    <header className="sticky top-0 z-30 bg-[#080c14]/85 border-b border-slate-700/50 px-3 sm:px-5 py-2.5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all">
      {/* User / Club Info (Hidden in Admin Mode) */}
      {activeTab !== 'admin' ? (
        isAuthenticated ? (
          <button
            onClick={onAvatarClick}
            className="flex items-center gap-2 sm:gap-3 text-right hover:opacity-95 transition-all group focus:outline-none"
          >
            <div className="relative">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-amber-400 p-[1.5px] shadow-[0_0_15px_rgba(0,243,255,0.25)] group-hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all">
                <div className="w-full h-full rounded-2xl team-crest-badge flex items-center justify-center font-bold text-slate-800 text-base overflow-hidden p-1">
                  {userTeamLogo ? (
                    <img src={userTeamLogo} alt={userTeamName || 'Logo'} className="w-full h-full object-contain drop-shadow-sm" />
                  ) : (
                    <span className="font-bold text-slate-800 text-xs dir-ltr font-sport">{user?.username ? user.username.slice(0, 2).toUpperCase() : 'FC'}</span>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[#00ff87] border-2 border-[#080c14] rounded-full shadow-[0_0_8px_#00ff87]"></span>
            </div>

            <div className="text-right hidden xs:block sm:block">
              <h2 className="text-xs sm:text-sm font-black text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 tracking-tight truncate max-w-[110px] sm:max-w-[180px]">
                {userTeamName || (user?.username ? `@${user.username}` : 'کاربر گرامی')}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                {userTeamName ? `سرمربی ${userTeamName}` : user?.role ? `نقش: ${user.role}` : 'مربی لیگ'}
              </p>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 fc-btn-cyan text-white text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            <LogIn size={15} />
            <span>ورود / ثبت‌نام</span>
          </button>
        )
      ) : (
        <div className="flex items-center gap-2 text-rose-400 font-black text-sm tracking-wide">
          <ShieldAlert size={20} className="animate-pulse" />
          <span>پنل مدیریت ارشد ادمین</span>
        </div>
      )}

      {/* Stats & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Admin Mode Quick Access Button */}
        {onOpenAdmin && isAuthenticated && isAdmin && activeTab !== 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            title="ورود به پنل مدیریت ادمین"
          >
            <ShieldAlert size={14} className="text-rose-400" />
            <span className="hidden sm:inline">ادمین</span>
          </button>
        )}

        {/* Dual Currency Badges */}
        {activeTab !== 'admin' && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. Gems Badge (Cyan / Electric Violet Crystal Glow) */}
            <button
              onClick={() => onNavigateTab && onNavigateTab('store', 'gems')}
              className="flex items-center gap-1 bg-gradient-to-r from-cyan-950/90 via-[#0d162a] to-purple-950/90 hover:from-cyan-900/90 hover:to-purple-900/90 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black shadow-[0_0_15px_rgba(0,243,255,0.25)] hover:shadow-[0_0_20px_rgba(0,243,255,0.45)] font-sport tracking-wide transition-all active:scale-95 cursor-pointer"
              title="خرید و موجودی الماس (جم)"
            >
              <Gem size={14} className="text-cyan-400 animate-pulse" />
              <span className="dir-ltr">{displayGems}</span>
            </button>

            {/* 2. Dollar / Club Budget Badge (Championship Gold Styling) */}
            <button
              onClick={() => onNavigateTab && onNavigateTab('store', 'coins')}
              className="flex items-center gap-1 bg-gradient-to-r from-amber-950/90 to-slate-900/90 hover:from-amber-900/90 hover:to-slate-800/90 border border-amber-400/50 hover:border-amber-300 text-amber-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:shadow-[0_0_20px_rgba(245,158,11,0.45)] font-sport tracking-wide transition-all active:scale-95 cursor-pointer"
              title="بودجه نقل و انتقالات باشگاه"
            >
              <Coins size={14} className="text-amber-400" />
              <span className="dir-ltr">${displayDollars}</span>
            </button>
          </div>
        )}

        {/* Notification Center Dropdown */}
        <NotificationCenter onNavigateTab={onNavigateTab} />

        {/* Logout Button */}
        {isAuthenticated && onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 p-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
            title="خروج از حساب کاربری"
          >
            <LogOut size={15} className="text-rose-400" />
            <span className="hidden md:inline">خروج</span>
          </button>
        )}
      </div>
    </header>
  );
}
