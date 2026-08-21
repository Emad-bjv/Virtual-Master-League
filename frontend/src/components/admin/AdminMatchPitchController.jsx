import React, { useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Shield, UserCheck, AlertCircle, RotateCcw, Plus, Minus, Undo2, Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { matchApi } from '../../services/api';

const INITIAL_TEAM_A = {
  name: 'تیم میزبان',
  color: 'from-purple-600 via-indigo-600 to-cyan-500',
  starters: [],
  bench: [],
};

const INITIAL_TEAM_B = {
  name: 'تیم میهمان',
  color: 'from-amber-500 via-yellow-500 to-amber-600',
  starters: [],
  bench: [],
};

export default function AdminMatchPitchController({
  onPushLiveEvent,
  onMatchStatusChange,
  matchId = 1,
  homeTeamName = 'تیم میزبان',
  awayTeamName = 'تیم میهمان',
  initialStartersHome = [],
  initialBenchHome = [],
  initialStartersAway = [],
  initialBenchAway = [],
}) {
  const [activeTeamKey, setActiveTeamKey] = useState('teamA');
  const [matchStatus, setMatchStatus] = useState('FIRST_HALF'); // 'SCHEDULED', 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED'
  const [teams, setTeams] = useState({
    teamA: {
      name: homeTeamName || INITIAL_TEAM_A.name,
      color: INITIAL_TEAM_A.color,
      starters: initialStartersHome.length > 0 ? initialStartersHome : INITIAL_TEAM_A.starters,
      bench: initialBenchHome.length > 0 ? initialBenchHome : INITIAL_TEAM_A.bench,
    },
    teamB: {
      name: awayTeamName || INITIAL_TEAM_B.name,
      color: INITIAL_TEAM_B.color,
      starters: initialStartersAway.length > 0 ? initialStartersAway : INITIAL_TEAM_B.starters,
      bench: initialBenchAway.length > 0 ? initialBenchAway : INITIAL_TEAM_B.bench,
    },
  });

  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
  const [activePitchPlayerModal, setActivePitchPlayerModal] = useState(null);
  const [subModalBenchSelect, setSubModalBenchSelect] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const currentTeam = teams[activeTeamKey] || teams.teamA;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const triggerLiveEvent = (text, icon, color, teamName) => {
    const ev = {
      id: Date.now(),
      type: 'ADMIN_EVENT',
      text,
      team: teamName,
      icon,
      color,
    };
    if (onPushLiveEvent) onPushLiveEvent(ev);
    showToast(text);
  };

  const handleSetMatchState = async (newStatus) => {
    let action = 'START_MATCH';
    if (newStatus === 'HALF_TIME') action = 'TRIGGER_HALF_TIME';
    else if (newStatus === 'SECOND_HALF') action = 'START_SECOND_HALF';
    else if (newStatus === 'FINISHED') action = 'CONCLUDE_FULL_TIME';

    try {
      await matchApi.controlMatch(matchId, { action });
    } catch (err) {
      console.warn('API Error, proceeding with optimistic UI update', err);
    }

    setMatchStatus(newStatus);
    if (onMatchStatusChange) onMatchStatusChange(newStatus);

    let text = '';
    let icon = '📢';
    let color = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';

    if (newStatus === 'FIRST_HALF') {
      text = 'مسابقه رسماً با سوت داور آغاز شد! ⚽';
      icon = '⚽';
      color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    } else if (newStatus === 'HALF_TIME') {
      text = 'سوت پایان نیمه اول توسط داور به صدا درآمد! ⏸️ استراحت ۳۰ ثانیه‌ای بین دو نیمه برای مربیان آغاز شد.';
      icon = '⏸️';
      color = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    } else if (newStatus === 'SECOND_HALF') {
      text = 'نیمه دوم مسابقه با سوت داور آغاز گردید! ▶️ تاکتیک‌ها قفل شدند.';
      icon = '▶️';
      color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
    } else if (newStatus === 'FINISHED') {
      text = 'سوت پایان بازی توسط داور زده شد! ⏹️ مسابقه به پایان رسید.';
      icon = '⏹️';
      color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
    }

    triggerLiveEvent(text, icon, color, 'سیستم داوری');
  };

  // Flow B: Click Bench player first
  const handleSelectBenchPlayer = (bPlayer) => {
    if (bPlayer.hasBeenSubbed) {
      showToast(`بازیکن ${bPlayer.name} قبلا تعویض و از زمین خارج شده است.`);
      return;
    }

    if (selectedBenchPlayer?.id === bPlayer.id) {
      setSelectedBenchPlayer(null);
    } else {
      setSelectedBenchPlayer(bPlayer);
    }
  };

  // Flow A or B: Click Player on Pitch
  const handlePitchPlayerClick = (pPlayer) => {
    if (selectedBenchPlayer) {
      if (pPlayer.isRed) {
        showToast(`بازیکن اخراج شده (${pPlayer.name}) امکان تعویض ندارد! 🚫`);
        return;
      }
      executeSubstitution(pPlayer, selectedBenchPlayer);
      setSelectedBenchPlayer(null);
      return;
    }

    setActivePitchPlayerModal(pPlayer);
    setSubModalBenchSelect(false);
  };

  // Execute Swap between starter & bench player
  const executeSubstitution = async (outPlayer, inPlayer) => {
    if (outPlayer.isRed) {
      showToast(`بازیکن اخراج شده (${outPlayer.name}) امکان تعویض ندارد! 🚫`);
      return;
    }

    try {
      const teamId = activeTeamKey === 'teamA' ? 1 : 2;
      await matchApi.applySubstitution(matchId, {
        team_id: teamId,
        player_out: outPlayer.id,
        player_in: inPlayer.id,
        minute: 60,
      });
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'خطا در ثبت تعویض در سرور';
      showToast(errMsg + ' ❌');
      return;
    }

    const updatedStarters = (currentTeam.starters || []).map((p) => {
      if (p.id === outPlayer.id) {
        return {
          ...inPlayer,
          x: outPlayer.x,
          y: outPlayer.y,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          isRed: false,
          isInjured: false,
          hasBeenSubbed: false,
        };
      }
      return p;
    });

    const updatedBench = (currentTeam.bench || []).map((b) => {
      if (b.id === inPlayer.id) {
        return {
          ...outPlayer,
          hasBeenSubbed: true,
        };
      }
      return b;
    });

    setTeams((prev) => ({
      ...prev,
      [activeTeamKey]: {
        ...currentTeam,
        starters: updatedStarters,
        bench: updatedBench,
      },
    }));

    const eventText = `تعویض تاکتیکی زنده (${currentTeam.name}): ورود ${inPlayer.name} (${inPlayer.position}) به جای ${outPlayer.name} (${outPlayer.position}) 🔄`;
    triggerLiveEvent(eventText, '🔄', 'text-purple-400 border-purple-500/40 bg-purple-950/40', currentTeam.name);

    setActivePitchPlayerModal(null);
    setSubModalBenchSelect(false);
  };

  // Incremental & Decremental Goals & Assists Control
  const handleModifyStatCount = async (statType, delta) => {
    if (!activePitchPlayerModal) return;
    const targetId = activePitchPlayerModal.id;

    try {
      if (delta > 0) {
        await matchApi.recordEvent(matchId, {
          player: targetId,
          event_type: statType,
          minute: 45,
        });
      }
    } catch (err) {
      console.warn('API Error, proceeding with optimistic UI update', err);
    }

    let text = '';
    let icon = '⚽';
    let color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';

    const updatedStarters = (currentTeam.starters || []).map((p) => {
      if (p.id !== targetId) return p;

      let updated = { ...p };

      if (statType === 'GOAL') {
        const newCount = Math.max(0, (updated.goals || 0) + delta);
        updated.goals = newCount;
        icon = '⚽';
        color = delta > 0 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' : 'text-amber-400 border-amber-500/40 bg-amber-950/40';
        text = delta > 0
          ? `ثبت گل برای ${p.name} (${currentTeam.name}) ⚽ (مجموع: ${newCount} گل)`
          : `کاهش / اصلاح گل برای ${p.name} (${currentTeam.name}) ⚽ (مجموع: ${newCount} گل)`;
      } else if (statType === 'ASSIST') {
        const newCount = Math.max(0, (updated.assists || 0) + delta);
        updated.assists = newCount;
        icon = '🅰️';
        color = delta > 0 ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40' : 'text-amber-400 border-amber-500/40 bg-amber-950/40';
        text = delta > 0
          ? `ثبت پاس گل توسط ${p.name} (${currentTeam.name}) 🅰️ (مجموع: ${newCount} پاس)`
          : `کاهش / اصلاح پاس گل برای ${p.name} (${currentTeam.name}) 🅰️ (مجموع: ${newCount} پاس)`;
      }

      setActivePitchPlayerModal(updated);
      return updated;
    });

    setTeams((prev) => ({
      ...prev,
      [activeTeamKey]: {
        ...currentTeam,
        starters: updatedStarters,
      },
    }));

    triggerLiveEvent(text, icon, color, currentTeam.name);
  };

  // Toggle & Undo Cards / Injury Events
  const handleToggleCardOrInjury = async (actionType) => {
    if (!activePitchPlayerModal) return;
    const targetId = activePitchPlayerModal.id;

    try {
      let event_type = null;
      if (actionType === 'TOGGLE_YELLOW_1' || actionType === 'TOGGLE_YELLOW_2') event_type = 'YELLOW';
      if (actionType === 'TOGGLE_RED') event_type = 'RED';
      if (actionType === 'TOGGLE_INJURY') event_type = 'INJURY';

      if (event_type) {
        await matchApi.recordEvent(matchId, {
          player: targetId,
          event_type: event_type,
          minute: 45,
        });
      }
    } catch (err) {
      console.warn('API Error, proceeding with optimistic UI update', err);
    }

    let icon = '🟨';
    let color = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    let text = '';

    const updatedStarters = (currentTeam.starters || []).map((p) => {
      if (p.id !== targetId) return p;

      let updated = { ...p };

      if (actionType === 'TOGGLE_YELLOW_1') {
        if (updated.yellowCards === 1) {
          updated.yellowCards = 0;
          icon = '🔄';
          color = 'text-slate-300 border-slate-700 bg-slate-900';
          text = `لغو کارت زرد اول برای ${p.name} (${currentTeam.name}) 🔄`;
        } else {
          updated.yellowCards = 1;
          icon = '🟨';
          color = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
          text = `کارت زرد اول برای ${p.name} (${currentTeam.name}) 🟨`;
        }
      } else if (actionType === 'TOGGLE_YELLOW_2') {
        if (updated.yellowCards === 2) {
          updated.yellowCards = 1;
          updated.isRed = false;
          icon = '🔄';
          color = 'text-slate-300 border-slate-700 bg-slate-900';
          text = `لغو کارت زرد دوم و اخراج برای ${p.name} (${currentTeam.name}) 🔄`;
        } else {
          updated.yellowCards = 2;
          updated.isRed = true;
          icon = '🟨🟨 🟥';
          color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
          text = `کارت زرد دوم و اخراج از زمین برای ${p.name} (${currentTeam.name}) 🟨🟨 🟥`;
        }
      } else if (actionType === 'TOGGLE_RED') {
        if (updated.isRed) {
          updated.isRed = false;
          icon = '🔄';
          color = 'text-slate-300 border-slate-700 bg-slate-900';
          text = `لغو کارت قرمز مستقیم برای ${p.name} (${currentTeam.name}) 🔄`;
        } else {
          updated.isRed = true;
          icon = '🟥';
          color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
          text = `کارت قرمز مستقیم و اخراج برای ${p.name} (${currentTeam.name}) 🟥`;
        }
      } else if (actionType === 'TOGGLE_INJURY') {
        if (updated.isInjured) {
          updated.isInjured = false;
          icon = '🩹';
          color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
          text = `بهبودی و لغو مصدومیت برای ${p.name} (${currentTeam.name}) 🩹`;
        } else {
          updated.isInjured = true;
          icon = '🚑';
          color = 'text-rose-300 border-rose-500/40 bg-rose-950/60';
          text = `ثبت مصدومیت و خروج از زمین برای ${p.name} (${currentTeam.name}) 🚑`;
        }
      }

      setActivePitchPlayerModal(updated);
      return updated;
    });

    setTeams((prev) => ({
      ...prev,
      [activeTeamKey]: {
        ...currentTeam,
        starters: updatedStarters,
      },
    }));

    triggerLiveEvent(text, icon, color, currentTeam.name);
  };

  return (
    <div className="space-y-4 font-sans dir-rtl text-xs">
      {/* ADMIN MATCH PERIOD CONTROL PANEL */}
      <div className="glass-panel p-4 rounded-3xl border border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-slate-900 to-purple-950/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-right">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
          <div>
            <h3 className="font-black text-white text-sm">پنل مدیریت زمان و وضعیت مسابقه (داور / ادمین)</h3>
            <p className="text-[11px] text-slate-300">
              وضعیت فعلی: <span className="font-bold text-cyan-300">
                {matchStatus === 'FIRST_HALF' ? 'نیمه اول' : matchStatus === 'HALF_TIME' ? 'استراحت بین دو نیمه (۳۰ ثانیه)' : matchStatus === 'SECOND_HALF' ? 'نیمه دوم' : 'پایان یافته'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleSetMatchState('FIRST_HALF')}
            disabled={matchStatus === 'FIRST_HALF'}
            className="flex-1 md:flex-none bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <span>⚽ شروع بازی (نیمه اول)</span>
          </button>

          <button
            onClick={() => handleSetMatchState('HALF_TIME')}
            disabled={matchStatus === 'HALF_TIME' || matchStatus === 'FINISHED'}
            className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <span>⏸️ پایان نیمه اول (استراحت ۳۰s)</span>
          </button>

          <button
            onClick={() => handleSetMatchState('SECOND_HALF')}
            disabled={matchStatus === 'SECOND_HALF' || matchStatus === 'FINISHED'}
            className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <span>▶️ شروع نیمه دوم</span>
          </button>

          <button
            onClick={() => handleSetMatchState('FINISHED')}
            disabled={matchStatus === 'FINISHED'}
            className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <span>⏹️ پایان کامل بازی</span>
          </button>
        </div>
      </div>

      {/* TOP TEAM SWITCHER TOGGLE BAR */}
      <div className="glass-panel p-3 rounded-3xl border border-cyan-500/40 bg-slate-900/90 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-cyan-400 animate-pulse" />
          <span className="font-black text-white text-xs sm:text-sm">کنترل زنده ترکیب ۱۱ نفره دو تیم</span>
        </div>

        {/* Team Tabs Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              setActiveTeamKey('teamA');
              setSelectedBenchPlayer(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTeamKey === 'teamA'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg border border-purple-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>{teams.teamA.name}</span>
          </button>

          <button
            onClick={() => {
              setActiveTeamKey('teamB');
              setSelectedBenchPlayer(null);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTeamKey === 'teamB'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-lg border border-amber-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>{teams.teamB.name}</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-emerald-300 font-bold bg-emerald-950/90 p-3 rounded-2xl border border-emerald-500/50 text-center shadow-xl flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* BENCH PRE-SELECTION INSTRUCTION BANNER (Flow B) */}
      {selectedBenchPlayer && (
        <div className="bg-gradient-to-r from-cyan-950 via-purple-950 to-slate-900 border-2 border-cyan-400 p-3 rounded-2xl text-center text-cyan-200 font-bold shadow-2xl animate-pulse flex items-center justify-center gap-2">
          <AlertCircle size={18} className="text-cyan-400" />
          <span>
            بازیکن ذخیره «<span className="text-white font-black">{selectedBenchPlayer.name} ({selectedBenchPlayer.position})</span>» انتخاب شد. اکنون روی هر بازیکنی که در زمین چمن است کلیک کنید تا تعویض انجام شود!
          </span>
          <button
            onClick={() => setSelectedBenchPlayer(null)}
            className="mr-2 bg-slate-800 text-rose-300 px-2 py-0.5 rounded-lg text-[10px] hover:bg-slate-700 cursor-pointer"
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {/* STARTING XI PLAYERS CONTAINER */}
      <div className="glass-panel p-4 rounded-3xl border border-cyan-500/30 space-y-3 bg-slate-900/90 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Shield size={16} className="text-cyan-400" />
            <span>ترکیب اصلی داخل زمین (Starting XI - ۱۱ بازیکن)</span>
          </span>
          <span className="text-[10px] text-slate-400">
            جهت ثبت گل، کارت، مصدومیت یا تعویض روی بازیکن کلیک کنید
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(currentTeam.starters || []).map((player) => (
            <button
              key={player.id}
              onClick={() => handlePitchPlayerClick(player)}
              className={`p-3 rounded-2xl border flex items-center justify-between text-right transition-all group hover:scale-[1.01] active:scale-95 cursor-pointer ${
                player.isRed
                  ? 'bg-rose-950/80 border-2 border-rose-600 text-rose-200 opacity-50 grayscale'
                  : player.isInjured
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : selectedBenchPlayer
                  ? 'bg-cyan-950/90 border-cyan-400 text-white animate-pulse ring-2 ring-cyan-400'
                  : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/60 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-2 py-1 rounded-md shrink-0">
                  {player.position}
                </span>
                <div>
                  <span className={`font-bold text-xs block ${player.isRed ? 'line-through' : ''}`}>
                    {player.name}
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono font-bold">OVR {player.overall || 75}</span>
                </div>
              </div>

              {/* Stat Badges */}
              <div className="flex items-center gap-1">
                {player.goals > 0 && <span className="text-xs bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono">⚽ {player.goals}</span>}
                {player.assists > 0 && <span className="text-xs bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/40 font-mono">🅰️ {player.assists}</span>}
                {player.yellowCards === 1 && <span className="text-xs">🟨</span>}
                {player.yellowCards === 2 && <span className="text-xs">🟨🟨</span>}
                {player.isRed && <span className="text-xs">🟥</span>}
                {player.isInjured && <span className="text-xs">🚑</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* BENCH PLAYERS CONTAINER BELOW THE PITCH */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 space-y-2.5 bg-slate-900/80">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <UserCheck size={16} className="text-purple-400" />
            <span>نیمکت ذخیره تیم «{currentTeam.name}» ({(currentTeam.bench || []).length} بازیکن)</span>
          </span>
          <span className="text-[10px] text-slate-400">
            جهت تعویض سریع روی بازیکن کلیک کنید
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(currentTeam.bench || []).map((bPlayer) => {
            const isSelected = selectedBenchPlayer?.id === bPlayer.id;
            const isDimmed = selectedBenchPlayer && !isSelected;
            const isSubbedOff = bPlayer.hasBeenSubbed;

            return (
              <div
                key={bPlayer.id}
                onClick={() => handleSelectBenchPlayer(bPlayer)}
                className={`p-2 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all relative overflow-hidden ${
                  isSubbedOff
                    ? 'bg-slate-950/80 border-slate-800/60 opacity-40 grayscale cursor-not-allowed'
                    : isSelected
                    ? 'bg-gradient-to-r from-purple-900 to-indigo-900 border-2 border-cyan-400 text-white shadow-lg scale-105'
                    : isDimmed
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-purple-500/50 text-slate-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[8.5px] font-black bg-purple-950 text-purple-300 px-1 py-0.5 rounded">
                    {bPlayer.position}
                  </span>
                  <span className="font-mono text-[9.5px] text-purple-300 font-bold">OVR {bPlayer.overall || 70}</span>
                </div>

                <div className="my-1">
                  <span className="font-bold text-[11px] text-white block truncate">{bPlayer.name}</span>
                </div>

                {/* Status Badges */}
                <div className="flex items-center justify-between text-[9px]">
                  {isSubbedOff ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-950/60 px-1 py-0.5 rounded border border-rose-500/30">
                      <RotateCcw size={9} /> تعویض 🔄
                    </span>
                  ) : isSelected ? (
                    <span className="text-cyan-300 font-bold bg-cyan-950 px-1 py-0.5 rounded">
                      آماده تعویض ⚡
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-500/30">
                      آماده ورود
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADVANCED FAST EVENT MODAL WITH RED CARD SUBSTITUTION PROTECTION */}
      {activePitchPlayerModal && (
        <div className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel p-5 rounded-3xl border border-cyan-500/50 space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-2.5 flex justify-between items-center">
              <div>
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <span>مدیریت سریع اتفاقات و آماری بازیکن</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded font-mono">
                    {activePitchPlayerModal.position}
                  </span>
                </h4>
                <p className="text-[11px] text-cyan-300 mt-0.5 font-bold">
                  {activePitchPlayerModal.name} ({currentTeam.name})
                </p>
              </div>

              <button
                onClick={() => setActivePitchPlayerModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!subModalBenchSelect ? (
              <div className="space-y-3">
                {/* 1. INCREMENTAL & DECREMENTAL GOALS & ASSISTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Goals Counter */}
                  <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-300 flex items-center gap-1">⚽ گل‌های بازیکن</span>
                      <span className="bg-emerald-900 text-white px-2 py-0.5 rounded font-mono font-bold">
                        {activePitchPlayerModal.goals || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModifyStatCount('GOAL', 1)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus size={14} /> افزایش گل
                      </button>
                      <button
                        onClick={() => handleModifyStatCount('GOAL', -1)}
                        disabled={(activePitchPlayerModal.goals || 0) <= 0}
                        className="bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-emerald-200 font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus size={14} /> کسر
                      </button>
                    </div>
                  </div>

                  {/* Assists Counter */}
                  <div className="p-3 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300 flex items-center gap-1">🅰️ پاس‌گل‌ها</span>
                      <span className="bg-cyan-900 text-white px-2 py-0.5 rounded font-mono font-bold">
                        {activePitchPlayerModal.assists || 0}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModifyStatCount('ASSIST', 1)}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus size={14} /> افزایش پاس
                      </button>
                      <button
                        onClick={() => handleModifyStatCount('ASSIST', -1)}
                        disabled={(activePitchPlayerModal.assists || 0) <= 0}
                        className="bg-cyan-900/80 hover:bg-cyan-800 disabled:opacity-40 text-cyan-200 font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Minus size={14} /> کسر
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. CARDS & INJURY TOGGLE & UNDO BUTTONS */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Yellow 1 */}
                  <button
                    onClick={() => handleToggleCardOrInjury('TOGGLE_YELLOW_1')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all active:scale-95 cursor-pointer ${
                      activePitchPlayerModal.yellowCards >= 1
                        ? 'bg-amber-900/80 border-amber-400 text-white'
                        : 'bg-amber-950/60 hover:bg-amber-900/60 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <span>🟨 کارت زرد اول</span>
                    {activePitchPlayerModal.yellowCards >= 1 ? (
                      <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
                        <Undo2 size={10} /> لغو
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-900 px-2 py-0.5 rounded">ثبت</span>
                    )}
                  </button>

                  {/* Yellow 2 */}
                  <button
                    onClick={() => handleToggleCardOrInjury('TOGGLE_YELLOW_2')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all active:scale-95 cursor-pointer ${
                      activePitchPlayerModal.yellowCards === 2
                        ? 'bg-rose-950/90 border-rose-400 text-white'
                        : 'bg-amber-950/60 hover:bg-rose-900/50 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <span>🟨🟨 زرد دوم (اخراج)</span>
                    {activePitchPlayerModal.yellowCards === 2 ? (
                      <span className="text-[10px] bg-rose-900 text-rose-200 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1">
                        <Undo2 size={10} /> لغو
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-900 px-2 py-0.5 rounded">ثبت</span>
                    )}
                  </button>

                  {/* Red Direct */}
                  <button
                    onClick={() => handleToggleCardOrInjury('TOGGLE_RED')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all active:scale-95 cursor-pointer ${
                      activePitchPlayerModal.isRed
                        ? 'bg-rose-950/90 border-rose-400 text-white'
                        : 'bg-rose-950/60 hover:bg-rose-900/60 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <span>🟥 کارت قرمز مستقیم</span>
                    {activePitchPlayerModal.isRed ? (
                      <span className="text-[10px] bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                        <Undo2 size={10} /> لغو
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-900 px-2 py-0.5 rounded">ثبت</span>
                    )}
                  </button>

                  {/* Injury */}
                  <button
                    onClick={() => handleToggleCardOrInjury('TOGGLE_INJURY')}
                    className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all active:scale-95 cursor-pointer ${
                      activePitchPlayerModal.isInjured
                        ? 'bg-rose-950/90 border-rose-400 text-white'
                        : 'bg-rose-900/60 hover:bg-rose-800/60 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <span>🚑 ثبت مصدومیت</span>
                    {activePitchPlayerModal.isInjured ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
                        <Undo2 size={10} /> لغو / بهبودی
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-950 px-2 py-0.5 rounded">ثبت</span>
                    )}
                  </button>
                </div>

                {/* SUBSTITUTION BUTTON WITH RED CARD PROTECTION */}
                {activePitchPlayerModal.isRed ? (
                  <div className="w-full mt-2 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <Ban size={16} className="text-rose-400" />
                    <span>بازیکن اخراج شده امکان تعویض ندارد 🚫</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setSubModalBenchSelect(true)}
                    className="w-full mt-2 p-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <ArrowLeftRight size={16} />
                    <span>انجام تعویض (انتخاب از لیست رختکن / نیمکت) 🔄</span>
                  </button>
                )}
              </div>
            ) : (
              /* Bench Selector Mode inside Modal */
              <div className="space-y-3">
                <span className="text-slate-300 font-bold block">
                  انتخاب بازیکن جایگزین از نیمکت برای تعویض با «{activePitchPlayerModal.name}»:
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {(currentTeam.bench || [])
                    .filter((b) => !b.hasBeenSubbed)
                    .map((bPlayer) => (
                      <div
                        key={bPlayer.id}
                        onClick={() => executeSubstitution(activePitchPlayerModal, bPlayer)}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 cursor-pointer flex justify-between items-center transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded">
                            {bPlayer.position}
                          </span>
                          <span className="font-bold text-white">{bPlayer.name}</span>
                        </div>
                        <span className="font-mono text-cyan-300 font-bold">OVR {bPlayer.overall || 70}</span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => setSubModalBenchSelect(false)}
                  className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-xl cursor-pointer hover:bg-slate-700"
                >
                  بازگشت به گزینه اتفاقات
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
