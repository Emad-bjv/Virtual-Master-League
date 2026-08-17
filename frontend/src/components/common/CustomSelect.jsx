import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  colorTheme = 'cyan',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({
    left: 0,
    width: 0,
    top: undefined,
    bottom: undefined,
    openUpwards: false,
    maxHeight: 240,
  });

  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // If space below is less than 240px and space above has more room, open upwards
    const openUpwards = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableHeight = openUpwards ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.min(280, Math.max(150, availableHeight));

    setCoords({
      left: rect.left,
      width: rect.width,
      top: openUpwards ? undefined : rect.bottom + 6,
      bottom: openUpwards ? window.innerHeight - rect.top + 6 : undefined,
      openUpwards,
      maxHeight,
    });
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (event) => {
      const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isInsideMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, updatePosition]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Dynamic theme colors
  const themeStyles = {
    cyan: {
      borderOpen: 'border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.35)]',
      icon: 'text-cyan-400',
      activeBg: 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border-cyan-400/40',
      activeText: 'text-cyan-300',
    },
    rose: {
      borderOpen: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
      icon: 'text-rose-400',
      activeBg: 'bg-gradient-to-r from-rose-600/30 to-purple-600/30 border-rose-500/40',
      activeText: 'text-rose-300',
    },
    emerald: {
      borderOpen: 'border-[#00ff87] shadow-[0_0_20px_rgba(0,255,135,0.35)]',
      icon: 'text-[#00ff87]',
      activeBg: 'bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border-emerald-500/40',
      activeText: 'text-[#00ff87]',
    },
  };

  const theme = themeStyles[colorTheme] || themeStyles.cyan;

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all duration-300 outline-none focus:outline-none focus:ring-0 cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99]'
        } ${
          isOpen
            ? `${theme.borderOpen} bg-[#080c14]/95`
            : 'border-slate-700/80 bg-[#05080e]/90 hover:border-cyan-500/50 hover:bg-[#080c14]'
        }`}
      >
        <span className={`font-black text-xs sm:text-sm truncate ${isOpen ? theme.activeText : 'text-white'}`}>
          {selectedOption?.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, type: 'spring', stiffness: 250, damping: 18 }}
          className="shrink-0 mr-2"
        >
          <ChevronDown size={18} className={theme.icon} />
        </motion.div>
      </button>

      {/* Render menu in a Portal directly to document.body so it NEVER clips under other containers */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={menuRef}
                initial={{
                  opacity: 0,
                  y: coords.openUpwards ? 8 : -8,
                  scale: 0.97,
                  transformOrigin: coords.openUpwards ? 'bottom center' : 'top center',
                }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  y: coords.openUpwards ? 8 : -8,
                  scale: 0.97,
                }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  left: coords.left,
                  width: coords.width,
                  top: coords.top,
                  bottom: coords.bottom,
                  maxHeight: coords.maxHeight,
                  zIndex: 999999,
                  overscrollBehavior: 'contain',
                }}
                className="bg-[#080c14]/98 backdrop-blur-2xl border-2 border-slate-700/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-y-auto custom-scrollbar dir-rtl"
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
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-xs sm:text-sm font-bold text-right outline-none focus:outline-none cursor-pointer ${
                          isActive
                            ? `${theme.activeBg} ${theme.activeText} border font-black`
                            : 'text-slate-300 hover:bg-slate-800/90 hover:text-white border border-transparent'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="shrink-0 mr-2"
                          >
                            <Check size={16} className={theme.icon} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
