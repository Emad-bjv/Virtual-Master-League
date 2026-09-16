import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, Award, Target, Zap, Shield, Activity, Plus, Minus,
  Save, CheckCircle2, RefreshCw, ChevronRight, ChevronLeft, User, Sparkles
} from 'lucide-react';
import { calculatePlayerRating } from '../../utils/ratingEngine';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import api from '../../services/api';

const DEFAULT_STATS = {
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
  minutes_played: 90,
  touches: 0,
  dribble_distance: 0,
  duels_total: 0,
  duels_won: 0,
  clearances: 0,
  // GK
  gk_shots_faced: 0,
  gk_shots_on_target: 0,
  gk_saves: 0,
  goals_conceded: 0,
  penalty_saves: 0,
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

  const homeTeamName = String(match?.home_team_name || 'تیم میزبان');
  const awayTeamName = String(match?.away_team_name || 'تیم میهمان');
  const homeScore = Number(match?.home_score ?? 0);
  const awayScore = Number(match?.away_score ?? 0);

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

      const conceded = isHome ? awayScore : homeScore;
      const teamWon = isHome ? homeScore > awayScore : awayScore > homeScore;
      const cleanSheet = isHome ? awayScore === 0 : homeScore === 0;

      const mergedStats = {
        ...DEFAULT_STATS,
        minutes_played: p.minutes_played !== undefined ? p.minutes_played : (p.was_starter ?? p.is_starting ? 90 : 0),
        goals: p.goals || existingDetailed.goals || 0,
        assists: p.assists || existingDetailed.assists || 0,
        goals_conceded: conceded,
        ...existingDetailed,
      };

      const matchCtx = { team_won: teamWon, clean_sheet: cleanSheet, goals_conceded: conceded };
      const calc = calculatePlayerRating(pos, mergedStats, matchCtx);

      initialMap[pid] = {
        player_id: pid,
        name: p.name || p.player_name,
        position: pos,
        shirt_number: p.shirt_number || p.player_shirt_number || '-',
        photo_url: p.photo_url || p.custom_photo,
        was_starter: p.was_starter ?? p.is_starting ?? false,
        is_home: isHome,
        stats: mergedStats,
        autoCalculate: true,
        rating: p.rating ? Number(p.rating) : calc.rating,
        breakdown: calc.breakdown || [],
      };
    });

    setPlayersData(initialMap);

    // Select first player of active side
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

  // Handler: Update specific stat field for selected player
  const handleStatChange = (fieldName, rawVal) => {
    if (!selectedPlayer) return;
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal) || 0;

    setPlayersData((prev) => {
      const p = prev[selectedPlayer.player_id];
      if (!p) return prev;

      const updatedStats = { ...p.stats, [fieldName]: Math.max(0, val) };

      // Update minutes_played top level if field is minutes_played
      const isHome = p.is_home;
      const conceded = isHome ? awayScore : homeScore;
      const teamWon = isHome ? homeScore > awayScore : awayScore > homeScore;
      const cleanSheet = isHome ? awayScore === 0 : homeScore === 0;
      const matchCtx = { team_won: teamWon, clean_sheet: cleanSheet, goals_conceded: conceded };

      let nextRating = p.rating;
      let nextBreakdown = p.breakdown;

      if (p.autoCalculate) {
        const res = calculatePlayerRating(p.position, updatedStats, matchCtx);
        nextRating = res.rating;
        nextBreakdown = res.breakdown;
      }

      return {
        ...prev,
        [p.player_id]: {
          ...p,
          stats: updatedStats,
          rating: nextRating,
          breakdown: nextBreakdown,
        }
      };
    });
  };

  // Handler: Increment/Decrement helper
  const handleStep = (fieldName, delta, min = 0) => {
    if (!selectedPlayer) return;
    const cur = Number(selectedPlayer.stats?.[fieldName] || 0);
    handleStatChange(fieldName, Math.max(min, cur + delta));
  };

  // Handler: Toggle auto-calculate vs manual rating
  const handleToggleAutoCalc = () => {
    if (!selectedPlayer) return;
    setPlayersData((prev) => {
      const p = prev[selectedPlayer.player_id];
      if (!p) return prev;
      const nextAuto = !p.autoCalculate;

      let nextRating = p.rating;
      let nextBreakdown = p.breakdown;

      if (nextAuto) {
        const isHome = p.is_home;
        const conceded = isHome ? awayScore : homeScore;
        const teamWon = isHome ? homeScore > awayScore : awayScore > homeScore;
        const cleanSheet = isHome ? awayScore === 0 : homeScore === 0;
        const res = calculatePlayerRating(p.position, p.stats, { team_won: teamWon, clean_sheet: cleanSheet, goals_conceded: conceded });
        nextRating = res.rating;
        nextBreakdown = res.breakdown;
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

  // Handler: Manual rating edit
  const handleManualRatingChange = (val) => {
    if (!selectedPlayer) return;
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

  // Handler: Submit all ratings
  const handleSubmitAll = async () => {
    if (!match?.id) return;
    setIsSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const payloadPlayers = Object.values(playersData).map((p) => ({
        player_id: p.player_id,
        minutes_played: Number(p.stats?.minutes_played ?? (p.was_starter ? 90 : 0)),
        rating: Number(p.rating || 6.0),
        was_starter: Boolean(p.was_starter),
        goals: Number(p.stats?.goals || 0),
        assists: Number(p.stats?.assists || 0),
        detailed_stats: {
          ...p.stats,
          breakdown: p.breakdown || [],
        }
      }));

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

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative z-10 bg-slate-950 border border-cyan-500/40 rounded-3xl w-full max-w-5xl my-auto p-4 sm:p-6 shadow-[0_0_60px_rgba(0,243,255,0.15)] text-right flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* TOP BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                <span>ثبت آمار فردی مسابقه (PES 2021) و محاسبه هوشمند نمرات</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-sport font-black px-2 py-0.5 rounded-full">
                  بازی #{match?.id}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                آمار بازیکنان را ثبت کنید؛ نمرات به صورت دقیق و آنی بر اساس ۱۷ فاکتور PES محاسبه می‌شوند.
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

        {/* MAIN BODY: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-3 overflow-hidden flex-1 min-h-0">
          {/* LEFT: Roster List (4 cols) */}
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400 font-bold px-1">
              <span>لیست بازیکنان {activeSide === 'home' ? homeTeamName : awayTeamName}</span>
              <span>نمره هوشمند</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {(currentRoster || []).map((p) => {
                const isSelected = selectedPlayer?.player_id === p.player_id;
                const r = Number(p.rating || 6.0);

                return (
                  <button
                    key={p.player_id}
                    onClick={() => setSelectedPlayerId(p.player_id)}
                    className={`w-full p-2 rounded-xl text-right transition-all flex items-center justify-between gap-2 border cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500/80 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                        : 'bg-slate-950/60 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/40'
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
                        <span className="font-bold text-white text-xs block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {p.was_starter ? "فیکس (۹۰')" : "تعویضی"}
                          {p.stats?.goals > 0 ? ` • ⚽ ${p.stats.goals}` : ''}
                          {p.stats?.assists > 0 ? ` • 🎯 ${p.stats.assists}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-sport font-black px-2 py-0.5 rounded-lg border shadow-sm ${
                        r >= 8.5
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                          : r >= 7.0
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}>
                        {r.toFixed(1)} ★
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Detailed PES Matrix Inputs (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden">
            {selectedPlayer ? (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Selected Player Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 font-sport">
                      {selectedPlayer.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-sm sm:text-base">{selectedPlayer.name}</h3>
                        <span className="text-[10px] text-slate-400 font-sport font-bold">
                          #{selectedPlayer.shirt_number}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {selectedPlayer.was_starter ? 'بازیکن فیکس' : 'بازیکن تعویضی'} • {activeSide === 'home' ? homeTeamName : awayTeamName}
                      </span>
                    </div>
                  </div>

                  {/* Live Rating & Auto toggle */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-400">نمره محاسبه‌شده</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="3.0"
                          max="10.0"
                          value={selectedPlayer.rating}
                          onChange={(e) => handleManualRatingChange(e.target.value)}
                          className="w-16 bg-slate-950 border border-cyan-500/50 rounded-xl px-2 py-0.5 text-center text-sm font-sport font-black text-[#00ff87] focus:outline-none"
                        />
                        <button
                          onClick={handleToggleAutoCalc}
                          className={`text-[10px] px-2 py-1 rounded-xl border font-bold transition-all ${
                            selectedPlayer.autoCalculate
                              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {selectedPlayer.autoCalculate ? '⚡ محاسبه خودکار' : '✏️ دستی'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Factors preview pill banner */}
                {selectedPlayer.breakdown && selectedPlayer.breakdown.length > 0 && (
                  <div className="mb-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar shrink-0">
                    {(selectedPlayer.breakdown || []).map((f, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${
                          String(f.impact).startsWith('+')
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        <span>{f.label}</span>
                        <strong className="font-sport font-black">{f.impact}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* 17 PES Inputs Grid (Scrollable) */}
                <div className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {/* Category 1: Attack & Goals */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3">
                    <span className="text-[11px] font-black text-amber-400 flex items-center gap-1 mb-2">
                      <Target size={13} />
                      <span>گلزنی، پاس گل و تمام‌کنندگی</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <StatInput
                        label="گل‌ها (Goals)"
                        value={selectedPlayer.stats?.goals || 0}
                        onChange={(v) => handleStatChange('goals', v)}
                        onStep={(d) => handleStep('goals', d)}
                        highlight={Number(selectedPlayer.stats?.goals) > 0}
                      />
                      <StatInput
                        label="پاس گل (Assists)"
                        value={selectedPlayer.stats?.assists || 0}
                        onChange={(v) => handleStatChange('assists', v)}
                        onStep={(d) => handleStep('assists', d)}
                        highlight={Number(selectedPlayer.stats?.assists) > 0}
                      />
                      <StatInput
                        label="گل ضربه آزاد"
                        value={selectedPlayer.stats?.freekick_goals || 0}
                        onChange={(v) => handleStatChange('freekick_goals', v)}
                        onStep={(d) => handleStep('freekick_goals', d)}
                      />
                      <StatInput
                        label="گل پنالتی (PK)"
                        value={selectedPlayer.stats?.penalty_goals || 0}
                        onChange={(v) => handleStatChange('penalty_goals', v)}
                        onStep={(d) => handleStep('penalty_goals', d)}
                      />
                      <StatInput
                        label="شوت کل (Shots)"
                        value={selectedPlayer.stats?.shots_total || 0}
                        onChange={(v) => handleStatChange('shots_total', v)}
                        onStep={(d) => handleStep('shots_total', d)}
                      />
                      <StatInput
                        label="شوت در چارچوب"
                        value={selectedPlayer.stats?.shots_on_target || 0}
                        onChange={(v) => handleStatChange('shots_on_target', v)}
                        onStep={(d) => handleStep('shots_on_target', d)}
                        highlight={Number(selectedPlayer.stats?.shots_on_target) > 0}
                      />
                    </div>
                  </div>

                  {/* Category 2: Passes & Build-up */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3">
                    <span className="text-[11px] font-black text-cyan-400 flex items-center gap-1 mb-2">
                      <Zap size={13} />
                      <span>پاسکاری و گردش توپ (Passes)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <StatInput
                        label="پاس کل"
                        value={selectedPlayer.stats?.passes_total || 0}
                        onChange={(v) => handleStatChange('passes_total', v)}
                        onStep={(d) => handleStep('passes_total', d, 0)}
                        stepSize={5}
                      />
                      <StatInput
                        label="پاس موفق"
                        value={selectedPlayer.stats?.passes_completed || 0}
                        onChange={(v) => handleStatChange('passes_completed', v)}
                        onStep={(d) => handleStep('passes_completed', d, 0)}
                        stepSize={5}
                      />
                      <StatInput
                        label="سانترها (Crosses)"
                        value={selectedPlayer.stats?.crosses || 0}
                        onChange={(v) => handleStatChange('crosses', v)}
                        onStep={(d) => handleStep('crosses', d)}
                      />
                      <StatInput
                        label="لمس توپ (Touches)"
                        value={selectedPlayer.stats?.touches || 0}
                        onChange={(v) => handleStatChange('touches', v)}
                        onStep={(d) => handleStep('touches', d, 0)}
                        stepSize={5}
                      />
                    </div>
                  </div>

                  {/* Category 3: Defense & Physical */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3">
                    <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 mb-2">
                      <Shield size={13} />
                      <span>دفاع، دوئل‌ها و بازپس‌گیری</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <StatInput
                        label="نبردهای کل"
                        value={selectedPlayer.stats?.duels_total || 0}
                        onChange={(v) => handleStatChange('duels_total', v)}
                        onStep={(d) => handleStep('duels_total', d)}
                      />
                      <StatInput
                        label="نبردهای پیروز"
                        value={selectedPlayer.stats?.duels_won || 0}
                        onChange={(v) => handleStatChange('duels_won', v)}
                        onStep={(d) => handleStep('duels_won', d)}
                        highlight={Number(selectedPlayer.stats?.duels_won) > 0}
                      />
                      <StatInput
                        label="دفع توپ (Clearance)"
                        value={selectedPlayer.stats?.clearances || 0}
                        onChange={(v) => handleStatChange('clearances', v)}
                        onStep={(d) => handleStep('clearances', d)}
                        highlight={Number(selectedPlayer.stats?.clearances) > 0}
                      />
                      <StatInput
                        label="سد توپ (Blocks)"
                        value={selectedPlayer.stats?.blocks || 0}
                        onChange={(v) => handleStatChange('blocks', v)}
                        onStep={(d) => handleStep('blocks', d)}
                      />
                    </div>
                  </div>

                  {/* Category 4: Movement & Discipline */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3">
                    <span className="text-[11px] font-black text-purple-400 flex items-center gap-1 mb-2">
                      <Activity size={13} />
                      <span>دوندگی، دریبل و خطاها</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <StatInput
                        label="مسافت دریبل (متر)"
                        value={selectedPlayer.stats?.dribble_distance || 0}
                        onChange={(v) => handleStatChange('dribble_distance', v)}
                        onStep={(d) => handleStep('dribble_distance', d)}
                        stepSize={5}
                      />
                      <StatInput
                        label="دقایق بازی"
                        value={selectedPlayer.stats?.minutes_played || 0}
                        onChange={(v) => handleStatChange('minutes_played', v)}
                        onStep={(d) => handleStep('minutes_played', d)}
                        stepSize={5}
                      />
                      <StatInput
                        label="خطاهای مرتکب شده"
                        value={selectedPlayer.stats?.fouls || 0}
                        onChange={(v) => handleStatChange('fouls', v)}
                        onStep={(d) => handleStep('fouls', d)}
                      />
                      <StatInput
                        label="خطای گرفته‌شده"
                        value={selectedPlayer.stats?.freekicks_won || 0}
                        onChange={(v) => handleStatChange('freekicks_won', v)}
                        onStep={(d) => handleStep('freekicks_won', d)}
                      />
                      <StatInput
                        label="آفسایدها"
                        value={selectedPlayer.stats?.offsides || 0}
                        onChange={(v) => handleStatChange('offsides', v)}
                        onStep={(d) => handleStep('offsides', d)}
                      />
                    </div>
                  </div>

                  {/* Category 5: Goalkeeping (shown if GK or toggled) */}
                  {isGk && (
                    <div className="bg-slate-950/50 border border-amber-500/40 rounded-2xl p-3">
                      <span className="text-[11px] font-black text-amber-300 flex items-center gap-1 mb-2">
                        <Shield size={13} />
                        <span>آمار اختصاصی دروازه‌بان (GK Saves)</span>
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <StatInput
                          label="مهار شوت (Saves)"
                          value={selectedPlayer.stats?.gk_saves || 0}
                          onChange={(v) => handleStatChange('gk_saves', v)}
                          onStep={(d) => handleStep('gk_saves', d)}
                          highlight={Number(selectedPlayer.stats?.gk_saves) > 0}
                        />
                        <StatInput
                          label="شوت در چارچوب حریف"
                          value={selectedPlayer.stats?.gk_shots_on_target || 0}
                          onChange={(v) => handleStatChange('gk_shots_on_target', v)}
                          onStep={(d) => handleStep('gk_shots_on_target', d)}
                        />
                        <StatInput
                          label="مهار پنالتی"
                          value={selectedPlayer.stats?.penalty_saves || 0}
                          onChange={(v) => handleStatChange('penalty_saves', v)}
                          onStep={(d) => handleStep('penalty_saves', d)}
                          highlight={Number(selectedPlayer.stats?.penalty_saves) > 0}
                        />
                        <StatInput
                          label="گل خورده"
                          value={selectedPlayer.stats?.goals_conceded ?? 0}
                          onChange={(v) => handleStatChange('goals_conceded', v)}
                          onStep={(d) => handleStep('goals_conceded', d)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                یک بازیکن را از لیست سمت راست انتخاب نمایید.
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {errorMessage && <span className="text-rose-400 font-bold">{errorMessage}</span>}
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
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 flex-1 sm:flex-none cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'در حال ثبت در سرور...' : '⭐ ذخیره رسمی آمار و نمرات'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

function StatInput({ label, value, onChange, onStep, stepSize = 1, highlight = false }) {
  return (
    <div className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
      highlight
        ? 'bg-cyan-950/40 border-cyan-500/50'
        : 'bg-slate-950/80 border-slate-800'
    }`}>
      <span className="text-[10px] text-slate-400 font-bold truncate block mb-1">{label}</span>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onStep(-stepSize)}
          className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 transition-transform"
        >
          <Minus size={11} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1 py-0.5 text-center text-xs font-sport font-black text-white focus:outline-none focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={() => onStep(stepSize)}
          className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs active:scale-90 transition-transform"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}
