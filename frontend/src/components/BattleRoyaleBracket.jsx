import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Flame, Shield, Calendar, Clock, RefreshCw, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle2, AlertTriangle, Eye, ArrowLeftRight, Swords, Star, Info,
  BookOpen, Zap, Target, Search, X, Check, Award, Radio, Filter
} from 'lucide-react';
import { battleRoyaleApi, adminApi } from '../services/api';
import { getTeamLogoUrl } from '../utils/teamLogos';
import { useAuth } from '../context/AuthContext';
import BattleRoyaleGuideView from './BattleRoyaleGuideView';

export default function BattleRoyaleBracket({ tournamentId, isAdmin = false, onMatchClick }) {
  // Safe auth context consumption
  let user = null;
  try {
    const auth = useAuth();
    user = auth?.user || null;
  } catch (_e) {
    user = null;
  }
  const userTeamId = user?.team_id || user?.team?.id || null;

  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('winners'); // 'winners' | 'losers' | 'grand_final' | 'schedule' | 'guide'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [highlightedTeamId, setHighlightedTeamId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('ALL'); // 'ALL' | 'LIVE' | 'FINISHED' | 'SCHEDULED'

  const fetchBracket = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      let res;
      if (tournamentId) {
        res = await battleRoyaleApi.getBracket(tournamentId);
      } else {
        res = await battleRoyaleApi.getActive();
      }

      if (res && res.data) {
        setBracketData(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch Battle Royale bracket:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchBracket();

    const handleUpdate = () => fetchBracket(true);
    window.addEventListener('battle_royale_bracket_updated', handleUpdate);
    window.addEventListener('vml_match_status_updated', handleUpdate);

    return () => {
      window.removeEventListener('battle_royale_bracket_updated', handleUpdate);
      window.removeEventListener('vml_match_status_updated', handleUpdate);
    };
  }, [fetchBracket]);

  const tournament = bracketData?.tournament || {};
  const wbRounds = bracketData?.winners_bracket || [];
  const lbRounds = bracketData?.losers_bracket || [];
  const gfMatches = bracketData?.grand_final || [];
  const champion = bracketData?.champion || null;
  const stats = bracketData?.stats || { total_matches: 0, finished_matches: 0, remaining_matches: 0 };

  const mainGf = useMemo(() => {
    return (gfMatches || []).find((m) => !m.is_reset_match) || null;
  }, [gfMatches]);

  const resetGf = useMemo(() => {
    return (gfMatches || []).find((m) => m.is_reset_match) || null;
  }, [gfMatches]);

  // All matches flattened for schedule & search
  const allMatchesChronological = useMemo(() => {
    const list = [];
    (wbRounds || []).forEach((r) => (r.matches || []).forEach((m) => list.push(m)));
    (lbRounds || []).forEach((r) => (r.matches || []).forEach((m) => list.push(m)));
    (gfMatches || []).forEach((m) => list.push(m));

    return list.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }, [wbRounds, lbRounds, gfMatches]);

  // Live match count
  const liveCount = useMemo(() => {
    return (allMatchesChronological || []).filter((m) => m.status === 'LIVE').length;
  }, [allMatchesChronological]);

  // Unique teams list for focus filter dropdown
  const participatingTeams = useMemo(() => {
    const map = new Map();
    (allMatchesChronological || []).forEach((m) => {
      if (m.home_team_id && m.home_team_name && !m.home_team_name.includes('مشخص نشده')) {
        map.set(m.home_team_id, { id: m.home_team_id, name: m.home_team_name, logo: m.home_team_logo });
      }
      if (m.away_team_id && m.away_team_name && !m.away_team_name.includes('مشخص نشده')) {
        map.set(m.away_team_id, { id: m.away_team_id, name: m.away_team_name, logo: m.away_team_logo });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, [allMatchesChronological]);

  // Format Persian Date
  const formatDateFa = (isoDate) => {
    if (!isoDate) return 'زمان اعلام‌نشده';
    try {
      const d = new Date(isoDate);
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      const dayName = days[d.getDay()];
      const timeStr = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
      return `${dayName} ${dateStr} • ${timeStr}`;
    } catch {
      return String(isoDate);
    }
  };

  const getWinnerId = (m) => {
    if (!m || m.status !== 'FINISHED') return null;
    const hScore = Number(m.home_score || 0);
    const aScore = Number(m.away_score || 0);
    if (hScore > aScore) return m.home_team_id;
    if (aScore > hScore) return m.away_team_id;

    const hPen = Number(m.home_penalties || 0);
    const aPen = Number(m.away_penalties || 0);
    if (hPen > aPen) return m.home_team_id;
    if (aPen > hPen) return m.away_team_id;
    return null;
  };

  const handleNavigateToLineup = (targetMatch) => {
    if (targetMatch?.id) {
      try {
        sessionStorage.setItem('vml_selected_match_id', String(targetMatch.id));
      } catch (_e) {}
    }
    window.dispatchEvent(new CustomEvent('vml_navigate_tab', {
      detail: {
        tab: 'team',
        sub: 'lineup',
        matchId: targetMatch?.id || null,
      },
    }));
  };

  // Tournament progress percentage
  const progressPercent = useMemo(() => {
    const total = Number(stats.total_matches || 0);
    const finished = Number(stats.finished_matches || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((finished / total) * 100));
  }, [stats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin absolute -bottom-1 -right-1" />
        </div>
        <span className="text-sm font-black text-gray-200">در حال دریافت ساختار تورنمنت نبرد رویال...</span>
        <span className="text-xs text-gray-500">بارگذاری جدول مسابقات و مسیر صعود تیم‌ها</span>
      </div>
    );
  }

  if (!tournament.id && (!bracketData || bracketData.active === false)) {
    return (
      <div className="space-y-6 pb-28 sm:pb-36">
        <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Swords className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-black text-white">هیچ دوره نبرد رویالی هم‌اکنون در جریان نیست</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            در حال حاضر مسابقات حذفی دوطرفه (Battle Royale) فعال نشده است. قوانین رسمی و راهنمای ساختار این فرمت را می‌توانید در ادامه مرور کنید.
          </p>
        </div>
        <BattleRoyaleGuideView />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-36 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP BROADCAST HEADER & STATS BAR                                      */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-amber-500/20 shadow-2xl backdrop-blur-2xl p-5 sm:p-6 overflow-hidden">
        {/* Ambient Neon Lighting */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Tournament Identity */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-orange-600/30 border border-amber-400/40 shrink-0">
              <Swords className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {String(tournament.name || 'تورنمنت نبرد رویال مستر لیگ')}
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Double Elimination
                </span>
                {liveCount > 0 ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/50 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    {liveCount} بازی زنده
                  </span>
                ) : tournament.is_active ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    در حال برگزاری
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-400">
                هر تیم ۲ شانس بقا دارد: باخت اول به براکت بازنده‌ها، باخت دوم حذف قطعی از تورنمنت.
              </p>
            </div>
          </div>

          {/* Quick Metrics, Team Highlighter & Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* Live Progress Bar and Counts */}
            <div className="flex items-center gap-3 bg-black/50 border border-white/10 rounded-2xl px-4 py-2.5 shadow-inner">
              <div className="text-center px-1">
                <span className="text-[10px] text-gray-400 block font-semibold">کل نبردها</span>
                <span className="text-sm font-black text-white">{stats.total_matches}</span>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center px-1">
                <span className="text-[10px] text-gray-400 block font-semibold">پایان‌یافته</span>
                <span className="text-sm font-black text-emerald-400">{stats.finished_matches}</span>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center px-1">
                <span className="text-[10px] text-gray-400 block font-semibold">باقی‌مانده</span>
                <span className="text-sm font-black text-amber-400">{stats.remaining_matches}</span>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center px-1 min-w-[50px]">
                <span className="text-[10px] text-gray-400 block font-semibold">پیشرفت</span>
                <span className="text-xs font-black text-cyan-400 font-mono">{progressPercent}٪</span>
              </div>
            </div>

            {/* Team Focus Spotlight Filter */}
            {participatingTeams.length > 0 && (
              <div className="relative">
                <select
                  value={highlightedTeamId || ''}
                  onChange={(e) => setHighlightedTeamId(e.target.value ? Number(e.target.value) : null)}
                  className="appearance-none bg-slate-950/80 border border-amber-500/30 text-amber-300 rounded-2xl px-3 py-2 pr-7 text-xs font-bold focus:outline-none focus:border-amber-400 transition-all cursor-pointer shadow-md"
                >
                  <option value="" className="bg-slate-900 text-gray-300">
                    🔍 ردیابی مسیر تیم...
                  </option>
                  {participatingTeams.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.name} {userTeamId === t.id ? '⭐ (تیم شما)' : ''}
                    </option>
                  ))}
                </select>
                <Target className="w-3.5 h-3.5 text-amber-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Guide Button */}
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/25'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">راهنمای تورنمنت</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchBracket(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer"
              title="به‌روزرسانی براکت"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Progress Bar Line */}
        <div className="mt-5 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full"
          />
        </div>

        {/* Champion Banner (When finalized) */}
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/30 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <Trophy className="w-6 h-6 text-amber-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] font-black text-amber-400 block tracking-wider uppercase">
                  قهرمان بلامنازع نبرد رویال 🏆
                </span>
                <span className="text-lg font-black text-white">{String(champion.name || 'نامشخص')}</span>
              </div>
            </div>

            {champion.logo && (
              <img
                src={getTeamLogoUrl(champion.logo)}
                alt={champion.name}
                className="w-12 h-12 object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              />
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 2. SEGMENTED NAVIGATION DOCK                                              */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t border-white/10 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('winners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === 'winners'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            براکت برنده‌ها (Winners)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('losers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === 'losers'
                ? 'bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-lg shadow-orange-600/30 ring-1 ring-orange-400/50'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-300" />
            براکت بازنده‌ها (Losers)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grand_final')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === 'grand_final'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-300'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            فینال بزرگ (Grand Final)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/50'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-cyan-300" />
            تقویم و جدول مسابقات
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400/50'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-300" />
            راهنمای کامل و قوانین 📖
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB CONTENT                                                            */}
      {/* ========================================================================= */}

      {/* TAB A: WINNERS BRACKET (ESPORTS BRACKET TREE WITH BALANCED FORK CONNECTORS) */}
      {activeTab === 'winners' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2">
            <div>
              <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                مراحل براکت برنده‌ها — مسیر بدون باخت به فینال بزرگ
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                تیم‌ها با پیروزی به دور بعد صعود کرده و با اولین شکست، به براکت بازنده‌ها منتقل می‌شوند.
              </p>
            </div>

            {highlightedTeamId && (
              <button
                type="button"
                onClick={() => setHighlightedTeamId(null)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 cursor-pointer transition-all"
              >
                <X className="w-3 h-3" />
                حذف هایلایت تیم
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Bracket Canvas */}
          <div className="overflow-x-auto pb-6 pt-2 rounded-3xl border border-white/5 bg-slate-950/60 shadow-2xl">
            <div className="flex min-w-max p-4 items-stretch">
              {(wbRounds || []).map((round, rIdx) => {
                const matches = round.matches || [];
                const nextRound = wbRounds[rIdx + 1];
                const hasNextFork = nextRound && nextRound.matches && nextRound.matches.length > 0;
                const forkCount = hasNextFork ? nextRound.matches.length : 0;

                return (
                  <React.Fragment key={round.round_number || rIdx}>
                    {/* Round Column */}
                    <div className="w-72 sm:w-80 flex flex-col shrink-0 min-h-[1050px]">
                      {/* Round Header Badge */}
                      <div className="p-3 mb-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 text-center shadow-md shrink-0">
                        <span className="text-xs font-black text-emerald-300 block">
                          {String(round.round_name || `دور ${round.round_number}`)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                          {matches.length} مسابقه
                        </span>
                      </div>

                      {/* Matches in balanced vertical alignment */}
                      <div className="flex-1 flex flex-col justify-around py-2 space-y-4">
                        {matches.map((m) => {
                          const isMatchInvolvingHighlighted =
                            highlightedTeamId &&
                            (m.home_team_id === highlightedTeamId || m.away_team_id === highlightedTeamId);

                          const isUserClub =
                            userTeamId &&
                            (m.home_team_id === userTeamId || m.away_team_id === userTeamId);

                          return (
                            <EsportsMatchCard
                              key={m.id}
                              match={m}
                              winnerId={getWinnerId(m)}
                              formatDateFa={formatDateFa}
                              isHighlighted={Boolean(isMatchInvolvingHighlighted)}
                              isUserClub={Boolean(isUserClub)}
                              highlightedTeamId={highlightedTeamId}
                              onTeamHover={setHighlightedTeamId}
                              onLineupClick={handleNavigateToLineup}
                              onClick={() => {
                                setSelectedMatch(m);
                                if (onMatchClick) onMatchClick(m);
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* SVG Fork Connector Column between this round and next round */}
                    {hasNextFork && forkCount > 0 && (
                      <div className="w-10 sm:w-14 flex flex-col shrink-0 min-h-[1050px] pt-16">
                        <div className="flex-1 flex flex-col justify-around">
                          {Array.from({ length: forkCount }).map((_, forkIdx) => {
                            const parentMatch1 = matches[forkIdx * 2];
                            const parentMatch2 = matches[forkIdx * 2 + 1];

                            const isTopActive =
                              highlightedTeamId &&
                              parentMatch1 &&
                              (parentMatch1.home_team_id === highlightedTeamId ||
                                parentMatch1.away_team_id === highlightedTeamId);

                            const isBottomActive =
                              highlightedTeamId &&
                              parentMatch2 &&
                              (parentMatch2.home_team_id === highlightedTeamId ||
                                parentMatch2.away_team_id === highlightedTeamId);

                            return (
                              <div
                                key={forkIdx}
                                className="flex-1 flex items-center justify-center relative w-full"
                              >
                                <svg
                                  className="w-full h-full overflow-visible"
                                  preserveAspectRatio="none"
                                  viewBox="0 0 100 100"
                                >
                                  {/* Top Feeder Branch: Starts from Right (100%), turns at midpoint (50%), goes to Left (0%) */}
                                  <path
                                    d="M 100 25 H 50 V 50 H 0"
                                    fill="none"
                                    stroke={isTopActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}
                                    strokeWidth={isTopActive ? 3 : 1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={
                                      isTopActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''
                                    }
                                  />
                                  {/* Bottom Feeder Branch: Starts from Right (100%), turns at midpoint (50%), goes to Left (0%) */}
                                  <path
                                    d="M 100 75 H 50 V 50 H 0"
                                    fill="none"
                                    stroke={isBottomActive ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}
                                    strokeWidth={isBottomActive ? 3 : 1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={
                                      isBottomActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''
                                    }
                                  />
                                  {/* Central Convergence Point Node */}
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r={isTopActive || isBottomActive ? 4 : 2.5}
                                    fill={isTopActive || isBottomActive ? '#f59e0b' : 'rgba(16, 185, 129, 0.5)'}
                                  />
                                </svg>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: LOSERS BRACKET */}
      {activeTab === 'losers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2">
            <div>
              <h3 className="text-sm font-black text-orange-400 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                مراحل براکت بازنده‌ها — نبرد مرگ و زندگی
              </h3>
              <p className="text-[11px] text-rose-400 font-bold mt-0.5">
                تیم‌های این براکت متحمل ۱ باخت شده‌اند؛ دومین باخت مساوی با خروج دائمی و حذف از تورنمنت است!
              </p>
            </div>

            {highlightedTeamId && (
              <button
                type="button"
                onClick={() => setHighlightedTeamId(null)}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 cursor-pointer transition-all"
              >
                <X className="w-3 h-3" />
                حذف هایلایت تیم
              </button>
            )}
          </div>

          <div className="overflow-x-auto pb-6 pt-2 rounded-3xl border border-white/5 bg-slate-950/60 shadow-2xl">
            <div className="flex min-w-max p-4 items-stretch gap-6">
              {(lbRounds || []).map((round, rIdx) => {
                const matches = round.matches || [];
                const isDropdownRound = round.round_number % 2 === 0;

                return (
                  <div
                    key={round.round_number || rIdx}
                    className="w-72 sm:w-80 flex flex-col shrink-0 min-h-[600px]"
                  >
                    {/* Round Header Badge */}
                    <div className="p-3 mb-4 rounded-2xl bg-gradient-to-r from-orange-950/80 to-slate-900 border border-orange-500/30 text-center shadow-md shrink-0">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs font-black text-orange-300 block">
                          {String(round.round_name || `دور بازنده‌ها ${round.round_number}`)}
                        </span>
                        {isDropdownRound && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            تقاطع با برندگان
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                        {matches.length} مسابقه
                      </span>
                    </div>

                    {/* Matches in Losers Round */}
                    <div className="flex-1 flex flex-col justify-around py-2 space-y-4">
                      {matches.map((m) => {
                        const isMatchInvolvingHighlighted =
                          highlightedTeamId &&
                          (m.home_team_id === highlightedTeamId || m.away_team_id === highlightedTeamId);

                        const isUserClub =
                          userTeamId &&
                          (m.home_team_id === userTeamId || m.away_team_id === userTeamId);

                        return (
                          <EsportsMatchCard
                            key={m.id}
                            match={m}
                            winnerId={getWinnerId(m)}
                            formatDateFa={formatDateFa}
                            isHighlighted={Boolean(isMatchInvolvingHighlighted)}
                            isUserClub={Boolean(isUserClub)}
                            highlightedTeamId={highlightedTeamId}
                            onTeamHover={setHighlightedTeamId}
                            onLineupClick={handleNavigateToLineup}
                            onClick={() => {
                              setSelectedMatch(m);
                              if (onMatchClick) onMatchClick(m);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB C: GRAND FINAL */}
      {activeTab === 'grand_final' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black shadow-lg">
              <Trophy className="w-4 h-4" />
              نبرد نهایی تعیین قهرمان کل مسابقات
            </div>
            <h3 className="text-2xl font-black text-white">فینال بزرگ (Grand Final)</h3>
            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              برنده براکت برنده‌ها (بدون باخت) در برابر برنده براکت بازنده‌ها (۱ باخت).
              اگر تیم بازنده‌ها بازی اول را ببرد، به دلیل برابری تعداد باخت‌ها، مسابقه دوم (ریست فینال) برای مشخص شدن قهرمان قطعی فعال می‌شود!
            </p>
          </div>

          {/* Grand Final Match 1 */}
          {mainGf && (
            <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-amber-400">
                    بازی اول فینال بزرگ (Match #1)
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-300">{formatDateFa(mainGf.date)}</span>
              </div>

              <EsportsMatchCard
                match={mainGf}
                winnerId={getWinnerId(mainGf)}
                formatDateFa={formatDateFa}
                isHighlighted={Boolean(
                  highlightedTeamId &&
                    (mainGf.home_team_id === highlightedTeamId || mainGf.away_team_id === highlightedTeamId)
                )}
                isUserClub={Boolean(
                  userTeamId &&
                    (mainGf.home_team_id === userTeamId || mainGf.away_team_id === userTeamId)
                )}
                highlightedTeamId={highlightedTeamId}
                onTeamHover={setHighlightedTeamId}
                onLineupClick={handleNavigateToLineup}
                onClick={() => {
                  setSelectedMatch(mainGf);
                  if (onMatchClick) onMatchClick(mainGf);
                }}
              />
            </div>
          )}

          {/* Grand Final Reset Match (Conditional) */}
          {resetGf && (
            <div
              className={`rounded-3xl p-6 border transition-all ${
                resetGf.status === 'SCHEDULED' && resetGf.round_name !== 'فینال بزرگ (بدون نیاز به ریست)'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-2xl shadow-amber-950/40'
                  : 'bg-slate-950/60 border-white/5 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black text-orange-300">
                    بازی دوم فینال بزرگ (ریست براکت - Bracket Reset)
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400">
                  {resetGf.round_name === 'فینال بزرگ (بدون نیاز به ریست)'
                    ? 'بدون نیاز به بازی دوم'
                    : resetGf.status === 'FINISHED'
                    ? 'انجام شد'
                    : 'مشروط به پیروزی قهرمان بازنده‌ها در بازی اول'}
                </span>
              </div>

              <EsportsMatchCard
                match={resetGf}
                winnerId={getWinnerId(resetGf)}
                formatDateFa={formatDateFa}
                isHighlighted={Boolean(
                  highlightedTeamId &&
                    (resetGf.home_team_id === highlightedTeamId || resetGf.away_team_id === highlightedTeamId)
                )}
                isUserClub={Boolean(
                  userTeamId &&
                    (resetGf.home_team_id === userTeamId || resetGf.away_team_id === userTeamId)
                )}
                highlightedTeamId={highlightedTeamId}
                onTeamHover={setHighlightedTeamId}
                onLineupClick={handleNavigateToLineup}
                onClick={() => {
                  setSelectedMatch(resetGf);
                  if (onMatchClick) onMatchClick(resetGf);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB D: SCHEDULE CALENDAR */}
      {activeTab === 'schedule' && (
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                تقویم جامع مسابقات نبرد رویال
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                روزهای برگزاری: یکشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه (شنبه و دوشنبه استراحت)
              </p>
            </div>

            {/* Filter Pills and Search */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setScheduleFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    scheduleFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  همه ({allMatchesChronological.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('LIVE')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    scheduleFilter === 'LIVE'
                      ? 'bg-rose-500 text-white font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  زنده ({liveCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('FINISHED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    scheduleFilter === 'FINISHED'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  انجام‌شده ({stats.finished_matches})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleFilter('SCHEDULED')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    scheduleFilter === 'SCHEDULED'
                      ? 'bg-cyan-600 text-white font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  پیش‌رو ({stats.remaining_matches})
                </button>
              </div>

              {/* Text Search */}
              <div className="relative flex-1 md:w-48">
                <input
                  type="text"
                  placeholder="جستجوی نام تیم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-1.5 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="space-y-3">
            {allMatchesChronological
              .filter((m) => {
                if (scheduleFilter === 'LIVE' && m.status !== 'LIVE') return false;
                if (scheduleFilter === 'FINISHED' && m.status !== 'FINISHED') return false;
                if (scheduleFilter === 'SCHEDULED' && m.status !== 'SCHEDULED') return false;

                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const h = String(m.home_team_name || '').toLowerCase();
                  const a = String(m.away_team_name || '').toLowerCase();
                  const r = String(m.round_name || '').toLowerCase();
                  return h.includes(q) || a.includes(q) || r.includes(q);
                }
                return true;
              })
              .map((m) => {
                const winnerId = getWinnerId(m);
                const isUserClub =
                  userTeamId && (m.home_team_id === userTeamId || m.away_team_id === userTeamId);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMatch(m);
                      if (onMatchClick) onMatchClick(m);
                    }}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isUserClub
                        ? 'bg-amber-950/25 border-amber-500/40 hover:border-amber-400 shadow-md'
                        : 'bg-slate-950/70 hover:bg-slate-950 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                          m.bracket_side === 'WINNERS'
                            ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                            : m.bracket_side === 'LOSERS'
                            ? 'bg-orange-950/60 border-orange-500/30 text-orange-300'
                            : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        #{m.match_number} {String(m.round_name || '')}
                      </span>

                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {formatDateFa(m.date)}
                      </span>

                      {isUserClub && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          تیم شما ⭐
                        </span>
                      )}
                    </div>

                    {/* Teams and Score */}
                    <div className="flex items-center gap-4 self-center sm:self-auto">
                      <div className="flex items-center gap-2 text-right">
                        <span
                          className={`text-xs font-bold ${
                            winnerId === m.home_team_id ? 'text-emerald-400 font-black' : 'text-gray-200'
                          }`}
                        >
                          {String(m.home_team_name || m.home_feeder_label || 'TBD')}
                        </span>
                        {m.home_team_logo ? (
                          <img
                            src={getTeamLogoUrl(m.home_team_logo)}
                            alt=""
                            className="w-6 h-6 object-contain rounded-lg bg-black/40 p-0.5 border border-white/10"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-[10px]">
                            🛡️
                          </div>
                        )}
                      </div>

                      <div className="bg-black/60 border border-white/10 px-3 py-1 rounded-xl text-xs font-mono font-black text-white min-w-[55px] text-center shadow-inner">
                        {m.status === 'FINISHED' ? (
                          <span>
                            {m.home_score} - {m.away_score}
                            {m.home_penalties !== null && (
                              <span className="text-[10px] text-amber-400 block font-normal">
                                ({m.home_penalties}-{m.away_penalties})
                              </span>
                            )}
                          </span>
                        ) : m.status === 'LIVE' ? (
                          <span className="text-rose-400 animate-pulse font-black">LIVE</span>
                        ) : (
                          <span className="text-gray-400">VS</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-left">
                        {m.away_team_logo ? (
                          <img
                            src={getTeamLogoUrl(m.away_team_logo)}
                            alt=""
                            className="w-6 h-6 object-contain rounded-lg bg-black/40 p-0.5 border border-white/10"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-[10px]">
                            🛡️
                          </div>
                        )}
                        <span
                          className={`text-xs font-bold ${
                            winnerId === m.away_team_id ? 'text-emerald-400 font-black' : 'text-gray-200'
                          }`}
                        >
                          {String(m.away_team_name || m.away_feeder_label || 'TBD')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB E: GUIDE & RULES VIEW */}
      {activeTab === 'guide' && <BattleRoyaleGuideView />}

      {/* ========================================================================= */}
      {/* 4. STADIUM MATCH DETAILS MODAL (Mounted via createPortal to document.body) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedMatch && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                <div className="fixed inset-0" onClick={() => setSelectedMatch(null)} />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 border border-white/15 rounded-3xl w-full max-w-2xl my-auto p-6 sm:p-8 shadow-2xl space-y-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <Swords className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">
                          جزئیات نبرد #{selectedMatch.match_number} • {String(selectedMatch.round_name || '')}
                        </h4>
                        <span className="text-[11px] text-gray-400">
                          {selectedMatch.bracket_side === 'WINNERS'
                            ? 'براکت برندگان (مسیر بدون باخت)'
                            : selectedMatch.bracket_side === 'LOSERS'
                            ? 'براکت بازندگان (نبرد بقا و تک‌حذفی)'
                            : 'دیدار پایانی فینال بزرگ'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMatch(null)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Versus Card Stadium Presentation */}
                  <div className="relative overflow-hidden rounded-2xl bg-slate-950/90 border border-white/10 p-6 shadow-inner">
                    <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-transparent pointer-events-none" />

                    <div className="grid grid-cols-3 items-center text-center relative z-10 gap-3">
                      {/* Home Team */}
                      <div className="space-y-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center mx-auto shadow-lg p-2">
                          {selectedMatch.home_team_logo ? (
                            <img
                              src={getTeamLogoUrl(selectedMatch.home_team_logo)}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-amber-400/60" />
                          )}
                        </div>
                        <span className="text-sm font-black text-white block">
                          {String(selectedMatch.home_team_name || selectedMatch.home_feeder_label || 'مشخص نشده')}
                        </span>
                        {selectedMatch.home_feeder_label && !selectedMatch.home_team_id && (
                          <span className="text-[10px] font-bold text-amber-400/80 block">
                            {selectedMatch.home_feeder_label}
                          </span>
                        )}
                      </div>

                      {/* Score / Status */}
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center justify-center min-w-[70px] px-4 py-2 rounded-2xl bg-black/70 border border-white/15 text-2xl font-mono font-black text-white shadow-xl">
                          {selectedMatch.status === 'FINISHED' ? (
                            <span>
                              {selectedMatch.home_score} - {selectedMatch.away_score}
                            </span>
                          ) : selectedMatch.status === 'LIVE' ? (
                            <span className="text-rose-400 animate-pulse">LIVE</span>
                          ) : (
                            <span className="text-amber-400 text-lg">VS</span>
                          )}
                        </div>

                        {selectedMatch.home_penalties !== null && selectedMatch.away_penalties !== null && (
                          <span className="text-xs font-mono text-amber-300 block font-bold">
                            پنالتی‌ها: ({selectedMatch.home_penalties} - {selectedMatch.away_penalties})
                          </span>
                        )}

                        <span className="text-[10px] text-gray-400 block font-semibold">
                          {selectedMatch.status === 'FINISHED'
                            ? 'پایان بازی'
                            : selectedMatch.status === 'LIVE'
                            ? 'در حال پخش زنده'
                            : 'برنامه‌ریزی شده'}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="space-y-2">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center mx-auto shadow-lg p-2">
                          {selectedMatch.away_team_logo ? (
                            <img
                              src={getTeamLogoUrl(selectedMatch.away_team_logo)}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Shield className="w-8 h-8 text-amber-400/60" />
                          )}
                        </div>
                        <span className="text-sm font-black text-white block">
                          {String(selectedMatch.away_team_name || selectedMatch.away_feeder_label || 'مشخص نشده')}
                        </span>
                        {selectedMatch.away_feeder_label && !selectedMatch.away_team_id && (
                          <span className="text-[10px] font-bold text-amber-400/80 block">
                            {selectedMatch.away_feeder_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">زمان مسابقه:</span>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {formatDateFa(selectedMatch.date)}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">قانون وقت اضافه:</span>
                      <span className="font-bold text-white">
                        {selectedMatch.has_extra_time ? 'فعال (مراحل پایانی)' : 'مستقیم به ضربات پنالتی'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">شاخه و براکت:</span>
                      <span className="font-bold text-emerald-400">
                        {selectedMatch.bracket_side === 'WINNERS'
                          ? 'براکت برنده‌ها'
                          : selectedMatch.bracket_side === 'LOSERS'
                          ? 'براکت بازنده‌ها'
                          : 'فینال بزرگ'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                      <span className="text-gray-400 block text-[11px]">سرنوشت مسابقه:</span>
                      <span className="font-bold text-amber-300">
                        {selectedMatch.bracket_side === 'WINNERS'
                          ? 'برنده صعود به دور بعد / بازنده انتقال به جدول بازنده‌ها'
                          : selectedMatch.bracket_side === 'LOSERS'
                          ? 'برنده ادامه می‌دهد / بازنده به طور کامل حذف می‌شود'
                          : 'برنده قهرمان جام خواهد شد'}
                      </span>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    {userTeamId &&
                    (selectedMatch.home_team_id === userTeamId || selectedMatch.away_team_id === userTeamId) &&
                    selectedMatch.status !== 'FINISHED' ? (
                      <button
                        type="button"
                        onClick={() => {
                          const m = selectedMatch;
                          setSelectedMatch(null);
                          handleNavigateToLineup(m);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        ارسال / ویرایش ترکیب تیم من ⚡
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedMatch(null)}
                      className="px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      بستن
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENT: ESPORTS MATCH CARD
// High-Octane Broadcast Styling with 28px Badges, Smart Feeders & Laser Highlight
// =============================================================================
function EsportsMatchCard({
  match,
  winnerId,
  formatDateFa,
  isHighlighted,
  isUserClub,
  highlightedTeamId,
  onTeamHover,
  onLineupClick,
  onClick,
}) {
  if (!match) return null;

  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  const homeWon = isFinished && winnerId === match.home_team_id;
  const awayWon = isFinished && winnerId === match.away_team_id;

  const isHomeHighlighted = highlightedTeamId && match.home_team_id === highlightedTeamId;
  const isAwayHighlighted = highlightedTeamId && match.away_team_id === highlightedTeamId;

  // Resolve Feeder labels when team is not yet decided
  const homeIsTbd = !match.home_team_id || String(match.home_team_name || '').includes('مشخص نشده');
  const awayIsTbd = !match.away_team_id || String(match.away_team_name || '').includes('مشخص نشده');

  const homeLabel = homeIsTbd
    ? match.home_feeder_label || 'برنده دور قبل'
    : String(match.home_team_name || '');

  const awayLabel = awayIsTbd
    ? match.away_feeder_label || 'برنده دور قبل'
    : String(match.away_team_name || '');

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-3 backdrop-blur-xl cursor-pointer transition-all duration-300 shadow-lg min-h-[118px] flex flex-col justify-between ${
        isLive
          ? 'bg-slate-900/95 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse'
          : isHighlighted
          ? 'bg-slate-900/95 ring-2 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.35)] z-20'
          : isUserClub
          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400 shadow-md'
          : isFinished
          ? 'bg-slate-900/85 border-white/10 hover:border-white/25'
          : 'bg-slate-950/80 border-white/5 hover:border-amber-500/30'
      }`}
    >
      {/* Top Meta Bar: Match Number, Extra Time, Date */}
      <div className="flex items-center justify-between text-[10px] mb-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 text-gray-400 border border-white/5">
            #{match.match_number}
          </span>
          {isLive ? (
            <span className="flex items-center gap-1 text-rose-400 font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              زنده
            </span>
          ) : (
            <span className="text-gray-400 font-semibold">{formatDateFa(match.date)}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isUserClub && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ⭐ تیم شما
            </span>
          )}
          {match.has_extra_time && (
            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              ET
            </span>
          )}
        </div>
      </div>

      {/* Home Team Row */}
      <div
        onMouseEnter={() => match.home_team_id && onTeamHover(match.home_team_id)}
        onMouseLeave={() => onTeamHover(null)}
        className={`flex items-center justify-between py-1 px-1.5 rounded-xl transition-all ${
          homeWon
            ? 'bg-emerald-500/15 font-black text-white'
            : isFinished && !homeWon
            ? 'opacity-40 text-gray-400'
            : isHomeHighlighted
            ? 'bg-amber-400/15 text-amber-300 font-bold'
            : 'text-gray-200 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {match.home_team_logo && !homeIsTbd ? (
            <img
              src={getTeamLogoUrl(match.home_team_logo)}
              alt=""
              className="w-7 h-7 object-contain rounded-lg bg-black/50 p-0.5 border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-dashed border-amber-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-amber-400/70" />
            </div>
          )}

          <span
            className={`text-xs truncate max-w-[130px] flex items-center gap-1 ${
              homeIsTbd ? 'text-amber-300/80 italic text-[11px]' : ''
            }`}
          >
            <span className="truncate">{homeLabel}</span>
            {match.home_preset_name ? (
              <span className="text-[8.5px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.2 rounded font-black shrink-0">
                ⚡ {match.home_preset_name}
              </span>
            ) : match.home_lineup_ready ? (
              <span className="text-[8.5px] text-emerald-400 font-bold shrink-0">✓</span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFinished && (
            <span className="font-mono text-xs font-black">
              {match.home_score}
              {match.home_penalties !== null && (
                <span className="text-[10px] text-amber-400 font-normal"> ({match.home_penalties})</span>
              )}
            </span>
          )}
          {homeWon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* VS Divider Line with Mini Badge */}
      <div className="relative my-0.5 flex items-center justify-center">
        <div className="w-full h-px bg-white/5" />
        <span className="absolute px-1.5 py-0.2 bg-slate-950 text-[8px] font-black text-gray-500 rounded border border-white/5 uppercase">
          vs
        </span>
      </div>

      {/* Away Team Row */}
      <div
        onMouseEnter={() => match.away_team_id && onTeamHover(match.away_team_id)}
        onMouseLeave={() => onTeamHover(null)}
        className={`flex items-center justify-between py-1 px-1.5 rounded-xl transition-all ${
          awayWon
            ? 'bg-emerald-500/15 font-black text-white'
            : isFinished && !awayWon
            ? 'opacity-40 text-gray-400'
            : isAwayHighlighted
            ? 'bg-amber-400/15 text-amber-300 font-bold'
            : 'text-gray-200 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {match.away_team_logo && !awayIsTbd ? (
            <img
              src={getTeamLogoUrl(match.away_team_logo)}
              alt=""
              className="w-7 h-7 object-contain rounded-lg bg-black/50 p-0.5 border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-dashed border-amber-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-amber-400/70" />
            </div>
          )}

          <span
            className={`text-xs truncate max-w-[130px] flex items-center gap-1 ${
              awayIsTbd ? 'text-amber-300/80 italic text-[11px]' : ''
            }`}
          >
            <span className="truncate">{awayLabel}</span>
            {match.away_preset_name ? (
              <span className="text-[8.5px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1 py-0.2 rounded font-black shrink-0">
                ⚡ {match.away_preset_name}
              </span>
            ) : match.away_lineup_ready ? (
              <span className="text-[8.5px] text-emerald-400 font-bold shrink-0">✓</span>
            ) : null}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFinished && (
            <span className="font-mono text-xs font-black">
              {match.away_score}
              {match.away_penalties !== null && (
                <span className="text-[10px] text-amber-400 font-normal"> ({match.away_penalties})</span>
              )}
            </span>
          )}
          {awayWon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
      </div>

      {/* Quick Lineup Button for Coach's Team */}
      {isUserClub && !isFinished && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLineupClick(match);
          }}
          className="w-full mt-2 py-1 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5" />
          ارسال / ویرایش ترکیب ⚡
        </button>
      )}
    </motion.div>
  );
}
