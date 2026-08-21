import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Star, Award, BarChart2, Shield, Activity, 
  Flame, CheckCircle2, ChevronRight, User, Sparkles
} from 'lucide-react';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function PostMatchComparisonCard({
  match,
  teamStats,
  playerStats = [],
  homeRoster = [],
  awayRoster = [],
  onClose,
}) {
  if (!match) return null;

  const homeName = match.home_team_name || match.home || 'میزبان';
  const awayName = match.away_team_name || match.away || 'میهمان';
  const homeLogo = getTeamLogoUrl(match.home_team_logo || homeName);
  const awayLogo = getTeamLogoUrl(match.away_team_logo || awayName);
  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;

  // Normalized Stats
  const homeStatsObj = teamStats?.home || {
    possession_percent: 50,
    shots: 0,
    shots_on_target: 0,
    fouls: 0,
    corners: 0,
    offsides: 0,
    saves: 0,
  };

  const awayStatsObj = teamStats?.away || {
    possession_percent: 50,
    shots: 0,
    shots_on_target: 0,
    fouls: 0,
    corners: 0,
    offsides: 0,
    saves: 0,
  };

  // Extract Goal Scorers from events if available
  const events = match.events || [];
  const goalEvents = useMemo(() => {
    return (events || []).filter(
      (ev) => (ev.event_type === 'GOAL' || ev.event_type === 'PENALTY_SCORED') && !ev.is_undone
    );
  }, [events]);

  const homeGoals = useMemo(() => {
    return goalEvents.filter(
      (ev) => ev.team_id === match.home_team || ev.player?.team_id === match.home_team || ev.team === 'home'
    );
  }, [goalEvents, match.home_team]);

  const awayGoals = useMemo(() => {
    return goalEvents.filter(
      (ev) => ev.team_id === match.away_team || ev.player?.team_id === match.away_team || ev.team === 'away'
    );
  }, [goalEvents, match.away_team]);

  // Combine player stats for MOTM determination
  const allRatedPlayers = useMemo(() => {
    const combined = [];
    (playerStats || []).forEach((p) => {
      combined.push({
        ...p,
        name: p.player_name || p.name,
        team_id: p.team_id || (p.team?.id),
        rating: Number(p.rating) || 6.0,
      });
    });

    if (combined.length === 0) {
      (homeRoster || []).forEach((p) => {
        combined.push({
          ...p,
          teamSide: 'home',
          teamName: homeName,
          rating: Number(p.rating) || 6.5,
        });
      });
      (awayRoster || []).forEach((p) => {
        combined.push({
          ...p,
          teamSide: 'away',
          teamName: awayName,
          rating: Number(p.rating) || 6.5,
        });
      });
    }

    return combined.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [playerStats, homeRoster, awayRoster, homeName, awayName]);

  const motmPlayer = allRatedPlayers[0] || null;

  // Stat definitions for comparative bars
  const STAT_METRICS = [
    { key: 'possession_percent', label: 'درصد مالکیت توپ', unit: '٪', isPercent: true },
    { key: 'shots', label: 'کل شوت‌ها', unit: '' },
    { key: 'shots_on_target', label: 'شوت در چارچوب', unit: '' },
    { key: 'corners', label: 'کرنرها', unit: '' },
    { key: 'fouls', label: 'خطاها', unit: '' },
    { key: 'offsides', label: 'آفسایدها', unit: '' },
    { key: 'saves', label: 'مهار دروازه‌بان (Saves)', unit: '' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* 1. Final Scoreboard Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 shadow-2xl relative overflow-hidden">
        <div className="flex justify-between items-center text-xs mb-3 border-b border-slate-800 pb-2.5">
          <span className="text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 font-sport">
            <Trophy size={14} />
            <span>نتیجه نهایی مسابقه (Full Time)</span>
          </span>
          <span className="text-slate-400 font-sport text-[11px]">
            {match.round_name || 'هفته مسابقاتی'} • شناسه #{match.id}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 my-3 px-2">
          {/* Home Team */}
          <div className="flex items-center gap-3 w-[40%] justify-start">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 shrink-0 flex items-center justify-center shadow-lg">
              {homeLogo ? (
                <img src={homeLogo} alt={homeName} className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold text-xs">{homeName.slice(0, 2)}</span>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-base text-white block truncate">{homeName}</span>
              <span className="text-[10px] text-cyan-400 font-sport">تیم میزبان</span>
            </div>
          </div>

          {/* Center Score */}
          <div className="text-center shrink-0">
            <div className="px-5 py-2 bg-slate-950 rounded-2xl border-2 border-emerald-500/60 font-sport font-black text-2xl text-[#00ff87] shadow-[0_0_20px_rgba(0,255,135,0.25)]">
              {homeScore} - {awayScore}
            </div>
            <span className="text-[10px] text-slate-400 font-bold block mt-1">پایان بازی</span>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-3 w-[40%] justify-end text-left">
            <div className="min-w-0 text-right">
              <span className="font-black text-sm sm:text-base text-white block truncate">{awayName}</span>
              <span className="text-[10px] text-rose-400 font-sport">تیم میهمان</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700 p-1.5 shrink-0 flex items-center justify-center shadow-lg">
              {awayLogo ? (
                <img src={awayLogo} alt={awayName} className="w-full h-full object-contain" />
              ) : (
                <span className="font-bold text-xs">{awayName.slice(0, 2)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Goal Scorers Timeline */}
        {(homeGoals.length > 0 || awayGoals.length > 0) && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              {homeGoals.map((g, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-[11px]">⚽</span>
                  <span className="font-bold text-cyan-300">{g.player?.name || g.player_name || 'گل'}</span>
                  <span className="text-[10px] text-slate-500 font-sport">'{g.minute || 45}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-left">
              {awayGoals.map((g, idx) => (
                <div key={idx} className="flex items-center justify-end gap-1.5 text-slate-300">
                  <span className="text-[10px] text-slate-500 font-sport">'{g.minute || 45}</span>
                  <span className="font-bold text-rose-300">{g.player?.name || g.player_name || 'گل'}</span>
                  <span className="text-[11px]">⚽</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Man of the Match (MOTM) Highlight Card */}
      {motmPlayer && (
        <div className="glass-panel p-4 rounded-3xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-yellow-950/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
                  {motmPlayer.photo_url ? (
                    <img src={motmPlayer.photo_url} alt={motmPlayer.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-amber-400" />
                  )}
                </div>
              </div>
              <span className="absolute -top-1 -right-1 p-1 bg-amber-500 rounded-full text-slate-950 shadow-md">
                <Star size={12} fill="currentColor" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-500/40 font-black font-sport flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>ستاره برتر میدان (Man of the Match)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-sport">{motmPlayer.position || 'FW'}</span>
              </div>
              <h4 className="font-black text-white text-base sm:text-lg mt-0.5">{motmPlayer.name}</h4>
              <span className="text-xs text-slate-400">{motmPlayer.teamName || (motmPlayer.team_id === match.home_team ? homeName : awayName)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-amber-500/30 font-sport">
            <div className="text-center">
              <span className="text-[9px] text-slate-400 block font-sans">نمره عملکرد</span>
              <span className="text-xl font-black text-[#00ff87]">{Number(motmPlayer.rating).toFixed(1)}</span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="text-center">
              <span className="text-[9px] text-slate-400 block font-sans">دقایق بازی</span>
              <span className="text-sm font-black text-white">{motmPlayer.minutes_played || 90}'</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Head-to-Head Comparative Team Statistics */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
            <BarChart2 size={18} className="text-cyan-400" />
            <span>آمار مقایسه‌ای دو تیم (Head-to-Head Stats)</span>
          </h3>
          <div className="flex items-center gap-3 text-xs font-sport font-bold">
            <span className="text-cyan-400">{homeName}</span>
            <span className="text-slate-500">مقابل</span>
            <span className="text-rose-400">{awayName}</span>
          </div>
        </div>

        <div className="space-y-3.5 pt-1">
          {STAT_METRICS.map(({ key, label, unit, isPercent }) => {
            const hVal = Number(homeStatsObj[key]) || 0;
            const aVal = Number(awayStatsObj[key]) || 0;
            const total = isPercent ? 100 : (hVal + aVal === 0 ? 1 : hVal + aVal);
            const homePercent = isPercent ? hVal : Math.round((hVal / total) * 100);
            const awayPercent = isPercent ? aVal : Math.round((aVal / total) * 100);

            const isHomeDominant = hVal > aVal;
            const isAwayDominant = aVal > hVal;

            return (
              <div key={key} className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  {/* Home Value */}
                  <span className={`font-sport font-black text-xs ${isHomeDominant ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                    {hVal} {unit}
                  </span>

                  {/* Metric Label */}
                  <span className="font-bold text-slate-300 text-[11px]">{label}</span>

                  {/* Away Value */}
                  <span className={`font-sport font-black text-xs ${isAwayDominant ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>
                    {aVal} {unit}
                  </span>
                </div>

                {/* Comparative Horizontal Progress Bar */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-700 rounded-r-full"
                    style={{ width: `${homePercent}%` }}
                  ></div>
                  <div
                    className="h-full bg-gradient-to-l from-rose-600 to-amber-500 transition-all duration-700 rounded-l-full"
                    style={{ width: `${awayPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Top Rated Players by Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Home Top Players */}
        <div className="glass-panel p-4 rounded-3xl border border-cyan-500/30 space-y-2.5">
          <h4 className="font-black text-cyan-300 text-xs sm:text-sm flex items-center justify-between border-b border-slate-800 pb-2">
            <span>بازیکنان برتر {homeName}</span>
            <span className="text-[10px] text-slate-400 font-sport">نمرات رسمی</span>
          </h4>
          <div className="space-y-1.5">
            {allRatedPlayers
              .filter((p) => p.teamSide === 'home' || p.team_id === match.home_team)
              .slice(0, 5)
              .map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-500 font-sport">#{idx + 1}</span>
                    <span className="font-bold text-white truncate">{p.name}</span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-1 rounded font-sport">{p.position || 'MID'}</span>
                  </div>
                  <span className={`font-sport font-black px-2 py-0.5 rounded-lg text-xs ${
                    Number(p.rating) >= 7.5 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                    Number(p.rating) >= 6.0 ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                    'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {Number(p.rating || 6.0).toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Away Top Players */}
        <div className="glass-panel p-4 rounded-3xl border border-rose-500/30 space-y-2.5">
          <h4 className="font-black text-rose-300 text-xs sm:text-sm flex items-center justify-between border-b border-slate-800 pb-2">
            <span>بازیکنان برتر {awayName}</span>
            <span className="text-[10px] text-slate-400 font-sport">نمرات رسمی</span>
          </h4>
          <div className="space-y-1.5">
            {allRatedPlayers
              .filter((p) => p.teamSide === 'away' || p.team_id === match.away_team)
              .slice(0, 5)
              .map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-500 font-sport">#{idx + 1}</span>
                    <span className="font-bold text-white truncate">{p.name}</span>
                    <span className="text-[10px] text-rose-400 bg-rose-950/80 px-1 rounded font-sport">{p.position || 'MID'}</span>
                  </div>
                  <span className={`font-sport font-black px-2 py-0.5 rounded-lg text-xs ${
                    Number(p.rating) >= 7.5 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                    Number(p.rating) >= 6.0 ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                    'bg-rose-950 text-rose-300 border border-rose-500/30'
                  }`}>
                    {Number(p.rating || 6.0).toFixed(1)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
