import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Flame, Shield, Calendar, Clock, RefreshCw, ChevronLeft, ChevronRight,
  Sparkles, CheckCircle2, AlertTriangle, Eye, ArrowLeftRight, Swords, Star, Info, BookOpen
} from 'lucide-react';
import { battleRoyaleApi, adminApi } from '../services/api';
import { getTeamLogoUrl } from '../utils/teamLogos';
import BattleRoyaleGuideView from './BattleRoyaleGuideView';

export default function BattleRoyaleBracket({ tournamentId, isAdmin = false, onMatchClick }) {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('winners'); // 'winners' | 'losers' | 'grand_final' | 'schedule'
  const [selectedMatch, setSelectedMatch] = useState(null);

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

  // All matches flattened for schedule view
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

  const formatDateFa = (isoDate) => {
    if (!isoDate) return 'زمان مشخص نشده';
    try {
      const d = new Date(isoDate);
      const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      const dayName = days[d.getDay()];
      const timeStr = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      return `${dayName} ساعت ${timeStr}`;
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
        <span className="text-sm font-bold text-gray-300">در حال بارگذاری ساختار مسابقات نبرد رویال...</span>
      </div>
    );
  }

  if (!tournament.id && (!bracketData || bracketData.active === false)) {
    return (
      <div className="space-y-6 pb-28 sm:pb-36">
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 text-center space-y-3">
          <Swords className="w-12 h-12 text-amber-400 mx-auto opacity-70" />
          <h3 className="text-lg font-black text-white">هیچ تورنمنت نبرد رویال فعالی در جریان نیست</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            در حال حاضر مسابقات حذفی دوطرفه (نبرد رویال) آغاز نشده است. می‌توانید راهنما و قوانین کامل این فرمت جذاب را در ادامه مطالعه فرمایید.
          </p>
        </div>
        <BattleRoyaleGuideView />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 sm:pb-36">
      {/* 1. Header & Stats Bar */}
      <div className="bg-slate-900/90 border border-amber-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
              <Flame className="w-8 h-8 text-slate-950" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {String(tournament.name || 'تورنمنت نبرد رویال')}
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Double Elimination
                </span>
                {tournament.is_active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    در حال برگزاری
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                فرمت حذفی دوطرفه با ۲ شانس بقا: شکست اول = انتقال به براکت بازنده‌ها؛ شکست دوم = حذف قطعی
              </p>
            </div>
          </div>

          {/* Quick Metrics & Refresh Button */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
            <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2">
              <div className="text-center px-2">
                <span className="text-[10px] text-gray-400 block">کل بازی‌ها</span>
                <span className="text-sm font-black text-white">{stats.total_matches}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center px-2">
                <span className="text-[10px] text-gray-400 block">انجام‌شده</span>
                <span className="text-sm font-black text-emerald-400">{stats.finished_matches}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center px-2">
                <span className="text-[10px] text-gray-400 block">باقی‌مانده</span>
                <span className="text-sm font-black text-amber-400">{stats.remaining_matches}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="مشاهده راهنمای تصویری و قوانین مسابقات"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">راهنمای مسابقات</span>
            </button>

            <button
              type="button"
              onClick={() => fetchBracket(true)}
              disabled={refreshing}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all"
              title="به‌روزرسانی براکت"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Champion Spotlight Banner (If tournament has ended) */}
        {champion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
                <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-300 block">قهرمان نهایی نبرد رویال 🏆</span>
                <span className="text-lg font-black text-white">{String(champion.name || 'نامشخص')}</span>
              </div>
            </div>

            {champion.logo && (
              <img
                src={getTeamLogoUrl(champion.logo)}
                alt={champion.name}
                className="w-12 h-12 object-contain filter drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              />
            )}
          </motion.div>
        )}

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t border-white/10 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('winners')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'winners'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            براکت برنده‌ها (Winners Bracket)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('losers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'losers'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-orange-300" />
            براکت بازنده‌ها (Losers Bracket)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grand_final')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'grand_final'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-yellow-500/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            فینال بزرگ و ریست براکت
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-300" />
            تقویم و برنامه زمانی بازی‌ها
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-300" />
            راهنمای مسابقات و قوانین 📖
          </button>
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      {/* TAB A: WINNERS BRACKET */}
      {activeTab === 'winners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              مراحل براکت برنده‌ها — مسیر قهرمانی مستقیم
            </h3>
            <span className="text-xs text-gray-400">تیم‌ها با هر باخت به براکت بازنده‌ها منتقل می‌شوند</span>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max p-2">
              {(wbRounds || []).map((round, rIdx) => (
                <div key={round.round_number || rIdx} className="w-72 flex flex-col space-y-3">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center">
                    <span className="text-xs font-black text-emerald-300 block">
                      {String(round.round_name || `دور ${round.round_number}`)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      {(round.matches || []).length} مسابقه
                    </span>
                  </div>

                  <div className="space-y-4">
                    {(round.matches || []).map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        winnerId={getWinnerId(m)}
                        formatDateFa={formatDateFa}
                        onClick={() => {
                          setSelectedMatch(m);
                          if (onMatchClick) onMatchClick(m);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB B: LOSERS BRACKET */}
      {activeTab === 'losers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-orange-400 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              مراحل براکت بازنده‌ها — نبرد مرگ و زندگی
            </h3>
            <span className="text-xs text-rose-400 font-bold">شکست در این براکت مساوی با حذف قطعی از تورنمنت است</span>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max p-2">
              {(lbRounds || []).map((round, rIdx) => (
                <div key={round.round_number || rIdx} className="w-72 flex flex-col space-y-3">
                  <div className="p-3 bg-orange-950/40 border border-orange-500/30 rounded-2xl text-center">
                    <span className="text-xs font-black text-orange-300 block">
                      {String(round.round_name || `دور ${round.round_number}`)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                      {(round.matches || []).length} مسابقه
                    </span>
                  </div>

                  <div className="space-y-4">
                    {(round.matches || []).map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        winnerId={getWinnerId(m)}
                        formatDateFa={formatDateFa}
                        onClick={() => {
                          setSelectedMatch(m);
                          if (onMatchClick) onMatchClick(m);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB C: GRAND FINAL */}
      {activeTab === 'grand_final' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
              <Trophy className="w-3.5 h-3.5" />
              دیدار نهایی نبرد رویال
            </div>
            <h3 className="text-2xl font-black text-white">فینال بزرگ (Grand Final)</h3>
            <p className="text-xs text-gray-400 max-w-lg mx-auto">
              برنده براکت برنده‌ها (میزبان) در برابر برنده براکت بازنده‌ها (میهمان).
              اگر تیم بازنده‌ها بازی اول را ببرد، به دلیل برابری باخت‌ها، بازی دوم ریست فینال فعال خواهد شد.
            </p>
          </div>

          {/* Grand Final Match 1 */}
          {mainGf && (
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  بازی اول فینال بزرگ
                </span>
                <span className="text-xs text-gray-400">{formatDateFa(mainGf.date)}</span>
              </div>

              <MatchCard
                match={mainGf}
                winnerId={getWinnerId(mainGf)}
                formatDateFa={formatDateFa}
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
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-2xl shadow-amber-950/30'
                  : 'bg-slate-950/60 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black text-orange-300">
                    بازی دوم فینال بزرگ (ریست براکت)
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                  {resetGf.round_name === 'فینال بزرگ (بدون نیاز به ریست)'
                    ? 'بدون نیاز به بازی دوم'
                    : resetGf.status === 'FINISHED'
                    ? 'انجام شد'
                    : 'مشروط به نتیجه بازی اول'}
                </span>
              </div>

              <MatchCard
                match={resetGf}
                winnerId={getWinnerId(resetGf)}
                formatDateFa={formatDateFa}
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
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              برنامه زمانی و جدول مسابقات
            </h3>
            <span className="text-xs text-gray-400">روزهای بازی: یکشنبه، سه‌شنبه، چهارشنبه، پنج‌شنبه، جمعه</span>
          </div>

          <div className="space-y-3">
            {(allMatchesChronological || []).map((m) => {
              const winnerId = getWinnerId(m);
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMatch(m);
                    if (onMatchClick) onMatchClick(m);
                  }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-950/70 hover:bg-slate-950 border border-white/5 hover:border-white/15 rounded-2xl cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                        m.bracket_side === 'WINNERS'
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                          : m.bracket_side === 'LOSERS'
                          ? 'bg-orange-950/60 border-orange-500/30 text-orange-300'
                          : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {String(m.round_name || '')}
                    </span>

                    <span className="text-xs font-semibold text-gray-300">{formatDateFa(m.date)}</span>
                  </div>

                  {/* Teams and Score */}
                  <div className="flex items-center gap-4 self-center sm:self-auto">
                    <div className="flex items-center gap-2 text-right">
                      <span className={`text-xs font-bold ${winnerId === m.home_team_id ? 'text-emerald-400' : 'text-gray-200'}`}>
                        {String(m.home_team_name || 'TBD')}
                      </span>
                      {m.home_team_logo && (
                        <img src={getTeamLogoUrl(m.home_team_logo)} alt="" className="w-5 h-5 object-contain" />
                      )}
                    </div>

                    <div className="bg-black/60 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-white min-w-[50px] text-center">
                      {m.status === 'FINISHED' ? `${m.home_score} - ${m.away_score}` : 'vs'}
                    </div>

                    <div className="flex items-center gap-2 text-left">
                      {m.away_team_logo && (
                        <img src={getTeamLogoUrl(m.away_team_logo)} alt="" className="w-5 h-5 object-contain" />
                      )}
                      <span className={`text-xs font-bold ${winnerId === m.away_team_id ? 'text-emerald-400' : 'text-gray-200'}`}>
                        {String(m.away_team_name || 'TBD')}
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
      {activeTab === 'guide' && (
        <BattleRoyaleGuideView />
      )}

      {/* 4. MATCH DETAIL MODAL (React Portal directly to document.body) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedMatch && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                <div className="fixed inset-0" onClick={() => setSelectedMatch(null)} />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative z-10 bg-slate-950 border border-white/15 rounded-3xl w-full max-w-xl my-auto p-6 shadow-2xl space-y-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Swords className="w-5 h-5 text-amber-400" />
                      <h4 className="text-base font-black text-white">
                        جزئیات مسابقه {String(selectedMatch.round_name || '')}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMatch(null)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Versus Card */}
                  <div className="grid grid-cols-3 items-center text-center p-4 bg-slate-900/80 rounded-2xl border border-white/5">
                    {/* Home Team */}
                    <div className="space-y-2">
                      <img
                        src={getTeamLogoUrl(selectedMatch.home_team_logo)}
                        alt=""
                        className="w-14 h-14 object-contain mx-auto"
                      />
                      <span className="text-xs font-black text-white block">
                        {String(selectedMatch.home_team_name || 'TBD')}
                      </span>
                    </div>

                    {/* Score / Status */}
                    <div className="space-y-1">
                      <span className="text-2xl font-mono font-black text-white block">
                        {selectedMatch.status === 'FINISHED'
                          ? `${selectedMatch.home_score} - ${selectedMatch.away_score}`
                          : 'VS'}
                      </span>
                      {selectedMatch.home_penalties !== null && selectedMatch.away_penalties !== null && (
                        <span className="text-[11px] font-mono text-amber-400 block font-bold">
                          پنالتی: ({selectedMatch.home_penalties} - {selectedMatch.away_penalties})
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 block font-semibold">
                        {selectedMatch.status === 'FINISHED'
                          ? 'پایان‌یافته'
                          : selectedMatch.status === 'LIVE'
                          ? 'در حال پخش'
                          : 'برنامه‌ریزی شده'}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="space-y-2">
                      <img
                        src={getTeamLogoUrl(selectedMatch.away_team_logo)}
                        alt=""
                        className="w-14 h-14 object-contain mx-auto"
                      />
                      <span className="text-xs font-black text-white block">
                        {String(selectedMatch.away_team_name || 'TBD')}
                      </span>
                    </div>
                  </div>

                  {/* Match Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block mb-1">زمان برگزاری:</span>
                      <span className="font-bold text-white">{formatDateFa(selectedMatch.date)}</span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block mb-1">قانون وقت اضافه:</span>
                      <span className="font-bold text-white">
                        {selectedMatch.has_extra_time ? 'فعال (مراحل پایانی)' : 'غیرفعال (مستقیم به پنالتی)'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block mb-1">شاخه براکت:</span>
                      <span className="font-bold text-white">
                        {selectedMatch.bracket_side === 'WINNERS'
                          ? 'براکت برنده‌ها'
                          : selectedMatch.bracket_side === 'LOSERS'
                          ? 'براکت بازنده‌ها'
                          : 'فینال بزرگ'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-gray-400 block mb-1">بازی حذفی:</span>
                      <span className="font-bold text-emerald-400">بله (تک‌حذفی در این مرحله)</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMatch(null)}
                      className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
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

// -------------------------------------------------------------
// Sub-Component: Match Card
// -------------------------------------------------------------
function MatchCard({ match, winnerId, formatDateFa, onClick }) {
  if (!match) return null;

  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  const homeWon = isFinished && winnerId === match.home_team_id;
  const awayWon = isFinished && winnerId === match.away_team_id;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-md cursor-pointer transition-all shadow-lg ${
        isLive
          ? 'bg-slate-900 border-rose-500/50 shadow-rose-950/20'
          : isFinished
          ? 'bg-slate-900/90 border-white/10 hover:border-white/20'
          : 'bg-slate-950/80 border-white/5 hover:border-white/15'
      }`}
    >
      {/* Card Header: Round badge + Extra Time + Date */}
      <div className="flex items-center justify-between text-[11px] mb-2.5 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          {isLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          <span className="text-gray-400 font-semibold">{formatDateFa(match.date)}</span>
        </div>

        {match.has_extra_time && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
            وقت اضافه
          </span>
        )}
      </div>

      {/* Home Team Row */}
      <div
        className={`flex items-center justify-between py-1 px-1.5 rounded-xl transition-all ${
          homeWon
            ? 'bg-emerald-500/15 font-black text-white'
            : isFinished && !homeWon
            ? 'opacity-50 text-gray-400'
            : 'text-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {match.home_team_logo ? (
            <img src={getTeamLogoUrl(match.home_team_logo)} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px]">⚽</div>
          )}
          <span className="text-xs truncate max-w-[130px]">
            {String(match.home_team_name || 'مشخص نشده (TBD)')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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

      {/* Away Team Row */}
      <div
        className={`flex items-center justify-between py-1 px-1.5 rounded-xl mt-1 transition-all ${
          awayWon
            ? 'bg-emerald-500/15 font-black text-white'
            : isFinished && !awayWon
            ? 'opacity-50 text-gray-400'
            : 'text-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {match.away_team_logo ? (
            <img src={getTeamLogoUrl(match.away_team_logo)} alt="" className="w-5 h-5 object-contain" />
          ) : (
            <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px]">⚽</div>
          )}
          <span className="text-xs truncate max-w-[130px]">
            {String(match.away_team_name || 'مشخص نشده (TBD)')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
    </motion.div>
  );
}
