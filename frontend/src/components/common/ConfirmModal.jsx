import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

/**
 * Modern Confirmation Dialog (Yes/No Modal)
 * Prevents accidental clicks on critical and financial actions.
 */
export default function ConfirmModal({
  isOpen,
  title = 'تأیید عملیات',
  message,
  details = null,
  confirmText = 'بله، مطمئنم',
  cancelText = 'خیر، انصراف',
  variant = 'warning', // 'warning', 'danger', 'success', 'info'
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const variantStyles = {
    warning: {
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      bgGlow: 'bg-amber-500/10',
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      confirmBtn: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black',
      icon: AlertTriangle,
    },
    danger: {
      border: 'border-rose-500/40',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.25)]',
      bgGlow: 'bg-rose-500/10',
      iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      confirmBtn: 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black',
      icon: ShieldAlert,
    },
    success: {
      border: 'border-[#00ff87]/40',
      glow: 'shadow-[0_0_30px_rgba(0,255,135,0.2)]',
      bgGlow: 'bg-[#00ff87]/10',
      iconBg: 'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30',
      confirmBtn: 'bg-gradient-to-r from-[#00ff87] to-cyan-400 hover:from-[#00ff87]/90 hover:to-cyan-300 text-slate-950 font-black',
      icon: CheckCircle2,
    },
    info: {
      border: 'border-cyan-500/40',
      glow: 'shadow-[0_0_30px_rgba(0,243,255,0.2)]',
      bgGlow: 'bg-cyan-500/10',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
      confirmBtn: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black',
      icon: HelpCircle,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.warning;
  const IconComponent = currentVariant.icon;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto dir-rtl font-sans"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`w-full max-w-md bg-gradient-to-b from-[#0e1626] to-[#080d17] border ${currentVariant.border} ${currentVariant.glow} rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="absolute left-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header & Icon */}
          <div className="flex items-start gap-3.5 mb-4">
            <div className={`w-11 h-11 rounded-2xl ${currentVariant.iconBg} flex items-center justify-center shrink-0 shadow-lg mt-0.5`}>
              <IconComponent size={22} />
            </div>
            <div className="flex-1 pr-1">
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Optional Details Badge/Box */}
          {details && (
            <div className="mb-5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              {details}
            </div>
          )}

          {/* Action Buttons: Yes / No */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Cancel (No) Button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all active:scale-95 cursor-pointer font-sport text-center disabled:opacity-50"
            >
              {cancelText}
            </button>

            {/* Confirm (Yes) Button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm ${currentVariant.confirmBtn} transition-all active:scale-95 cursor-pointer shadow-lg font-sport text-center flex items-center justify-center gap-1.5 disabled:opacity-50`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
