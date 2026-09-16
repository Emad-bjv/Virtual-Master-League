import React from 'react';
import { Menu, Bell, User as UserIcon, Globe, Crown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function MobileHeader({
  onOpenDrawer,
  onOpenNotifications,
  onOpenProfile,
  user,
  teamData,
  unreadCount = 0,
}) {
  const { lang, toggleLang, t, isRtl } = useLanguage();

  const coachName = user?.username || user?.coach_name || 'Coach';
  const teamLogo = teamData?.logo;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060b17]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-2.5 transition-all">
      <div className="max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Side: Hamburger Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700/60 hover:border-amber-500/50 flex items-center justify-center text-slate-200 hover:text-amber-400 transition-all active:scale-90 cursor-pointer shadow-sm"
            aria-label={t('menu')}
          >
            <Menu size={20} />
          </button>

          {/* Language Switcher Pill */}
          <button
            onClick={toggleLang}
            className="h-8 px-2.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/20 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
            title="Switch Language (FA / EN)"
          >
            <Globe size={13} className="text-amber-400" />
            <span>{t('switchLang')}</span>
          </button>
        </div>

        {/* Center: VML Golden Crown Logo */}
        <div className="flex flex-col items-center justify-center select-none cursor-pointer">
          <div className="flex items-center gap-1.5">
            <Crown size={16} className="text-amber-400 fill-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-2xl font-black tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]">
              VML
            </span>
          </div>
          <span className="text-[8.5px] font-bold tracking-[0.25em] text-amber-500/90 uppercase -mt-0.5">
            {t('vmlSubtitle')}
          </span>
        </div>

        {/* Right Side: Notification Bell + Profile Avatar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 rounded-2xl bg-slate-900/80 border border-slate-700/60 hover:border-amber-500/50 flex items-center justify-center text-slate-200 hover:text-amber-400 transition-all active:scale-90 cursor-pointer shadow-sm"
            aria-label={t('notifications')}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
              </span>
            )}
          </button>

          <button
            onClick={onOpenProfile}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/50 overflow-hidden flex items-center justify-center text-amber-300 hover:border-amber-400 transition-all active:scale-90 cursor-pointer shadow-sm"
            aria-label={t('profile')}
          >
            {teamLogo ? (
              <img src={teamLogo} alt={coachName} className="w-full h-full object-cover p-1" />
            ) : (
              <UserIcon size={19} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
