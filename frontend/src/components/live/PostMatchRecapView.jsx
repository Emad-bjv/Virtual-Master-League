import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Award, BarChart2, Clock, ChevronLeft, Star, 
  Flame, CheckCircle2, Shield, Activity, RefreshCw, Radio
} from 'lucide-react';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { matchApi } from '../../services/api';

export default function PostMatchRecapView({
  match,
  userTeamData,
  onReturnToStandby,
  initialCountdownSeconds = 600,
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialCountdownSeconds);
  const [detailedStats, setDetailedStats] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'ratings'

  // Fetch full match detail including team stats & player ratings if not fully populated
  useEffect(() => {
    if (match?.id) {
      setLoadingDetails(true);
      matchApi
        .getMatchDetail(match.id)
        .then((res) => {
          if (res.data) {
            setDetailedStats(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [match?.id]);

  // Post-Match Recap Elapsed/Timer (Informational - NEVER auto-transitions)
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = ((initialCountdownSeconds - secondsRemaining) / initialCountdownSeconds) * 100;

  // Active match data
  const currentMatch = detailedStats || match;
  const homeName = currentMatch?.home_team_name || 'تیم میزبان';
  const awayName = currentMatch?.away_team_name || 'تیم میهمان';
  const homeLogo = currentMatch?.home_team_logo;
  const awayLogo = currentMatch?.away_team_logo;
  const homeScore = currentMatch?.home_score ?? 0;
  const awayScore = currentMatch?.away_score ?? 0;
  const roundName = currentMatch?.round_name || 'هفته مسابقات لیگ برتر';

  // Team Stats extraction
  const teamStatsList = currentMatch?.team_stats || [];
  const homeStats = useMemo(() => {
    return teamStatsList.find((s) => s.team === currentMatch?.home_team || s.team_name === homeName) || {
      possession_percent: 50,
      shots: 0,
      shots_on_target: 0,
      fouls: 0,
      corners: 0,
      offsides: 0,
      saves: 0,
    };
  }, [teamStatsList, currentMatch?.home_team, homeName]);

  const awayStats = useMemo(() => {
    return teamStatsList.find((s) => s.team === currentMatch?.away_team || s.team_name === awayName) || {
      possession_percent: 50,
      shots: 0,
      shots_on_target: 0,
      fouls: 0,
      corners: 0,
      offsides: 0,
      saves: 0,
    };
  }, [teamStatsList, currentMatch?.away_team, awayName]);

  // Player Stats extraction & MOTM calculation
  const playerStatsList = currentMatch?.player_stats || [];
  const homePlayers = useMemo(() => {
    return playerStatsList.filter((p) => p.team === currentMatch?.home_team || p.team_name === homeName);
  }, [playerStatsList, currentMatch?.home_team, homeName]);

  const awayPlayers = useMemo(() => {
    return playerStatsList.filter((p) => p.team === currentMatch?.away_team || p.team_name === awayName);
  }, [playerStatsList, currentMatch?.away_team, awayName]);

  const motmPlayer = useMemo(() => {
    if (playerStatsList.length === 0) return null;
    return [...playerStatsList].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0];
  }, [playerStatsList]);

  // Winner calculation
  const isDraw = homeScore === awayScore;
  const isHomeWinner = homeScore > awayScore;

  return (
    <div className="space-y-5 pb-20 font-sans dir-rtl">
      {/* 1. 10-MINUTE POST-MATCH RECAP HEADER BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 via-[#0d162a] to-purple-950/80 shadow-2xl relative overflow-hidden"
      >
        {/* Glow Ambient */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-400/50 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] shrink-0">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-sport">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  FULL-TIME RECAP
                </span>
                <span className="text-[10px] text-slate-400 font-sport">
                  {roundName}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white mt-1 tracking-tight">
                خلاصه و آمار نهایی مسابقه (POST-MATCH ANALYSIS)
              </h2>
            </div>
          </div>

          {/* 10-Minute Countdown Clock & Switch Action */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2 bg-[#05080e]/95 px-3.5 py-2 rounded-2xl border border-cyan-500/40 shadow-inner">
              <Clock size={16} className="text-cyan-400 animate-pulse" />
              <div className="text-right">
                <span className="text-[9.5px] text-slate-400 block font-medium">زمان تا انتقال به بازی بعد:</span>
                <span className="font-sport font-black text-cyan-300 text-sm tracking-wider dir-ltr">
                  {timeFormatted}
                </span>
              </div>
            </div>

            <button
              onClick={onReturnToStandby}
              className="fc-btn-volt px-4 py-2 rounded-xl text-xs font-black text-slate-950 flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,135,0.35)] cursor-pointer active:scale-95 transition-all"
            >
              <span>مشاهده بازی هفته بعد</span>
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Linear Progress Bar for 10-minute recap */}
        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-4 border border-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${100 - progressPercent}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>
      </motion.div>

      {/* 2. MATCH FULL-TIME RESULT SCOREBOARD CARD */}
      <div className="fc-card-elevated p-5 sm:p-6 rounded-3xl border border-slate-700/60 bg-gradient-to-b from-[#0a101f] to-[#05080e] shadow-2xl text-center space-y-4">
        <div className="flex items-center justify-between max-w-xl mx-auto gap-4">
          {/* Home Team */}
          <div className={`flex flex-col items-center gap-2 flex-1 p-3 rounded-2xl transition-all ${
            isHomeWinner ? 'bg-emerald-950/30 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : ''
          }`}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl team-crest-badge p-1.5 flex items-center justify-center shadow-xl relative">
              {getTeamLogoUrl(homeLogo || homeName) ? (
                <img src={getTeamLogoUrl(homeLogo || homeName)} alt={homeName} className="w-full h-full object-contain" />
              ) : (
                <span className="font-sport font-black text-slate-800 text-sm">{homeName.slice(0, 2).toUpperCase()}</span>
              )}
              {isHomeWinner && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 p-1 rounded-full shadow border border-amber-200">
                  <CrownBadge />
                </span>
              )}
            </div>
            <span className="font-black text-xs sm:text-sm text-white">{homeName}</span>
            {isHomeWinner && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/30">
                برنده مسابقه 🏆
              </span>
            )}
          </div>

          {/* Final Score Clash */}
          <div className="flex flex-col items-center shrink-0 px-2">
            <span className="text-[11px] font-sport text-slate-400 font-bold bg-slate-900 px-3 py-0.5 rounded-full border border-slate-800 mb-1.5">
              FULL TIME
            </span>
            <div className="flex items-center gap-2 bg-[#05080e] px-5 py-2 rounded-2xl border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(0,243,255,0.25)]">
              <span className="text-2xl sm:text-3xl font-sport font-black text-white">{homeScore}</span>
              <span className="text-cyan-400 font-black text-lg">:</span>
              <span className="text-2xl sm:text-3xl font-sport font-black text-white">{awayScore}</span>
            </div>
            <span className="text-[10px] text-cyan-300 mt-1.5 font-bold">
              {isDraw ? 'تساوی بازی' : isHomeWinner ? `پیروزی ${homeName}` : `پیروزی ${awayName}`}
            </span>
          </div>

          {/* Away Team */}
          <div className={`flex flex-col items-center gap-2 flex-1 p-3 rounded-2xl transition-all ${
            !isDraw && !isHomeWinner ? 'bg-emerald-950/30 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : ''
          }`}>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl team-crest-badge p-1.5 flex items-center justify-center shadow-xl relative">
              {getTeamLogoUrl(awayLogo || awayName) ? (
                <img src={getTeamLogoUrl(awayLogo || awayName)} alt={awayName} className="w-full h-full object-contain" />
              ) : (
                <span className="font-sport font-black text-slate-800 text-sm">{awayName.slice(0, 2).toUpperCase()}</span>
              )}
              {!isDraw && !isHomeWinner && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 p-1 rounded-full shadow border border-amber-200">
                  <CrownBadge />
                </span>
              )}
            </div>
            <span className="font-black text-xs sm:text-sm text-white">{awayName}</span>
            {!isDraw && !isHomeWinner && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/30">
                برنده مسابقه 🏆
              </span>
            )}
          </div>
        </div>

        {/* MOTM Highlight Callout */}
        {motmPlayer && (
          <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/40 flex items-center justify-between max-w-lg mx-auto text-xs shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Star size={18} className="fill-amber-400" />
              </div>
              <div className="text-right">
                <span className="font-black text-amber-300 block text-xs">
                  بهترین بازیکن زمین (MAN OF THE MATCH)
                </span>
                <span className="text-white font-bold text-[11px]">
                  {motmPlayer.player_name} ({motmPlayer.player_position || 'بازیکن'})
                </span>
              </div>
            </div>
            <span className="font-sport font-black text-amber-300 text-base bg-slate-950 px-3 py-1 rounded-xl border border-amber-500/40 shadow">
              {motmPlayer.rating ? Number(motmPlayer.rating).toFixed(1) : '8.5'} ★
            </span>
          </div>
        )}
      </div>

      {/* 3. NAVIGATION SUBNAV PILLS (Stats vs Player Ratings) */}
      <div className="flex bg-[#080c14] p-1.5 rounded-2xl border border-slate-700/60 gap-1.5 text-xs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 size={16} />
          <span>آمار مقایسه‌ای مسابقه (Team Stats)</span>
        </button>
        <button
          onClick={() => setActiveTab('ratings')}
          className={`flex-1 py-2.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'ratings'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award size={16} />
          <span>نمرات و عملکرد بازیکنان (Player Ratings)</span>
        </button>
      </div>

      {/* 4. TAB CONTENT 1: COMPARATIVE TEAM STATS CARDS */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fc-card p-4 sm:p-6 rounded-3xl border border-slate-700/60 space-y-4 shadow-xl bg-[#080c14]/90"
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-cyan-400" />
              <span>کارت‌های مقایسه‌ای آمار تیمی مسابقه</span>
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold font-sport">
              <span className="text-cyan-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>{homeName}</span>
              </span>
              <span className="text-purple-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <span>{awayName}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {/* Possession Comparison Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex justify-between font-sport font-black text-xs">
                <span className="text-cyan-400 text-sm">{homeStats.possession_percent}%</span>
                <span className="text-white text-xs font-sans font-bold">درصد مالکیت توپ</span>
                <span className="text-purple-400 text-sm">{awayStats.possession_percent}%</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-purple-950/80 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700"
                  style={{ width: `${homeStats.possession_percent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${awayStats.possession_percent}%` }}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'شوت در چارچوب (Shots on Target)', h: homeStats.shots_on_target, a: awayStats.shots_on_target },
                { label: 'کل شوت‌ها (Total Shots)', h: homeStats.shots, a: awayStats.shots },
                { label: 'خطاها (Fouls)', h: homeStats.fouls, a: awayStats.fouls },
                { label: 'کرنرها (Corners)', h: homeStats.corners, a: awayStats.corners },
                { label: 'آفسایدها (Offsides)', h: homeStats.offsides, a: awayStats.offsides },
                { label: 'سیوهای دروازه‌بان (Saves)', h: homeStats.saves, a: awayStats.saves },
              ].map((metric, idx) => {
                const total = (metric.h || 0) + (metric.a || 0) || 1;
                const hPercent = Math.round(((metric.h || 0) / total) * 100);
                const aPercent = 100 - hPercent;

                return (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between items-center font-sport font-bold text-xs">
                      <span className="text-cyan-400 text-xs w-6 text-left">{metric.h || 0}</span>
                      <span className="text-slate-300 text-[11px] font-sans font-medium">{metric.label}</span>
                      <span className="text-purple-400 text-xs w-6 text-right">{metric.a || 0}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-purple-950/60 border border-slate-800">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-700"
                        style={{ width: `${(metric.h || 0) === 0 && (metric.a || 0) === 0 ? 50 : hPercent}%` }}
                      />
                      <div
                        className="h-full bg-purple-500 transition-all duration-700"
                        style={{ width: `${(metric.h || 0) === 0 && (metric.a || 0) === 0 ? 50 : aPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. TAB CONTENT 2: PLAYER RATINGS & MINUTES TABLE */}
      {activeTab === 'ratings' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {playerStatsList.length === 0 ? (
            <div className="fc-card p-8 rounded-3xl border border-slate-800 text-center text-slate-400 text-xs space-y-2">
              <Award size={32} className="mx-auto text-purple-400 opacity-60 animate-pulse" />
              <p className="font-bold">نمرات و دقایق بازی بازیکنان در حال محاسبه است.</p>
              <p className="text-[11px] text-slate-500">نمرات بازیکنان بر اساس عملکرد درون زمین و سیستم ریتینگ ۱۰.۰ محاسبه می‌گردد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Home Team Player Ratings */}
              <div className="fc-card p-4 rounded-3xl border border-cyan-500/40 bg-[#080c14]/90 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-black text-cyan-400 text-xs flex items-center gap-1.5">
                    <span>نمرات {homeName}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-sport font-bold">
                    {homePlayers.length} PLAYERS
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {homePlayers.map((p) => {
                    const isMotm = motmPlayer && motmPlayer.id === p.id;
                    const ratingNum = Number(p.rating) || 7.0;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          isMotm
                            ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative">
                            {p.photo_url ? (
                              <img src={getPlayerPhotoUrl(p.photo_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{p.player_position || 'P'}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{p.player_name}</span>
                              {isMotm && (
                                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-sport">
                                  MOTM 🌟
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              پست: {p.player_position || '-'} • دقایق: {p.minutes_played || 90}'
                            </span>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1.5">
                          {p.goals_scored > 0 && (
                            <span className="text-[10px] text-emerald-400 font-sport font-black bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ⚽ {p.goals_scored}
                            </span>
                          )}
                          <span className={`font-sport font-black text-xs px-2.5 py-1 rounded-xl border shadow ${
                            ratingNum >= 8.5
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : ratingNum >= 7.0
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                              : 'bg-slate-950 text-slate-300 border-slate-700'
                          }`}>
                            {ratingNum.toFixed(1)} ★
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Away Team Player Ratings */}
              <div className="fc-card p-4 rounded-3xl border border-purple-500/40 bg-[#080c14]/90 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-black text-purple-400 text-xs flex items-center gap-1.5">
                    <span>نمرات {awayName}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-sport font-bold">
                    {awayPlayers.length} PLAYERS
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {awayPlayers.map((p) => {
                    const isMotm = motmPlayer && motmPlayer.id === p.id;
                    const ratingNum = Number(p.rating) || 7.0;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                          isMotm
                            ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-purple-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative">
                            {p.photo_url ? (
                              <img src={getPlayerPhotoUrl(p.photo_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{p.player_position || 'P'}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{p.player_name}</span>
                              {isMotm && (
                                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-sport">
                                  MOTM 🌟
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              پست: {p.player_position || '-'} • دقایق: {p.minutes_played || 90}'
                            </span>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="flex items-center gap-1.5">
                          {p.goals_scored > 0 && (
                            <span className="text-[10px] text-emerald-400 font-sport font-black bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ⚽ {p.goals_scored}
                            </span>
                          )}
                          <span className={`font-sport font-black text-xs px-2.5 py-1 rounded-xl border shadow ${
                            ratingNum >= 8.5
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                              : ratingNum >= 7.0
                              ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                              : 'bg-slate-950 text-slate-300 border-slate-700'
                          }`}>
                            {ratingNum.toFixed(1)} ★
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function CrownBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    </svg>
  );
}
