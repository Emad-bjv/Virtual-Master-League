import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'success', isVisible }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const styles = {
    success: 'bg-emerald-950/95 border-emerald-500/80 text-emerald-300 shadow-[0_10px_40px_rgba(16,185,129,0.4)]',
    error: 'bg-rose-950/95 border-rose-500/80 text-rose-300 shadow-[0_10px_40px_rgba(244,63,94,0.4)]',
    info: 'bg-cyan-950/95 border-cyan-500/80 text-cyan-300 shadow-[0_10px_40px_rgba(6,182,212,0.4)]',
  };

  const icons = {
    success: <CheckCircle size={24} className="text-emerald-400" />,
    error: <AlertCircle size={24} className="text-rose-400" />,
    info: <Info size={24} className="text-cyan-400" />,
  };

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] px-4 w-full sm:w-auto sm:min-w-[320px] pointer-events-none flex justify-center"
        >
          <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 backdrop-blur-xl max-w-sm sm:max-w-md ${styles[type]}`}>
            <div className="flex items-center gap-3">
              <div className="bg-slate-900/50 p-2 rounded-xl border border-white/10 shrink-0">
                {icons[type]}
              </div>
              <span className="font-black text-sm md:text-base leading-snug">
                {message}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
