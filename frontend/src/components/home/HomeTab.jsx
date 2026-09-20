import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Crown,
  TrendingUp,
  Users,
  Megaphone,
  Radio,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  Activity,
  HeartPulse,
  Ban,
  ZapOff,
  ShieldCheck,
  Zap,
  Sliders,
  ArrowLeftRight,
  X,
  ExternalLink,
  Eye,
  Shield,
  Dumbbell,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchApi, newsApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { useLanguage } from '../../context/LanguageContext';
import { useTeam } from '../../context/TeamContext';
import TransferCountdownBanner from '../common/TransferCountdownBanner';
import NewsArticleModal from '../news/NewsArticleModal';

/**
 * Formats match date and time for FA / EN locales safely.
 */
function formatMatchDisplayDate(dateString, isFa = true) {
  if (!dateString) {
    return isFa
      ? { dateStr: 'شنبه، ۲۹ شهریور', timeStr: '۲۲:۰۰' }
      : { dateStr: 'Sat, Sep 20', timeStr: '22:00' };
  }
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return { dateStr: String(dateString || ''), timeStr: '' };
    }
    if (isFa) {
      return {
        dateStr: d.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', weekday: 'short', month: 'long', day: 'numeric' }),
        timeStr: d.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
      };
    }
    return {
      dateStr: d.toLocaleDateString('en-US', { timeZone: 'Asia/Tehran', weekday: 'short', month: 'short', day: 'numeric' }),
      timeStr: d.toLocaleTimeString('en-US', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  } catch {
    return { dateStr: String(dateString || ''), timeStr: '' };
  }
}

/**
 * Custom hook for live countdown telemetry on matchday hero card.
 */
function useMatchCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    let target = targetDate ? new Date(targetDate).getTime() : null;
    if (!target || isNaN(target)) {
      target = Date.now() + (18 * 60 * 60 * 1000) + (45 * 60 * 1000);
    }

    function calculate() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

