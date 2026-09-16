import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Tv,
  ShoppingCart,
  Swords,
  Building2,
  ShieldAlert,
  LogOut,
  Globe,
  Award,
  Coins,
  Gem,
  Newspaper,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function MobileSideDrawer({
  isOpen,
  onClose,
  onNavigateTab,
  user,
  teamData,
  onLogout,
}) {
  const { lang, toggleLang, t, isRtl } = useLanguage();

  if (typeof document === 'undefined') return null;

  const coachName = user?.username || user?.coach_name || 'Coach';
  const teamName = teamData?.name || user?.team_name || 'Virtual Master Club';
  const isAdmin = user?.role === 'admin' || user?.is_superuser;

  const handleNavigate = (tabId, sub = null) => {
    onNavigateTab?.(tabId, sub);
    onClose();
  };

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  const drawerVariants = {
    hidden: { x: isRtl ? '100%' : '-100%', opacity: 0.5 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 280 } },
    exit: { x: isRtl ? '100%' : '-100%', opacity: 0, transition: { duration: 0.2 } },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-80 max-w-[85vw] h-full bg-[#080d1a] border-r ${
              isRtl ? 'border-l border-r-0 mr-0 ml-auto' : 'border-r ml-0 mr-auto'
            } border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header & Profile Card */}
            <div className="p-5 border-b border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md">
                    👑
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base leading-tight">
                      {t('drawerTitle')}
                    </h3>
                    <p className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                      Virtual Master League
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 hover:border-amber-400 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Coach Profile Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0c1427] border border-slate-700/70 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-lg overflow-hidden shrink-0 shadow-md">
                    {teamData?.logo ? (
                      <img src={teamData.logo} alt={teamName} className="w-full h-full object-cover p-1" />
                    ) : (
                      '⚽'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{coachName}</h4>
                    <p className="text-xs text-amber-300/90 truncate">{teamName}</p>
                  </div>
                </div>

                {/* Team Currency Badges */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-300">
                    <Coins size={13} className="text-amber-400 shrink-0" />
                    <span className="font-bold truncate">
                      {Number(teamData?.budget || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-cyan-500/20 text-cyan-300">
                    <Gem size={13} className="text-cyan-400 shrink-0" />
                    <span className="font-bold truncate">
                      {Number(teamData?.gems || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="p-4 space-y-1.5 flex-1">
              <button
                onClick={() => handleNavigate('live')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900/80 text-slate-200 hover:text-amber-400 transition-all cursor-pointer group border border-transparent hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Tv size={18} />
                  </div>
                  <span className="font-bold text-sm">{t('liveStream')}</span>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => handleNavigate('store')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900/80 text-slate-200 hover:text-amber-400 transition-all cursor-pointer group border border-transparent hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShoppingCart size={18} />
                  </div>
                  <span className="font-bold text-sm">{t('store')}</span>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => handleNavigate('battle_royale')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900/80 text-slate-200 hover:text-amber-400 transition-all cursor-pointer group border border-transparent hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Swords size={18} />
                  </div>
                  <span className="font-bold text-sm">{t('battleRoyale')}</span>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => handleNavigate('club')}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-900/80 text-slate-200 hover:text-amber-400 transition-all cursor-pointer group border border-transparent hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building2 size={18} />
                  </div>
                  <span className="font-bold text-sm">{t('facilities')}</span>
                </div>
                <ArrowIcon size={16} className="text-slate-500 group-hover:text-amber-400" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleNavigate('admin')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-500/30 hover:border-red-500/60 text-red-300 transition-all cursor-pointer group mt-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ShieldAlert size={18} />
                    </div>
                    <span className="font-bold text-sm">{t('adminPanel')}</span>
                  </div>
                  <ArrowIcon size={16} className="text-red-400" />
                </button>
              )}
            </div>

            {/* Footer Settings & Logout */}
            <div className="p-4 border-t border-slate-800/80 space-y-3 bg-black/20">
              {/* Language Switch Row */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <Globe size={14} className="text-amber-400" />
                  {t('languageLabel')}
                </span>
                <button
                  onClick={toggleLang}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {lang === 'fa' ? 'English (EN)' : 'فارسی (FA)'}
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <LogOut size={15} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
