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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { matchApi, notificationApi, seasonPassApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import Toast from '../common/Toast';

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
      } catch (err) {
        console.error('Failed to load dashboard home data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [teamId]);

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
    <div className="space-y-4 pb-20 font-sans dir-rtl">
      {/* Special Offer Banner (Hyper Violet & Magenta Glow) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="fc-card-elevated p-3.5 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-950 flex items-center justify-between shadow-[0_8px_30px_rgba(168,85,247,0.25)] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full filter blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            <Sparkles size={20} className="animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-black text-white block tracking-tight">آفر ویژه پیش‌فصل مستر لیگ</span>
            <span className="text-[11px] text-purple-300">پک‌های تخفیفی سکه و جم ویژه افتتاحیه مسابقات</span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab?.('store')}
          className="flex flex-col items-end bg-[#05080e]/80 border border-purple-400/40 hover:border-cyan-400 px-3.5 py-1.5 rounded-2xl transition-all shadow-md active:scale-95 z-10"
        >
          <span className="text-[9.5px] text-purple-300 font-bold">مهلت باقی‌مانده:</span>
          <span className="text-xs sm:text-sm font-sport font-black text-cyan-300 dir-ltr tracking-wider">
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </button>
      </motion.div>

      {/* Next Match & Arena Clash Face-Off Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`fc-card-elevated p-4 sm:p-5 rounded-3xl border relative overflow-hidden transition-all ${
          !isLineupSubmittedActual && nextMatch
            ? 'border-rose-500/70 bg-gradient-to-b from-rose-950/40 via-slate-900/90 to-[#05080e] shadow-[0_0_30px_rgba(244,63,94,0.3)]'
            : 'border-cyan-500/30 bg-gradient-to-b from-[#0e172e]/90 via-[#0a0f1d]/90 to-[#05080e] shadow-[0_12px_40px_rgba(0,0,0,0.7)]'
        }`}
      >
        {/* Stadium Floodlight Top Shimmer */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-cyan-400/15 via-transparent to-transparent filter blur-xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-3.5 border-b border-slate-700/50 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-white">
            {!isLineupSubmittedActual && nextMatch ? (
              <AlertCircle size={17} className="text-rose-400 animate-bounce" />
            ) : (
              <Zap size={17} className="text-[#00ff87]" />
            )}
            <span className={!isLineupSubmittedActual && nextMatch ? 'text-rose-300' : 'text-cyan-300 font-sport tracking-wide'}>
              مسابقه بعدی (MATCHDAY ARENA)
            </span>
          </div>
          <span
            className={`text-[11px] px-3 py-1 rounded-full font-sport font-black ${
              !isLineupSubmittedActual && nextMatch
                ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'text-[#00ff87] bg-emerald-950/80 border border-emerald-500/40 shadow-[0_0_10px_rgba(0,255,135,0.2)]'
            }`}
          >
            {nextMatch ? `${nextMatch.round_name || 'هفته اول'} • ${dateStr}` : 'مسابقات فصل اول'}
          </span>
        </div>

        {/* Warning Banner if Lineup NOT submitted */}
        {!isLineupSubmittedActual && nextMatch ? (
          <div className="mb-3.5 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>هشدار ترکیب: تاکتیک و ترکیب ۱۱ نفره هنوز تایید نهایی نشده است!</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('team', 'lineup')}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black px-4 py-1.5 rounded-xl text-xs shrink-0 transition-all shadow-md active:scale-95 text-center font-sport cursor-pointer"
            >
              ثبت و تایید ترکیب
            </button>
          </div>
        ) : isLineupSubmittedActual && nextMatch ? (
          <div className="mb-3.5 p-2.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-[#00ff87] shrink-0" />
              <span>ترکیب و تاکتیک‌های تیم شما تایید و ثبت سرور شده است.</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('team', 'lineup')}
              className="text-[11px] text-cyan-300 hover:text-cyan-200 underline shrink-0 font-normal"
            >
              ویرایش ترکیب
            </button>
          </div>
        ) : null}

        {nextMatch ? (
          <div className="py-4 px-3 sm:px-5 bg-[#05080e]/80 rounded-2xl border border-slate-700/60 flex items-center justify-between shadow-inner">
            {/* Home Team */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl team-crest-badge flex items-center justify-center font-bold text-slate-800 text-sm p-1.5 overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)] relative shrink-0">
                {getTeamLogoUrl(teamData || teamName) ? (
                  <img src={getTeamLogoUrl(teamData || teamName)} alt={teamName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black">{teamName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div>
                <span className="text-xs sm:text-sm font-black text-white block tracking-tight">{teamName}</span>
                <span className="text-[10px] text-cyan-300 font-sport">{isHome ? 'میزبان (HOME)' : 'میهمان (AWAY)'}</span>
              </div>
            </div>

            {/* Stadium Clash VS Badge */}
            <div className="flex flex-col items-center px-2">
              <span className="text-xs font-black text-amber-300 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 px-3 py-1 rounded-xl border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] font-sport tracking-widest">
                VS
              </span>
              <span className="text-[10.5px] text-slate-300 mt-1.5 flex items-center gap-1 font-sport font-bold">
                <Clock size={12} className="text-cyan-400" /> {timeStr || '۱۴:۰۰'}
              </span>
            </div>

            {/* Away / Opponent Team */}
            <div className="flex items-center gap-3 text-left dir-ltr">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl team-crest-badge flex items-center justify-center font-bold text-slate-800 text-sm p-1.5 overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)] relative shrink-0">
                {getTeamLogoUrl(nextMatch.opponent_logo || opponentName) ? (
                  <img src={getTeamLogoUrl(nextMatch.opponent_logo || opponentName)} alt={opponentName} className="w-full h-full object-contain" />
                ) : (
                  <span className="font-sport font-black">{opponentName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-white block tracking-tight">{opponentName}</span>
                <span className="text-[10px] text-amber-300 font-sport">{!isHome ? 'میزبان (HOME)' : 'میهمان (AWAY)'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            برنامه مسابقه بعدی شما در حال بارگذاری است. لیگ از ۳۰ مرداد رسماً آغاز می‌شود.
          </div>
        )}

        <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-slate-700/50 text-xs">
          <button
            onClick={() => onNavigateTab?.('team', 'schedule')}
            className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors font-bold"
          >
            <span>مشاهده تقویم بازی‌های تیم</span>
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onNavigateTab?.('live')}
            className="fc-btn-magenta text-white px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all text-xs font-black shadow-md cursor-pointer"
          >
            <Radio size={13} className="animate-pulse" />
            <span>پخش زنده مسابقات</span>
          </button>
        </div>
      </motion.div>

      {/* Grid for Notifications & Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inbox / Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="fc-card p-4 rounded-3xl border border-slate-700/60"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-white">
              <Inbox size={16} className="text-cyan-400" />
              <span>صندوق پیام‌ها و اعلانات</span>
            </div>
            <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-sport font-black">
              {notifications.length} MSG
            </span>
          </div>

          <div className="space-y-2 text-xs max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                پیام جدیدی در صندوق دریافت شما وجود ندارد.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-2.5 rounded-2xl bg-[#05080e]/60 border border-slate-700/50 flex items-center justify-between hover:border-cyan-400/40 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f3ff]"></div>
                    <span className="text-slate-200 font-medium">{n.title || n.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sport">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('fa-IR') : 'به‌تازگی'}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Daily & Season Pass Active Missions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="fc-card p-4 rounded-3xl border border-slate-700/60 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-white">
              <Flame size={16} className="text-amber-400" />
              <span>ماموریت‌های فعال سیزن پس</span>
            </div>
            <button
              onClick={() => onNavigateTab?.('store', 'pass')}
              className="text-[10px] text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-sport font-black transition-all cursor-pointer flex items-center gap-1"
            >
              <span>SEASON PASS</span>
              <ChevronLeft size={12} />
            </button>
          </div>

          <div className="space-y-2 text-xs max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {(activeSeasonTasks || []).length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                ماموریت جدیدی در حال حاضر فعال نیست.
              </div>
            ) : (
              (activeSeasonTasks || [])
                .slice()
                .sort((a, b) => {
                  // Put completed but unclaimed first, then in-progress, then claimed
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
                  const title = String(taskObj.title || 'ماموریت فصلی');
                  const curVal = Number(task.current_value || 0);
                  const targetVal = Number(taskObj.target_value || 1);
                  const rewardXp = Number(taskObj.reward_xp || 56);
                  const isCompleted = Boolean(task.is_completed);
                  const isClaimed = Boolean(task.is_claimed);
                  const pct = Math.min(100, Math.round((curVal / Math.max(1, targetVal)) * 100));

                  return (
                    <div
                      key={task.id}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isClaimed
                          ? 'bg-[#05080e]/40 border-slate-800 text-slate-400'
                          : isCompleted
                          ? 'bg-gradient-to-r from-amber-950/60 to-purple-950/60 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#05080e]/70 border-slate-700/60'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
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
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-950/60 px-2 py-1 rounded-xl border border-emerald-500/30">
                            <CheckCircle2 size={12} /> دریافت شد
                          </span>
                        ) : isCompleted ? (
                          <button
                            disabled={claimingTaskId === task.id}
                            onClick={() => handleClaimHomeTask(task.id, rewardXp)}
                            className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-[10.5px] shadow-[0_0_12px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                          >
                            <Gift size={12} />
                            <span>دریافت XP</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
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
      </div>

      <Toast message={taskToast} type="success" isVisible={Boolean(taskToast)} />

      {/* League Standings Summary (Championship Leaderboard Format) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fc-card p-4 rounded-3xl border border-slate-700/60 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
          <div className="flex items-center gap-2 text-xs font-black text-white">
            <Trophy size={16} className="text-amber-400" />
            <span>وضعیت و جایگاه در جدول لیگ برتر</span>
          </div>
          <button
            onClick={() => onNavigateTab?.('team', 'table')}
            className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition-colors font-bold"
          >
            <span>مشاهده جدول کامل (۱۶ تیم)</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700/60 text-[10.5px] font-sport">
                <th className="pb-2 text-center w-12">رتبه</th>
                <th className="pb-2 pr-2">باشگاه</th>
                <th className="pb-2 text-center w-12">بازی</th>
                <th className="pb-2 text-center w-12">تفاضل</th>
                <th className="pb-2 text-center w-14 font-black">امتیاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {miniStandings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 text-xs">
                    جدول در حال بارگذاری است...
                  </td>
                </tr>
              ) : (
                miniStandings.map((row) => {
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
                              <span className="text-[9px] font-black text-slate-800 font-sport">{(row.name || 'FC').slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="font-bold text-xs truncate max-w-[130px] sm:max-w-[200px]">
                            {row.name}
                          </span>
                          {isMyTeam && (
                            <span className="text-[9px] bg-cyan-500/25 text-cyan-300 px-1.5 py-0.5 rounded-md border border-cyan-400/40 shrink-0 font-black font-sport">
                              YOUR CLUB
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-sport font-bold text-slate-300">{row.played ?? 0}</td>
                      <td className="py-2.5 text-center font-sport font-bold text-slate-300">
                        {row.gd != null ? row.gd : (row.goals_for != null && row.goals_against != null ? row.goals_for - row.goals_against : 0)}
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

      {/* 5 Recent Games Form Guide */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="fc-card p-4 rounded-3xl border border-slate-700/60"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
          <span className="text-xs font-black text-white">فرم بازی‌های اخیر تیم</span>
          <span className="text-[10.5px] text-slate-400 font-sport">
            {recentMatches.length > 0
              ? `${recentMatches.length} MATCHES RECORDED`
              : 'مسابقه‌ای در این فصل انجام نشده است'}
          </span>
        </div>

        {recentMatches.length > 0 ? (
          <div className="flex items-center gap-2 justify-center py-1">
            {recentMatches.slice(0, 5).map((m, idx) => {
              const isH = m.home_team === teamId;
              const myScore = isH ? m.home_score : m.away_score;
              const oppScore = isH ? m.away_score : m.home_score;
              const isWin = myScore > oppScore;
              const isDraw = myScore === oppScore;

              return (
                <div
                  key={m.id || idx}
                  className={`w-9 h-9 rounded-xl font-black font-sport flex items-center justify-center text-xs shadow-md transition-all ${
                    isWin
                      ? 'bg-emerald-500/20 border border-emerald-400/60 text-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.3)]'
                      : isDraw
                      ? 'bg-slate-800/80 border border-slate-700 text-slate-300'
                      : 'bg-rose-500/20 border border-rose-500/60 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  }`}
                >
                  {isWin ? 'W' : isDraw ? 'D' : 'L'}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-slate-400">
            هنوز مسابقه‌ای در این فصل برگزار نشده است. اولین مسابقه در ۳۰ مرداد برگزار می‌شود.
          </div>
        )}
      </motion.div>
    </div>
  );
}
