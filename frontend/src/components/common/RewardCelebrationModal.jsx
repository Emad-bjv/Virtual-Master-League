import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Check, Diamond, DollarSign, Trophy } from 'lucide-react';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function RewardCelebrationModal({
  isOpen,
  onClose,
  title = '🎉 پاداش ویژه باشگاه',
  message = '',
  gems = 0,
  budget = 0,
}) {
  useBodyScrollLock(isOpen);

  // Generate deterministic confetti particle properties
  const confettiParticles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 450,
      y: (Math.random() - 0.5) * 400 - 50,
      rotate: Math.random() * 360,
      scale: Math.random() * 0.7 + 0.5,
      color: [
        'bg-amber-400',
        'bg-yellow-300',
        'bg-cyan-400',
        'bg-emerald-400',
        'bg-purple-400',
        'bg-pink-400'
      ][i % 6],
      delay: (i % 8) * 0.05,
    }));
  }, []);

  if (typeof document === 'undefined') return null;

  const numGems = Number(gems) || 0;
  const numBudget = Number(budget) || 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          {/* Backdrop dismiss */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="relative z-10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-amber-500/40 rounded-3xl w-full max-w-lg my-auto p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 backdrop-blur-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Ambient Background Glow Rays */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-tr from-amber-500/20 via-yellow-400/15 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Confetti Explosion Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              {confettiParticles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: p.x,
                    y: p.y,
                    scale: p.scale,
                    rotate: p.rotate + 180,
                  }}
                  transition={{
                    duration: 1.4,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                  className={`absolute w-3 h-3 rounded-sm ${p.color} shadow-sm`}
                />
              ))}
            </div>

            {/* Glowing Trophy / Gift Icon Header */}
            <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-300/10 to-transparent border border-dashed border-amber-400/40"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/40 text-slate-950 font-black"
              >
                <Gift className="w-10 h-10 text-slate-950 animate-bounce" />
              </motion.div>
              <div className="absolute -top-1 -right-1 bg-yellow-300 text-slate-950 p-1.5 rounded-full shadow-md">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
            </div>

            {/* Title & Message */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl sm:text-3xl font-black text-white tracking-wide mb-2 flex items-center justify-center gap-2"
            >
              <span>{String(title || '🎉 پاداش ویژه باشگاه')}</span>
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed mb-6 px-3"
            >
              {String(message || 'تبریک مربی! پاداش رسمی از طرف مدیریت لیگ به باشگاه شما تعلق گرفت و هم‌اکنون به موجودی شما افزوده شد.')}
            </motion.p>

            {/* Currency Rewards Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
              {numGems > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-slate-900/90 border border-cyan-500/30 flex items-center gap-3.5 shadow-inner"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0 shadow-sm">
                    <Diamond className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-cyan-300/80 font-bold block">الماس / جم</span>
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      +{numGems.toLocaleString('fa-IR')} <span className="text-sm font-normal text-cyan-300">💎</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {numBudget > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: numGems > 0 ? 0.5 : 0.4 }}
                  className={`relative p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900/90 border border-emerald-500/30 flex items-center gap-3.5 shadow-inner ${
                    numGems === 0 ? 'sm:col-span-2 justify-center' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
                    <DollarSign className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-300/80 font-bold block">بودجه باشگاه</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight">
                      +${numBudget.toLocaleString('en-US')}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Button */}
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 hover:brightness-110 active:brightness-95 transition-all cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>دریافت پاداش و ثبت در حساب</span>
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
