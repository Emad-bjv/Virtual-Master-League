import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Inbox,
  Flame,
  ChevronLeft,
  CheckCircle,
  CheckCircle2,
  Radio,
  Zap,
  Shield,
  Gift,
  Swords,
  ChevronDown,
  ChevronUp,
  Award,
  Activity,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { matchApi, notificationApi, seasonPassApi, battleRoyaleApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import Toast from '../common/Toast';
import TransferCountdownBanner from '../common/TransferCountdownBanner';

function formatMatchDate(dateString) {
  if (!dateString) return { dateStr: '۳۰ مرداد ۱۴۰۵', timeStr: '۱۴:۰۰' };
  try {
    const d = new Date(dateString);
    return {
      dateStr: d.toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran', month: 'long', day: 'numeric' }),
      timeStr: d.toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  } catch (_e) {
    return { dateStr: dateString, timeStr: '' };
  }
}

export default function HomeTab({ onNavigateTab, isLineupSubmitted = false, teamData }) {
  // Live Timer for Special Offer
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 12 });

  // Real Next Match State
  const [nextMatch, setNextMatch] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allStandings, setAllStandings] = useState([]);
  const [activeSeasonTasks, setActiveSeasonTasks] = useState([]);
  const [taskToast, setTaskToast] = useState('');
  const [claimingTaskId, setClaimingTaskId] = useState(null);
  const [_loadingData, setLoadingData] = useState(true);

  // Battle Royale format state
  const [activeBattleRoyale, setActiveBattleRoyale] = useState(null);
  const [showArchivedStandings, setShowArchivedStandings] = useState(false);
  const [homeSubTab, setHomeSubTab] = useState('missions_inbox'); // 'missions_inbox' | 'record_standings'

  const teamId = teamData?.id;
  const teamName = teamData?.name || 'تیم شما';

  // Match-Scoped Lineup Check for the upcoming match
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

  const handleClaimHomeTask = async (taskProgressId, rewardXp = 56) => {
    setClaimingTaskId(taskProgressId);
    try {
      await seasonPassApi.claimTask(taskProgressId);
      setTaskToast(`امتیاز تسک دریافت شد (+${rewardXp} XP به سیزن پس) 🎉`);
      const passRes = await seasonPassApi.getStatus();
      setActiveSeasonTasks(passRes.data?.weekly_tasks || []);
    } catch (err) {
      setTaskToast(err.response?.data?.error || 'خطا در دریافت امتیاز تسک');
    } finally {
      setClaimingTaskId(null);
      setTimeout(() => setTaskToast(''), 3500);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      setLoadingData(true);
      try {
        // 1. Fetch Schedule for Next Match
        if (teamId) {
          const schedRes = await matchApi.getTeamSchedule(teamId, { status: 'SCHEDULED' });
          const upcoming = schedRes.data || [];
          if (upcoming.length > 0) {
            setNextMatch(upcoming[0]);
          } else {
            setNextMatch(null);
          }

          // 2. Fetch Recent Match History
          const histRes = await matchApi.getTeamMatchHistory(teamId);
          setRecentMatches(histRes.data || []);
        }

        // 3. Fetch Notifications
        const notifRes = await notificationApi.getInbox();
        setNotifications(notifRes.data || []);

        // 4. Fetch Full Standings
        const standRes = await matchApi.getLeagueStandings();
        setAllStandings(standRes.data || []);

        // 5. Fetch Season Pass Active Tasks
        try {
          const passRes = await seasonPassApi.getStatus();
          setActiveSeasonTasks(passRes.data?.weekly_tasks || []);
        } catch (passErr) {
          console.error('Failed to load season pass tasks:', passErr);
        }

        // 6. Fetch Active Battle Royale Tournament
        try {
          const brRes = await battleRoyaleApi.getActive();
          if (brRes.data?.active) {
            setActiveBattleRoyale(brRes.data);
          } else {
            setActiveBattleRoyale(null);
          }
        } catch (_brErr) {
          setActiveBattleRoyale(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard home data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [teamId]);

  // Compute coach's survival and lives status in Battle Royale
  const myBrStatus = useMemo(() => {
    if (!activeBattleRoyale?.team_statuses) return null;
    if (teamId && activeBattleRoyale.team_statuses[teamId]) {
      return activeBattleRoyale.team_statuses[teamId];
    }
    const all = Object.values(activeBattleRoyale.team_statuses);
    return all.find((s) => s.team_name === teamName) || null;
  }, [activeBattleRoyale, teamId, teamName]);

  // Compute 3-row mini standings: (Top neighbor, My Team, Bottom neighbor)
  const miniStandings = useMemo(() => {
    if (!allStandings || allStandings.length === 0) return [];

    const standingsWithRank = allStandings.map((s, idx) => ({
      ...s,
      rank: idx + 1,
    }));

    if (!teamId) {
      return standingsWithRank.slice(0, 3);
    }

    const myIndex = standingsWithRank.findIndex((s) => s.team_id === teamId || s.name === teamName);

    if (myIndex === -1) {
      return standingsWithRank.slice(0, 3);
    }

    if (myIndex === 0) {
      // Leader: show top 3
      return standingsWithRank.slice(0, Math.min(3, standingsWithRank.length));
    }

    if (myIndex === standingsWithRank.length - 1) {
      // Last place: show bottom 3
      return standingsWithRank.slice(Math.max(0, standingsWithRank.length - 3));
    }

    // Mid-table: show Above, Current, Below
    return [
      standingsWithRank[myIndex - 1],
      standingsWithRank[myIndex],
      standingsWithRank[myIndex + 1],
    ];
  }, [allStandings, teamId, teamName]);

  const formatTime = (val) => String(val).padStart(2, '0');

  const isHome = nextMatch ? nextMatch.home_team === teamId : true;
  const opponentName = nextMatch ? (isHome ? nextMatch.away_team_name : nextMatch.home_team_name) : 'حریف مسابقه';
  const { dateStr, timeStr } = formatMatchDate(nextMatch?.date);

  return (
    <div className="space-y-4 pb-24 font-sans dir-rtl">
      {/* ============================================================== */}
      {/* 1. TOP UNIFIED STATUS BAR (Transfer Countdown + Special Offer) */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md"
      >
        {/* Transfer Countdown Banner Pill */}
        <div
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onNavigateTab?.('market')}
          title="مشاهده بازار نقل‌وانتقالات"
        >
          <TransferCountdownBanner compact={true} />
        </div>

        {/* Special Offer Pill */}
        <button
          onClick={() => onNavigateTab?.('store')}
          className="flex items-center justify-between sm:justify-end gap-2.5 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 hover:border-purple-400 px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-xs group"
          title="ورود به فروشگاه و بسته‌های ویژه"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-pink-400 animate-spin-slow" />
            <span className="text-purple-200 font-bold text-[11.5px]">آفر ویژه افتتاحیه مسابقات</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-purple-500/30">
            <Clock size={11} className="text-purple-300" />
            <span className="text-[11px] font-sport font-black text-cyan-300 dir-ltr tracking-wider">
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
          </div>
        </button>
      </motion.div>

      {/* ============================================================== */}
      {/* 2. MATCHDAY ARENA HERO CARD (Next Match + Battle Royale Focus)  */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`fc-card-elevated p-4 sm:p-6 rounded-3xl border relative overflow-hidden transition-all shadow-2xl ${
          !isLineupSubmittedActual && nextMatch
            ? 'border-rose-500/70 bg-gradient-to-b from-rose-950/30 via-slate-900/90 to-[#05080e] shadow-[0_0_35px_rgba(244,63,94,0.25)]'
            : 'border-cyan-500/40 bg-gradient-to-b from-[#0e172e]/90 via-[#0a0f1d]/90 to-[#05080e] shadow-[0_12px_45px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Stadium Floodlight Top Shimmer */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-4/5 h-28 bg-gradient-to-b from-cyan-400/20 via-transparent to-transparent filter blur-2xl pointer-events-none" />

        {/* Hero Card Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-black text-white">
            <div className="p-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Zap size={16} className="text-[#00ff87]" />
            </div>
            <div>
              <span className="text-cyan-300 font-sport tracking-wide text-xs sm:text-sm block">
                میدان نبرد و مسابقه بعدی (MATCHDAY ARENA)
              </span>
              <span className="text-[10.5px] text-slate-400">
                {nextMatch ? `${nextMatch.round_name || 'هفته مسابقات'} • ${dateStr}` : 'مسابقات فصل اول'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-3 py-1 rounded-full font-sport font-black flex items-center gap-1.5 ${
                !isLineupSubmittedActual && nextMatch
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'text-[#00ff87] bg-emerald-950/80 border border-emerald-500/40 shadow-[0_0_12px_rgba(0,255,135,0.2)]'
              }`}
            >
              <Clock size={12} className={!isLineupSubmittedActual && nextMatch ? 'text-rose-400' : 'text-[#00ff87]'} />
              <span>{timeStr || '۱۸:۰۰'}</span>
            </span>
          </div>
        </div>

        {/* Integrated Battle Royale Survival Status Ribbon */}
        {activeBattleRoyale && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-950 to-orange-950/50 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Swords size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300">نبرد رویال (دابل الیمینیشن)</span>
                  <span className="text-[9.5px] bg-amber-500/20 text-amber-200 px-2 py-0.2 rounded-full border border-amber-500/30">
                    فرمت فعال
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-0.5">
                  <span className="text-slate-400">جایگاه:</span>
                  <span className="font-bold text-white">{myBrStatus?.status_label || 'جدول برندگان 🛡️'}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">فرصت‌ها:</span>
                  <span className="font-sport font-black">
                    {myBrStatus?.lives === 2 ? '❤️❤️ ۲ جان (کامل)' : myBrStatus?.lives === 1 ? '❤️💔 ۱ جان (لبه تیغ)' : myBrStatus?.lives === 0 ? '💔💔 حذف شده' : '❤️❤️ ۲ جان'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab?.('battle_royale')}
              className="self-end sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>مشاهده درخت مسابقات</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        )}

        {/* Warning / Confirmation Banner for Lineup Submission */}
        {!isLineupSubmittedActual && nextMatch ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-950 to-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-rose-900/60 border border-rose-400/40 text-rose-300 animate-bounce shrink-0">
                <AlertCircle size={16} />
              </div>
              <span className="leading-relaxed">
                تاکتیک و ترکیب ۱۱ نفره تیم شما هنوز برای این مسابقه نهایی نشده است!
              </span>
            </div>
            <button
              onClick={() => onNavigateTab?.('team', 'lineup')}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shrink-0 transition-all shadow-md active:scale-95 text-center cursor-pointer"
            >
              ثبت و تایید ترکیب ⚡
            </button>
          </div>
        ) : isLineupSubmittedActual && nextMatch ? (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00ff87] shrink-0" />
              <span>ترکیب و تاکتیک‌های تیم شما تایید و ثبت سرور شده است.</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('team', 'lineup')}
              className="text-[11px] text-cyan-300 hover:text-cyan-200 underline shrink-0 font-normal cursor-pointer"
            >
              ویرایش ترکیب
            </button>
          </div>
        ) : null}

        {/* Match Face-Off Arena (Home vs Away) */}
        {nextMatch ? (
          <div className="py-4 px-3 sm:px-6 bg-[#05080e]/85 rounded-3xl border border-slate-800 flex items-center justify-between shadow-inner relative overflow-hidden">
            {/* Home Team */}
            <div className="flex items-center gap-3 w-[42%] justify-start">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 flex items-center justify-center overflow-hidden shadow-lg relative shrink-0">
                {getTeamLogoUrl(teamData || teamName) ? (
                  <img src={getTeamLogoUrl(teamData || teamName)} alt={teamName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black text-slate-300 text-sm sm:text-base">
                    {(teamName || 'FC').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-base font-black text-white block truncate tracking-tight">
                  {teamName}
                </span>
                <span className="text-[10px] text-cyan-300 font-sport font-bold">
                  {isHome ? 'میزبان (HOME)' : 'میهمان (AWAY)'}
                </span>
                <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                  سرمربی: {teamData?.coach_name || 'ثبت شده'}
                </span>
              </div>
            </div>

            {/* Stadium Clash VS Centerpiece */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2">
              <div className="relative flex items-center justify-center">
                <span className="text-xs sm:text-sm font-black text-amber-300 bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 px-3.5 py-1.5 rounded-2xl border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.4)] font-sport tracking-widest">
                  VS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-sport font-bold">
                <Clock size={11} className="text-cyan-400" /> {timeStr || '۱۸:۰۰'}
              </span>
            </div>

            {/* Away / Opponent Team */}
            <div className="flex items-center gap-3 w-[42%] justify-end text-left dir-ltr">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 flex items-center justify-center overflow-hidden shadow-lg relative shrink-0">
                {getTeamLogoUrl(nextMatch.opponent_logo || opponentName) ? (
                  <img src={getTeamLogoUrl(nextMatch.opponent_logo || opponentName)} alt={opponentName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black text-slate-300 text-sm sm:text-base">
                    {(opponentName || 'OP').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 text-right">
                <span className="text-xs sm:text-base font-black text-white block truncate tracking-tight">
                  {opponentName}
                </span>
                <span className="text-[10px] text-amber-300 font-sport font-bold">
                  {!isHome ? 'میزبان (HOME)' : 'میهمان (AWAY)'}
                </span>
                <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                  حریف مسابقه
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 px-4 text-center rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <Trophy size={28} className="text-slate-600 mx-auto" />
            <p className="text-xs text-slate-300 font-bold">برنامه مسابقه بعدی در حال تنظیم و قرعه‌کشی است.</p>
            <p className="text-[11px] text-slate-500">برای اطلاع از برنامه کامل، به بخش جدول مسابقات مراجعه فرمایید.</p>
          </div>
        )}

        {/* Hero Card Footer CTA Actions */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => onNavigateTab?.('team', 'schedule')}
            className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-colors font-bold cursor-pointer"
          >
            <Calendar size={14} />
            <span>مشاهده تقویم و برنامه بازی‌ها</span>
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onNavigateTab?.('live')}
            className="fc-btn-magenta text-white px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all text-xs font-black shadow-md cursor-pointer active:scale-95"
          >
            <Radio size={14} className="animate-pulse text-rose-200" />
            <span>اتاق پخش زنده مسابقات</span>
          </button>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 3. MODULAR SUB-TABS HUB (Missions/Inbox vs Record/Standings)   */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setHomeSubTab('missions_inbox')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            homeSubTab === 'missions_inbox'
              ? 'bg-gradient-to-r from-amber-500/20 to-purple-600/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/10 scale-[1.01]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Zap size={14} className={homeSubTab === 'missions_inbox' ? 'text-amber-400' : 'text-slate-400'} />
          <span>مرکز مأموریت‌ها و پیام‌ها</span>
          {(activeSeasonTasks || []).filter((t) => t.is_completed && !t.is_claimed).length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setHomeSubTab('record_standings')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            homeSubTab === 'record_standings'
              ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/10 scale-[1.01]'
              : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
          }`}
        >
          <Trophy size={14} className={homeSubTab === 'record_standings' ? 'text-cyan-400' : 'text-slate-400'} />
          <span>کارنامه و جدول مسابقات</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. SUB-TAB 1: MISSIONS & INBOX NOTIFICATIONS                   */}
      {/* ============================================================== */}
      {homeSubTab === 'missions_inbox' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Daily & Season Pass Active Missions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-800/90 flex flex-col justify-between space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <div className="p-1 rounded-lg bg-amber-950 border border-amber-500/30 text-amber-400">
                  <Flame size={15} />
                </div>
                <span>مأموریت‌های فعال سیزن‌پَس</span>
              </div>
              <button
                onClick={() => onNavigateTab?.('store', 'pass')}
                className="text-[10.5px] text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 px-3 py-1 rounded-xl font-sport font-black transition-all cursor-pointer flex items-center gap-1"
              >
                <span>SEASON PASS</span>
                <ChevronLeft size={12} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {(activeSeasonTasks || []).length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  مأموریت جدیدی در حال حاضر فعال نیست.
                </div>
              ) : (
                (activeSeasonTasks || [])
                  .slice()
                  .sort((a, b) => {
                    if (a.is_completed && !a.is_claimed) return -1;
                    if (b.is_completed && !b.is_claimed) return 1;
                    if (!a.is_claimed && b.is_claimed) return -1;
                    if (a.is_claimed && !b.is_claimed) return 1;
                    return 0;
                  })
                  .slice(0, 3)
                  .map((task) => {
                    if (!task) return null;
                    const taskObj = task.task || {};
                    const title = String(taskObj.title || 'مأموریت فصلی');
                    const curVal = Number(task.current_value || 0);
                    const targetVal = Number(taskObj.target_value || 1);
                    const rewardXp = Number(taskObj.reward_xp || 56);
                    const isCompleted = Boolean(task.is_completed);
                    const isClaimed = Boolean(task.is_claimed);
                    const pct = Math.min(100, Math.round((curVal / Math.max(1, targetVal)) * 100));

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isClaimed
                            ? 'bg-[#05080e]/40 border-slate-800 text-slate-400'
                            : isCompleted
                            ? 'bg-gradient-to-r from-amber-950/60 to-purple-950/60 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-[#05080e]/70 border-slate-800'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200 text-xs truncate">{title}</span>
                            <span className="text-[10px] font-sport text-cyan-300 font-bold shrink-0 mr-2">
                              +{rewardXp} XP
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full ${
                                  isCompleted
                                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                                    : 'bg-cyan-400'
                                }`}
                              />
                            </div>
                            <span className="text-[9.5px] text-slate-400 font-sport shrink-0">
                              {curVal}/{targetVal}
                            </span>
                          </div>
                        </div>

                        {/* Claim or Status Button */}
                        <div className="shrink-0">
                          {isClaimed ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                              <CheckCircle2 size={12} /> دریافت شد
                            </span>
                          ) : isCompleted ? (
                            <button
                              disabled={claimingTaskId === task.id}
                              onClick={() => handleClaimHomeTask(task.id, rewardXp)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-[10.5px] shadow-[0_0_15px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Gift size={12} />
                              <span>دریافت XP</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                              در جریان
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </motion.div>

          {/* Inbox / Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-800/90 flex flex-col justify-between space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <div className="p-1 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                  <Inbox size={15} />
                </div>
                <span>صندوق پیام‌ها و اعلانات باشگاه</span>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-sport font-black">
                {notifications.length} پیام
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {(notifications || []).length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  پیام جدیدی در صندوق دریافت شما وجود ندارد.
                </div>
              ) : (
                (notifications || []).slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-2xl bg-[#05080e]/60 border border-slate-800 flex items-center justify-between hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f3ff] shrink-0" />
                      <span className="text-slate-200 font-medium truncate">{n.title || n.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sport shrink-0 mr-2">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('fa-IR') : 'به‌تازگی'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SUB-TAB 2: TEAM RECORD & STANDINGS SUMMARY                  */}
      {/* ============================================================== */}
      {homeSubTab === 'record_standings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* 5 Recent Games Form Guide */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-800/90 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <div className="p-1 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  <Activity size={15} />
                </div>
                <span>فرم ۵ بازی اخیر تیم</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sport">
                {recentMatches.length > 0
                  ? `${recentMatches.length} مسابقه ثبت‌شده`
                  : 'مسابقه‌ای در این فصل انجام نشده'}
              </span>
            </div>

            {recentMatches.length > 0 ? (
              <div className="flex items-center gap-2.5 justify-center py-4">
                {recentMatches.slice(0, 5).map((m, idx) => {
                  const isH = m.home_team === teamId;
                  const myScore = isH ? m.home_score : m.away_score;
                  const oppScore = isH ? m.away_score : m.home_score;
                  const isWin = myScore > oppScore;
                  const isDraw = myScore === oppScore;

                  return (
                    <div
                      key={m.id || idx}
                      className={`w-10 h-10 rounded-2xl font-black font-sport flex items-center justify-center text-xs shadow-md transition-all ${
                        isWin
                          ? 'bg-emerald-500/20 border border-emerald-400/60 text-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.3)]'
                          : isDraw
                          ? 'bg-slate-800/80 border border-slate-700 text-slate-300'
                          : 'bg-rose-500/20 border border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                      }`}
                      title={isWin ? 'پیروزی (Win)' : isDraw ? 'تساوی (Draw)' : 'شکست (Loss)'}
                    >
                      {isWin ? 'W' : isDraw ? 'D' : 'L'}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                هنوز مسابقه‌ای در این فصل برگزار نشده است.
              </div>
            )}
          </motion.div>

          {/* Standings Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-800/90 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <div className="p-1 rounded-lg bg-amber-950 border border-amber-500/30 text-amber-400">
                  <Trophy size={15} />
                </div>
                <span>
                  {activeBattleRoyale
                    ? 'آرشیو جدول رده‌بندی لیگ برتر'
                    : 'وضعیت در جدول رده‌بندی'}
                </span>
                {activeBattleRoyale && (
                  <span className="text-[9.5px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
                    فرمت معلق
                  </span>
                )}
              </div>

              <button
                onClick={() => onNavigateTab?.('team', 'table')}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors font-bold cursor-pointer"
              >
                <span>مشاهده کامل</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/60 text-[10px] font-sport">
                    <th className="pb-2 text-center w-12">رتبه</th>
                    <th className="pb-2 pr-2">باشگاه</th>
                    <th className="pb-2 text-center w-12">بازی</th>
                    <th className="pb-2 text-center w-12">تفاضل</th>
                    <th className="pb-2 text-center w-14 font-black">امتیاز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(miniStandings || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                        جدول در حال بارگذاری است...
                      </td>
                    </tr>
                  ) : (
                    (miniStandings || []).map((row) => {
                      const isMyTeam = row.team_id === teamId || row.name === teamName;
                      return (
                        <tr
                          key={row.team_id || row.name}
                          className={`transition-all ${
                            isMyTeam
                              ? 'bg-gradient-to-r from-cyan-950/60 to-purple-950/60 text-white font-bold border-l-2 border-cyan-400 shadow-inner'
                              : 'text-slate-300 hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="py-2.5 text-center font-sport font-black">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                                row.rank === 1
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                  : row.rank <= 4
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : 'bg-slate-800/80 text-slate-400'
                              }`}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl team-crest-badge flex items-center justify-center overflow-hidden p-0.5 shrink-0 shadow-sm relative">
                                {getTeamLogoUrl(row) ? (
                                  <img src={getTeamLogoUrl(row)} alt={row.name} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-[9px] font-black text-slate-800 font-sport">
                                    {(row.name || 'FC').slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-xs truncate max-w-[130px] sm:max-w-[180px]">
                                {row.name}
                              </span>
                              {isMyTeam && (
                                <span className="text-[9px] bg-cyan-500/25 text-cyan-300 px-1.5 py-0.2 rounded-md border border-cyan-400/40 shrink-0 font-black font-sport">
                                  تیم شما
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-center font-sport font-bold text-slate-300">{row.played ?? 0}</td>
                          <td className="py-2.5 text-center font-sport font-bold text-slate-300">
                            {row.gd != null
                              ? row.gd
                              : row.goals_for != null && row.goals_against != null
                              ? row.goals_for - row.goals_against
                              : 0}
                          </td>
                          <td className="py-2.5 text-center font-sport font-black text-amber-300 text-sm">
                            {row.points ?? row.pts ?? 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Task claiming toast notification */}
      <Toast message={taskToast} type="success" isVisible={Boolean(taskToast)} />
    </div>
  );
}

