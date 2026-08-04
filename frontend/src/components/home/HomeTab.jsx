import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Mail, CheckCircle2, Circle, Trophy, Flame, ChevronLeft, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomeTab({ onNavigateTab, isLineupSubmitted = false }) {
  // Live Timer for Special Offer
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 12 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Daily Missions State
  const [missions, setMissions] = useState([
    { id: 1, text: '۳ بازیکن را تست کن', current: 2, target: 3, reward: '۲۰۰ سکه', claimed: false },
    { id: 2, text: 'یک بازی دوستانه برنده شو', current: 0, target: 1, reward: '۱ پک برنزی', claimed: false },
  ]);

  const claimMissionReward = (id) => {
    setMissions((prev) =>
      prev.map((m) => (m.id === id ? { ...m, claimed: true, current: m.target } : m))
    );
  };

  const formatTime = (val) => String(val).padStart(2, '0');

  return (
    <div className="space-y-4 pb-20">
      {/* Special Offer Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-3.5 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 flex items-center justify-between shadow-lg shadow-purple-950/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 neon-glow-purple">
            <Sparkles size={18} className="animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">آفر ویژه هفته</span>
            <span className="text-[11px] text-purple-300">۳۰٪ تخفیف خرید سکه با دیزاین اختصاصی</span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab?.('store')}
          className="flex flex-col items-end bg-purple-950/70 border border-purple-500/50 hover:bg-purple-900/80 px-3 py-1.5 rounded-xl transition-all"
        >
          <span className="text-[10px] text-purple-300">مهلت باقی‌مانده:</span>
          <span className="text-xs font-mono font-bold text-cyan-400 dir-ltr">
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </button>
      </motion.div>

      {/* Next Match Card - Warning State if Lineup not submitted within 1 Hour */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`glass-panel p-4 rounded-2xl border transition-all ${
          !isLineupSubmitted
            ? 'border-2 border-rose-500 bg-gradient-to-r from-rose-950/80 via-amber-950/60 to-slate-900 shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse'
            : 'border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            {!isLineupSubmitted ? (
              <AlertTriangle size={18} className="text-rose-400 animate-bounce" />
            ) : (
              <Calendar size={16} className="text-cyan-400" />
            )}
            <span className={!isLineupSubmitted ? 'text-rose-300 font-black' : ''}>
              بازی بعدی {!isLineupSubmitted && '(هشدار ترکیب!)'}
            </span>
          </div>
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
              !isLineupSubmitted
                ? 'bg-rose-950 text-rose-300 border border-rose-500/50 font-bold'
                : 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/30'
            }`}
          >
            {!isLineupSubmitted ? '⏰ کمتر از ۱ ساعت تا شروع (۴۵ دقیقه)' : 'هفته دوازدهم'}
          </span>
        </div>

        {!isLineupSubmitted && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>هشدار مربی: کمتر از ۱ ساعت تا شروع بازی باقی مانده اما ترکیب تیم ثبت نشده است!</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('team', 'lineup')}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black px-3 py-1.5 rounded-lg text-[11px] shrink-0 transition-all shadow-md active:scale-95 text-center"
            >
              ثبت سریع ترکیب
            </button>
          </div>
        )}

        <div className="flex items-center justify-between py-2 px-2 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-400 text-xs">
              البرز
            </div>
            <span className="text-xs font-bold text-white">باشگاه البرز</span>
          </div>

          <div className="text-center">
            <span className="text-sm font-black text-cyan-400 px-3 py-1 bg-slate-950 rounded-lg border border-cyan-500/30 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
              VS
            </span>
            <span className="text-[10.5px] text-slate-400 block mt-1">امروز، ساعت ۱۸:۰۰ (۴۵ دقیقه مانده)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">سپاهان</span>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xs">
              سپاه
            </div>
          </div>
        </div>

        {isLineupSubmitted && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>ترکیب نهایی تیم برای این مسابقه با موفقیت ثبت شد.</span>
          </div>
        )}
      </motion.div>

      {/* Inbox & Daily Missions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inbox / Messages */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-4 rounded-2xl border border-slate-800"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Mail size={16} className="text-purple-400" />
              <span>صندوق پیام</span>
            </div>
            <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
              ۳ پیام جدید
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-200">نتیجه بازی: برد ۲-۱ در مقابل الاهلی</span>
              </div>
              <span className="text-[10px] text-slate-500">۱۰ دقبقه پیش</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-slate-200">پیشنهاد خرید برای رضا کریمی (۵۰۰ م)</span>
              </div>
              <span className="text-[10px] text-slate-500">۱ ساعت پیش</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span className="text-slate-300">آفر جدید در فروشگاه فصلی فعال شد</span>
              </div>
              <span className="text-[10px] text-slate-500">دیروز</span>
            </div>
          </div>
        </motion.div>

        {/* Daily Missions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel p-4 rounded-2xl border border-slate-800"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Flame size={16} className="text-amber-400" />
              <span>ماموریت‌های روزانه</span>
            </div>
            <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
              ریست: ۱۲ ساعت دیگر
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {missions.map((m) => (
              <div key={m.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.current >= m.target ? (
                      <CheckCircle2 size={15} className="text-emerald-400" />
                    ) : (
                      <Circle size={15} className="text-slate-500" />
                    )}
                    <span className="text-slate-200 font-medium">{m.text}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {m.current}/{m.target}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
                    style={{ width: `${(m.current / m.target) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] text-amber-400">جایزه: {m.reward}</span>
                  {m.current >= m.target && !m.claimed && (
                    <button
                      onClick={() => claimMissionReward(m.id)}
                      className="text-[10px] bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/40 text-emerald-300 font-bold px-2 py-0.5 rounded-lg transition-colors"
                    >
                      دریافت جایزه
                    </button>
                  )}
                  {m.claimed && (
                    <span className="text-[10px] text-slate-500">دریافت شد</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* League Standings Snippet */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-4 rounded-2xl border border-slate-800"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Trophy size={16} className="text-amber-400" />
            <span>وضعیت جدول لیگ برتر</span>
          </div>
          <button
            onClick={() => onNavigateTab?.('team', 'table')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>مشاهده کامل</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-slate-900/40 text-slate-400">
            <span>۲ — تراکتور</span>
            <span className="font-semibold text-slate-300">۴۵ امتیاز</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/50 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <span className="text-cyan-400 flex items-center gap-2">
              <span>۳ — باشگاه البرز</span>
              <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40">تیم شما</span>
            </span>
            <span className="text-cyan-300">۴۲ امتیاز</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-slate-900/40 text-slate-400">
            <span>۴ — استقلال</span>
            <span className="font-semibold text-slate-300">۴۰ امتیاز</span>
          </div>
        </div>
      </motion.div>

      {/* 5 Recent Games Form Guide */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel p-4 rounded-2xl border border-slate-800"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-xs font-bold text-slate-200">فرم بازی‌های اخیر (۵ بازی آخر)</span>
          <span className="text-[10.5px] text-emerald-400 font-medium">۳ برد، ۱ مساوی، ۱ باخت</span>
        </div>

        <div className="flex items-center gap-2 justify-center py-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center text-xs shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            برد
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center text-xs shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            برد
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-bold flex items-center justify-center text-xs">
            مساوی
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 font-bold flex items-center justify-center text-xs shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            باخت
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center text-xs shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            برد
          </div>
        </div>
      </motion.div>
    </div>
  );
}