/* ========================================================================== */
/* 1. MATCHDAY HERO CARD                                                     */
/* ========================================================================== */
function MatchdayHeroCard({ nextMatch, isLineupSubmittedActual, onNavigateTab, lang, isRtl }) {
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;
  const homeTeamName = nextMatch?.home_team_name || (lang === 'fa' ? 'بارسلونا' : 'Barcelona');
  const awayTeamName = nextMatch?.away_team_name || (lang === 'fa' ? 'رئال مادرید' : 'Real Madrid');
  const homeLogo = nextMatch ? getTeamLogoUrl(nextMatch.home_team_name) : '/logos/barcelona.webp';
  const awayLogo = nextMatch ? getTeamLogoUrl(nextMatch.away_team_name) : '/logos/real-madrid.webp';
  const roundName = nextMatch?.round_name
    ? (lang === 'fa' ? String(nextMatch.round_name) : `Week ${String(nextMatch.round_name).replace(/[^0-9]/g, '') || '5'}`)
    : (lang === 'fa' ? 'هفته ۵' : 'Week 5');

  const { dateStr, timeStr } = formatMatchDisplayDate(nextMatch?.date, lang === 'fa');
  const { days, hours, minutes, seconds, isPast } = useMatchCountdown(nextMatch?.date);

  const format2 = (n) => String(n).padStart(2, '0');

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-[#070c18] shadow-[0_16px_48px_rgba(0,0,0,0.85)] group transition-all duration-300">
      {/* Ambient Stadium Turf Backdrops */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e1c33]/80 via-[#060b17]/90 to-[#05080e] pointer-events-none" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[28rem] h-48 bg-cyan-500/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/25 via-transparent to-transparent pointer-events-none" />

      {/* Cockpit Card Content */}
      <div className="relative z-10 p-4 sm:p-7 flex flex-col justify-between space-y-5 sm:space-y-6">
        {/* Header Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f3ff]" />
            <span className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-wider font-sport">
              {lang === 'fa' ? `مرکز فرماندهی مسابقه • ${roundName}` : `Matchday Cockpit • ${roundName}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Countdown Telemetry Badge */}
            {!isPast && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-300 font-sport tabular-nums">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span>
                  {days > 0 ? `${days}d ${format2(hours)}:${format2(minutes)}:${format2(seconds)}` : `${format2(hours)}:${format2(minutes)}:${format2(seconds)}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[11px] sm:text-xs text-slate-300 font-sport tabular-nums">
              <Calendar size={12} className="text-cyan-400 shrink-0" />
              <span>{dateStr} • {timeStr}</span>
            </div>
          </div>
        </div>

        {/* Teams Faceoff Stage */}
        <div className="flex items-center justify-between gap-2 sm:gap-8 py-2">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-2">
            <div className="relative w-18 h-18 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-white/95 to-slate-200/90 p-2.5 sm:p-3 flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/20 transition-transform duration-300 group-hover:scale-105">
              <img
                src={homeLogo}
                alt={homeTeamName}
                className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                onError={(e) => { e.currentTarget.src = '/logos/barcelona.webp'; }}
              />
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-950/90 text-cyan-300 border border-cyan-500/40 text-[9px] font-black uppercase tracking-wider shadow-sm">
                {lang === 'fa' ? 'میزبان' : 'HOME'}
              </span>
            </div>
            <span className="text-xs sm:text-base font-black text-white line-clamp-1 max-w-[120px] sm:max-w-[160px] pt-1">
              {homeTeamName}
            </span>
          </div>

          {/* VS & Match Badge */}
          <div className="flex flex-col items-center justify-center text-center px-2 space-y-1 shrink-0">
            <span className="text-2xl sm:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400 drop-shadow-[0_0_20px_rgba(0,243,255,0.7)] font-sport">
              VS
            </span>
            <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              {lang === 'fa' ? 'رقابت رسمی لیگ' : 'OFFICIAL LEAGUE'}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center text-center space-y-2">
            <div className="relative w-18 h-18 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-white/95 to-slate-200/90 p-2.5 sm:p-3 flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/20 transition-transform duration-300 group-hover:scale-105">
              <img
                src={awayLogo}
                alt={awayTeamName}
                className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                onError={(e) => { e.currentTarget.src = '/logos/real-madrid.webp'; }}
              />
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-slate-950/90 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider shadow-sm">
                {lang === 'fa' ? 'میهمان' : 'AWAY'}
              </span>
            </div>
            <span className="text-xs sm:text-base font-black text-white line-clamp-1 max-w-[120px] sm:max-w-[160px] pt-1">
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* Bottom Cockpit Status & Primary CTA */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Lineup Pulse Indicator */}
          <div className="flex items-center gap-2">
            {isLineupSubmittedActual ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-2xl">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                  {lang === 'fa' ? 'ترکیب نهایی تایید و ثبت شده است' : 'Lineup submitted and confirmed'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 rounded-2xl animate-pulse">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                <span className="text-amber-300 font-bold text-xs sm:text-sm">
                  {lang === 'fa' ? 'ترکیب مسابقه هنوز ثبت نشده است!' : 'Lineup submission pending!'}
                </span>
              </div>
            )}
          </div>

          {/* Volt Primary Action CTA */}
          <button
            onClick={() => onNavigateTab?.('team')}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 cursor-pointer ${
              isLineupSubmittedActual
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/15 shadow-md'
                : 'bg-gradient-to-r from-[#00ff87] to-[#10b981] hover:from-[#05f284] hover:to-[#059669] text-slate-950 shadow-[0_0_25px_rgba(0,255,135,0.4)] hover:shadow-[0_0_35px_rgba(0,255,135,0.7)]'
            }`}
          >
            <Sliders size={16} />
            <span>
              {isLineupSubmittedActual
                ? (lang === 'fa' ? 'مشاهده و ویرایش ترکیب' : 'View / Edit Lineup')
                : (lang === 'fa' ? 'تنظیم و ثبت ارنج مسابقه' : 'Set & Confirm Lineup')}
            </span>
            <ArrowIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 2. SQUAD HEALTH & READINESS BAR                                           */
/* ========================================================================== */
function SquadHealthBar({ squadHealth, onOpenModal, lang }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#080d1a]/95 p-4 sm:p-5 shadow-xl backdrop-blur-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.2)]">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white">
              {lang === 'fa' ? 'نوار سلامت و آمادگی تاکتیکی تیم' : 'Squad Health & Tactical Readiness'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {lang === 'fa' ? 'پایش زنده وضعیت خستگی، مصدومان و محرومان اسکواد' : 'Live monitoring of fatigue, injuries and suspensions'}
            </p>
          </div>
        </div>

        {/* Volt/Cyan Average Stamina Progress Bar */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-white/10 min-w-[210px]">
          <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
            {lang === 'fa' ? 'میانگین انرژی تیم:' : 'Avg Stamina:'}
          </span>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#00ff87] via-teal-400 to-[#00f3ff] rounded-full transition-all duration-500 shadow-[0_0_10px_#00ff87]"
              style={{ width: `${squadHealth.avgStamina}%` }}
            />
          </div>
          <span className="text-xs font-black text-[#00ff87] font-sport tabular-nums">
            {squadHealth.avgStamina}%
          </span>
        </div>
      </div>

      {/* Interactive Status Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Chip 1: Injured */}
        <button
          onClick={() => onOpenModal('injured')}
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-start ${
            squadHealth.injured.length > 0
              ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-slate-950/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <HeartPulse size={16} className={squadHealth.injured.length > 0 ? 'text-rose-400' : 'text-slate-400'} />
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'fa' ? 'مصدومان' : 'Injuries'}
              </span>
              <span className={`text-xs font-black font-sport tabular-nums ${squadHealth.injured.length > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {squadHealth.injured.length > 0
                  ? (lang === 'fa' ? `${squadHealth.injured.length} بازیکن` : `${squadHealth.injured.length} Players`)
                  : (lang === 'fa' ? 'بدون مصدوم' : 'Clear')}
              </span>
            </div>
          </div>
          <Eye size={14} className="text-slate-500 shrink-0" />
        </button>

        {/* Chip 2: Suspended */}
        <button
          onClick={() => onOpenModal('suspended')}
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-start ${
            squadHealth.suspended.length > 0
              ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-slate-950/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ban size={16} className={squadHealth.suspended.length > 0 ? 'text-amber-400' : 'text-slate-400'} />
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'fa' ? 'محرومان' : 'Suspended'}
              </span>
              <span className={`text-xs font-black font-sport tabular-nums ${squadHealth.suspended.length > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                {squadHealth.suspended.length > 0
                  ? (lang === 'fa' ? `${squadHealth.suspended.length} بازیکن` : `${squadHealth.suspended.length} Players`)
                  : (lang === 'fa' ? 'بدون محروم' : 'Clear')}
              </span>
            </div>
          </div>
          <Eye size={14} className="text-slate-500 shrink-0" />
        </button>

        {/* Chip 3: High Fatigue */}
        <button
          onClick={() => onOpenModal('fatigue')}
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-start ${
            squadHealth.highFatigue.length > 0
              ? 'bg-sky-950/30 border-sky-500/40 hover:border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
              : 'bg-slate-950/50 border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <ZapOff size={16} className={squadHealth.highFatigue.length > 0 ? 'text-sky-400' : 'text-slate-400'} />
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'fa' ? 'نیاز به ریکاوری' : 'High Fatigue'}
              </span>
              <span className={`text-xs font-black font-sport tabular-nums ${squadHealth.highFatigue.length > 0 ? 'text-sky-400' : 'text-slate-200'}`}>
                {squadHealth.highFatigue.length > 0
                  ? (lang === 'fa' ? `${squadHealth.highFatigue.length} بازیکن` : `${squadHealth.highFatigue.length} Players`)
                  : (lang === 'fa' ? 'آماده کامل' : '100% Fresh')}
              </span>
            </div>
          </div>
          <Eye size={14} className="text-slate-500 shrink-0" />
        </button>

        {/* Chip 4: Total Squad */}
        <button
          onClick={() => onOpenModal('all')}
          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/50 border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer text-start"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'fa' ? 'کل اسکواد' : 'Squad Total'}
              </span>
              <span className="text-xs font-black text-emerald-400 font-sport tabular-nums">
                {lang === 'fa' ? `${squadHealth.total} بازیکن ثبت‌شده` : `${squadHealth.total} Players`}
              </span>
            </div>
          </div>
          <Eye size={14} className="text-slate-500 shrink-0" />
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 3. SQUAD STATUS MODAL (React Portal Enforced)                              */
/* ========================================================================== */
function SquadStatusModal({ isOpen, activeTab, onClose, onSelectTab, squadHealth, playersList, onNavigateTab, lang, isRtl }) {
  if (typeof document === 'undefined') return null;

  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  const tabs = [
    { id: 'all', label: lang === 'fa' ? 'همه بازیکنان' : 'All Players', count: squadHealth.total },
    { id: 'injured', label: lang === 'fa' ? 'مصدومان' : 'Injured', count: squadHealth.injured.length, color: 'text-rose-400' },
    { id: 'suspended', label: lang === 'fa' ? 'محرومان' : 'Suspended', count: squadHealth.suspended.length, color: 'text-amber-400' },
    { id: 'fatigue', label: lang === 'fa' ? 'خستگی بالا' : 'High Fatigue', count: squadHealth.highFatigue.length, color: 'text-sky-400' },
  ];

  const activeList = useMemo(() => {
    const list = playersList || [];
    if (activeTab === 'injured') return squadHealth.injured;
    if (activeTab === 'suspended') return squadHealth.suspended;
    if (activeTab === 'fatigue') return squadHealth.highFatigue;
    return list;
  }, [activeTab, squadHealth, playersList]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          {/* Backdrop Click Dismissal */}
          <div className="fixed inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 bg-slate-950 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.2)]">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {lang === 'fa' ? 'گزارش تفصیلی وضعیت بازیکنان تیم' : 'Detailed Squad Status Report'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'fa' ? 'بررسی شرایط فیزیکی، محرومیت‌ها و مصدومیت‌ها' : 'Review physical fitness, suspensions and injury updates'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(tabs || []).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md bg-black/60 text-[10px] font-sport tabular-nums ${tab.color || 'text-slate-300'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Player List */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {(!activeList || activeList.length === 0) ? (
                <div className="py-10 text-center space-y-2 text-slate-400">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-400 opacity-70" />
                  <p className="text-xs font-bold">
                    {lang === 'fa' ? 'هیچ بازیکنی در این دسته‌بندی وجود ندارد.' : 'No players in this category.'}
                  </p>
                </div>
              ) : (
                (activeList || []).map((player) => {
                  const isInjured = Boolean(player?.is_injured) || (Number(player?.injury_duration) > 0);
                  const isSuspended = Boolean(player?.is_suspended) || (Number(player?.red_cards) > 0);
                  const fatigue = Number(player?.fatigue || 0);

                  return (
                    <div
                      key={player.id || player.name}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-sport font-black text-xs text-amber-400">
                          {player.position || 'CF'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black text-white">
                              {player.name || player.real_name || (lang === 'fa' ? 'بازیکن' : 'Player')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-sport tabular-nums">
                              OVR {player.overall || player.rating || 80}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                            {isInjured && (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <HeartPulse size={12} />
                                {lang === 'fa'
                                  ? `مصدوم (${player.injury_type || 'نامشخص'} - ${player.injury_duration || 1} بازی)`
                                  : `Injured (${player.injury_type || 'Unknown'} - ${player.injury_duration || 1} matches)`}
                              </span>
                            )}
                            {isSuspended && (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Ban size={12} />
                                {lang === 'fa' ? 'محروم از مسابقه' : 'Suspended'}
                              </span>
                            )}
                            {!isInjured && !isSuspended && (
                              <span className="text-slate-400 flex items-center gap-1 font-sport tabular-nums">
                                <Activity size={12} className="text-emerald-400" />
                                {lang === 'fa' ? `خستگی: ${fatigue}٪` : `Fatigue: ${fatigue}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab?.('team');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>{lang === 'fa' ? 'مدیریت' : 'Manage'}</span>
                        <ArrowIcon size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {lang === 'fa' ? 'برای ریکاوری و تغییر ترکیب به تب تیم مراجعه کنید' : 'Go to Team tab for lineup adjustment'}
              </span>
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab?.('team');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{lang === 'fa' ? 'ورود به ارنج تیم' : 'Open Lineup'}</span>
                <ArrowIcon size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ========================================================================== */
/* 4. COACH ACTION GRID (5 Tactical Command Actions)                         */
/* ========================================================================== */
function CoachActionGrid({ onNavigateTab, isLineupSubmittedActual, roundName, lang }) {
  const actions = [
    {
      id: 'tactics',
      title: lang === 'fa' ? 'ارنج و تاکتیک' : 'Tactics & Plan',
      sub: isLineupSubmittedActual
        ? (lang === 'fa' ? 'ترکیب تایید شده' : 'Lineup Ready')
        : (lang === 'fa' ? 'نیازمند ثبت' : 'Action Needed'),
      icon: Sliders,
      borderColor: 'border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.15)]',
      iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-400/40 shadow-[0_0_12px_rgba(0,243,255,0.3)]',
      tab: 'team',
    },
    {
      id: 'training',
      title: lang === 'fa' ? 'تمرین و بوست' : 'Training & Boost',
      sub: lang === 'fa' ? 'ارتقای توان بازیکنان' : 'Enhance Players',
      icon: Zap,
      borderColor: 'border-amber-500/30 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
      tab: 'team',
    },
    {
      id: 'fixtures',
      title: lang === 'fa' ? 'برنامه مسابقات' : 'Fixtures & Table',
      sub: roundName,
      icon: Calendar,
      borderColor: 'border-teal-500/30 hover:border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.15)]',
      iconBg: 'bg-teal-500/15 text-teal-400 border-teal-400/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]',
      tab: 'league',
    },
    {
      id: 'transfers',
      title: lang === 'fa' ? 'میز نقل‌وانتقالات' : 'Transfer Desk',
      sub: lang === 'fa' ? 'پیشنهاد و معامله' : 'Live Bidding',
      icon: ArrowLeftRight,
      borderColor: 'border-blue-500/30 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-400/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
      tab: 'market',
    },
    {
      id: 'news',
      title: lang === 'fa' ? 'چنل مطبوعات' : 'Official Press',
      sub: lang === 'fa' ? 'رویدادها و اخبار' : 'VML Newsroom',
      icon: Megaphone,
      borderColor: 'border-rose-500/30 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      tab: 'news_channel',
      isWideMobile: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {(actions || []).map((act) => {
        const Icon = act.icon;
        return (
          <button
            key={act.id}
            onClick={() => onNavigateTab?.(act.tab)}
            className={`flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-[#0b1326] to-[#070c18] border transition-all duration-300 active:scale-95 cursor-pointer group text-center ${act.borderColor} ${
              act.isWideMobile ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform ${act.iconBg}`}>
              <Icon size={22} />
            </div>
            <span className="text-xs sm:text-sm font-black text-white mt-2.5 leading-tight">
              {act.title}
            </span>
            <span className="text-[10px] text-slate-400 truncate w-full mt-1 font-sport">
              {act.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/* 5. PRESS & NEWSROOM GRID (16:9 Cards with Modal Wiring)                   */
/* ========================================================================== */
function PressNewsGrid({ loadingNews, displayNews, onSelectNews, onNavigateTab, lang, t, isRtl }) {
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-amber-400" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
            {lang === 'fa' ? 'اتاق خبر و مطبوعات رسمی VML' : 'VML Official Newsroom'}
          </h3>
        </div>
        <button
          onClick={() => onNavigateTab?.('news_channel')}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>{t('viewAll')}</span>
          <ArrowIcon size={14} />
        </button>
      </div>

      {loadingNews ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl overflow-hidden bg-slate-900/60 border border-white/10 p-4 animate-pulse space-y-3 flex flex-col justify-between">
              <div className="w-full aspect-[16/9] bg-slate-800/60 rounded-2xl" />
              <div className="space-y-2 flex-1 pt-2">
                <div className="h-4 bg-slate-800/80 rounded w-5/6" />
                <div className="h-3 bg-slate-800/50 rounded w-1/2" />
              </div>
              <div className="h-3 bg-slate-800/40 rounded w-1/3 pt-2" />
            </div>
          ))}
        </div>
      ) : (!displayNews || displayNews.length === 0) ? (
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-[#0a1226] to-slate-950 border border-white/10 p-6 text-center space-y-3 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Megaphone size={26} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm sm:text-base">
              {lang === 'fa' ? 'اتاق خبر و مطبوعات رسمی VML' : 'VML Official Newsroom'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {lang === 'fa'
                ? 'تمام رویدادهای زنده، مصاحبه‌ها، نقل‌وانتقالات و نتایج بازی‌ها در چنل مطبوعات مخابره می‌شوند.'
                : 'Live match reports, transfer bombs, and disciplinary updates are broadcasted in the press channel.'}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab?.('news_channel')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <span>{lang === 'fa' ? 'ورود به چنل مطبوعات' : 'Enter News Channel'}</span>
            <ArrowIcon size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(displayNews || []).map((news) => {
            const imgSrc = news.image || news.image_url || '/images/vml_news_trophy.webp';
            const isLogo = imgSrc.includes('/logos/') || imgSrc.includes('logo');
            const isPlayer = imgSrc.includes('player_photos') || imgSrc.includes('messi');

            return (
              <div
                key={news.id}
                onClick={() => onSelectNews(news.raw || news)}
                className="group relative rounded-3xl overflow-hidden bg-[#090f1d] border border-white/10 hover:border-amber-500/60 hover:shadow-[0_12px_35px_rgba(245,158,11,0.18)] shadow-lg cursor-pointer transition-all duration-300 active:scale-[0.98] flex flex-col h-full"
              >
                {/* 16:9 Image Frame */}
                <div className="relative w-full aspect-[16/9] bg-slate-950 overflow-hidden flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-cover bg-center filter blur-lg scale-110 opacity-35"
                    style={{ backgroundImage: `url(${imgSrc})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090f1d] via-black/25 to-black/30" />

                  <img
                    src={imgSrc}
                    alt={news.title}
                    className={`relative z-10 transition-transform duration-500 group-hover:scale-105 ${
                      isLogo
                        ? 'max-h-[75%] max-w-[75%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
                        : isPlayer
                        ? 'h-full w-full object-cover object-top'
                        : 'h-full w-full object-cover'
                    }`}
                    onError={(e) => { e.currentTarget.src = '/images/vml_news_trophy.webp'; }}
                  />

                  {/* Category Tag */}
                  <span className="absolute bottom-2.5 left-2.5 z-20 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md bg-amber-500 text-slate-950">
                    {news.categoryLabel || news.category_display || news.category}
                  </span>

                  {news.is_pinned && (
                    <span className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-amber-400 text-slate-950 shadow-md flex items-center gap-1">
                      📌 {lang === 'fa' ? 'سنجاق' : 'PINNED'}
                    </span>
                  )}

                  {news.is_breaking && (
                    <span className="absolute top-2.5 right-2.5 z-20 px-2.5 py-0.5 rounded-lg text-[9px] font-black bg-rose-600 text-white animate-pulse shadow-md">
                      🔥 {lang === 'fa' ? 'فوری' : 'BREAKING'}
                    </span>
                  )}
                </div>

                {/* News Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2 min-h-[2.6rem] leading-snug">
                      {news.title}
                    </h4>
                    {news.subtitle && (
                      <p className="text-[11px] font-bold text-amber-400/90 truncate">
                        {news.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2.5 border-t border-white/10">
                    <span className="flex items-center gap-1 font-sport tabular-nums">
                      <Clock size={12} className="text-amber-400" />
                      {news.timeAgo || news.time_ago}
                    </span>
                    <span className="text-cyan-400 group-hover:underline font-bold text-xs">
                      {t('readMore')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* MAIN HOMETAB COMPONENT                                                     */
/* ========================================================================== */
export default function HomeTab({ onNavigateTab, isLineupSubmitted = false, teamData, onSaveLineup }) {
  const { t, lang, isRtl } = useLanguage();
  const { players: contextPlayers } = useTeam();

  // Next Match & Live Context
  const [nextMatch, setNextMatch] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Selected news modal
  const [selectedNews, setSelectedNews] = useState(null);
  const [realNews, setRealNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // Squad Health Modal state
  const [squadModalTab, setSquadModalTab] = useState(null); // 'injured' | 'suspended' | 'fatigue' | 'all' | null

  // Fetch News from API
  useEffect(() => {
    let isMounted = true;
    setLoadingNews(true);
    newsApi.getNews({ page_size: 4 })
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
        setRealNews(list || []);
      })
      .catch((err) => {
        console.error('Failed to load news for home tab:', err);
        if (isMounted) setRealNews([]);
      })
      .finally(() => {
        if (isMounted) setLoadingNews(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleReact = async (newsId, reactionType) => {
    try {
      const res = await newsApi.reactNews(newsId, reactionType);
      if (res?.data) {
        setRealNews((prev) =>
          (prev || []).map((n) => (n.id === newsId ? { ...n, reactions_count: res.data.reactions_count, user_reaction: res.data.user_reaction } : n))
        );
        if (selectedNews?.id === newsId) {
          setSelectedNews((prev) => ({
            ...prev,
            reactions_count: res.data.reactions_count,
            user_reaction: res.data.user_reaction,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to react in home:', err);
    }
  };

  const teamId = teamData?.id;

  // Match-Scoped Lineup Check
  const isLineupSubmittedActual = useMemo(() => {
    if (!nextMatch) return true;
    if (nextMatch.is_lineup_submitted !== undefined) {
      return Boolean(nextMatch.is_lineup_submitted);
    }
    if (teamId) {
      if (nextMatch.home_team === teamId) return Boolean(nextMatch.home_lineup_ready);
      if (nextMatch.away_team === teamId) return Boolean(nextMatch.away_lineup_ready);
    }
    return Boolean(isLineupSubmitted);
  }, [nextMatch, teamId, isLineupSubmitted]);

  // Load Real Match Data from API
  useEffect(() => {
    let isMounted = true;
    async function loadHomeData() {
      setLoadingData(true);
      try {
        const liveRes = await matchApi.getLiveMatchContext(teamId).catch(() => ({ data: null }));
        if (isMounted && liveRes?.data) {
          const match = liveRes.data.team_next_match || liveRes.data.next_match;
          if (match) {
            setNextMatch(match);
            return;
          }
        }

        // Fallback: search matches list
        const matchesRes = await matchApi.getMatches().catch(() => ({ data: [] }));
        if (isMounted) {
          const matchesList = Array.isArray(matchesRes.data)
            ? matchesRes.data
            : matchesRes.data?.results || [];
          const upcoming = (matchesList || []).find((m) => m.status === 'SCHEDULED' || m.status === 'TIMED');
          if (upcoming) {
            setNextMatch(upcoming);
          }
        }
      } catch (err) {
        console.error('Failed to load next match data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }
    loadHomeData();
    return () => { isMounted = false; };
  }, [teamId]);

  // Squad Health & Readiness Metrics
  const playersList = useMemo(() => {
    return Array.isArray(contextPlayers) && contextPlayers.length > 0
      ? contextPlayers
      : (teamData?.players || []);
  }, [contextPlayers, teamData]);

  const squadHealth = useMemo(() => {
    const list = playersList || [];
    const injured = list.filter((p) => Boolean(p?.is_injured) || (Number(p?.injury_duration) > 0));
    const suspended = list.filter((p) => Boolean(p?.is_suspended) || (Number(p?.red_cards) > 0));
    const highFatigue = list.filter((p) => {
      const fatigue = Number(p?.fatigue || 0);
      const stamina = Number(p?.stamina || 100);
      return fatigue >= 40 || stamina <= 60;
    });

    let avgStamina = 88;
    if (list.length > 0) {
      const totalStamina = list.reduce((acc, p) => {
        const stam = p?.stamina !== undefined ? Number(p.stamina) : (100 - Number(p?.fatigue || 0));
        return acc + (isNaN(stam) ? 85 : stam);
      }, 0);
      avgStamina = Math.round(totalStamina / list.length);
    }

    return {
      total: list.length,
      injured,
      suspended,
      highFatigue,
      avgStamina: Math.max(10, Math.min(100, avgStamina)),
    };
  }, [playersList]);

  // News Items Format
  const displayNews = useMemo(() => {
    if (!Array.isArray(realNews) || realNews.length === 0) {
      return [];
    }
    return realNews.slice(0, 4).map((item) => ({
      id: item.id,
      category: item.category,
      categoryLabel: item.category_display || (item.category === 'TRANSFER' ? t('tagTransfer') : item.category === 'MATCH' ? t('tagLeague') : t('tagTactics')),
      title: item.title,
      subtitle: item.subtitle,
      timeAgo: item.time_ago || (lang === 'fa' ? 'امروز' : 'Today'),
      image: item.image_url || '/images/vml_news_trophy.webp',
      summary: item.summary,
      content: item.content,
      is_breaking: Boolean(item.is_breaking),
      is_pinned: Boolean(item.is_pinned),
      reactions_count: item.reactions_count || {},
      user_reaction: item.user_reaction,
      raw: item,
    }));
  }, [realNews, lang, t]);

  const roundName = nextMatch?.round_name
    ? (lang === 'fa' ? String(nextMatch.round_name) : `Week ${String(nextMatch.round_name).replace(/[^0-9]/g, '') || '5'}`)
    : (lang === 'fa' ? 'هفته ۵' : 'Week 5');

  return (
    <div className="space-y-5 pb-28 sm:pb-36 text-slate-100 max-w-md sm:max-w-xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-1 sm:px-2 select-none">
      {/* 1. Transfer Window Compact Bar */}
      <div
        className="cursor-pointer hover:opacity-95 transition-opacity"
        onClick={() => onNavigateTab?.('market')}
      >
        <TransferCountdownBanner compact={true} />
      </div>

      {/* 2. MATCHDAY COMMAND HERO CARD */}
      <MatchdayHeroCard
        nextMatch={nextMatch}
        isLineupSubmittedActual={isLineupSubmittedActual}
        onNavigateTab={onNavigateTab}
        lang={lang}
        isRtl={isRtl}
      />

      {/* 3. SQUAD HEALTH & READINESS BAR */}
      <SquadHealthBar
        squadHealth={squadHealth}
        onOpenModal={(tabId) => setSquadModalTab(tabId)}
        lang={lang}
      />

      {/* 4. COACH SPECIALIZED ACTION GRID */}
      <CoachActionGrid
        onNavigateTab={onNavigateTab}
        isLineupSubmittedActual={isLineupSubmittedActual}
        roundName={roundName}
        lang={lang}
      />

      {/* 5. OFFICIAL PRESS & NEWSROOM GRID */}
      <PressNewsGrid
        loadingNews={loadingNews}
        displayNews={displayNews}
        onSelectNews={(article) => setSelectedNews(article)}
        onNavigateTab={onNavigateTab}
        lang={lang}
        t={t}
        isRtl={isRtl}
      />

      {/* 6. SQUAD STATUS MODAL (React Portal) */}
      <SquadStatusModal
        isOpen={Boolean(squadModalTab)}
        activeTab={squadModalTab}
        onClose={() => setSquadModalTab(null)}
        onSelectTab={(tabId) => setSquadModalTab(tabId)}
        squadHealth={squadHealth}
        playersList={playersList}
        onNavigateTab={onNavigateTab}
        lang={lang}
        isRtl={isRtl}
      />

      {/* 7. NEWS ARTICLE MODAL */}
      <NewsArticleModal
        isOpen={Boolean(selectedNews)}
        onClose={() => setSelectedNews(null)}
        article={selectedNews?.raw || selectedNews}
        onReact={handleReact}
      />
    </div>
  );
}
