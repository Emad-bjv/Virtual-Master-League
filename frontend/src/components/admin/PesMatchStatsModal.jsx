import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, Target, Zap, Shield, Activity, Plus, Minus,
  Save, CheckCircle2, RefreshCw, ChevronRight, ChevronLeft, User, Sparkles,
  UserCheck, UserX, Check, AlertCircle
} from 'lucide-react';
import { calculatePlayerRating } from '../../utils/ratingEngine';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import api from '../../services/api';

const DEFAULT_STATS = {
  // 17 Outfield PES Stats
  goals: 0,
  penalty_goals: 0,
  freekick_goals: 0,
  assists: 0,
  shots_total: 0,
  shots_on_target: 0,
  passes_total: 0,
  passes_completed: 0,
  crosses: 0,
  fouls: 0,
  offsides: 0,
  freekicks_won: 0,
  corners: 0,
  blocks: 0,
  minutes_played: 0,
  touches: 0,
  dribble_distance: 0.0,
  avg_speed: 0.0,
  duels_total: 0,
  duels_won: 0,
  clearances: 0,

  // Goalkeeper Specific Stats
  gk_shots_faced: 0,
  gk_shots_on_target: 0,
  gk_saves: 0,
  penalty_saves: 0,
  goals_conceded: 0,
};

