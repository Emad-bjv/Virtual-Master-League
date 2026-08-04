import React from 'react';
import { motion } from 'framer-motion';

export default function SubNav({ items, activeId, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none no-scrollbar">
      {items.map((item) => {
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`relative flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
              isActive
                ? `${item.color ? item.color : 'text-purple-300'} font-semibold border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]`
                : `${item.color ? item.color + ' opacity-70 hover:opacity-100' : 'text-slate-400'} bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200`
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSubNavPill"
                className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
