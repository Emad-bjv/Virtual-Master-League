import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Home, Plane, RefreshCw, ChevronRight } from 'lucide-react';
import { matchApi } from '../../services/api';
import MatchDetailModal from './MatchDetailModal';
import { getTeamLogoUrl } from '../../utils/teamLogos';

// Helper to convert Gregorian date to readable Shamsi/Jalali date & time
function formatMatchDateTime(dateString) {
  if (!dateString) return { dateStr: 'تاریخ اعلام نشده', timeStr: '--:--' };
  try {
    const dt = new Date(dateString);
    const dateStr = dt.toLocaleDateString('fa-IR', {
      timeZone: 'Asia/Tehran',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dt.toLocaleTimeString('fa-IR', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return { dateStr, timeStr };
  } catch (_e) {
    return { dateStr: dateString, timeStr: '' };
  }
}

export default function TeamScheduleView({ teamId, teamName }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'UPCOMING', 'FINISHED', 'HOME', 'AWAY'
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const fetchSchedule = async (isBackground = false) => {
    if (!isBackground && matches.length === 0) {
      setLoading(true);
    }
    try {
      let mList = [];
      if (teamId) {
        const res = await matchApi.getTeamSchedule(teamId);
        mList = res.data || [];
      } else {
        const res = await matchApi.getLeagueSchedule({ status: 'ALL' });
        mList = res.data || [];
      }
      setMatches(mList);
    } catch (err) {
      console.error('Failed to load team schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(false);
    const handleSync = () => fetchSchedule(true);
    window.addEventListener('vml_league_schedule_updated', handleSync);
    return () => {
      window.removeEventListener('vml_league_schedule_updated', handleSync);
    };
  }, [teamId]);

  // Filtered matches
  const filteredMatches = matches.filter((m) => {
    const isHome = m.home_team === teamId;
    const isCup = Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP');
    if (activeFilter === 'LEAGUE') return !isCup;
    if (activeFilter === 'CUP') return isCup;
    if (activeFilter === 'UPCOMING') return m.status === 'SCHEDULED' || m.status === 'LIVE';
    if (activeFilter === 'FINISHED') return m.status === 'FINISHED';
    if (activeFilter === 'HOME') return isHome;
    if (activeFilter === 'AWAY') return !isHome;
    return true;
  });

  const totalMatches = matches.length || 30;
  const leagueCount = matches.filter((m) => !m.is_knockout && !m.tournament_name?.includes('حذفی') && m.tournament?.tournament_type !== 'CUP').length;
  const cupCount = matches.filter((m) => Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP')).length;
  const finishedCount = matches.filter((m) => m.status === 'FINISHED').length;
  const upcomingCount = matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'LIVE').length;

  const FILTERS = [
    { id: 'ALL', label: `همه (${totalMatches})` },
    ...(cupCount > 0 ? [
      { id: 'LEAGUE', label: `⚽ لیگ برتر (${leagueCount})` },
      { id: 'CUP', label: `🏆 جام حذفی (${cupCount})` },
    ] : []),
    { id: 'UPCOMING', label: `پیش‌رو (${upcomingCount})` },
    { id: 'FINISHED', label: `پایان‌یافته (${finishedCount})` },
    { id: 'HOME', label: 'میزبان (خانگی)' },
    { id: 'AWAY', label: 'میهمان (خارج)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header & Season Progress Bar */}
      <div className="fc-card p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2 tracking-tight">
              <Calendar className="text-cyan-400" size={19} />
              <span>برنامه و تقویم رسمی مسابقات {teamName || 'تیم'}</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              ۳۰ مسابقه رفت و برگشت فصل اول مسابقات در لیگ برتر
            </p>
          </div>

          <button
            onClick={fetchSchedule}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#080c14] hover:bg-slate-800 text-cyan-300 text-xs font-black rounded-xl border border-cyan-500/40 transition-all self-end sm:self-auto shadow font-sport"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>بروزرسانی</span>
          </button>
        </div>

        {/* Progress Bar with Volt Green & Cyan Sheen */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
            <span>پیشرفت مسابقات فصل اول:</span>
            <span className="font-sport text-cyan-300 font-black">
              {finishedCount} / {totalMatches} مسابقه
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#05080e] rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-[#00ff87] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,243,255,0.4)]"
              style={{ width: `${(finishedCount / totalMatches) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border font-sport ${
              activeFilter === f.id
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.35)]'
                : 'bg-[#080c14]/80 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Fixtures List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="fc-card p-10 rounded-3xl border border-slate-700/60 text-center text-slate-400 space-y-2">
            <RefreshCw className="animate-spin mx-auto text-cyan-400" size={24} />
            <p className="text-xs">در حال بارگذاری تقویم بازی‌های تیم...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="fc-card p-10 rounded-3xl border border-slate-700/60 text-center text-slate-400 space-y-1">
            <p className="text-sm font-black text-white">مسابقه‌ای در این دسته‌بندی یافت نشد.</p>
            <p className="text-xs text-slate-500">فیلتر دیگری را انتخاب کنید.</p>
          </div>
        ) : (
          filteredMatches.map((m, idx) => {
            const isHome = m.home_team === teamId;
            const opponentName = isHome ? m.away_team_name : m.home_team_name;
            const { dateStr, timeStr } = formatMatchDateTime(m.date);
            const isFinished = m.status === 'FINISHED';
            const isLive = m.status === 'LIVE';

            let resultBadge = null;
            if (isFinished) {
              const myScore = isHome ? m.home_score : m.away_score;
              const oppScore = isHome ? m.away_score : m.home_score;
              const isWin = myScore > oppScore;
              const isDraw = myScore === oppScore;

              resultBadge = (
                <span
                  className={`text-xs font-black px-3 py-1 rounded-xl font-sport dir-ltr flex items-center gap-1.5 shadow ${
                    isWin
                      ? 'bg-emerald-950/80 text-[#00ff87] border border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,135,0.2)]'
                      : isDraw
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                  }`}
                >
                  <span>{isHome ? `${m.home_score} - ${m.away_score}` : `${m.away_score} - ${m.home_score}`}</span>
                  <span className="text-[10px]">{isWin ? 'W' : isDraw ? 'D' : 'L'}</span>
                </span>
              );
            } else if (isLive) {
              resultBadge = (
                <span className="text-xs font-black px-3 py-1 rounded-xl bg-rose-950/90 text-rose-300 border border-rose-500/60 animate-pulse flex items-center gap-1 font-sport shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>LIVE</span>
                </span>
              );
            } else {
              resultBadge = (
                <div className="text-left">
                  <span className="text-xs font-sport font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg block">
                    {timeStr}
                  </span>
                  <span className="text-[9.5px] text-slate-400 block mt-0.5">برنامه‌ریزی‌شده</span>
                </div>
              );
            }

            const isCup = Boolean(m.is_knockout || m.tournament_name?.includes('حذفی') || m.tournament?.tournament_type === 'CUP');

            return (
              <motion.div
                key={m.id || idx}
                whileHover={{ scale: 1.008 }}
                onClick={() => isFinished && setSelectedMatchId(m.id)}
                className={`p-3.5 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                  isLive
                    ? 'bg-gradient-to-r from-rose-950/50 to-slate-900 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                    : isCup
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-amber-950/25 hover:border-amber-400 shadow-lg shadow-amber-950/30'
                    : isFinished
                    ? 'fut-card border-slate-700/60 hover:border-cyan-500/40 cursor-pointer'
                    : 'fc-card border-slate-700/60 hover:border-cyan-500/40'
                }`}
              >
                {/* Left side: Matchday Badge, Date & Opponent with Logo */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Round Badge */}
                  <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 shadow-inner ${
                    isCup
                      ? 'bg-gradient-to-b from-amber-500/20 to-amber-950/90 border border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#05080e] border border-cyan-500/30 text-cyan-300'
                  }`}>
                    <span className="text-[8.5px] font-bold leading-none text-slate-400">
                      {isCup ? '🏆 حذفی' : 'هفته'}
                    </span>
                    <span className="text-xs font-black font-sport leading-tight truncate px-1">
                      {isCup 
                        ? String(m.round_name || 'حذفی').replace('یک‌', '۱/').replace(' نهایی', '')
                        : (m.round_name ? String(m.round_name).replace('هفته', '').trim() : idx + 1)
                      }
                    </span>
                  </div>

                  {/* Opponent Crest */}
                  <div className="w-10 h-10 rounded-2xl team-crest-badge flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-md relative">
                    {getTeamLogoUrl(m.opponent_logo || opponentName) ? (
                      <img src={getTeamLogoUrl(m.opponent_logo || opponentName)} alt={opponentName || 'Team'} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-black text-slate-800 font-sport">{(opponentName ? opponentName.slice(0, 2) : 'OP').toUpperCase()}</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-white truncate">
                        {opponentName || 'حریف'}
                      </span>
                      {isCup ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-sport bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                          <span>🏆</span>
                          <span>جام حذفی ({m.round_name || 'مرحله حذفی'})</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-1 font-sport ${
                            isHome
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isHome ? <Home size={9} /> : <Plane size={9} />}
                          <span>{isHome ? 'HOME' : 'AWAY'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10.5px] text-slate-400 font-sport">
                      <span className="flex items-center gap-1 font-sans">
                        <Calendar size={11} className={isCup ? 'text-amber-400' : 'text-cyan-400'} />
                        <span>{dateStr}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-bold">
                        <Clock size={11} className={isCup ? 'text-amber-400' : 'text-cyan-400'} />
                        <span>{timeStr}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Score / Kickoff Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  {resultBadge}
                  {isFinished && <ChevronRight size={14} className="text-slate-400" />}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Match Detail Modal Overlay */}
      {selectedMatchId && (
        <MatchDetailModal
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </motion.div>
  );
}
