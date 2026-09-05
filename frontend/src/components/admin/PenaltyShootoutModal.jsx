import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Trophy, CheckCircle2, Shield, Plus, Minus,
  Sparkles, AlertCircle, Save, Check, Minimize2, Maximize2
} from 'lucide-react';
import { getTeamLogoUrl } from '../../utils/teamLogos';

export default function PenaltyShootoutModal({
  isOpen,
  onClose,
  match,
  onSavePenalties,
  onConcludeMatchWithPenalties,
}) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Kick-by-kick tracker state: arrays of 'SCORED' | 'MISSED' | 'PENDING'
  // Starts with standard 5 kicks for each team
  const [homeKicks, setHomeKicks] = useState(['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING']);
  const [awayKicks, setAwayKicks] = useState(['PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING']);

  useEffect(() => {
    if (match) {
      const hPen = Number(match.home_penalties) || 0;
      const aPen = Number(match.away_penalties) || 0;
      setHomeScore(hPen);
      setAwayScore(aPen);

      // Reconstruct initial kick indicators if existing penalties
      const maxKicks = Math.max(5, Math.max(hPen, aPen));
      const newHomeKicks = Array(maxKicks).fill('PENDING');
      for (let i = 0; i < Math.min(hPen, maxKicks); i++) newHomeKicks[i] = 'SCORED';

      const newAwayKicks = Array(maxKicks).fill('PENDING');
      for (let i = 0; i < Math.min(aPen, maxKicks); i++) newAwayKicks[i] = 'SCORED';

      setHomeKicks(newHomeKicks);
      setAwayKicks(newAwayKicks);
    }
  }, [match?.id, match?.home_penalties, match?.away_penalties]);

  if (!isOpen || !match) return null;

  const homeName = match.home_team_name || 'میزبان';
  const awayName = match.away_team_name || 'میهمان';
  const homeLogo = getTeamLogoUrl(match.home_team_logo || homeName);
  const awayLogo = getTeamLogoUrl(match.away_team_logo || awayName);

  // Toggle kick outcome (PENDING -> SCORED -> MISSED -> PENDING)
  const toggleKick = (side, index) => {
    if (side === 'home') {
      const updated = [...homeKicks];
      const curr = updated[index];
      const next = curr === 'PENDING' ? 'SCORED' : curr === 'SCORED' ? 'MISSED' : 'PENDING';
      updated[index] = next;
      setHomeKicks(updated);
      // Recount scored
      const count = updated.filter((k) => k === 'SCORED').length;
      setHomeScore(count);
    } else {
      const updated = [...awayKicks];
      const curr = updated[index];
      const next = curr === 'PENDING' ? 'SCORED' : curr === 'SCORED' ? 'MISSED' : 'PENDING';
      updated[index] = next;
      setAwayKicks(updated);
      // Recount scored
      const count = updated.filter((k) => k === 'SCORED').length;
      setAwayScore(count);
    }
  };

  // Add Sudden Death kick round
  const addSuddenDeathRound = () => {
    setHomeKicks((prev) => [...prev, 'PENDING']);
    setAwayKicks((prev) => [...prev, 'PENDING']);
  };

  const handleSave = async () => {
    if (!onSavePenalties) return;
    setIsSaving(true);
    try {
      await onSavePenalties(homeScore, awayScore);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConclude = async () => {
    if (homeScore === awayScore) {
      if (!window.confirm('نتیجه ضربات پنالتی در حال حاضر برابر است! آیا از ثبت تساوی مطمئنید؟ در جام حذفی باید حتماً یک برنده مشخص شود.')) {
        return;
      }
    }
    const winnerName = homeScore > awayScore ? homeName : (awayScore > homeScore ? awayName : 'تساوی');
    if (!window.confirm(`آیا از ثبت نهایی ضربات پنالتی (${homeScore} - ${awayScore}) به نفع تیم «${winnerName}» و صعود به مرحله بعدی اطمینان دارید؟`)) {
      return;
    }

    setIsConcluding(true);
    try {
      if (onConcludeMatchWithPenalties) {
        await onConcludeMatchWithPenalties(homeScore, awayScore);
      }
      onClose();
    } finally {
      setIsConcluding(false);
    }
  };

  const isTied = homeScore === awayScore;
  const leaderSide = homeScore > awayScore ? 'home' : (awayScore > homeScore ? 'away' : 'tied');

  return typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      {isMinimized ? (
        /* Minimized Floating Bar */
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 left-6 z-[99999] bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 border-2 border-amber-500/80 rounded-2xl p-3.5 shadow-2xl shadow-amber-950/80 flex items-center gap-3.5"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Trophy size={16} />
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-amber-300 font-bold block">پنل ثبت ضربات پنالتی</span>
            <span className="font-black text-white">
              {homeName} <strong className="text-amber-400 font-sport text-sm px-1.5">{homeScore} - {awayScore}</strong> {awayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
              title="بزرگ‌نمایی پنجره پنالتی"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition-all cursor-pointer"
              title="بستن"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        /* Full Modal */
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setIsMinimized(true)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-10 bg-slate-950 border-2 border-amber-500/50 rounded-3xl w-full max-w-3xl my-auto p-4 sm:p-6 shadow-2xl shadow-amber-950/40 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-600/30">
                  <Trophy size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/40 font-sport">
                      {match.round_name || 'جام حذفی'} • بازی #{match.id}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold animate-pulse">
                      ● ثبت ضربات پنالتی مسابقه
                    </span>
                  </div>
                  <h3 className="text-white font-black text-base sm:text-lg mt-0.5">
                    اتاق داوری: ثبت ضربه به ضربه و نتیجه پنالتی‌ها
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                  title="کوچک‌سازی به نوار شناور"
                >
                  <Minimize2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 transition-all cursor-pointer"
                  title="بستن"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Match State & Result Callout */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">نتیجه وقت قانونی و اضافه:</span>
                <span className="font-sport font-black text-sm px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-[#00ff87]">
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                </span>
                <span className="text-slate-400 text-[11px]">(تساوی رسمی)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-300">وضعیت پیشتازی:</span>
                {isTied ? (
                  <span className="text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-500/30 font-bold">
                    تساوی ({homeScore} - {awayScore})
                  </span>
                ) : (
                  <span className="text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-500/40 font-bold flex items-center gap-1">
                    <Check size={12} />
                    <span>برتری تیم {leaderSide === 'home' ? homeName : awayName} ({homeScore} - {awayScore})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Scoreboard Counters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Home Team Penalty Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                leaderSide === 'home'
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 p-1 shrink-0 flex items-center justify-center border border-slate-700">
                      {homeLogo ? <img src={homeLogo} alt={homeName} className="w-full h-full object-contain" /> : <Shield size={16} />}
                    </div>
                    <div className="truncate">
                      <span className="font-black text-white text-sm block truncate">{homeName}</span>
                      <span className="text-[10px] text-slate-400">میزبان</span>
                    </div>
                  </div>

                  {/* Numeric Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-sport font-black text-2xl text-amber-300 px-3.5 py-0.5 bg-slate-950 rounded-xl border border-amber-500/40 min-w-[50px] text-center shadow-inner">
                      {homeScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHomeScore(homeScore + 1)}
                      className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Kick-by-Kick Trackers */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] text-slate-400 block font-bold">روند ضربات پنالتی:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {homeKicks.map((status, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleKick('home', idx)}
                        className={`w-8 h-8 rounded-xl text-xs font-sport font-black flex items-center justify-center transition-all cursor-pointer border ${
                          status === 'SCORED'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60 scale-105'
                            : status === 'MISSED'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'
                        }`}
                        title={`ضربه ${idx + 1}: ${status === 'SCORED' ? 'گل' : status === 'MISSED' ? 'ناموفق' : 'نزده'}`}
                      >
                        {status === 'SCORED' ? '⚽' : status === 'MISSED' ? '❌' : idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Away Team Penalty Card */}
              <div className={`p-4 rounded-2xl border transition-all ${
                leaderSide === 'away'
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/90 border-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 p-1 shrink-0 flex items-center justify-center border border-slate-700">
                      {awayLogo ? <img src={awayLogo} alt={awayName} className="w-full h-full object-contain" /> : <Shield size={16} />}
                    </div>
                    <div className="truncate">
                      <span className="font-black text-white text-sm block truncate">{awayName}</span>
                      <span className="text-[10px] text-slate-400">میهمان</span>
                    </div>
                  </div>

                  {/* Numeric Stepper */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-sport font-black text-2xl text-amber-300 px-3.5 py-0.5 bg-slate-950 rounded-xl border border-amber-500/40 min-w-[50px] text-center shadow-inner">
                      {awayScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAwayScore(awayScore + 1)}
                      className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Kick-by-Kick Trackers */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <span className="text-[10px] text-slate-400 block font-bold">روند ضربات پنالتی:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {awayKicks.map((status, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleKick('away', idx)}
                        className={`w-8 h-8 rounded-xl text-xs font-sport font-black flex items-center justify-center transition-all cursor-pointer border ${
                          status === 'SCORED'
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/60 scale-105'
                            : status === 'MISSED'
                            ? 'bg-rose-600 text-white border-rose-400'
                            : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'
                        }`}
                        title={`ضربه ${idx + 1}: ${status === 'SCORED' ? 'گل' : status === 'MISSED' ? 'ناموفق' : 'نزده'}`}
                      >
                        {status === 'SCORED' ? '⚽' : status === 'MISSED' ? '❌' : idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sudden Death Add Button */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-400">
                💡 روی شماره هر ضربه کلیک کنید تا وضعیت آن تغییر کند: (⚽ گل شد / ❌ خراب شد).
              </span>
              <button
                type="button"
                onClick={addSuddenDeathRound}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus size={13} />
                <span>افزودن نوبت ضربه اضافه (Sudden Death)</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isConcluding}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره آنی ضربات پنالتی'}</span>
              </button>

              <button
                type="button"
                onClick={handleConclude}
                disabled={isSaving || isConcluding}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 size={16} />
                <span>{isConcluding ? 'در حال ثبت و صعود برنده...' : 'ثبت نهایی و صعود برنده مسابقه'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
