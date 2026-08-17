import React, { useState, useEffect } from 'react';
import { Clock, Tv, Calendar, Shield, Radio, Sparkles, Bell, Play, AlertTriangle, Flame, Disc, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import notificationSoundService from '../../services/notificationSound';
import { getTeamLogoUrl } from '../../utils/teamLogos';

function formatRemainingTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true };
  }
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, isZero: false };
}

export default function LiveMatchStandby({
  nextMatch,
  initialSeconds = 0,
  isWithinReminder = false,
  onUnlockLive,
  isAdmin = false,
  onAdminOverride,
  teamName,
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  // Live countdown ticker
  useEffect(() => {
    if (secondsLeft == null || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onUnlockLive) onUnlockLive();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onUnlockLive]);

  // Pre-Match T-15 Audio Chime Trigger
  useEffect(() => {
    if (secondsLeft != null && secondsLeft > 0 && secondsLeft <= 900) {
      notificationSoundService.playMatchAlertChime();
    }
  }, [secondsLeft]);

  const handleEnableNotifications = async () => {
    await notificationSoundService.requestPermission();
    setHasRequestedPermission(true);
    notificationSoundService.playMatchAlertChime();
  };

  const { days, hours, minutes, seconds, isZero } = formatRemainingTime(secondsLeft);

  const homeName = nextMatch?.home_team_name || 'تیم میزبان';
  const awayName = nextMatch?.away_team_name || 'تیم میهمان';
  const homeLogo = nextMatch?.home_team_logo;
  const awayLogo = nextMatch?.away_team_logo;
  const roundName = nextMatch?.round_name || 'هفته اول لیگ برتر';

  let dateStr = '۳۰ مرداد ۱۴۰۵';
  let timeStr = '۱۴:۰۰';
  if (nextMatch?.date) {
    try {
      const dt = new Date(nextMatch.date);
      dateStr = dt.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
      timeStr = dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (_e) {
      // fallback
    }
  }

  return (
    <div className="space-y-5 pb-20 font-sans dir-rtl">
      {/* Top Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-purple-950/70 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden"
      >
        <div className="flex items-center gap-3.5 text-right z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 border border-cyan-400/50 flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            <Tv size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-sport">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                STANDBY BROADCAST
              </span>
              <span className="text-[10px] text-purple-300 font-sport bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                1080p • 60 FPS
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white mt-1 tracking-tight">
              استودیوی پخش زنده مسابقات مستر لیگ (LIVE ARENA)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10">
          {isAdmin && (
            <button
              onClick={onAdminOverride}
              className="fc-btn-magenta text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer font-sport"
            >
              <Play size={14} />
              <span>اتاق فرمان داوری (ADMIN ROOM)</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Broadcast Stage Container with Animated Live Countdown Overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="fc-card-elevated p-6 sm:p-10 rounded-3xl border-2 border-cyan-500/30 bg-gradient-to-b from-[#080c14] via-[#0b1020] to-[#05080e] shadow-[0_0_50px_rgba(0,243,255,0.15)] space-y-8 text-center relative overflow-hidden"
      >
        {/* Animated Stadium Spotlights & Ambient Glow */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-full h-64 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Fixture Matchday Badge */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-[#05080e]/90 px-5 py-2 rounded-full border border-cyan-500/40 text-xs font-black text-slate-200 shadow-xl font-sport">
            <Calendar size={15} className="text-cyan-400" />
            <span>{roundName} • {dateStr} — ساعت {timeStr}</span>
          </div>
          <span className="text-[11px] text-cyan-300 font-medium font-sport">
            OFFICIAL BROADCAST & REAL-TIME TACTICAL TELEMETRY
          </span>
        </div>

        {/* Head-to-Head 3D Battle Arena */}
        <div className="relative z-10 grid grid-cols-3 items-center max-w-2xl mx-auto py-4 px-2">
          {/* Home Team Card */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-22 h-22 sm:w-28 sm:h-28 rounded-3xl team-crest-badge flex items-center justify-center p-3 sm:p-4 shadow-[0_0_35px_rgba(255,255,255,0.25)] relative transition-all group-hover:border-cyan-400 group-hover:shadow-[0_0_30px_rgba(0,243,255,0.5)]">
              {getTeamLogoUrl(homeLogo || homeName) ? (
                <img src={getTeamLogoUrl(homeLogo || homeName)} alt={homeName} className="w-full h-full object-contain relative z-10 drop-shadow-md" />
              ) : (
                <span className="font-black text-slate-800 text-xl sm:text-2xl relative z-10 font-sport">{homeName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="font-black text-white text-sm sm:text-base tracking-tight">{homeName}</span>
            <span className="text-[10px] text-cyan-300 font-black bg-cyan-950/90 px-3 py-0.5 rounded-full border border-cyan-500/40 font-sport">
              HOME
            </span>
          </motion.div>

          {/* VS Center Orb */}
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500/30 via-[#080c14] to-purple-900/40 border-2 border-amber-400 flex items-center justify-center font-black text-base sm:text-lg text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.45)] font-sport tracking-widest">
                VS
              </div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-amber-400/50 absolute top-0 left-0 animate-ping pointer-events-none opacity-40"></div>
            </div>
            <span className="text-[10.5px] text-slate-400 font-sport font-black">MATCHDAY ARENA</span>
          </div>

          {/* Away Team Card */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-3 group"
          >
            <div className="w-22 h-22 sm:w-28 sm:h-28 rounded-3xl team-crest-badge flex items-center justify-center p-3 sm:p-4 shadow-[0_0_35px_rgba(255,255,255,0.25)] relative transition-all group-hover:border-amber-400 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              {getTeamLogoUrl(awayLogo || awayName) ? (
                <img src={getTeamLogoUrl(awayLogo || awayName)} alt={awayName} className="w-full h-full object-contain relative z-10 drop-shadow-md" />
              ) : (
                <span className="font-black text-slate-800 text-xl sm:text-2xl relative z-10 font-sport">{awayName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="font-black text-white text-sm sm:text-base tracking-tight">{awayName}</span>
            <span className="text-[10px] text-amber-300 font-black bg-amber-950/90 px-3 py-0.5 rounded-full border border-amber-500/40 font-sport">
              AWAY
            </span>
          </motion.div>
        </div>

        {/* High-Tech Animated Countdown Display with Athletic Tabular Numerals */}
        <div className="relative z-10 space-y-4 pt-5 border-t border-slate-700/60">
          <span className="text-xs sm:text-sm font-black text-slate-200 flex items-center justify-center gap-2 font-sport">
            <Clock size={16} className="text-cyan-400 animate-pulse" />
            <span>زمان باقی‌مانده تا سوت آغاز مسابقه (KICKOFF COUNTDOWN):</span>
          </span>

          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto dir-ltr font-sport">
            {/* Days Card */}
            <div className="fc-card p-3 sm:p-4 rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-slate-900/90 text-center shadow-lg relative overflow-hidden">
              <span className="text-2xl sm:text-4xl font-black text-cyan-300 block drop-shadow-[0_0_15px_rgba(0,243,255,0.6)]">
                {String(days).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-black mt-1 block">
                DAYS
              </span>
            </div>

            {/* Hours Card */}
            <div className="fc-card p-3 sm:p-4 rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-950/40 to-slate-900/90 text-center shadow-lg relative overflow-hidden">
              <span className="text-2xl sm:text-4xl font-black text-purple-300 block drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">
                {String(hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-black mt-1 block">
                HOURS
              </span>
            </div>

            {/* Minutes Card */}
            <div className="fc-card p-3 sm:p-4 rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-slate-900/90 text-center shadow-lg relative overflow-hidden">
              <span className="text-2xl sm:text-4xl font-black text-[#00ff87] block drop-shadow-[0_0_15px_rgba(0,255,135,0.6)]">
                {String(minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-black mt-1 block">
                MINS
              </span>
            </div>

            {/* Seconds Card (Pulsing Animation) */}
            <div className="fc-card p-3 sm:p-4 rounded-3xl border border-amber-500/50 bg-gradient-to-b from-amber-950/40 to-slate-900/90 text-center shadow-lg relative overflow-hidden">
              <span className="text-2xl sm:text-4xl font-black text-amber-300 block animate-pulse drop-shadow-[0_0_20px_rgba(245,158,11,0.8)]">
                {String(seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 uppercase tracking-widest font-black mt-1 block">
                SECS
              </span>
            </div>
          </div>
        </div>

        {/* T-15 Pre-Match Notification Banner */}
        {secondsLeft <= 900 && secondsLeft > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-500/70 text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_30px_rgba(245,158,11,0.35)] relative z-10"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={20} className="text-amber-400 animate-bounce shrink-0" />
              <span className="font-black text-right">
                هشدار: کمتر از ۱۵ دقیقه تا شروع مسابقه باقی مانده است! ترکیب و تاکتیک خود را نهایی کنید.
              </span>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="fc-btn-gold px-4 py-2 rounded-2xl text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer font-sport"
            >
              <Bell size={14} />
              <span>{hasRequestedPermission ? 'زنگ هشدار فعال شد 🔔' : 'فعال‌سازی هشدار پیش‌بازی'}</span>
            </button>
          </motion.div>
        ) : (
          <div className="relative z-10 flex justify-center">
            <button
              onClick={handleEnableNotifications}
              className="text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-2 transition-all bg-[#05080e]/80 px-5 py-2.5 rounded-full border border-cyan-500/30 hover:border-cyan-400/60 shadow-md cursor-pointer font-sport"
            >
              <Bell size={15} className="text-cyan-400 animate-bounce" />
              <span>ارسال نوتیفیکیشن و زنگ صوتی ۱۵ دقیقه قبل از مسابقه</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
