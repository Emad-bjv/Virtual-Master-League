import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, className = '', colorTheme = 'cyan' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Open upwards ONLY if remaining space below is tight AND top space is larger
      if (spaceBelow < 240 && spaceAbove > spaceBelow && spaceAbove > 200) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Dynamic theme colors
  const themeStyles = {
    cyan: {
      borderOpen: 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      icon: 'text-cyan-400',
      activeBg: 'bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-cyan-500/30',
      activeText: 'text-cyan-300',
    },
    rose: {
      borderOpen: 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
      icon: 'text-rose-400',
      activeBg: 'bg-gradient-to-r from-rose-600/20 to-purple-600/20 border-rose-500/30',
      activeText: 'text-rose-300',
    },
    emerald: {
      borderOpen: 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      icon: 'text-emerald-400',
      activeBg: 'bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-emerald-500/30',
      activeText: 'text-emerald-300',
    }
  };

  const theme = themeStyles[colorTheme] || themeStyles.cyan;

  return (
    <div className={`relative w-full ${isOpen ? 'z-40' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-300 outline-none focus:outline-none focus:ring-0 active:scale-[0.98] ${
          isOpen 
            ? `${theme.borderOpen} bg-slate-900/95` 
            : 'border-slate-700/80 bg-slate-950/80 hover:border-slate-600 hover:bg-slate-900/90'
        }`}
      >
        <span className={`font-bold text-sm ${isOpen ? theme.activeText : 'text-slate-200'}`}>
          {selectedOption?.label}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 15 }}>
          <ChevronDown size={18} className={theme.icon} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: openUpwards ? 10 : -10,
              scale: 0.95,
              transformOrigin: openUpwards ? 'bottom center' : 'top center',
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: openUpwards ? 10 : -10,
              scale: 0.95,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute z-50 w-full bg-slate-900/98 backdrop-blur-2xl border-2 border-slate-700/90 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] max-h-52 md:max-h-60 overflow-y-auto custom-scrollbar ${
              openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
            style={{ overscrollBehavior: 'contain' }}
          >
            <div className="p-1.5 flex flex-col gap-1">
              {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 text-sm font-bold text-right outline-none focus:outline-none ${
                      isActive
                        ? `${theme.activeBg} ${theme.activeText} border`
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <Check size={16} className={theme.icon} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
