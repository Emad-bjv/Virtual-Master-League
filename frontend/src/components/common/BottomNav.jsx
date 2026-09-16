import React from 'react';
import { Home, ShieldCheck, Trophy, ArrowLeftRight, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export default function BottomNav({ activeTab, onTabChange }) {
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { id: 'home', label: t('navHome'), icon: Home },
    { id: 'team', label: t('navTeam'), icon: ShieldCheck },
    { id: 'league', label: t('navLeague'), icon: Trophy },
    { id: 'market', label: t('navMarket'), icon: ArrowLeftRight },
    { id: 'profile', label: t('navProfile'), icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl z-50 bg-[#060b17]/95 rounded-t-3xl sm:rounded-2xl border-t border-slate-800/90 px-3 pt-2 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 sm:px-3 rounded-2xl transition-all duration-150 min-w-[52px] min-h-[48px] touch-manipulation select-none active:scale-90 cursor-pointer group ${
                isActive
                  ? 'text-amber-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active Golden Glow Underline Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabGoldGlow"
                  className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-amber-500/5 to-transparent rounded-2xl border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                >
                  <div className="absolute -bottom-[2px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-amber-400 rounded-full shadow-[0_0_10px_#f59e0b]"></div>
                </motion.div>
              )}

              <div className="relative z-10">
                <Icon
                  size={22}
                  className={`transition-all duration-200 ${
                    isActive
                      ? 'scale-110 text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                      : 'group-hover:scale-105'
                  }`}
                />
              </div>

              <span className={`text-[10.5px] sm:text-xs mt-1 z-10 leading-none transition-colors ${
                isActive ? 'text-amber-300 font-bold' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
