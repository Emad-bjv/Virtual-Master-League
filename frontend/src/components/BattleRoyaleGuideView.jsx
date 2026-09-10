import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Flame, Trophy, Clock, ArrowLeftRight,
  Sparkles, RefreshCw, Zap, UserCheck, ArrowRight,
  ArrowDown, CheckCircle2, XCircle, Play, RotateCcw,
  HelpCircle, Heart, HeartOff, ChevronLeft, Swords, Info
} from 'lucide-react';
import { getTeamLogoUrl } from '../utils/teamLogos';

export default function BattleRoyaleGuideView() {
  // Simulator State
  const [simTeam, setSimTeam] = useState('پرسپولیس');
  const [simStep, setSimStep] = useState(0); // 0: Start, 1: Round 1, 2: Branch, ...
  const [simScenario, setSimScenario] = useState(null); // 'flawless' | 'comeback' | null
  const [simLives, setSimLives] = useState(2);
  const [simStatus, setSimStatus] = useState('WB_R1'); // 'WB_R1', 'WB_SEMI', 'WB_FINAL', 'LB_R1', 'LB_R2', 'LB_FINAL', 'GF_M1', 'GF_RESET', 'CHAMPION', 'ELIMINATED'
  const [simHistory, setSimHistory] = useState([
    { text: 'تورنمنت آغاز شد. تیم شما در دور اول جدول برندگان قرار دارد.', type: 'info' }
  ]);

  const teamLogos = {
    'پرسپولیس': '/logos/persepolis.webp',
    'استقلال': '/logos/esteghlal.webp',
    'سپاهان': '/logos/sepahan.webp',
    'تراکتور': '/logos/tractor.webp'
  };

  // Reset simulator
  const handleResetSim = () => {
    setSimStep(0);
    setSimScenario(null);
    setSimLives(2);
    setSimStatus('WB_R1');
    setSimHistory([
      { text: `شبیه‌ساز با تیم ${simTeam} ریست شد. شما با ۲ جان در دور اول جدول برندگان هستید.`, type: 'info' }
    ]);
  };

  // Preset Scenario 1: Flawless Run (Golden Path)
  const handleFlawlessRun = () => {
    setSimScenario('flawless');
    setSimLives(2);
    setSimStatus('CHAMPION');
    setSimStep(4);
    setSimHistory([
      { text: 'گام ۱: پیروزی در دور اول برندگان (۲ - ۰) مقابل رقیب.', type: 'win' },
      { text: 'گام ۲: پیروزی در نیمه‌نهایی برندگان (۱ - ۰) و صعود به فینال برندگان.', type: 'win' },
      { text: 'گام ۳: پیروزی در فینال جدول برندگان و صعود مستقیم به فینال بزرگ با ۲ جان کامل!', type: 'win' },
      { text: 'گام ۴: پیروزی مقتدرانه در مسابقه اول فینال بزرگ و کسب جام قهرمانی نبرد رویال 🏆', type: 'champion' }
    ]);
  };

  // Preset Scenario 2: Epic Comeback & Bracket Reset
  const handleComebackRun = () => {
    setSimScenario('comeback');
    setSimLives(1);
    setSimStatus('CHAMPION');
    setSimStep(5);
    setSimHistory([
      { text: 'گام ۱: شکست در دور اول برندگان (۰ - ۱). اولین جان از دست رفت، اما شما حذف نشدید!', type: 'loss' },
      { text: 'گام ۲: سقوط به جدول بازندگان (شروع نبرد بقا با ۱ جان باقی‌مانده).', type: 'info' },
      { text: 'گام ۳: پیروزی‌های پیاپی در جدول بازندگان تا فینال دره مرگ و صعود به فینال بزرگ!', type: 'win' },
      { text: 'گام ۴: پیروزی در مسابقه اول فینال بزرگ مقابل قهرمان برندگان! براکت ریست شد (چون رقیب هم ۱ جان باخت).', type: 'reset' },
      { text: 'گام ۵: پیروزی در مسابقه نهایی ریست براکت و قهرمانی شگفت‌انگیز با جام طلایی 🏆', type: 'champion' }
    ]);
  };

  // Interactive Manual Actions
  const handleSimAction = (isWin) => {
    if (simStatus === 'CHAMPION' || simStatus === 'ELIMINATED') return;

    if (simStatus === 'WB_R1') {
      if (isWin) {
        setSimStatus('WB_FINAL');
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'پیروزی در دور ۱ برندگان! با ۲ جان به فینال برندگان صعود کردید.', type: 'win' }
        ]);
      } else {
        setSimStatus('LB_R1');
        setSimLives(1);
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'شکست در دور ۱! حذف نشدید؛ ۱ جان کسر شد و به جدول بازندگان سقوط کردید.', type: 'loss' }
        ]);
      }
    } else if (simStatus === 'WB_FINAL') {
      if (isWin) {
        setSimStatus('GF_M1');
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'پیروزی در فینال برندگان! راهی فینال بزرگ شدید (همچنان با ۲ جان کامل).', type: 'win' }
        ]);
      } else {
        setSimStatus('LB_FINAL');
        setSimLives(1);
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'شکست در فینال برندگان! به فینال جدول بازندگان منتقل شدید (۱ جان باقی‌مانده).', type: 'loss' }
        ]);
      }
    } else if (simStatus === 'LB_R1') {
      if (isWin) {
        setSimStatus('LB_FINAL');
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'پیروزی در جدول بازندگان! به فینال بازندگان صعود کردید.', type: 'win' }
        ]);
      } else {
        setSimStatus('ELIMINATED');
        setSimLives(0);
        setSimHistory((prev) => [
          ...prev,
          { text: 'شکست دوم! دومین جان از دست رفت و تیم شما از تورنمنت حذف شد.', type: 'eliminated' }
        ]);
      }
    } else if (simStatus === 'LB_FINAL') {
      if (isWin) {
        setSimStatus('GF_M1');
        setSimStep((s) => s + 1);
        setSimHistory((prev) => [
          ...prev,
          { text: 'پیروزی در فینال بازندگان! شما به عنوان قهرمان بازنده‌ها به فینال بزرگ رسیدید.', type: 'win' }
        ]);
      } else {
        setSimStatus('ELIMINATED');
        setSimLives(0);
        setSimHistory((prev) => [
          ...prev,
          { text: 'شکست دوم در جدول بازندگان! تیم از مسابقات حذف شد.', type: 'eliminated' }
        ]);
      }
    } else if (simStatus === 'GF_M1') {
      if (isWin) {
        // If team was undefeated with 2 lives, direct champion!
        // If team had 1 life, they force bracket reset!
        if (simLives === 2) {
          setSimStatus('CHAMPION');
          setSimHistory((prev) => [
            ...prev,
            { text: 'پیروزی در فینال بزرگ! شما بدون حتی یک شکست قهرمان تورنمنت شدید! 🏆', type: 'champion' }
          ]);
        } else {
          setSimStatus('GF_RESET');
          setSimHistory((prev) => [
            ...prev,
            { text: 'پیروزی بر قهرمان جدول برندگان! براکت ریست شد (هر دو تیم اکنون ۱ باخت دارند). مسابقه مرگ و زندگی فعال شد!', type: 'reset' }
          ]);
        }
      } else {
        if (simLives === 2) {
          setSimStatus('GF_RESET');
          setSimLives(1);
          setSimHistory((prev) => [
            ...prev,
            { text: 'اولین شکست شما در فینال اول رقم خورد! چون ۲ جان داشتید حذف نمی‌شوید؛ بازی دوم (ریست براکت) تکلیف قهرمان را معلوم می‌کند.', type: 'reset' }
          ]);
        } else {
          setSimStatus('ELIMINATED');
          setSimLives(0);
          setSimHistory((prev) => [
            ...prev,
            { text: 'شکست در فینال بزرگ! دومین باخت ثبت شد و نایب قهرمان شدید.', type: 'eliminated' }
          ]);
        }
      }
    } else if (simStatus === 'GF_RESET') {
      if (isWin) {
        setSimStatus('CHAMPION');
        setSimHistory((prev) => [
          ...prev,
          { text: 'پیروزی در مسابقه نهایی ریست براکت! جام زرین قهرمانی از آن شماست! 🏆🔥', type: 'champion' }
        ]);
      } else {
        setSimStatus('ELIMINATED');
        setSimLives(0);
        setSimHistory((prev) => [
          ...prev,
          { text: 'شکست در مسابقه ریست براکت! پایان کار با مدال نقره تورنمنت.', type: 'eliminated' }
        ]);
      }
    }
  };

  return (
    <div className="space-y-8 font-sans text-right dir-rtl pb-32 sm:pb-40">
      {/* 1. Hero Summary Card with Visual Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-[#0a1122] to-[#1a0f28] border-2 border-amber-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.8)]"
      >
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
              <Sparkles size={14} className="animate-spin-slow text-amber-400" />
              <span>راهنمای تعاملی و دیاگرام بصری نبرد رویال</span>
            </div>

            {/* Visual Life Badges */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-2xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-bold ml-1">سیستم بقا:</span>
              <span className="text-emerald-400 font-black flex items-center gap-1">
                <Heart size={14} className="fill-emerald-400" /> ۲ جان (فرصت دوباره)
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white leading-tight flex items-center gap-3">
            <span>درک بصری فرمت حذفی دوطرفه (Double Elimination)</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            در مسابقات سنتی حذفی، یک باخت اتفاقی همه چیز را نابود می‌کند. اما در <strong className="text-amber-400">نبرد رویال</strong>، مسابقات به دو طبقه تقسیم می‌شوند:
            <span className="text-emerald-400 font-bold"> جدول برندگان</span> و
            <span className="text-amber-400 font-bold"> جدول بازندگان</span>. با اولین باخت، سقوط می‌کنید اما حذف نمی‌شوید؛ تنها تیمی حذف می‌شود که
            <span className="text-rose-400 font-bold"> ۲ بار شکست بخورد</span>!
          </p>

          {/* Quick Pillar Tags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
              <span className="text-[11px] font-black text-emerald-300 block">🟢 جدول برندگان</span>
              <span className="text-[10px] text-slate-400">مسیر بدون باخت</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-center">
              <span className="text-[11px] font-black text-amber-300 block">🟠 جدول بازندگان</span>
              <span className="text-[10px] text-slate-400">نبرد شانس دوم</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-center">
              <span className="text-[11px] font-black text-purple-300 block">🟣 فینال و ریست براکت</span>
              <span className="text-[10px] text-slate-400">امکان بازی دوم</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
              <span className="text-[11px] font-black text-rose-300 block">🔴 خروج از مسابقات</span>
              <span className="text-[10px] text-slate-400">فقط با ۲ باخت</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Live Simulator (شبیه‌ساز زنده حرکت تیم) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/30 shadow-2xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <Play size={22} className="text-cyan-400 fill-cyan-400/30" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>شبیه‌ساز تعاملی نبرد رویال (Interactive Bracket Simulator)</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">زنده</span>
              </h3>
              <p className="text-xs text-slate-400">روی برد یا باخت کلیک کنید و مسیر زنده حرکت تیم خود را روی براکت تماشا کنید!</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleFlawlessRun}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>👑 سناریوی ۱: قهرمانی مستقیم</span>
            </button>
            <button
              onClick={handleComebackRun}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔥 سناریوی ۲: بازگشت از بازنده‌ها</span>
            </button>
            <button
              onClick={handleResetSim}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
              title="ریست شبیه‌ساز"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Live Simulator Board Visualizer */}
        <div className="relative bg-[#060a14] rounded-3xl p-5 border border-slate-800 overflow-hidden">
          {/* Top Status HUD */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">تیم انتخابی شما:</span>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-xl">
                <span className="text-xs font-black text-white">{simTeam}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">تعداد جان باقی‌مانده:</span>
                <div className="flex items-center gap-1">
                  {simLives >= 1 ? (
                    <Heart size={16} className="text-rose-500 fill-rose-500 animate-pulse" />
                  ) : (
                    <HeartOff size={16} className="text-slate-600" />
                  )}
                  {simLives >= 2 ? (
                    <Heart size={16} className="text-rose-500 fill-rose-500 animate-pulse" />
                  ) : (
                    <HeartOff size={16} className="text-slate-600" />
                  )}
                </div>
              </div>

              <span className={`text-xs px-2.5 py-1 rounded-xl font-bold ${simStatus === 'CHAMPION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  simStatus === 'ELIMINATED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    simLives === 2 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                }`}>
                {simStatus === 'CHAMPION' ? '🏆 قهرمان مسابقات' :
                  simStatus === 'ELIMINATED' ? '💀 حذف شده' :
                    simLives === 2 ? 'در جدول برندگان (امن)' : 'در جدول بازندگان (خطر حذف)'}
              </span>
            </div>
          </div>

          {/* Graphical Multi-Tier Nodes */}
          <div className="space-y-6">
            {/* TIER 1: WINNERS BRACKET */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 relative">
              <div className="flex items-center justify-between mb-3 text-xs font-black text-emerald-400">
                <span className="flex items-center gap-1">
                  <Shield size={14} /> طبقه اول: جدول برندگان (Winners Tier)
                </span>
                <span className="text-[10px] text-emerald-400/70">مسیر سبز با هر برد رو به جلو می‌رود</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Node WB_R1 */}
                <div className={`p-3 rounded-xl border text-center transition-all ${simStatus === 'WB_R1'
                    ? 'bg-cyan-600/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">دور اول برندگان</span>
                  <span className="text-xs font-bold text-white">مسابقه افتتاحیه</span>
                  {simStatus === 'WB_R1' && (
                    <span className="inline-block mt-1 text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                </div>

                {/* Node WB_FINAL */}
                <div className={`p-3 rounded-xl border text-center transition-all ${simStatus === 'WB_FINAL'
                    ? 'bg-cyan-600/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">نیمه‌نهایی / فینال برندگان</span>
                  <span className="text-xs font-bold text-white">گام نهایی برندگان</span>
                  {simStatus === 'WB_FINAL' && (
                    <span className="inline-block mt-1 text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                </div>

                {/* Node GF_M1_WB */}
                <div className={`p-3 rounded-xl border text-center transition-all ${simStatus === 'GF_M1' && simLives === 2
                    ? 'bg-amber-600/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">فینال بزرگ</span>
                  <span className="text-xs font-bold text-white">صعود به عنوان تیم بدون باخت</span>
                  {simStatus === 'GF_M1' && simLives === 2 && (
                    <span className="inline-block mt-1 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* CONNECTOR ARROWS (DROP-DOWN TRANSITION) */}
            <div className="flex items-center justify-around py-1 px-4 text-xs font-black text-amber-400">
              <div className="flex items-center gap-1 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/40 shadow-inner">
                <ArrowDown size={14} className="animate-bounce text-amber-400" />
                <span>سقوط در صورت شکست (انتقال با ۱ جان به جدول بازندگان)</span>
                <ArrowDown size={14} className="animate-bounce text-amber-400" />
              </div>
            </div>

            {/* TIER 2: LOSERS BRACKET */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 relative">
              <div className="flex items-center justify-between mb-3 text-xs font-black text-amber-400">
                <span className="flex items-center gap-1">
                  <Flame size={14} /> طبقه دوم: جدول بازندگان (Losers Tier - شانس دوباره)
                </span>
                <span className="text-[10px] text-amber-400/70">شکست در این مرحله به معنی حذف قطعی است</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Node LB_R1 */}
                <div className={`p-3 rounded-xl border text-center transition-all ${simStatus === 'LB_R1'
                    ? 'bg-amber-600/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">دور اول بازندگان</span>
                  <span className="text-xs font-bold text-white">نبرد بقای اول</span>
                  {simStatus === 'LB_R1' && (
                    <span className="inline-block mt-1 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                </div>

                {/* Node LB_FINAL */}
                <div className={`p-3 rounded-xl border text-center transition-all ${simStatus === 'LB_FINAL'
                    ? 'bg-amber-600/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">فینال بازندگان</span>
                  <span className="text-xs font-bold text-white">بلیط فینال بزرگ</span>
                  {simStatus === 'LB_FINAL' && (
                    <span className="inline-block mt-1 text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                </div>

                {/* Node GF_M1_LB */}
                <div className={`p-3 rounded-xl border text-center transition-all ${(simStatus === 'GF_M1' && simLives === 1) || simStatus === 'GF_RESET'
                    ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-102'
                    : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}>
                  <span className="text-[10px] text-slate-400 block">فینال بزرگ + ریست</span>
                  <span className="text-xs font-bold text-white">مصاف دو قهرمان</span>
                  {(simStatus === 'GF_M1' && simLives === 1) && (
                    <span className="inline-block mt-1 text-[9px] bg-purple-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                      موقعیت فعلی شما📍
                    </span>
                  )}
                  {simStatus === 'GF_RESET' && (
                    <span className="inline-block mt-1 text-[9px] bg-amber-300 text-slate-950 font-black px-1.5 py-0.2 rounded-full animate-bounce">
                      بازی دوم (ریست براکت)⚡
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Step Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              {simStatus === 'CHAMPION' ? (
                <span className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <Trophy size={18} /> تبریک! تیم شما بر قله نبرد رویال ایستاد!
                </span>
              ) : simStatus === 'ELIMINATED' ? (
                <span className="text-rose-400 font-black text-sm flex items-center gap-1.5">
                  <XCircle size={18} /> با ۲ باخت، کار تیم شما در این تورنمنت به پایان رسید.
                </span>
              ) : (
                <span>در مرحله <strong className="text-cyan-300">{simStatus}</strong> هستید. نتیجه این بازی چه باشد؟</span>
              )}
            </div>

            {simStatus !== 'CHAMPION' && simStatus !== 'ELIMINATED' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSimAction(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>ثبت پیروزی (برد) 🟢</span>
                </button>
                <button
                  onClick={() => handleSimAction(false)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={16} />
                  <span>ثبت شکست (باخت) 🔴</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleResetSim}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>شبیه‌سازی مجدد یک سناریوی دیگر</span>
              </button>
            )}
          </div>

          {/* Commentary Log */}
          <div className="mt-4 p-3 rounded-2xl bg-black/50 border border-slate-800/80 space-y-1 text-xs">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">گزارش زنده حرکت تیم:</span>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {simHistory.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-2 ${item.type === 'win' ? 'text-emerald-300' :
                    item.type === 'loss' ? 'text-amber-300' :
                      item.type === 'champion' ? 'text-yellow-300 font-black' :
                        item.type === 'reset' ? 'text-purple-300 font-black' :
                          item.type === 'eliminated' ? 'text-rose-400 font-bold' :
                            'text-slate-300'
                  }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Schematic Tree Architecture Diagram (رسم شکل ساختار براکت با خطوط و فلش‌ها) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-xl space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Swords size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">شماتیک کامل ساختار براکت نبرد رویال (۸ تیمی)</h3>
              <p className="text-xs text-slate-400">نمایش تصویری پیوستگی مسابقات، خطوط سقوط و نقطه تقاطع فینال بزرگ</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-xl border border-slate-700 hidden sm:inline">
            فرمت استاندارد ESports
          </span>
        </div>

        {/* SVG-Enhanced Visual Bracket Diagram */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[700px] p-4 bg-[#070b16] rounded-3xl border border-slate-800/90 space-y-8 relative">
            {/* SECTION A: WINNERS BRACKET (Green Path) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <span className="flex items-center gap-1.5">
                  <Shield size={15} /> جدول برندگان (Winners Bracket)
                </span>
                <span className="text-[10px] font-normal text-emerald-300/80">تمام تیم‌ها از این جدول شروع می‌کنند</span>
              </div>

              {/* Match Nodes Row */}
              <div className="grid grid-cols-4 gap-4 items-center">
                {/* Round 1 */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">دور ۱ برندگان (۴ بازی)</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-center space-y-1 shadow-md">
                    <div className="text-emerald-300 font-bold">تیم ۱ vs تیم ۲</div>
                    <div className="text-[9px] text-slate-400 border-t border-slate-800 pt-1">برنده ➔ نیمه‌نهایی | بازنده ➔ دره بازندگان</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-center space-y-1 shadow-md">
                    <div className="text-emerald-300 font-bold">تیم ۳ vs تیم ۴</div>
                    <div className="text-[9px] text-slate-400 border-t border-slate-800 pt-1">برنده ➔ نیمه‌نهایی | بازنده ➔ دره بازندگان</div>
                  </div>
                </div>

                {/* Arrow 1 */}
                <div className="flex flex-col items-center justify-center text-emerald-400">
                  <span className="text-[10px] font-bold mb-1">برد 🟢</span>
                  <div className="w-full h-0.5 bg-gradient-to-l from-emerald-400 to-transparent relative">
                    <ArrowLeftRight size={14} className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-emerald-400" />
                  </div>
                </div>

                {/* Semi Finals */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">نیمه‌نهایی برندگان (۲ بازی)</span>
                  <div className="p-3 rounded-xl bg-slate-900 border-2 border-emerald-500/50 text-xs text-center space-y-1 shadow-md">
                    <div className="text-emerald-300 font-black">برندگان دور ۱</div>
                    <div className="text-[9px] text-amber-300/90 pt-1">باخت اینجا = سقوط به دور دوم بازنده‌ها</div>
                  </div>
                </div>

                {/* Winners Final & Direct Ticket */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">فینال برندگان</span>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-900/60 to-slate-900 border-2 border-emerald-400 text-xs text-center space-y-1 shadow-lg shadow-emerald-500/10">
                    <span className="text-[9.5px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full inline-block">صعود مستقیم</span>
                    <div className="text-white font-black text-xs">قهرمان برندگان</div>
                    <div className="text-[10px] text-emerald-300 font-sport">راهی فینال بزرگ (۲ جان)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* NEON BRANCHING DROP CONNECTORS (VISUAL ARROWS BETWEEN BRACKETS) */}
            <div className="relative py-2 px-6 flex items-center justify-around bg-gradient-to-r from-amber-950/30 via-orange-950/40 to-amber-950/30 rounded-2xl border border-amber-500/30">
              <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>مسیر سقوط بازندگان دور اول و نیمه‌نهایی به جدول بازندگان (Rematch Prevention: جلوگیری از تقابل مجدد زودهنگام)</span>
                <ArrowDown size={16} className="text-amber-400" />
              </div>
            </div>

            {/* SECTION B: LOSERS BRACKET (Orange / Survival Path) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-orange-400 bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-500/30">
                <span className="flex items-center gap-1.5">
                  <Flame size={15} /> جدول بازندگان (Losers Bracket - جنگ مرگ و زندگی)
                </span>
                <span className="text-[10px] font-normal text-orange-300/80">هر شکست در این جدول مساوی با حذف دائمی از کل جام است!</span>
              </div>

              {/* Losers Match Nodes */}
              <div className="grid grid-cols-4 gap-4 items-center">
                {/* Losers R1 */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">دور اول بازندگان</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-orange-500/30 text-xs text-center space-y-1">
                    <div className="text-orange-300 font-bold">بازندگان دور اول</div>
                    <div className="text-[9px] text-rose-400">باخت = حذف قطعی ❌</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center text-orange-400">
                  <span className="text-[10px] font-bold mb-1">بقا 🟠</span>
                  <div className="w-full h-0.5 bg-gradient-to-l from-orange-400 to-transparent" />
                </div>

                {/* Losers Semi / R2 */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">دور دوم و نیمه‌نهایی بازندگان</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-orange-500/40 text-xs text-center space-y-1">
                    <div className="text-orange-200 font-bold">پیکار با سقوط‌کنندگان جدید</div>
                    <div className="text-[9px] text-emerald-400">برد = راهیابی به فینال بازندگان</div>
                  </div>
                </div>

                {/* Losers Final */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-bold text-center">فینال بازندگان</span>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-950/60 to-slate-900 border-2 border-orange-400 text-xs text-center space-y-1 shadow-lg shadow-orange-500/10">
                    <span className="text-[9.5px] bg-orange-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full inline-block">شانس دوم طلایی</span>
                    <div className="text-white font-black text-xs">قهرمان بازندگان</div>
                    <div className="text-[10px] text-orange-300 font-sport">راهی فینال بزرگ (۱ جان)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION C: GRAND FINAL & BRACKET RESET (CLIMAX / GOLDEN PURPLE) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-[#190d2e] to-amber-950/60 border-2 border-purple-500/50 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-amber-400 animate-pulse" />
                  <span className="text-sm font-black text-white">قله نبرد: فینال بزرگ و ریست براکت (Grand Final Climax)</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/40 font-bold">
                  مصاف دو قطب جام
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Match 1 */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-400/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-300">مسابقه اول فینال بزرگ (Game 1)</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full">الزامی</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed">
                    قهرمان برندگان (بدون باخت) در برابر قهرمان بازندگان (۱ باخت) صف‌آرایی می‌کنند.
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <div>✅ اگر <strong>قهرمان برندگان</strong> ببرد: <span className="text-emerald-400 font-bold">مسابقات بلافاصله تمام و قهرمان می‌شود!</span></div>
                    <div>⚡ اگر <strong>قهرمان بازندگان</strong> ببرد: <span className="text-amber-300 font-bold">شرایط دو تیم مساوی (۱ باخت) می‌شود و بازی دوم فوراً فعال می‌گردد!</span></div>
                  </div>
                </div>

                {/* Match 2 (Reset Match) */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/50 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-500" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300">مسابقه دوم: ریست براکت (Reset Match)</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">مشروط</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed">
                    این بازی فقط در صورت باخت قهرمان برندگان در بازی اول برگزار می‌شود؛ چرا که آن تیم هم حق دارد طعم ۱ باخت را مثل بقیه بچشد!
                  </div>
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
                    🏆 برنده بازی دوم، قهرمان رسمی، بلامنازع و دارنده مدال طلای نبرد رویال است!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Text Explanation & Real Example Scenario (توضیحات متنی خلاصه، مفید و سناریوی واقعی) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-xl space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">توضیح مرحله‌به‌مرحله با یک مثال واقعی و ملموس</h3>
            <p className="text-xs text-slate-400">داستان نبرد پرسپولیس و استقلال در مسیر جام نبرد رویال</p>
          </div>
        </div>

        {/* 5-Step Story */}
        <div className="space-y-3 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              ۱
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>دور اول برندگان: دربی تهران (استقلال ۱ - ۰ پرسپولیس)</span>
                <span className="text-[10px] text-cyan-400 font-bold">شکست اول = عدم حذف</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                استقلال برنده می‌شود و در جدول برندگان به نیمه‌نهایی می‌رود. پرسپولیس <strong>حذف نمی‌شود</strong>، بلکه ۱ جان از دست می‌دهد و با ۱ جان باقی‌مانده به جدول بازندگان سقوط می‌کند تا از فرصت دوم خود استفاده کند.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              ۲
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>جنگ بقا در جدول بازندگان: پرسپولیس در دره مرگ</span>
                <span className="text-[10px] text-amber-300 font-bold">صعود نفس‌گیر</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                پرسپولیس در جدول بازندگان با سپاهان و تراکتور بازی می‌کند. هر بازی برای پرسپولیس حکم مرگ و زندگی دارد (باخت دوم = حذف). پرسپولیس تمام رقبای خود را در جدول بازندگان شکست می‌دهد و به فینال بزرگ می‌رسد!
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              ۳
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>استقلال در جدول برندگان: پرواز تا فینال بدون شکست</span>
                <span className="text-[10px] text-emerald-400 font-bold">۲ جان کامل</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                در طرف دیگر، استقلال تمامی بازی‌های جدول برندگان را می‌برد و بدون حتی ۱ باخت، با ۲ جان دست‌نخورده به عنوان قهرمان جدول برندگان راهی فینال بزرگ می‌شود.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-slate-950/80 border border-purple-500/40 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              ۴
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-purple-200 flex items-center justify-between">
                <span>فینال اول: پرسپولیس ۲ - ۱ استقلال (ریست براکت!)</span>
                <span className="text-[10px] text-purple-300 font-black">فعال‌شدن بازی دوم⚡</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                پرسپولیس مسابقه اول فینال را می‌برد! اما استقلال بلافاصله جام را از دست نمی‌دهد؛ زیرا این اولین باخت استقلال در کل جام بود و استقلال هم مانند پرسپولیس حق ۱ باخت داشت. اکنون هر دو تیم ۱ باخت دارند و بازی دوم (ریست براکت) فعال می‌شود.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-slate-950/80 border border-amber-500/50 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              ۵
            </span>
            <div className="space-y-1 flex-1">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>فینال دوم (مسابقه مرگ و زندگی): تعیین قهرمان نهایی</span>
                <span className="text-[10px] text-amber-400 font-black">جام زرین 🏆</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                مسابقه سرنوشت‌ساز دوم آغاز می‌شود؛ برنده این بازی دوم مستقیماً مدال طلای نبرد رویال را بالای سر می‌برد و بازنده به عنوان نایب‌قهرمان به کار خود پایان می‌دهد.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Golden Rules Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <Shield size={14} /> ۱. قانون ۲ باخت (Two Lives)
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              با اولین باخت هرگز نگران نباشید؛ شما شانس دوم دارید. تنها تیمی از جام حذف می‌شود که ۲ بار شکست بخورد.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
              <RefreshCw size={14} /> ۲. فلسفه ریست براکت (Bracket Reset)
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              تیم بدون باخت جدول برندگان شایسته شانس برابر است؛ اگر در فینال ببازد، بازی دوم برگزار می‌شود تا حق فرصت دوم آن تیم هم حفظ شود.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
              <Clock size={14} /> ۳. سرعت و استقامت در مراحل ابتدایی
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              دورهای اولیه در صورت تساوی مستقیماً پنالتی دارند تا بازیکنان خسته نشوند. وقت اضافه فقط در دورهای نیمه‌نهایی به بعد فعال است.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-xs font-black text-purple-400 flex items-center gap-1.5">
              <ArrowLeftRight size={14} /> ۴. تمرکز کامل در روزهای مسابقه
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              بازار نقل و انتقالات در روزهای مسابقه کاملاً قفل است و فقط در روزهای استراحت (شنبه، دوشنبه، چهارشنبه) از ساعت ۱۲ بامداد تا ۱۸ غروب باز می‌شود.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 5. Extra Time & Transfer Market Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Extra Time Rules */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-700/60 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
            <Clock size={20} />
            <span>قانون زمان اضافه و ضربات پنالتی</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">دورهای اولیه و میانی:</span>
              <span>در صورت تساوی در ۹۰ دقیقه، مسابقه مستقیماً به <strong>ضربات پنالتی</strong> می‌رود تا در مصرف استقامت بازیکنان صرفه‌جویی شود.</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-white font-bold block mb-1">دورهای حساس (نیمه‌نهایی برندگان و دور ۳ بازندگان به بعد):</span>
              <span>در صورت تساوی، بازی دارای <strong>دو وقت اضافه ۱۵ دقیقه‌ای</strong> خواهد بود و در صورت تداوم تساوی، برنده با ضربات پنالتی معین می‌شود.</span>
            </div>
          </div>
        </motion.div>

        {/* Transfer Market Window Rules */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-700/60 space-y-3"
        >
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <ArrowLeftRight size={20} />
            <span>پنجره نقل و انتقالات و روزهای استراحت</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-emerald-400 font-bold block mb-1">روزهای استراحت (شنبه، دوشنبه، چهارشنبه):</span>
              <span className="leading-relaxed block">
                پنجره نقل و انتقالات فقط در روزهای استراحت از ساعت <strong>۰۰:۰۰ بامداد تا ۱۸:۰۰ غروب همان روز</strong> باز می‌شود و تایمر شمارش معکوس زنده در بالای صفحه بازار فعال می‌باشد.
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-rose-400 font-bold block mb-1">روزهای برگزاری مسابقات (یکشنبه، سه‌شنبه، پنج‌شنبه، جمعه):</span>
              <span className="leading-relaxed block">
                در روزهای مسابقه و همچنین پس از ساعت ۱۸:۰۰ غروب روزهای استراحت، بازار نقل و انتقالات به صورت کامل بسته است تا تمرکز مربیان بر روی مسابقات حفظ شود.
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Safe Clearance Bottom Spacer */}
      <div className="h-12 w-full pointer-events-none" />
    </div>
  );
}
