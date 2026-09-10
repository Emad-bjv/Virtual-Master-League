import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, Unlock, ArrowLeftRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { transferApi } from '../../services/api';

export default function TransferCountdownBanner({ onStatusChange, compact = false }) {
  const [statusData, setStatusData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await transferApi.getMarketStatus();
      if (res.data) {
        setStatusData(res.data);
        setSecondsRemaining(Math.max(0, parseInt(res.data.seconds_remaining || 0, 10)));
        if (onStatusChange) {
          onStatusChange(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed to load transfer market status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 60 seconds to keep synced with server
    const pollInterval = setInterval(fetchStatus, 60000);
    return () => clearInterval(pollInterval);
  }, []);

  // Tick countdown locally every second
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchStatus(); // Refresh when countdown hits zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const formattedTime = useMemo(() => {
    if (secondsRemaining <= 0) return '00:00:00';
    const d = Math.floor(secondsRemaining / (3600 * 24));
    const h = Math.floor((secondsRemaining % (3600 * 24)) / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (d > 0) {
      return `${d} روز و ${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }, [secondsRemaining]);

  if (loading || !statusData) {
    return null;
  }

  const isOpen = Boolean(statusData.is_open);
  const mode = statusData.mode || 'AUTO';

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
          isOpen
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/10'
        }`}
      >
        {isOpen ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
        <span>{isOpen ? 'بازار نقل‌وانتقالات: باز' : 'بازار نقل‌وانتقالات: قفل'}</span>
        {secondsRemaining > 0 && (
          <span className="font-mono font-black text-white bg-black/40 px-1.5 py-0.5 rounded-lg text-[11px] ltr">
            {formattedTime}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 backdrop-blur-xl transition-all shadow-xl ${
        isOpen
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-teal-950/80 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-amber-950/80 border-rose-500/40 shadow-rose-950/20'
      }`}
    >
      {/* Background Subtle Accent Glow */}
      <div
        className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isOpen ? 'bg-emerald-400' : 'bg-rose-500'
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left / Top Info */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {isOpen ? <Unlock className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                {isOpen ? 'پنجره نقل‌وانتقالات باز است' : 'پنجره نقل‌وانتقالات قفل است'}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isOpen
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
              >
                {statusData.status_label || (isOpen ? 'فعال' : 'بسته')}
              </span>
              {mode !== 'AUTO' && (
                <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  دستور ادمین ({mode})
                </span>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
              {String(statusData.message || '')}
            </p>
          </div>
        </div>

        {/* Right / Countdown Block */}
        {secondsRemaining > 0 && (
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 self-stretch md:self-auto justify-between md:justify-end">
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 block">
                {isOpen ? 'زمان تا پایان بازار:' : 'زمان تا بازگشایی بازار:'}
              </span>
              <span className="text-xs font-semibold text-gray-200">
                {isOpen ? 'بسته شدن خودکار' : 'بازگشایی خودکار'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-base font-black text-amber-300 tracking-wider ltr">
                {formattedTime}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
