import React from 'react';
import { Home, Users, Building2, ArrowLeftRight, ShoppingCart, Tv } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'home', label: 'خانه', icon: Home, flag: null },
  { id: 'team', label: 'تیم', icon: Users, flag: null },
  { id: 'live', label: 'پخش زنده', icon: Tv, isLive: true, flag: 'feature_live_broadcast' },
  { id: 'club', label: 'باشگاه', icon: Building2, flag: 'feature_club_facilities' },
  { id: 'market', label: 'بازار', icon: ArrowLeftRight, flag: 'feature_transfer_market' },
  { id: 'store', label: 'فروشگاه', icon: ShoppingCart, flag: 'feature_store' },
];

export default function BottomNav({ activeTab, onTabChange, featureFlags = {} }) {
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.flag) return true;
    return featureFlags[item.flag] !== false;
  });

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl z-50 bg-[#080c14]/90 rounded-t-3xl sm:rounded-2xl border-t border-slate-700/60 px-3 pt-2 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.85)]">
      <div className="flex items-center justify-around">
        {visibleNavItems.map((item) => {

          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[50px] min-h-[50px] touch-manipulation group ${
                isActive
                  ? 'text-cyan-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-gradient-to-t from-cyan-500/25 via-cyan-500/10 to-transparent rounded-2xl border border-cyan-400/40 shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                >
                  <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-cyan-400 rounded-full shadow-[0_0_8px_#00f3ff]"></div>
                </motion.div>
              )}

              <div className="relative z-10">
                <Icon
                  size={21}
                  className={`transition-all duration-200 ${
                    isActive
                      ? 'scale-110 text-cyan-300 drop-shadow-[0_0_10px_rgba(0,243,255,0.7)]'
                      : 'group-hover:scale-105'
                  }`}
                />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 z-10 leading-none transition-colors ${
                isActive ? 'text-cyan-300 font-bold' : 'text-slate-400'
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
