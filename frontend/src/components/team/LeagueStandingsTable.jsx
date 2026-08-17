import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Shield, AlertCircle, RefreshCw, Star, Crown } from 'lucide-react';
import { matchApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function LeagueStandingsTable({ userTeamId, initialStandings = null }) {
  const [standings, setStandings] = useState(initialStandings || []);
  const [loading, setLoading] = useState(!initialStandings || initialStandings.length === 0);
  const [error, setError] = useState(null);

  const fetchStandings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await matchApi.getLeagueStandings();
      setStandings(res.data || []);
    } catch (err) {
      console.error('Failed to load league standings:', err);
      setError('خطا در دریافت جدول رده‌بندی لیگ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialStandings || initialStandings.length === 0) {
      fetchStandings();
    } else {
      setStandings(initialStandings);
    }
  }, [initialStandings]);

  // Sort standings: Points (DESC) -> GD (DESC) -> GF (DESC) -> Name (ASC)
  const sortedStandings = [...standings].sort((a, b) => {
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }
    const gdA = (a.gf || 0) - (a.ga || 0);
    const gdB = (b.gf || 0) - (b.ga || 0);
    if (gdB !== gdA) {
      return gdB - gdA;
    }
    if ((b.gf || 0) !== (a.gf || 0)) {
      return (b.gf || 0) - (a.gf || 0);
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const userRank = sortedStandings.findIndex((row) => row.team_id === userTeamId) + 1;
  const userRow = sortedStandings.find((row) => row.team_id === userTeamId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header & Quick Summary Cards */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight">
            <Trophy className="text-amber-400 animate-pulse" size={22} />
            <span>جدول رسمی رده‌بندی مستر لیگ (TOURNAMENT LEADERBOARD)</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            فصل اول ۱۴۰۵ — ۱۶ تیم در بالاترین سطح رقابت‌های شبیه‌سازی فوتبال
          </p>
        </div>

        <button
          onClick={fetchStandings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#080c14] hover:bg-slate-800 text-cyan-300 text-xs font-black rounded-xl border border-cyan-500/40 transition-all self-end sm:self-auto shadow-md font-sport active:scale-95"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>بروزرسانی زنده</span>
        </button>
      </div>

      {/* User Position Spotlight (Championship Spotlight Card) */}
      {userRow && (
        <div className="p-4 rounded-3xl fc-card-elevated border border-cyan-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl team-crest-badge flex items-center justify-center p-1.5 overflow-hidden shadow-xl shrink-0 relative">
              {getTeamLogoUrl(userRow) ? (
                <img 
                  src={getTeamLogoUrl(userRow)} 
                  alt={userRow.name} 
                  className="w-full h-full object-contain" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : null}
              <span className="font-black text-slate-950 font-sport text-sm -z-10 absolute">#{userRank}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base text-white tracking-tight">{userRow.name}</span>
                <span className="text-[9.5px] bg-cyan-500/25 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-400/40 font-sport font-black">
                  رتبه #{userRank}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">
                {userRank <= 4
                  ? '🌟 در منطقه صعود مستقیم به لیگ قهرمانان (UCL)'
                  : userRank <= 6
                  ? '🟠 در منطقه سهمیه لیگ اروپا (UEL)'
                  : userRank >= 14
                  ? '⚠️ در منطقه خطر سقوط'
                  : 'میانه جدول رقابت‌ها'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 text-center relative z-10 font-sport">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">MATCHES</span>
              <span className="text-sm font-black text-white">{userRow.played || 0}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">GD</span>
              <span className="text-sm font-black text-slate-200">
                {(userRow.gf || 0) - (userRow.ga || 0) > 0 ? `+${(userRow.gf || 0) - (userRow.ga || 0)}` : (userRow.gf || 0) - (userRow.ga || 0)}
              </span>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <span className="text-[9px] text-slate-950 font-black block leading-tight">POINTS</span>
              <span className="text-base sm:text-lg font-black text-slate-950 leading-tight">{userRow.points || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="fc-card rounded-3xl border border-slate-700/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-[#080c14]/90 border-b border-slate-700/60 text-[11px] text-slate-400 font-black font-sport tracking-wider">
                <th className="py-3 px-2 text-center w-10">#</th>
                <th className="py-3 px-3 min-w-[140px]">باشگاه (CLUB)</th>
                <th className="py-3 px-2 text-center" title="بازی‌های انجام شده">MP</th>
                <th className="py-3 px-2 text-center text-[#00ff87]" title="برد">W</th>
                <th className="py-3 px-2 text-center text-slate-400" title="مساوی">D</th>
                <th className="py-3 px-2 text-center text-rose-400" title="باخت">L</th>
                <th className="py-3 px-2 text-center text-slate-300 hidden sm:table-cell" title="گل زده">GF</th>
                <th className="py-3 px-2 text-center text-slate-400 hidden sm:table-cell" title="گل خورده">GA</th>
                <th className="py-3 px-2 text-center" title="تفاضل گل">GD</th>
                <th className="py-3 px-3 text-center text-amber-300 font-black text-sm" title="امتیاز">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sport">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-400 font-sans">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-cyan-400" size={22} />
                    <span>در حال بارگذاری جدول رده‌بندی مستر لیگ...</span>
                  </td>
                </tr>
              ) : sortedStandings.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-400 font-sans">
                    جدولی برای نمایش یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedStandings.map((row, idx) => {
                  const rank = idx + 1;
                  const isUser = row.team_id === userTeamId;
                  const gd = (row.gf || 0) - (row.ga || 0);

                  // Qualification Zone Border Styles
                  let zoneStyle = 'border-l-4 border-transparent';
                  let rankBadgeStyle = 'bg-slate-800/80 text-slate-400';

                  if (rank === 1) {
                    // Championship Gold Podium
                    zoneStyle = 'border-l-4 border-amber-400 bg-amber-950/15';
                    rankBadgeStyle = 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]';
                  } else if (rank === 2) {
                    // Silver
                    zoneStyle = 'border-l-4 border-slate-300 bg-slate-800/20';
                    rankBadgeStyle = 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 font-black';
                  } else if (rank === 3) {
                    // Bronze
                    zoneStyle = 'border-l-4 border-amber-700 bg-amber-950/10';
                    rankBadgeStyle = 'bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-black';
                  } else if (rank <= 4) {
                    // Champions League (1-4)
                    zoneStyle = 'border-l-4 border-cyan-400 bg-cyan-950/10';
                    rankBadgeStyle = 'bg-cyan-950/80 text-cyan-300 font-black border border-cyan-500/40';
                  } else if (rank <= 6) {
                    // Europa League (5-6)
                    zoneStyle = 'border-l-4 border-purple-500 bg-purple-950/10';
                    rankBadgeStyle = 'bg-purple-950/80 text-purple-300 font-bold border border-purple-500/40';
                  } else if (rank >= 14) {
                    // Relegation (14-16)
                    zoneStyle = 'border-l-4 border-rose-500 bg-rose-950/10';
                    rankBadgeStyle = 'bg-rose-950/80 text-rose-300 font-bold border border-rose-500/40';
                  }

                  return (
                    <tr
                      key={row.team_id || idx}
                      className={`transition-all ${zoneStyle} ${
                        isUser
                          ? 'bg-gradient-to-r from-cyan-950/60 to-purple-950/60 font-bold text-white ring-1 ring-cyan-400/40'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${rankBadgeStyle}`}>
                          {rank}
                        </span>
                      </td>

                      {/* Team Name & Logo */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 font-sans">
                          <div className="w-7 h-7 rounded-xl team-crest-badge flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm relative">
                            {getTeamLogoUrl(row) ? (
                              <img 
                                src={getTeamLogoUrl(row)} 
                                alt={row.name} 
                                className="w-full h-full object-contain" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : null}
                            <span className="text-[10px] font-black text-slate-800 font-sport -z-10 absolute">{row.name ? row.name.slice(0, 2).toUpperCase() : 'FC'}</span>
                          </div>
                          <span className={`truncate font-bold text-xs ${isUser ? 'text-cyan-300' : 'text-white'}`}>
                            {row.name}
                          </span>
                          {isUser && (
                            <span className="text-[8.5px] bg-cyan-500/25 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/40 shrink-0 font-black font-sport">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* MP */}
                      <td className="py-3 px-2 text-center font-bold text-slate-300">{row.played || 0}</td>

                      {/* W */}
                      <td className="py-3 px-2 text-center text-[#00ff87] font-black">{row.won || 0}</td>

                      {/* D */}
                      <td className="py-3 px-2 text-center text-slate-400 font-bold">{row.drawn || 0}</td>

                      {/* L */}
                      <td className="py-3 px-2 text-center text-rose-400 font-bold">{row.lost || 0}</td>

                      {/* GF */}
                      <td className="py-3 px-2 text-center text-slate-300 font-bold hidden sm:table-cell">{row.gf || 0}</td>

                      {/* GA */}
                      <td className="py-3 px-2 text-center text-slate-400 font-bold hidden sm:table-cell">{row.ga || 0}</td>

                      {/* GD */}
                      <td className={`py-3 px-2 text-center font-black text-xs ${
                        gd > 0 ? 'text-[#00ff87]' : gd < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {gd > 0 ? `+${gd}` : gd}
                      </td>

                      {/* PTS */}
                      <td className="py-3 px-3 text-center font-black text-amber-300 text-sm">
                        {row.points || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend / Qualification Zones Guide */}
        <div className="p-3.5 bg-[#05080e]/90 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-[10.5px] text-slate-400 font-medium">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(0,243,255,0.8)]"></span>
              <span>رتبه ۱ تا ۴: صعود به لیگ قهرمانان (UCL)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              <span>رتبه ۵ و ۶: لیگ اروپا (UEL)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
              <span>رتبه ۱۴ تا ۱۶: منطقه خطر سقوط</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-sport">
            PTS ← GD ← GF ← H2H
          </span>
        </div>
      </div>
    </motion.div>
  );
}
