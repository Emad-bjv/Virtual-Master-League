import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Target, Zap, Shield, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

export default function PlayerPerformanceDetailModal({ isOpen, onClose, stat, matchContext }) {
  if (!isOpen || !stat) return null;

  const player = stat.player_data || stat.player || {};
  const playerName = String(stat.player_name || player.name || 'بازیکن');
  const position = String(stat.player_position || player.position || '-').toUpperCase();
  const shirtNumber = stat.player_shirt_number || player.shirt_number || '-';
  const ratingNum = Number(stat.rating || 6.0);
  const minutes = Number(stat.minutes_played ?? 90);
  const detailed = stat.detailed_stats || {};
  const breakdown = Array.isArray(detailed.breakdown) ? detailed.breakdown : [];

  // Pass metrics
  const passesTotal = Number(detailed.passes_total) || 0;
  const passesCompleted = Number(detailed.passes_completed) || 0;
  const passAcc = passesTotal > 0 ? Math.round((passesCompleted / passesTotal) * 100) : null;

  // Duels metrics
  const duelsTotal = Number(detailed.duels_total) || 0;
  const duelsWon = Number(detailed.duels_won) || 0;
  const duelAcc = duelsTotal > 0 ? Math.round((duelsWon / duelsTotal) * 100) : null;

  // Shots metrics
  const shotsTotal = Number(detailed.shots_total) || 0;
  const shotsOnTarget = Number(detailed.shots_on_target) || 0;
  const shotAcc = shotsTotal > 0 ? Math.round((shotsOnTarget / shotsTotal) * 100) : null;

  // GK metrics
  const isGk = position === 'GK' || detailed.gk_saves !== undefined;
  const gkShotsFaced = Number(detailed.gk_shots_faced || detailed.gk_shots_on_target) || 0;
  const gkSaves = Number(detailed.gk_saves) || 0;
  const gkSaveRate = gkShotsFaced > 0 ? Math.round((gkSaves / gkShotsFaced) * 100) : null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="fixed inset-0" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative z-10 bg-gradient-to-b from-[#0e1726] to-[#060a12] border border-cyan-500/30 rounded-3xl w-full max-w-xl my-auto p-5 sm:p-6 shadow-[0_0_50px_rgba(0,243,255,0.15)] text-right"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 border-2 border-cyan-400/40 p-1 flex items-center justify-center shadow-lg relative overflow-hidden shrink-0">
                {getPlayerPhotoUrl(player) ? (
                  <img src={getPlayerPhotoUrl(player)} alt={playerName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="font-sport font-black text-cyan-400 text-base">{position}</span>
                )}
                {shirtNumber !== '-' && (
                  <span className="absolute bottom-0 right-0 bg-slate-950/90 text-[10px] font-sport font-black text-cyan-300 px-1 rounded-tl">
                    #{shirtNumber}
                  </span>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-white text-base sm:text-lg">{playerName}</h3>
                  <span className="text-[11px] font-sport font-bold px-2 py-0.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                    {position}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  گزارش عملکرد فردی • {minutes} دقیقه بازی
                  {stat.was_starter ? ' (فیکس)' : ' (تعویضی)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Rating Badge */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 font-bold mb-0.5">نمره بازی</span>
                <div className={`px-3 py-1 rounded-2xl font-sport font-black text-base sm:text-lg border shadow-lg flex items-center gap-1 ${
                  ratingNum >= 8.5
                    ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border-amber-500/60 shadow-amber-500/20'
                    : ratingNum >= 7.0
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}>
                  <span>{ratingNum.toFixed(1)}</span>
                  <Award size={16} className="text-amber-400" />
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Rating Breakdown / Factors */}
          {breakdown.length > 0 && (
            <div className="mb-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 mb-2">
                <TrendingUp size={14} />
                <span>عوامل موثر در محاسبه نمره هوشمند</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(breakdown || []).map((factor, idx) => {
                  const isPositive = String(factor.impact || '').startsWith('+');
                  return (
                    <span
                      key={idx}
                      className={`text-[11px] px-2 py-0.8 rounded-lg border font-medium flex items-center gap-1.5 ${
                        isPositive
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <span>{factor.label}</span>
                      <strong className="font-sport font-black">{factor.impact}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* PES Individual Stats Matrix */}
          <div className="space-y-4 max-h-[52vh] overflow-y-auto custom-scrollbar pl-1">
            {/* 1. Attack & Scoring */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 mb-2.5">
                <Target size={14} />
                <span>عملکرد هجومی و گلزنی</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="گل‌ها" value={detailed.goals || 0} highlight={Number(detailed.goals) > 0} icon="⚽" />
                <StatCard label="پاس گل" value={detailed.assists || 0} highlight={Number(detailed.assists) > 0} icon="🎯" />
                <StatCard label="شوت‌ها" value={`${shotsOnTarget}/${shotsTotal}`} sub={shotAcc !== null ? `${shotAcc}% در چارچوب` : null} />
                <StatCard label="گل ضربه آزاد" value={detailed.freekick_goals || 0} />
              </div>
              {Number(detailed.penalty_goals) > 0 && (
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                  <span>⚽ گل‌های پنالتی:</span>
                  <strong className="text-white font-sport">{detailed.penalty_goals}</strong>
                </div>
              )}
            </div>

            {/* 2. Passing & Build-up */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 mb-2.5">
                <Zap size={14} />
                <span>پاسکاری و بازیسازی</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCard
                  label="پاس‌ها (موفق/کل)"
                  value={`${passesCompleted}/${passesTotal}`}
                  sub={passAcc !== null ? `دقت ${passAcc}%` : null}
                  highlight={passAcc !== null && passAcc >= 85}
                />
                <StatCard label="سانترها" value={detailed.crosses || 0} />
                <StatCard label="کرنرها" value={detailed.corners || 0} />
              </div>
            </div>

            {/* 3. Defense & Duels */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 mb-2.5">
                <Shield size={14} />
                <span>دفاع و نبردهای فیزیکی</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard
                  label="دوئل‌ها (پیروز/کل)"
                  value={`${duelsWon}/${duelsTotal}`}
                  sub={duelAcc !== null ? `${duelAcc}% موفق` : null}
                  highlight={duelAcc !== null && duelAcc >= 60}
                />
                <StatCard label="دفع توپ (Clear)" value={detailed.clearances || 0} />
                <StatCard label="بلاک شوت و پاس" value={detailed.blocks || 0} />
                <StatCard label="خطاهای متحمل شده" value={detailed.freekicks_won || 0} />
              </div>
            </div>

            {/* 4. Movement & Physical */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-400 mb-2.5">
                <Activity size={14} />
                <span>دوندگی و فیزیک مسابقه</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <StatCard
                  label="مسافت دریبل"
                  value={detailed.dribble_distance ? `${Number(detailed.dribble_distance).toFixed(1)} m` : '۰ m'}
                />
                <StatCard label="لمس توپ" value={detailed.touches || 0} />
                <StatCard
                  label="انضباطی"
                  value={`خطا: ${detailed.fouls || 0}`}
                  sub={Number(detailed.offsides) > 0 ? `آفساید: ${detailed.offsides}` : null}
                />
              </div>
            </div>

            {/* 5. Goalkeeper specifics (if GK) */}
            {isGk && (
              <div className="bg-slate-950/40 border border-amber-500/40 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 mb-2.5">
                  <Shield size={14} />
                  <span>آمار تخصصی دروازه‌بان (GK)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCard
                    label="مهار شوت (Saves)"
                    value={`${gkSaves}/${gkShotsFaced}`}
                    sub={gkSaveRate !== null ? `مهار ${gkSaveRate}%` : null}
                    highlight={gkSaveRate !== null && gkSaveRate >= 75}
                  />
                  <StatCard label="مهار پنالتی" value={detailed.penalty_saves || 0} highlight={Number(detailed.penalty_saves) > 0} />
                  <StatCard label="گل خورده" value={detailed.goals_conceded ?? 0} />
                  <StatCard
                    label="کلین شیت"
                    value={(detailed.goals_conceded === 0 || matchContext?.clean_sheet) ? 'بله' : 'خیر'}
                    highlight={detailed.goals_conceded === 0 || matchContext?.clean_sheet}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <AlertCircle size={12} className="text-cyan-400" />
              <span>محاسبه شده بر اساس الگوریتم هوشمند PES 2021 VML</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all text-xs"
            >
              بستن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

function StatCard({ label, value, sub, highlight = false, icon }) {
  return (
    <div className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
      highlight
        ? 'bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_10px_rgba(0,243,255,0.1)]'
        : 'bg-slate-900/60 border-slate-800/80'
    }`}>
      <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </span>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <strong className={`font-sport font-black text-sm ${highlight ? 'text-cyan-300' : 'text-white'}`}>
          {value}
        </strong>
        {sub && <span className="text-[9px] text-slate-400 font-bold">{sub}</span>}
      </div>
    </div>
  );
}
