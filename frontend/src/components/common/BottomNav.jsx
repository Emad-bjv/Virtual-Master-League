import React from 'react';
import { Home, Users, Building2, ArrowLeftRight, ShoppingCart, Tv } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'home', label: 'خانه', icon: Home },
  { id: 'team', label: 'تیم', icon: Users },
  { id: 'live', label: 'پخش زنده', icon: Tv, isLive: true },
  { id: 'club', label: 'باشگاه', icon: Building2 },
  { id: 'market', label: 'بازار', icon: ArrowLeftRight },
  { id: 'store', label: 'فروشگاه', icon: ShoppingCart },
];

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl z-50 glass-panel rounded-t-3xl sm:rounded-2xl border-t border-slate-800/80 px-2 pt-1.5 pb-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all duration-200 min-w-[48px] min-h-[48px] touch-manipulation ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-purple-500/10 rounded-xl border border-cyan-500/30 neon-glow-cyan"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    isActive ? 'scale-110 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]' : ''
                  }`}
                />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-1 z-10 leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