export default function PesMatchStatsModal({
  isOpen,
  onClose,
  match,
  homePlayers = [],
  awayPlayers = [],
  onSaved
}) {
  const [activeSide, setActiveSide] = useState('home'); // 'home' | 'away'
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playersData, setPlayersData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const carouselRef = useRef(null);

  const homeTeamName = String(match?.home_team_name || 'تیم میزبان');
  const awayTeamName = String(match?.away_team_name || 'تیم میهمان');
  const homeScore = Number(match?.home_score ?? 0);
  const awayScore = Number(match?.away_score ?? 0);

  const getMatchCtx = (isHome) => {
    const conceded = isHome ? awayScore : homeScore;
    const teamWon = isHome ? homeScore > awayScore : awayScore > homeScore;
    const cleanSheet = isHome ? awayScore === 0 : homeScore === 0;
    return { team_won: teamWon, clean_sheet: cleanSheet, goals_conceded: conceded };
  };

  // Initialize or re-sync player data map
  useEffect(() => {
    if (!isOpen) return;

    const initialMap = {};
    const all = [
      ...(homePlayers || []).map((p) => ({ ...p, is_home: true })),
      ...(awayPlayers || []).map((p) => ({ ...p, is_home: false }))
    ];

    all.forEach((p) => {
      const pid = p.player_id || p.id;
      const existingDetailed = p.detailed_stats || {};
      const pos = String(p.position || p.naturalPosition || 'CMF').toUpperCase();
      const isHome = p.is_home;

      const matchCtx = getMatchCtx(isHome);

      // Determine if player has recorded stats or rating previously
      const hasExistingStats = Boolean(
        (p.rating !== null && p.rating !== undefined && Number(p.rating) > 0) ||
        (p.minutes_played !== null && p.minutes_played !== undefined && Number(p.minutes_played) > 0) ||
        (existingDetailed && Object.entries(existingDetailed).some(([k, v]) =>
          !['is_played', 'goals_conceded', 'breakdown', 'minutes_played'].includes(k) && Number(v) > 0
        ))
      );

      const isPlayed = hasExistingStats;
      const minutes = isPlayed ? Number(p.minutes_played || 90) : 0;

      const mergedStats = {
        ...DEFAULT_STATS,
        ...existingDetailed,
        minutes_played: minutes,
        goals: Number(p.goals || existingDetailed.goals || 0),
        assists: Number(p.assists || existingDetailed.assists || 0),
        goals_conceded: matchCtx.goals_conceded,
        is_played: isPlayed,
      };

      let calcRating = null;
      let breakdown = [{ label: 'خارج از مسابقه (بازی نکرده)', impact: '-' }];

      if (isPlayed) {
        const calc = calculatePlayerRating(pos, mergedStats, matchCtx);
        calcRating = p.rating ? Number(Number(p.rating).toFixed(1)) : calc.rating;
        breakdown = calc.breakdown || [];
      }

      initialMap[pid] = {
        player_id: pid,
        name: String(p.name || p.player_name || 'بازیکن'),
        position: pos,
        shirt_number: p.shirt_number || p.player_shirt_number || '-',
        photo_url: p.photo_url || p.custom_photo,
        was_starter: Boolean(p.was_starter ?? p.is_starting ?? false),
        is_home: isHome,
        is_played: isPlayed,
        stats: mergedStats,
        autoCalculate: true,
        rating: calcRating,
        breakdown: breakdown,
      };
    });

    setPlayersData(initialMap);

    // Default select first player of active side
    const firstSidePlayer = all.find((p) => (activeSide === 'home' ? p.is_home : !p.is_home));
    if (firstSidePlayer) {
      setSelectedPlayerId(firstSidePlayer.player_id || firstSidePlayer.id);
    }
  }, [isOpen, match, homePlayers, awayPlayers, activeSide]);

  // Active side roster
  const currentRoster = useMemo(() => {
    return Object.values(playersData).filter((p) => (activeSide === 'home' ? p.is_home : !p.is_home));
  }, [playersData, activeSide]);

  // Currently selected player
  const selectedPlayer = playersData[selectedPlayerId] || currentRoster[0] || null;

  // Selected player index for L1 / R1 navigation
  const currentIndex = useMemo(() => {
    if (!selectedPlayer) return 0;
    return currentRoster.findIndex((p) => p.player_id === selectedPlayer.player_id);
  }, [currentRoster, selectedPlayer]);

  // L1 / R1 Quick Switch handlers
  const handlePrevPlayer = () => {
    if (currentRoster.length === 0) return;
    const prevIdx = (currentIndex - 1 + currentRoster.length) % currentRoster.length;
    setSelectedPlayerId(currentRoster[prevIdx].player_id);
  };

  const handleNextPlayer = () => {
    if (currentRoster.length === 0) return;
    const nextIdx = (currentIndex + 1) % currentRoster.length;
    setSelectedPlayerId(currentRoster[nextIdx].player_id);
  };

  // Auto scroll active player chip into view in carousel
  useEffect(() => {
    if (!carouselRef.current || !selectedPlayerId) return;
    const activeEl = carouselRef.current.querySelector(`[data-player-id="${selectedPlayerId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedPlayerId]);

  // Toggle played status (حضور در زمین / خارج از بازی)
  const handleTogglePlayed = (playerId) => {
    setPlayersData((prev) => {
      const p = prev[playerId];
      if (!p) return prev;
      const nextPlayed = !p.is_played;

      let updatedStats = { ...p.stats, is_played: nextPlayed };
      let nextRating = null;
      let nextBreakdown = [{ label: 'خارج از مسابقه (بازی نکرده)', impact: '-' }];

      if (nextPlayed) {
        const minutes = Number(updatedStats.minutes_played) > 0 ? Number(updatedStats.minutes_played) : 90;
        updatedStats.minutes_played = minutes;
        const res = calculatePlayerRating(p.position, updatedStats, getMatchCtx(p.is_home));
        nextRating = res.rating;
        nextBreakdown = res.breakdown || [];
      } else {
        updatedStats.minutes_played = 0;
      }

      return {
        ...prev,
        [playerId]: {
          ...p,
          is_played: nextPlayed,
          stats: updatedStats,
          rating: nextRating,
          breakdown: nextBreakdown,
        }
      };
    });
  };

  // Handler: Update specific stat field for selected player
  const handleStatChange = (fieldName, rawVal) => {
    if (!selectedPlayer) return;
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal) || 0;

    setPlayersData((prev) => {
      const p = prev[selectedPlayer.player_id];
      if (!p) return prev;

      const updatedStats = { ...p.stats, [fieldName]: Math.max(0, val) };

      // Automatically activate player if any stat > 0 is modified
      let nextPlayed = p.is_played;
      if (!nextPlayed && (val > 0 || fieldName === 'minutes_played')) {
        nextPlayed = true;
        if (updatedStats.minutes_played === 0 && fieldName !== 'minutes_played') {
          updatedStats.minutes_played = 90;
        }
      }
      updatedStats.is_played = nextPlayed;

      let nextRating = p.rating;
      let nextBreakdown = p.breakdown;

      if (nextPlayed && p.autoCalculate) {
        const res = calculatePlayerRating(p.position, updatedStats, getMatchCtx(p.is_home));
        nextRating = res.rating;
        nextBreakdown = res.breakdown || [];
      } else if (!nextPlayed) {
        nextRating = null;
        nextBreakdown = [{ label: 'خارج از مسابقه (بازی نکرده)', impact: '-' }];
      }

      return {
        ...prev,
        [p.player_id]: {
          ...p,
          is_played: nextPlayed,
          stats: updatedStats,
          rating: nextRating,
          breakdown: nextBreakdown,
        }
      };
    });
  };

  // Step helper (+ / -)
  const handleStep = (fieldName, delta, min = 0) => {
    if (!selectedPlayer) return;
    const cur = Number(selectedPlayer.stats?.[fieldName] || 0);
    handleStatChange(fieldName, Math.max(min, cur + delta));
  };

  // Toggle auto-calculate vs manual rating
  const handleToggleAutoCalc = () => {
    if (!selectedPlayer || !selectedPlayer.is_played) return;
    setPlayersData((prev) => {
      const p = prev[selectedPlayer.player_id];
      if (!p) return prev;
      const nextAuto = !p.autoCalculate;

      let nextRating = p.rating;
      let nextBreakdown = p.breakdown;

      if (nextAuto) {
        const res = calculatePlayerRating(p.position, p.stats, getMatchCtx(p.is_home));
        nextRating = res.rating;
        nextBreakdown = res.breakdown || [];
      }

      return {
        ...prev,
        [p.player_id]: {
          ...p,
          autoCalculate: nextAuto,
          rating: nextRating,
          breakdown: nextBreakdown,
        }
      };
    });
  };

  // Manual rating input
  const handleManualRatingChange = (val) => {
    if (!selectedPlayer || !selectedPlayer.is_played) return;
    const num = Math.max(3.0, Math.min(10.0, parseFloat(val) || 6.0));
    setPlayersData((prev) => ({
      ...prev,
      [selectedPlayer.player_id]: {
        ...prev[selectedPlayer.player_id],
        rating: Number(num.toFixed(1)),
        autoCalculate: false,
      }
    }));
  };

  // Submit all ratings to backend
  const handleSubmitAll = async () => {
    if (!match?.id) return;
    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const payloadPlayers = Object.values(playersData).map((p) => {
        const isPlayed = Boolean(p.is_played);
        return {
          player_id: p.player_id,
          is_played: isPlayed,
          minutes_played: isPlayed ? Number(p.stats?.minutes_played || 0) : 0,
          rating: isPlayed && p.rating ? Number(Number(p.rating).toFixed(1)) : null,
          was_starter: isPlayed ? Boolean(p.was_starter) : false,
          goals: isPlayed ? Number(p.stats?.goals || 0) : 0,
          assists: isPlayed ? Number(p.stats?.assists || 0) : 0,
          detailed_stats: isPlayed ? {
            ...p.stats,
            is_played: true,
            breakdown: p.breakdown || [],
          } : { is_played: false }
        };
      });

      await api.post(`/matches/${match.id}/player-ratings/`, { players: payloadPlayers });

      setSaveSuccess(true);
      if (onSaved) onSaved(payloadPlayers);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'خطا در ذخیره آمار و نمرات بازیکنان.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isGk = selectedPlayer?.position === 'GK';
  const playedCount = currentRoster.filter((p) => p.is_played).length;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="relative z-10 bg-slate-950 border border-cyan-500/40 rounded-3xl w-full max-w-5xl my-auto p-3 sm:p-5 shadow-[0_0_60px_rgba(0,243,255,0.15)] text-right flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* TOP BAR: Header & Team Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                <span>ثبت آمار فردی مسابقه (PES 2021)</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-sport font-black px-2 py-0.5 rounded-full">
                  بازی #{match?.id}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {playedCount} بازیکن در زمین
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                ترتیب فیلدها دقیقاً ۱ به ۱ مطابق صفحه آمار فردی PES چیده شده است. بازیکنان بدون آمار نمره‌ای نخواهند داشت.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Team switcher */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  setActiveSide('home');
                  const firstH = Object.values(playersData).find((p) => p.is_home);
                  if (firstH) setSelectedPlayerId(firstH.player_id);
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSide === 'home'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{homeTeamName}</span>
                <span className="font-sport font-bold">({homeScore})</span>
              </button>
              <button
                onClick={() => {
                  setActiveSide('away');
                  const firstA = Object.values(playersData).find((p) => !p.is_home);
                  if (firstA) setSelectedPlayerId(firstA.player_id);
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSide === 'away'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{awayTeamName}</span>
                <span className="font-sport font-bold">({awayScore})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MOBILE HORIZONTAL PLAYER CAROUSEL */}
        <div
          ref={carouselRef}
          className="flex lg:hidden items-center gap-2 py-2 overflow-x-auto custom-scrollbar shrink-0 border-b border-slate-800/80 -mx-1 px-1"
        >
          {(currentRoster || []).map((p) => {
            const isSelected = selectedPlayer?.player_id === p.player_id;
            const r = p.rating ? Number(p.rating) : null;

            return (
              <button
                key={p.player_id}
                data-player-id={p.player_id}
                onClick={() => setSelectedPlayerId(p.player_id)}
                className={`shrink-0 px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                    : p.is_played
                    ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-70'
                }`}
              >
                <span className={`text-[9px] font-sport font-black px-1.5 py-0.5 rounded ${
                  p.position === 'GK'
                    ? 'bg-amber-950 text-amber-300'
                    : ['CB', 'LB', 'RB'].includes(p.position)
                    ? 'bg-blue-950 text-blue-300'
                    : ['CF', 'SS', 'LWF', 'RWF'].includes(p.position)
                    ? 'bg-rose-950 text-rose-300'
                    : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {p.position}
                </span>
                <span className="font-bold text-[11px] max-w-[85px] truncate block">{p.name}</span>
                <span className={`text-[10px] font-sport font-black px-1.5 py-0.2 rounded ${
                  p.is_played && r
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.is_played && r ? r.toFixed(1) : '-'}
                </span>
              </button>
            );
          })}
        </div>

        {/* MAIN BODY: Responsive 2-column or Mobile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 my-2.5 overflow-hidden flex-1 min-h-0">
          {/* DESKTOP LEFT: Roster List (4 cols) */}
          <div className="hidden lg:flex lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5 flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-bold px-1">
              <span>ترکیب {activeSide === 'home' ? homeTeamName : awayTeamName}</span>
              <span>نمره فردی</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {(currentRoster || []).map((p) => {
                const isSelected = selectedPlayer?.player_id === p.player_id;
                const r = p.rating ? Number(p.rating) : null;

                return (
                  <button
                    key={p.player_id}
                    onClick={() => setSelectedPlayerId(p.player_id)}
                    className={`w-full p-2 rounded-xl text-right transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500/80 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                        : p.is_played
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-sport font-black px-1.5 py-0.5 rounded border shrink-0 ${
                        p.position === 'GK'
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                          : ['CB', 'LB', 'RB'].includes(p.position)
                          ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                          : ['CF', 'SS', 'LWF', 'RWF'].includes(p.position)
                          ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {p.position}
                      </span>
                      <div className="truncate">
                        <span className={`font-bold text-xs block truncate ${p.is_played ? 'text-white' : 'text-slate-400'}`}>
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.is_played ? `${p.stats?.minutes_played || 90} دقیقه در زمین` : 'خارج از بازی'}
                          {p.stats?.goals > 0 ? ` • ⚽ ${p.stats.goals}` : ''}
                          {p.stats?.assists > 0 ? ` • 🎯 ${p.stats.assists}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-sport font-black px-2 py-0.5 rounded-lg border shadow-sm ${
                        !p.is_played || !r
                          ? 'bg-slate-900/60 text-slate-500 border-slate-800'
                          : r >= 8.0
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                          : r >= 7.0
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}>
                        {p.is_played && r ? `${r.toFixed(1)} ★` : '-'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN COLUMN: Active Player Bar & 17 PES Stats (8 cols desktop, full mobile) */}
          <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-2.5 sm:p-4 flex flex-col min-h-0 overflow-hidden">
            {selectedPlayer ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* ACTIVE PLAYER BAR WITH L1 / R1 NAV BUTTONS */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 mb-2.5 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    {/* Previous Player (L1) */}
                    <button
                      type="button"
                      onClick={handlePrevPlayer}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                      title="بازیکن قبلی (L1)"
                    >
                      <ChevronRight size={16} />
                      <span className="hidden sm:inline">قبلی</span>
                      <span className="text-[10px] text-cyan-400 font-sport font-black bg-cyan-950 px-1 rounded">L1</span>
                    </button>

                    {/* Middle Player Identity & Play Status Toggle */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-400 font-sport text-xs sm:text-sm shrink-0">
                        {selectedPlayer.position}
                      </div>

                      <div className="text-center truncate">
                        <div className="flex items-center justify-center gap-1.5 truncate">
                          <h3 className="font-black text-white text-xs sm:text-base truncate">
                            {selectedPlayer.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-sport font-bold shrink-0">
                            #{selectedPlayer.shirt_number}
                          </span>
                        </div>

                        {/* Status Toggle Button: Outside vs In-Match */}
                        <div className="mt-1 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayed(selectedPlayer.player_id)}
                            className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              selectedPlayer.is_played
                                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {selectedPlayer.is_played ? (
                              <>
                                <UserCheck size={13} className="text-emerald-400" />
                                <span>حضور در زمین (بازی کرده)</span>
                              </>
                            ) : (
                              <>
                                <UserX size={13} className="text-slate-500" />
                                <span>خارج از بازی (DNP)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Next Player (R1) */}
                    <button
                      type="button"
                      onClick={handleNextPlayer}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                      title="بازیکن بعدی (R1)"
                    >
                      <span className="text-[10px] text-cyan-400 font-sport font-black bg-cyan-950 px-1 rounded">R1</span>
                      <span className="hidden sm:inline">بعدی</span>
                      <ChevronLeft size={16} />
                    </button>
                  </div>

                  {/* Rating display & Auto calculation bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">نمره نهایی:</span>
                      {selectedPlayer.is_played ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="3.0"
                            max="10.0"
                            value={selectedPlayer.rating || 6.0}
                            onChange={(e) => handleManualRatingChange(e.target.value)}
                            className="w-14 bg-slate-900 border border-cyan-500/50 rounded-lg px-1.5 py-0.5 text-center text-xs font-sport font-black text-[#00ff87] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleToggleAutoCalc}
                            className={`text-[9px] px-1.5 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                              selectedPlayer.autoCalculate
                                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {selectedPlayer.autoCalculate ? '⚡ خودکار' : '✏️ دستی'}
                          </button>
                        </div>
                      ) : (
                        <span className="font-sport font-black text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-xs">
                          - (بدون نمره)
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {selectedPlayer.is_played ? (
                        <span>دقایق: <strong className="text-white font-sport">{selectedPlayer.stats?.minutes_played || 0}'</strong></span>
                      ) : (
                        <span className="text-amber-400/80">برای ثبت نمره، آمار یا دقایق را وارد کنید.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Factors preview breakdown pill banner (if played) */}
                {selectedPlayer.is_played && selectedPlayer.breakdown && selectedPlayer.breakdown.length > 0 && (
                  <div className="mb-2 bg-slate-950/70 border border-slate-800/80 rounded-xl p-1.5 flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar shrink-0">
                    {(selectedPlayer.breakdown || []).map((f, i) => (
                      <span
                        key={i}
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${
                          String(f.impact).startsWith('+')
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : String(f.impact) === '-'
                            ? 'bg-slate-900 text-slate-400 border-slate-800'
                            : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        <span>{f.label}</span>
                        <strong className="font-sport font-black">{f.impact}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* 17 PES STATS FIELDS CONTAINER (1-to-1 Matching PES Screen) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 sm:pr-1 space-y-2">
                  {/* Category Header */}
                  <div className="flex items-center justify-between text-xs font-black text-cyan-400 pb-1 border-b border-slate-800/80">
                    <span>{isGk ? 'آمار اختصاصی دروازه‌بان' : 'هر بازیکنی بجز دروازه بان (PES 2021)'}</span>
                    <span className="text-[10px] text-slate-500 font-normal">مطابق صفحه آمار فردی بازی</span>
                  </div>

                  {isGk ? (
                    /* GOALKEEPER FIELDS */
                    <div className="space-y-2">
                      {/* 1. شوت حریف (در چارچوب) */}
                      <DualStatRow
                        label="شوت حریف (در چارچوب)"
                        primaryLabel="کل"
                        primaryValue={selectedPlayer.stats?.gk_shots_faced || 0}
                        onPrimaryStep={(d) => handleStep('gk_shots_faced', d)}
                        onPrimaryChange={(v) => handleStatChange('gk_shots_faced', v)}
                        secondaryLabel="در چارچوب"
                        secondaryValue={selectedPlayer.stats?.gk_shots_on_target || 0}
                        onSecondaryStep={(d) => handleStep('gk_shots_on_target', d)}
                        onSecondaryChange={(v) => handleStatChange('gk_shots_on_target', v)}
                        highlight={Number(selectedPlayer.stats?.gk_shots_on_target) > 0}
                      />

                      {/* 2. شوت گیری دروازه‌بان */}
                      <StatRow
                        label="شوت گیری دروازه‌بان"
                        value={selectedPlayer.stats?.gk_saves || 0}
                        onStep={(d) => handleStep('gk_saves', d)}
                        onChange={(v) => handleStatChange('gk_saves', v)}
                        highlight={Number(selectedPlayer.stats?.gk_saves) > 0}
                      />

                      {/* 3. مهار پنالتی */}
                      <StatRow
                        label="مهار پنالتی"
                        value={selectedPlayer.stats?.penalty_saves || 0}
                        onStep={(d) => handleStep('penalty_saves', d)}
                        onChange={(v) => handleStatChange('penalty_saves', v)}
                        highlight={Number(selectedPlayer.stats?.penalty_saves) > 0}
                      />

                      {/* 4. گل خورده */}
                      <StatRow
                        label="گل خورده"
                        value={selectedPlayer.stats?.goals_conceded ?? 0}
                        onStep={(d) => handleStep('goals_conceded', d)}
                        onChange={(v) => handleStatChange('goals_conceded', v)}
                      />

                      {/* 5. دقایق حضور در بازی */}
                      <StatRow
                        label="دقایق حضور در بازی"
                        value={selectedPlayer.stats?.minutes_played || 0}
                        onStep={(d) => handleStep('minutes_played', d)}
                        onChange={(v) => handleStatChange('minutes_played', v)}
                        stepSize={5}
                      />
                    </div>
                  ) : (
                    /* OUTFIELD 17 PES FIELDS (Exact Sequence of PES Screenshot) */
                    <div className="space-y-1.5 sm:space-y-2">
                      {/* 1. گل زده */}
                      <StatRow
                        label="گل زده"
                        value={selectedPlayer.stats?.goals || 0}
                        onStep={(d) => handleStep('goals', d)}
                        onChange={(v) => handleStatChange('goals', v)}
                        highlight={Number(selectedPlayer.stats?.goals) > 0}
                      />

                      {/* 2. گل پنالتی */}
                      <StatRow
                        label="گل پنالتی"
                        value={selectedPlayer.stats?.penalty_goals || 0}
                        onStep={(d) => handleStep('penalty_goals', d)}
                        onChange={(v) => handleStatChange('penalty_goals', v)}
                        highlight={Number(selectedPlayer.stats?.penalty_goals) > 0}
                      />

                      {/* 3. گل ضربه آزاد */}
                      <StatRow
                        label="گل ضربه آزاد"
                        value={selectedPlayer.stats?.freekick_goals || 0}
                        onStep={(d) => handleStep('freekick_goals', d)}
                        onChange={(v) => handleStatChange('freekick_goals', v)}
                        highlight={Number(selectedPlayer.stats?.freekick_goals) > 0}
                      />

                      {/* 4. پاس گل */}
                      <StatRow
                        label="پاس گل"
                        value={selectedPlayer.stats?.assists || 0}
                        onStep={(d) => handleStep('assists', d)}
                        onChange={(v) => handleStatChange('assists', v)}
                        highlight={Number(selectedPlayer.stats?.assists) > 0}
                      />

                      {/* 5. شوت زده (در چارچوب) */}
                      <DualStatRow
                        label="شوت زده (در چارچوب)"
                        primaryLabel="کل"
                        primaryValue={selectedPlayer.stats?.shots_total || 0}
                        onPrimaryStep={(d) => handleStep('shots_total', d)}
                        onPrimaryChange={(v) => handleStatChange('shots_total', v)}
                        secondaryLabel="در چارچوب"
                        secondaryValue={selectedPlayer.stats?.shots_on_target || 0}
                        onSecondaryStep={(d) => handleStep('shots_on_target', d)}
                        onSecondaryChange={(v) => handleStatChange('shots_on_target', v)}
                        highlight={Number(selectedPlayer.stats?.shots_on_target) > 0}
                      />

                      {/* 6. پاس (موفق) */}
                      <DualStatRow
                        label="پاس (موفق)"
                        primaryLabel="کل"
                        primaryValue={selectedPlayer.stats?.passes_total || 0}
                        onPrimaryStep={(d) => handleStep('passes_total', d)}
                        onPrimaryChange={(v) => handleStatChange('passes_total', v)}
                        secondaryLabel="موفق"
                        secondaryValue={selectedPlayer.stats?.passes_completed || 0}
                        onSecondaryStep={(d) => handleStep('passes_completed', d)}
                        onSecondaryChange={(v) => handleStatChange('passes_completed', v)}
                        stepSize={5}
                      />

                      {/* 7. سانتر */}
                      <StatRow
                        label="سانتر"
                        value={selectedPlayer.stats?.crosses || 0}
                        onStep={(d) => handleStep('crosses', d)}
                        onChange={(v) => handleStatChange('crosses', v)}
                      />

                      {/* 8. خطا (آفساید) */}
                      <DualStatRow
                        label="خطا (آفساید)"
                        primaryLabel="خطا"
                        primaryValue={selectedPlayer.stats?.fouls || 0}
                        onPrimaryStep={(d) => handleStep('fouls', d)}
                        onPrimaryChange={(v) => handleStatChange('fouls', v)}
                        secondaryLabel="آفساید"
                        secondaryValue={selectedPlayer.stats?.offsides || 0}
                        onSecondaryStep={(d) => handleStep('offsides', d)}
                        onSecondaryChange={(v) => handleStatChange('offsides', v)}
                      />

                      {/* 9. ضربه آزاد */}
                      <StatRow
                        label="ضربه آزاد"
                        value={selectedPlayer.stats?.freekicks_won || 0}
                        onStep={(d) => handleStep('freekicks_won', d)}
                        onChange={(v) => handleStatChange('freekicks_won', v)}
                      />

                      {/* 10. کرنر */}
                      <StatRow
                        label="کرنر"
                        value={selectedPlayer.stats?.corners || 0}
                        onStep={(d) => handleStep('corners', d)}
                        onChange={(v) => handleStatChange('corners', v)}
                      />

                      {/* 11. سد توپ */}
                      <StatRow
                        label="سد توپ"
                        value={selectedPlayer.stats?.blocks || 0}
                        onStep={(d) => handleStep('blocks', d)}
                        onChange={(v) => handleStatChange('blocks', v)}
                      />

                      {/* 12. دقایق حضور در بازی */}
                      <StatRow
                        label="دقایق حضور در بازی"
                        value={selectedPlayer.stats?.minutes_played || 0}
                        onStep={(d) => handleStep('minutes_played', d)}
                        onChange={(v) => handleStatChange('minutes_played', v)}
                        stepSize={5}
                        highlight={Number(selectedPlayer.stats?.minutes_played) > 0}
                      />

                      {/* 13. لمس توپ */}
                      <StatRow
                        label="لمس توپ"
                        value={selectedPlayer.stats?.touches || 0}
                        onStep={(d) => handleStep('touches', d)}
                        onChange={(v) => handleStatChange('touches', v)}
                        stepSize={5}
                      />

                      {/* 14. مسافت دریبل */}
                      <StatRow
                        label="مسافت دریبل"
                        value={selectedPlayer.stats?.dribble_distance || 0}
                        onStep={(d) => handleStep('dribble_distance', d)}
                        onChange={(v) => handleStatChange('dribble_distance', v)}
                        stepSize={0.5}
                        unit="متر"
                      />

                      {/* 15. متوسط سرعت */}
                      <StatRow
                        label="متوسط سرعت"
                        value={selectedPlayer.stats?.avg_speed || 0}
                        onStep={(d) => handleStep('avg_speed', d)}
                        onChange={(v) => handleStatChange('avg_speed', v)}
                        stepSize={0.2}
                        unit="km/h"
                      />

                      {/* 16. برنده در نبرد */}
                      <DualStatRow
                        label="برنده در نبرد"
                        primaryLabel="کل نبرد"
                        primaryValue={selectedPlayer.stats?.duels_total || 0}
                        onPrimaryStep={(d) => handleStep('duels_total', d)}
                        onPrimaryChange={(v) => handleStatChange('duels_total', v)}
                        secondaryLabel="پیروز"
                        secondaryValue={selectedPlayer.stats?.duels_won || 0}
                        onSecondaryStep={(d) => handleStep('duels_won', d)}
                        onSecondaryChange={(v) => handleStatChange('duels_won', v)}
                        highlight={Number(selectedPlayer.stats?.duels_won) > 0}
                      />

                      {/* 17. دفع توپ */}
                      <StatRow
                        label="دفع توپ"
                        value={selectedPlayer.stats?.clearances || 0}
                        onStep={(d) => handleStep('clearances', d)}
                        onChange={(v) => handleStatChange('clearances', v)}
                        highlight={Number(selectedPlayer.stats?.clearances) > 0}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                یک بازیکن را انتخاب نمایید.
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-slate-800 pt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {errorMessage && <span className="text-rose-400 font-bold flex items-center gap-1"><AlertCircle size={14} />{errorMessage}</span>}
            {saveSuccess && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={15} />
                <span>تمام نمرات و آمار فردی با موفقیت ثبت گردید!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all border border-slate-700 flex-1 sm:flex-none cursor-pointer"
            >
              انصراف
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 flex-1 sm:flex-none cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'در حال ثبت...' : '⭐ ذخیره رسمی آمار و نمرات'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

/**
 * Single Stat Row (1-to-1 matching PES screen layout)
 */
function StatRow({ label, value, onChange, onStep, stepSize = 1, unit = '', highlight = false }) {
  return (
    <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
      highlight
        ? 'bg-cyan-950/30 border-cyan-500/50'
        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
    }`}>
      <span className="text-xs text-slate-300 font-bold truncate flex-1">{label}</span>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onStep(-stepSize)}
          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 transition-transform cursor-pointer"
        >
          <Minus size={13} />
        </button>

        <div className="relative flex items-center">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center text-xs font-sport font-black text-white focus:outline-none focus:border-cyan-400"
          />
          {unit && (
            <span className="text-[9px] text-slate-500 font-bold mr-1 absolute -top-3.5 right-0">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onStep(stepSize)}
          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 transition-transform cursor-pointer"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/**
 * Dual Stat Row (e.g. Shots Total (On Target), Passes Total (Completed), Duels Total (Won))
 * Exactly matches PES display format: (در چارچوب) شوت زده
 */
function DualStatRow({
  label,
  primaryLabel,
  primaryValue,
  onPrimaryStep,
  onPrimaryChange,
  secondaryLabel,
  secondaryValue,
  onSecondaryStep,
  onSecondaryChange,
  stepSize = 1,
  highlight = false
}) {
  return (
    <div className={`p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
      highlight
        ? 'bg-cyan-950/30 border-cyan-500/50'
        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
    }`}>
      <span className="text-xs text-slate-300 font-bold truncate">{label}</span>

      <div className="flex items-center justify-end gap-2 shrink-0">
        {/* Primary Counter */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold px-1">{primaryLabel}</span>
          <button
            type="button"
            onClick={() => onPrimaryStep(-stepSize)}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 cursor-pointer"
          >
            <Minus size={11} />
          </button>
          <input
            type="number"
            value={primaryValue}
            onChange={(e) => onPrimaryChange(e.target.value)}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-0.5 py-0.5 text-center text-xs font-sport font-black text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onPrimaryStep(stepSize)}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 cursor-pointer"
          >
            <Plus size={11} />
          </button>
        </div>

        {/* Secondary Counter (in brackets) */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] text-cyan-400 font-bold px-1">{secondaryLabel}</span>
          <button
            type="button"
            onClick={() => onSecondaryStep(-1)}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 cursor-pointer"
          >
            <Minus size={11} />
          </button>
          <input
            type="number"
            value={secondaryValue}
            onChange={(e) => onSecondaryChange(e.target.value)}
            className="w-10 bg-slate-950 border border-slate-700 rounded px-0.5 py-0.5 text-center text-xs font-sport font-black text-cyan-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onSecondaryStep(1)}
            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 cursor-pointer"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
