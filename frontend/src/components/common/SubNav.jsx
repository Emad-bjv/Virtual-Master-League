import React from 'react';
import { motion } from 'framer-motion';

export default function SubNav({ items, activeId, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-4 scrollbar-none no-scrollbar">
      {items.map((item) => {
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
              isActive
                ? 'text-cyan-300 border border-cyan-400/60 shadow-[0_0_20px_rgba(0,243,255,0.3)] bg-gradient-to-r from-cyan-950/80 via-slate-900 to-purple-950/80'
                : 'text-slate-400 bg-[#0c1222]/80 border border-slate-700/50 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSubNavPill"
                className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-transparent rounded-2xl"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 font-sport text-xs md:text-sm">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
