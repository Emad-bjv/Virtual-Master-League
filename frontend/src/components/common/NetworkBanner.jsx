import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Info } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export default function NetworkBanner() {
  const { isOnline } = useNetworkStatus();
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail?.message) {
        setToastMessage(e.detail.message);
        setTimeout(() => {
          setToastMessage(null);
        }, 2200);
      }
    };

    window.addEventListener('vml-toast', handleToast);
    return () => window.removeEventListener('vml-toast', handleToast);
  }, []);

  return (
    <>
      {/* Offline Status Warning Bar */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-[999999] bg-gradient-to-r from-red-600/95 via-rose-600/95 to-red-700/95 text-white px-4 py-2.5 backdrop-blur-md shadow-lg border-b border-red-400/30 flex items-center justify-between text-xs sm:text-sm font-medium pt-safe select-none"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-red-800/60 animate-pulse">
                <WifiOff className="w-4 h-4 text-white" />
              </div>
              <span>ارتباط با سرور قطع شد — تلاش مجدد خودکار...</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-xs font-bold flex items-center gap-1.5 touch-manipulation cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>تلاش مجدد</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightweight Native Feedback Toast (e.g. Press Back Again to Exit) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999999] bg-slate-900/95 text-slate-100 border border-slate-700/80 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 text-xs font-semibold select-none pointer-events-none"
          >
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
