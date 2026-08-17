import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertCircle, ArrowLeftRight, User, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../common/CustomSelect';
import { getTeamLogoUrl } from '../../utils/teamLogos';

// Color map for position badges matching eFootball standard (13 official positions)
const POSITION_COLORS = {
  GK: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black',
  CB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  LB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  RB: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold',
  DMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  CMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  AMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  LMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  RMF: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold',
  LWF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  RWF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  SS: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
  CF: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold',
};

// Tactical Descriptions for exact 13 standard pitch positions
export const POSITION_INFO = {
  GK: { title: 'دروازه‌بان', englishTitle: 'Goalkeeper', desc: 'محافظ اصلی دروازه که وظیفه مهار شوت‌ها، جمع کردن ارسال‌ها و هدایت خط دفاعی را بر عهده دارد.' },
  CB: { title: 'مدافع وسط', englishTitle: 'Center Back', desc: 'مسئول پوشش عمق خط دفاعی، نبردهای هوایی، تکل‌زنی و مهار مهاجمان مرکزی حریف.' },
  LB: { title: 'مدافع چپ', englishTitle: 'Left Back', desc: 'مسئول مهار بال‌های راست حریف و نفوذ از جناح چپ برای اضافه شدن به حملات و ارسال سانتر.' },
  RB: { title: 'مدافع راست', englishTitle: 'Right Back', desc: 'مسئول مهار بال‌های چپ حریف و نفوذ از جناح راست برای باز کردن عرض بازی در حمله.' },
  DMF: { title: 'هافبک دفاعی', englishTitle: 'Defensive Midfielder', desc: 'تخریب‌کننده بازی حریف در جلوی مدافعان، قطع پاس‌ها و شروع‌کننده بازیسازی از عقب.' },
  CMF: { title: 'هافبک مرکزی', englishTitle: 'Central Midfielder', desc: 'موتور تیم در میانه زمین برای اتصال دفاع به حمله، کنترل ریتم بازی و پاسکاری‌های مداوم.' },
  LMF: { title: 'هافبک چپ', englishTitle: 'Left Midfielder', desc: 'مسئول بازیسازی و حرکت در عرض از جناح چپ، پشتیبانی از مدافع چپ و ارسال روی دروازه.' },
  RMF: { title: 'هافبک راست', englishTitle: 'Right Midfielder', desc: 'مسئول بازیسازی و حرکت در عرض از جناح راست، پشتیبانی از مدافع راست و ارسال روی دروازه.' },
  AMF: { title: 'هافبک تهاجمی', englishTitle: 'Attacking Midfielder', desc: 'طراح اصلی گل‌ها، بازیساز پشت مهاجمان، دادن پاس‌های کلیدی و شوت‌زنی از پشت محوطه.' },
  LWF: { title: 'بال تهاجمی چپ', englishTitle: 'Left Wing Forward', desc: 'مهاجم کناری با سرعت و تکنیک بالا برای دور زدن مدافعان، نفوذ به داخل محوطه و شوت‌زنی یا پاس کات‌بک.' },
  RWF: { title: 'بال تهاجمی راست', englishTitle: 'Right Wing Forward', desc: 'مهاجم کناری با سرعت و تکنیک بالا برای دور زدن مدافعان، نفوذ به داخل محوطه و شوت‌زنی یا پاس کات‌بک.' },
  SS: { title: 'مهاجم دوم', englishTitle: 'Second Striker', desc: 'بازیکنی آزاد و زهرآگین که در فضاهای خالی بین هافبک‌ها و مهاجم هدف حرکت کرده و موقعیت‌سازی یا گلزنی می‌کند.' },
  CF: { title: 'مهاجم هدف (نوک)', englishTitle: 'Center Forward', desc: 'گلزن اصلی تیم، مسئول ضربات تمام‌کننده، حفظ توپ تحت فشار و سرزنی در محوطه جریمه.' },
};

// 14 Tactical Formations Presets
export const FORMATION_PRESETS = {
  '4-5-1 (4-2-3-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 56 },
    { pos: 'DMF', x: 65, y: 56 },
    { pos: 'LWF', x: 20, y: 36 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'RWF', x: 80, y: 36 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-5-1 (4-1-4-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'LMF', x: 18, y: 40 },
    { pos: 'CMF', x: 38, y: 42 },
    { pos: 'CMF', x: 62, y: 42 },
    { pos: 'RMF', x: 82, y: 40 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-5-1 (4-3-2-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'CMF', x: 28, y: 55 },
    { pos: 'CMF', x: 50, y: 58 },
    { pos: 'CMF', x: 72, y: 55 },
    { pos: 'AMF', x: 36, y: 35 },
    { pos: 'AMF', x: 64, y: 35 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-4-2 (4-2-2-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 55 },
    { pos: 'DMF', x: 65, y: 55 },
    { pos: 'AMF', x: 22, y: 36 },
    { pos: 'AMF', x: 78, y: 36 },
    { pos: 'SS', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '4-4-2 (4-3-1-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 62 },
    { pos: 'CMF', x: 30, y: 48 },
    { pos: 'CMF', x: 70, y: 48 },
    { pos: 'AMF', x: 50, y: 34 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '4-3-3 (4-1-2-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'AMF', x: 35, y: 42 },
    { pos: 'AMF', x: 65, y: 42 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '4-3-3 (4-2-1-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'DMF', x: 35, y: 56 },
    { pos: 'CMF', x: 65, y: 56 },
    { pos: 'AMF', x: 50, y: 38 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '3-6-1 (3-2-4-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 38, y: 58 },
    { pos: 'DMF', x: 62, y: 58 },
    { pos: 'LMF', x: 15, y: 38 },
    { pos: 'AMF', x: 38, y: 35 },
    { pos: 'AMF', x: 62, y: 35 },
    { pos: 'RMF', x: 85, y: 38 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '3-5-2 (3-2-3-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 38, y: 58 },
    { pos: 'DMF', x: 62, y: 58 },
    { pos: 'LMF', x: 15, y: 40 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'RMF', x: 85, y: 40 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-5-2 (3-3-2-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'DMF', x: 50, y: 60 },
    { pos: 'CMF', x: 28, y: 52 },
    { pos: 'CMF', x: 72, y: 52 },
    { pos: 'AMF', x: 38, y: 35 },
    { pos: 'AMF', x: 62, y: 35 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '3-4-3 (3-2-2-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'CMF', x: 38, y: 56 },
    { pos: 'CMF', x: 62, y: 56 },
    { pos: 'AMF', x: 22, y: 36 },
    { pos: 'AMF', x: 78, y: 36 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '5-4-1 (5-2-2-1)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 38, y: 50 },
    { pos: 'CMF', x: 62, y: 50 },
    { pos: 'AMF', x: 32, y: 32 },
    { pos: 'AMF', x: 68, y: 32 },
    { pos: 'CF', x: 50, y: 15 },
  ],
  '5-3-2 (5-2-1-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 38, y: 52 },
    { pos: 'CMF', x: 62, y: 52 },
    { pos: 'AMF', x: 50, y: 36 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
  '5-3-2 (5-3-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 12, y: 68 },
    { pos: 'CB', x: 30, y: 76 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 70, y: 76 },
    { pos: 'RB', x: 88, y: 68 },
    { pos: 'CMF', x: 28, y: 48 },
    { pos: 'DMF', x: 50, y: 52 },
    { pos: 'CMF', x: 72, y: 48 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
  ],
};

export const FORMATION_OPTIONS = Object.keys(FORMATION_PRESETS).map((f) => ({
  value: f,
  label: f,
}));

// Default empty lineups (populated from API)
const DEFAULT_STARTING_XI = [];
const DEFAULT_SUBSTITUTES = [];
const DEFAULT_RESERVES = [];

export default function EFootballGamePlan({
  teamName = 'تیم شما',
  formation: initialFormationProp = '4-3-3 (4-2-1-3)',
  readOnly = false,
  hideReserves = false,
  initialStartingXi = DEFAULT_STARTING_XI,
  initialSubstitutes = DEFAULT_SUBSTITUTES,
  initialReserves = DEFAULT_RESERVES,
  onFormationChange,
  onLineupChange,
  isLiveMode = false,
  matchState = 'FIRST_HALF', // 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED'
  halfTimeSeconds = 30,
  subsUsed = 0,
  maxSubs = 5,
  onSave,
  isAdminMode = false,
  onPushLiveEvent,
}) {
  // Helper to match DB short formations (e.g. '4-3-3') to full presets (e.g. '4-3-3 (4-2-1-3)')
  const getResolvedFormation = (form) => {

    if (FORMATION_PRESETS[form]) return form;
    if (form) {
      const match = Object.keys(FORMATION_PRESETS).find(f => f.startsWith(form));
      if (match) return match;
    }
    return '4-3-3 (4-2-1-3)';
  };

  // Helper to intelligently match players to tactical slots based on their natural position
  const matchPlayersToFormation = (players, preset) => {
    if (!preset) return players;
    const unassignedPlayers = [...players];
    const availableSlots = [...preset];
    const newXi = new Array(players.length).fill(null);

    // Pass 1: Exact Natural Position Match
    for (let i = 0; i < availableSlots.length; i++) {
      if (availableSlots[i] === null) continue;
      const targetPos = availableSlots[i].pos;
      const playerIndex = unassignedPlayers.findIndex(
        p => p && (p.naturalPosition || p.position) === targetPos
      );

      if (playerIndex !== -1) {
        newXi[i] = {
          ...unassignedPlayers[playerIndex],
          naturalPosition: unassignedPlayers[playerIndex].naturalPosition || unassignedPlayers[playerIndex].position,
          position: targetPos,
          x_coord: availableSlots[i].x,
          y_coord: availableSlots[i].y,
        };
        unassignedPlayers[playerIndex] = null;
        availableSlots[i] = null;
      }
    }

    // Pass 2: Fill remaining slots with remaining players
    for (let i = 0; i < availableSlots.length; i++) {
      if (availableSlots[i] !== null) {
        const playerIndex = unassignedPlayers.findIndex(p => p !== null);
        if (playerIndex !== -1) {
          newXi[i] = {
            ...unassignedPlayers[playerIndex],
            naturalPosition: unassignedPlayers[playerIndex].naturalPosition || unassignedPlayers[playerIndex].position,
            position: availableSlots[i].pos,
            x_coord: availableSlots[i].x,
            y_coord: availableSlots[i].y,
          };
          unassignedPlayers[playerIndex] = null;
        }
      }
    }
    
    // Fallback for any leftovers
    return newXi.map((p, idx) => p || { ...players[idx], naturalPosition: players[idx].naturalPosition || players[idx].position });
  };

  const resolvedInitialFormation = getResolvedFormation(initialFormationProp);
  const [currentFormation, setCurrentFormation] = useState(resolvedInitialFormation);

  const [startingXi, setStartingXi] = useState(() => {
    const preset = FORMATION_PRESETS[resolvedInitialFormation];
    // If any player lacks valid coordinates, auto-layout the entire squad
    const needsAutoLayout = initialStartingXi.some(p => p.x_coord == null || p.y_coord == null || (p.x_coord === 0 && p.y_coord === 0));
    
    if (!needsAutoLayout) {
      return initialStartingXi.map(p => ({
        ...p,
        naturalPosition: p.naturalPosition || p.position,
      }));
    }

    return matchPlayersToFormation(initialStartingXi, preset);
  });
  const [substitutes, setSubstitutes] = useState(() =>
    initialSubstitutes.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position }))
  );
  const [reserves, setReserves] = useState(() =>
    initialReserves.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position }))
  );

  // Sync formation prop changes if any
  useEffect(() => {
    const resolved = getResolvedFormation(initialFormationProp);
    if (resolved && resolved !== currentFormation) {
      handleFormationChange(resolved, false);
    }
  }, [initialFormationProp]);

  // Sync squad props when loaded asynchronously
  useEffect(() => {
    if (initialStartingXi && initialStartingXi.length > 0) {
      const preset = FORMATION_PRESETS[getResolvedFormation(initialFormationProp)];
      const needsAutoLayout = initialStartingXi.some(p => p.x_coord == null || p.y_coord == null || (p.x_coord === 0 && p.y_coord === 0));
      if (!needsAutoLayout) {
        setStartingXi(initialStartingXi.map(p => ({
          ...p,
          naturalPosition: p.naturalPosition || p.position,
        })));
      } else if (preset) {
        setStartingXi(matchPlayersToFormation(initialStartingXi, preset));
      }
    }
  }, [initialStartingXi]);

  useEffect(() => {
    if (initialSubstitutes) {
      setSubstitutes(initialSubstitutes.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position })));
    }
  }, [initialSubstitutes]);

  useEffect(() => {
    if (initialReserves) {
      setReserves(initialReserves.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position })));
    }
  }, [initialReserves]);

  // Interactive Swap & Admin Event Modal States
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState(null);
  const [adminModalPlayer, setAdminModalPlayer] = useState(null);
  const [subModalBenchSelect, setSubModalBenchSelect] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const isTacticsDisabled = isLiveMode && matchState !== 'HALF_TIME';

  // Change Formation Handler
  const handleFormationChange = (newFormation, notify = true) => {
    if (isTacticsDisabled && notify) {
      showNotification('تغییر تاکتیک کلی در جریان بازی قفل است. فقط در زمان استراحت مجاز است.');
      return;
    }
    const preset = FORMATION_PRESETS[newFormation];
    if (!preset) return;

    setCurrentFormation(newFormation);
    const updatedXi = matchPlayersToFormation(startingXi, preset);
    setStartingXi(updatedXi);

    if (notify) {
      showNotification(`چیدمان تیمی به ${newFormation} تغییر یافت.`);
    }
    if (onFormationChange) {
      onFormationChange(newFormation);
    }
    if (onLineupChange) {
      onLineupChange({ startingXi: updatedXi, substitutes, reserves, formation: newFormation });
    }
  };

  // Admin Quick Event Handlers
  const handleAdminGoal = () => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    const newGoals = (adminModalPlayer.goals || 0) + 1;
    setStartingXi((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, goals: newGoals } : p))
    );

    const text = `گل برای ${teamName} توسط ${adminModalPlayer.name}! ⚽🔥 (مجموع: ${newGoals} گل)`;
    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'GOAL',
        text,
        team: teamName,
        icon: '⚽🔥',
        color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  const handleAdminGoalUndo = () => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    const currentGoals = adminModalPlayer.goals || 0;
    if (currentGoals <= 0) return;

    const newGoals = currentGoals - 1;
    setStartingXi((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, goals: newGoals } : p))
    );

    const text = `لغو ثبت گل برای ${adminModalPlayer.name} (${teamName}) ↩️ (باقی‌مانده: ${newGoals} گل)`;
    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'UNDO_EVENT',
        text,
        team: teamName,
        icon: '↩️',
        color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  const handleAdminAssist = () => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    const newAssists = (adminModalPlayer.assists || 0) + 1;
    setStartingXi((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, assists: newAssists } : p))
    );

    const text = `پاس گل عالی توسط ${adminModalPlayer.name} (${teamName}) 🅰️🎯 (مجموع: ${newAssists})`;
    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'ASSIST',
        text,
        team: teamName,
        icon: '🅰️🎯',
        color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  const handleAdminAssistUndo = () => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    const currentAssists = adminModalPlayer.assists || 0;
    if (currentAssists <= 0) return;

    const newAssists = currentAssists - 1;
    setStartingXi((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, assists: newAssists } : p))
    );

    const text = `لغو ثبت پاس گل برای ${adminModalPlayer.name} (${teamName}) ↩️`;
    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'UNDO_EVENT',
        text,
        team: teamName,
        icon: '↩️',
        color: 'text-amber-300 border-amber-500/40 bg-amber-950/40',
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  const handleAdminCardOrInjury = (actionType) => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    let text = '';
    let icon = '🟨⚠️';
    let color = 'text-amber-400 border-amber-500/40 bg-amber-950/40';

    setStartingXi((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        let updated = { ...p };

        if (actionType === 'TOGGLE_YELLOW_1') {
          if (updated.yellowCards === 1) {
            updated.yellowCards = 0;
            text = `لغو کارت زرد اول برای ${p.name} (${teamName}) ↩️`;
            icon = '↩️';
            color = 'text-slate-300 border-slate-700 bg-slate-900';
          } else {
            updated.yellowCards = 1;
            text = `کارت زرد اول برای ${p.name} (${teamName}) 🟨⚠️`;
            icon = '🟨⚠️';
            color = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
          }
        } else if (actionType === 'TOGGLE_YELLOW_2') {
          if (updated.yellowCards === 2) {
            updated.yellowCards = 1;
            updated.isRed = false;
            text = `لغو کارت زرد دوم و اخراج برای ${p.name} (${teamName}) ↩️`;
            icon = '↩️';
            color = 'text-slate-300 border-slate-700 bg-slate-900';
          } else {
            updated.yellowCards = 2;
            updated.isRed = true;
            text = `کارت زرد دوم و اخراج از زمین برای ${p.name} (${teamName}) 🟨🟨 🟥⛔`;
            icon = '🟨🟨 🟥⛔';
            color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
          }
        } else if (actionType === 'TOGGLE_RED') {
          if (updated.isRed) {
            updated.isRed = false;
            text = `لغو کارت قرمز برای ${p.name} (${teamName}) ↩️`;
            icon = '↩️';
            color = 'text-slate-300 border-slate-700 bg-slate-900';
          } else {
            updated.isRed = true;
            text = `کارت قرمز مستقیم و اخراج برای ${p.name} (${teamName}) 🟥⛔`;
            icon = '🟥⛔';
            color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
          }
        } else if (actionType === 'TOGGLE_INJURY') {
          if (updated.isInjured) {
            updated.isInjured = false;
            text = `بهبودی و لغو مصدومیت برای ${p.name} (${teamName}) 🩹✨`;
            icon = '🩹✨';
            color = 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
          } else {
            updated.isInjured = true;
            text = `ثبت مصدومیت شدید برای ${p.name} (${teamName}) 🚑🩹`;
            icon = '🚑🩹';
            color = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
          }
        }

        return updated;
      })
    );

    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'ADMIN_EVENT',
        text,
        team: teamName,
        icon,
        color,
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  // Pitch Player Click Handler
  const handlePitchPlayerClick = (clickedPlayer) => {
    if (isAdminMode) {
      if (selectedBenchPlayerId) {
        swapPitchWithBench(clickedPlayer.id, selectedBenchPlayerId);
        setSelectedBenchPlayerId(null);
        return;
      }
      setAdminModalPlayer(clickedPlayer);
      setSubModalBenchSelect(false);
      return;
    }

    if (readOnly) return;
    // Scenario 1: A bench/reserve player was pre-selected -> Swap pitch player with bench player
    if (selectedBenchPlayerId) {
      swapPitchWithBench(clickedPlayer.id, selectedBenchPlayerId);
      setSelectedBenchPlayerId(null);
      return;
    }

    // Scenario 2: No player currently selected -> Select this pitch player
    if (!selectedPitchPlayerId) {
      setSelectedPitchPlayerId(clickedPlayer.id);
      showNotification(`بازیکن «${clickedPlayer.name} (${clickedPlayer.position})» انتخاب شد. اکنون روی بازیکن دیگری روی زمین، یا روی یک بازیکن نیمکت کلیک کنید.`);
      return;
    }

    // Scenario 3: Clicked the same player -> Unselect
    if (selectedPitchPlayerId === clickedPlayer.id) {
      setSelectedPitchPlayerId(null);
      return;
    }

    // Scenario 4: Clicked another player on the pitch -> Swap their coordinates on pitch!
    swapPitchPositions(selectedPitchPlayerId, clickedPlayer.id);
    setSelectedPitchPlayerId(null);
  };

  // Bench / Reserve Player Click Handler
  const handleBenchPlayerClick = (clickedBenchPlayer, isFromSubstitutes = true) => {
    if (readOnly) return;

    // Official Football Rule: Once subbed out, a player cannot re-enter the pitch
    if (isLiveMode && clickedBenchPlayer.isSubbedOut) {
      showNotification(`🚫 بازیکن «${clickedBenchPlayer.name}» تعویض شده است و طبق قوانین رسمی فوتبال دیگر نمی‌تواند به زمین بازی بازگردد.`);
      return;
    }

    // Scenario 1: A pitch player was pre-selected -> Swap pitch player with clicked bench player
    if (selectedPitchPlayerId) {
      swapPitchWithBench(selectedPitchPlayerId, clickedBenchPlayer.id, isFromSubstitutes);
      setSelectedPitchPlayerId(null);
      return;
    }

    // Scenario 2: A bench player was ALREADY selected -> Swap two bench/reserve players!
    if (selectedBenchPlayerId) {
      if (selectedBenchPlayerId === clickedBenchPlayer.id) {
        setSelectedBenchPlayerId(null); // Clicked same -> unselect
      } else {
        swapBenchOrReserves(selectedBenchPlayerId, clickedBenchPlayer.id);
        setSelectedBenchPlayerId(null);
      }
      return;
    }

    // Scenario 3: Select bench/reserve player
    setSelectedBenchPlayerId(clickedBenchPlayer.id);
    const naturalPos = clickedBenchPlayer.naturalPosition || clickedBenchPlayer.position;
    showNotification(`بازیکن «${clickedBenchPlayer.name} (${naturalPos})» انتخاب شد. اکنون روی بازیکنی در چمن برای تعویض کلیک کنید.`);
  };

  // Swap two pitch players' positions (x_coord & y_coord)
  const swapPitchPositions = (id1, id2) => {
    const p1 = startingXi.find((p) => p.id === id1);
    const p2 = startingXi.find((p) => p.id === id2);
    if (!p1 || !p2) return;

    const updatedXi = startingXi.map((p) => {
      if (p.id === id1) {
        return {
          ...p,
          x_coord: p2.x_coord,
          y_coord: p2.y_coord,
          position: p2.position,
          naturalPosition: p.naturalPosition || p.position,
        };
      }
      if (p.id === id2) {
        return {
          ...p,
          x_coord: p1.x_coord,
          y_coord: p1.y_coord,
          position: p1.position,
          naturalPosition: p.naturalPosition || p.position,
        };
      }
      return p;
    });

    setStartingXi(updatedXi);
    showNotification(`پست تاکتیکی «${p1.name}» و «${p2.name}» روی چمن جابجا شد.`);
    if (onLineupChange) {
      onLineupChange({ startingXi: updatedXi, substitutes, reserves, formation: currentFormation });
    }
  };

  // Swap two bench or reserve players (between bench-bench, reserve-reserve, or bench-reserve)
  const swapBenchOrReserves = (id1, id2) => {
    const isSub1 = substitutes.some((b) => b.id === id1);
    const isSub2 = substitutes.some((b) => b.id === id2);

    const isRes1 = reserves.some((r) => r.id === id1);
    const isRes2 = reserves.some((r) => r.id === id2);

    const p1 = substitutes.find((b) => b.id === id1) || reserves.find((r) => r.id === id1);
    const p2 = substitutes.find((b) => b.id === id2) || reserves.find((r) => r.id === id2);

    if (!p1 || !p2) return;

    // Case A: Both in bench substitutes list
    if (isSub1 && isSub2) {
      const newSubs = substitutes.map((item) => (item.id === id1 ? p2 : item.id === id2 ? p1 : item));
      setSubstitutes(newSubs);
      showNotification(`جابجایی روی نیمکت: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      if (onLineupChange) {
        onLineupChange({ startingXi, substitutes: newSubs, reserves, formation: currentFormation });
      }
      return;
    }

    // Case B: Both in reserves list
    if (isRes1 && isRes2) {
      const newRes = reserves.map((item) => (item.id === id1 ? p2 : item.id === id2 ? p1 : item));
      setReserves(newRes);
      showNotification(`جابجایی در رختکن: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      if (onLineupChange) {
        onLineupChange({ startingXi, substitutes, reserves: newRes, formation: currentFormation });
      }
      return;
    }

    // Case C: Cross swap between substitutes and reserves
    if (isSub1 && isRes2) {
      const newSubs = substitutes.map((item) => (item.id === id1 ? p2 : item));
      const newRes = reserves.map((item) => (item.id === id2 ? p1 : item));
      setSubstitutes(newSubs);
      setReserves(newRes);
      showNotification(`ورود «${p2.name}» به نیمکت ذخیره‌ها و انتقال «${p1.name}» به خارج از ترکیب 🔄`);
      if (onLineupChange) {
        onLineupChange({ startingXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
      }
      return;
    }

    if (isRes1 && isSub2) {
      const newRes = reserves.map((item) => (item.id === id1 ? p2 : item));
      const newSubs = substitutes.map((item) => (item.id === id2 ? p1 : item));
      setReserves(newRes);
      setSubstitutes(newSubs);
      showNotification(`ورود «${p1.name}» به نیمکت ذخیره‌ها و انتقال «${p2.name}» به خارج از ترکیب 🔄`);
      if (onLineupChange) {
        onLineupChange({ startingXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
      }
      return;
    }
  };

  // Swap a pitch player with a bench/reserve player
  const swapPitchWithBench = (pitchId, benchId, isFromSubstitutes = true) => {
    if (isLiveMode && subsUsed >= maxSubs) {
      showNotification(`🚫 حداکثر تعداد تعویض‌های مجاز (${maxSubs} تعویض در این مسابقه) انجام شده است.`);
      return;
    }

    const pitchPlayer = startingXi.find((p) => p.id === pitchId);
    const benchSourceList = isFromSubstitutes ? substitutes : reserves;
    const benchPlayer = benchSourceList.find((b) => b.id === benchId) || substitutes.find((b) => b.id === benchId) || reserves.find((b) => b.id === benchId);

    if (!pitchPlayer || !benchPlayer) return;

    const benchNaturalPos = benchPlayer.naturalPosition || benchPlayer.position;
    const pitchNaturalPos = pitchPlayer.naturalPosition || pitchPlayer.position;

    // 1. Move bench player to pitch: gets the pitch slot position, but preserves their naturalPosition!
    const newPitchPlayer = {
      ...benchPlayer,
      naturalPosition: benchNaturalPos,
      position: pitchPlayer.position, // Tactical position slot on pitch
      x_coord: pitchPlayer.x_coord,
      y_coord: pitchPlayer.y_coord,
      face: benchPlayer.face || pitchPlayer.face,
      is_starting: true,
    };

    const updatedXi = startingXi.map((p) => (p.id === pitchId ? newPitchPlayer : p));
    setStartingXi(updatedXi);

    // 2. Move pitch player to bench: RESTORED to their naturalPosition and marked as permanently subbed out (ONLY in live mode)!
    const newBenchPlayer = {
      ...pitchPlayer,
      naturalPosition: pitchNaturalPos,
      position: pitchNaturalPos, // Restored to natural position on bench!
      x_coord: undefined,
      y_coord: undefined,
      face: pitchPlayer.face,
      is_starting: false,
      isSubbedOut: isLiveMode ? true : false, // Official football rule: once subbed out, cannot re-enter pitch (only in match mode)
    };

    let newSubs = substitutes;
    let newRes = reserves;
    const isBenchSub = substitutes.some((b) => b.id === benchId);
    if (isBenchSub) {
      newSubs = substitutes.map((b) => (b.id === benchId ? newBenchPlayer : b));
      setSubstitutes(newSubs);
    } else {
      newRes = reserves.map((b) => (b.id === benchId ? newBenchPlayer : b));
      setReserves(newRes);
    }

    showNotification(`تعویض تاکتیکی: ورود ${benchPlayer.name} به جای ${pitchPlayer.name} 🔄`);
    if (onLineupChange) {
      onLineupChange({ startingXi: updatedXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
    }
  };

  const activeSelectedPlayer =
    startingXi.find((p) => p.id === selectedPitchPlayerId) ||
    substitutes.find((p) => p.id === selectedBenchPlayerId) ||
    reserves.find((p) => p.id === selectedBenchPlayerId);

  const displayPosCode = activeSelectedPlayer
    ? (selectedPitchPlayerId ? activeSelectedPlayer.position : (activeSelectedPlayer.naturalPosition || activeSelectedPlayer.position))
    : 'GK';

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl bg-[#ded8e6] border border-purple-900/30 text-slate-900 font-sans select-none dir-rtl">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-[#180026] text-white px-4 py-3.5 md:px-5 md:py-4 flex items-center justify-between border-b-2 border-[#e6007e]/40 shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl team-crest-badge p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            {getTeamLogoUrl(teamName) ? (
              <img src={getTeamLogoUrl(teamName)} alt={teamName} className="w-full h-full object-contain" />
            ) : (
              <Shield size={22} className="text-slate-800 fill-slate-800/30" />
            )}
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-wide uppercase font-mono leading-tight">
              {teamName}
            </h2>
            <p className="text-[11px] md:text-xs text-purple-300 font-semibold tracking-wider">مدیریت ترکیب و تعویض‌های تاکتیکی (eFootball 2026)</p>
          </div>
        </div>

        <span className="text-xs md:text-sm font-black bg-purple-900 text-purple-200 px-3 py-1 rounded-xl border border-purple-500/40 font-mono">
          {currentFormation}
        </span>
      </div>

      {/* NOTIFICATION BANNER */}
      {statusMsg && (
        <div className="bg-purple-950 text-cyan-200 text-xs font-bold p-3 text-center border-b border-purple-800 flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle size={16} className="text-cyan-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* MAIN LAYOUT: PITCH TOP -> BENCH BOTTOM */}
      <div className="p-3 md:p-5 space-y-4">
        {/* LIVE MODE NOTICE BANNER */}
        {isLiveMode && (
          <div className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg ${
            isTacticsDisabled
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base">{isTacticsDisabled ? '⚠️' : '🟢'}</span>
              <div>
                <p className="font-black text-white text-xs md:text-sm flex items-center gap-2">
                  <span>{isTacticsDisabled ? 'حالت بازی: در جریان مسابقه (Live Match)' : 'حالت بازی: استراحت بین دو نیمه (Half Time)'}</span>
                  {matchState === 'HALF_TIME' && (
                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-mono font-black text-xs animate-pulse">
                      ⏱️ {halfTimeSeconds} ثانیه
                    </span>
                  )}
                </p>
                <p className="text-[11px] opacity-90 font-medium">
                  {isTacticsDisabled
                    ? 'تغییر تاکتیک کلی فقط بین دو نیمه امکان‌پذیر است. تعویض بازیکنان مجاز است.'
                    : 'امکان تغییر کامل ترکیب و تاکتیک در استراحت بین دو نیمه فعال است.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-black bg-cyan-950 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/40">
                تعویض‌های استفاده شده: {subsUsed} از {maxSubs}
              </span>
              <span className="text-[10px] font-mono font-black bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                {matchState === 'FIRST_HALF' ? 'نیمه اول' : matchState === 'HALF_TIME' ? 'بین دو نیمه' : matchState === 'SECOND_HALF' ? 'نیمه دوم' : 'پایان بازی'}
              </span>
            </div>
          </div>
        )}

        {/* FORMATION SELECTOR BAR (در بالای زمین چمن) */}
        {!readOnly && (
          <div className="bg-[#080c14]/90 p-3.5 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-cyan-400" />
              <span className="text-xs font-black text-white">انتخاب ترکیب چیدمان تیمی (Formation):</span>
            </div>
            <div className="w-full sm:w-64">
              <CustomSelect
                value={currentFormation}
                onChange={handleFormationChange}
                colorTheme="cyan"
                options={FORMATION_OPTIONS}
                disabled={isTacticsDisabled}
              />
            </div>
          </div>
        )}

        {/* SELECTED PLAYER POSITION INFO CARD */}
        {activeSelectedPlayer && POSITION_INFO[displayPosCode] && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="fc-card-elevated p-3.5 rounded-2xl border border-cyan-500/30 text-white space-y-1.5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] font-black px-2 py-0.5 rounded shadow ${POSITION_COLORS[displayPosCode] || 'bg-purple-600'}`}>
                  {displayPosCode}
                </span>
                <span className="font-black text-xs text-white">
                  {POSITION_INFO[displayPosCode].title} ({POSITION_INFO[displayPosCode].englishTitle})
                </span>
              </div>
              <span className="text-[11px] text-cyan-300 font-bold font-sport">
                {activeSelectedPlayer.name} — OVR: <strong className="text-amber-300 font-black">{activeSelectedPlayer.overall}</strong>
                {activeSelectedPlayer.naturalPosition && activeSelectedPlayer.naturalPosition !== activeSelectedPlayer.position && selectedPitchPlayerId && (
                  <span className="text-purple-300 font-normal mr-2"> (پست اصلی: {activeSelectedPlayer.naturalPosition})</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
              {POSITION_INFO[displayPosCode].desc}
            </p>
          </motion.div>
        )}

        {/* TOP: GREEN FOOTBALL PITCH CONTAINER */}
        <div className="fc-pitch-turf rounded-3xl p-3 md:p-5 border-2 border-cyan-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative flex flex-col justify-between min-h-[600px] md:min-h-[700px] overflow-hidden select-none">
          {/* Turf Mowing Stripes & Center Spotlight */}
          <div className="absolute inset-0 fc-pitch-mow-stripes opacity-70 pointer-events-none"></div>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.08) 0%, rgba(0, 255, 135, 0.04) 50%, transparent 80%)',
            }}
          />

          {/* Pitch Lines (Neon Cyan Line Art) */}
          <div className="absolute inset-3 border-2 border-cyan-400/60 rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(0,243,255,0.2)]"></div>

          {/* Penalty Boxes & Circle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-cyan-400/60 border-t-0 rounded-b-2xl pointer-events-none overflow-hidden">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-cyan-400/40 border-t-0 rounded-b-xl"></div>
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-cyan-400/60 border-b-0 rounded-t-2xl pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-2 border-cyan-400/40 border-b-0 rounded-t-xl"></div>
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/60 pointer-events-none shadow-[0_0_8px_rgba(0,243,255,0.3)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 md:w-40 h-28 md:h-40 rounded-full border-2 border-cyan-400/60 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-300 pointer-events-none shadow-[0_0_10px_#00f3ff]"></div>

          {/* Watermark Logo Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <Shield size={160} className="text-cyan-400" />
          </div>

          {/* PLAYERS ON PITCH */}
          <div className="relative w-full h-[540px] md:h-[640px]">
            {startingXi.map((player) => {
              const isSelected = selectedPitchPlayerId === player.id;
              const isDimmed = selectedPitchPlayerId && !isSelected;
              const posCode = player.position || player.naturalPosition || 'CMF';

              // Readiness / Stamina Calculation (linked with facilities & fatigue formula)
              const staminaPercent = Math.max(5, Math.min(100, Math.round(Number(player.stamina ?? player.virtual_stamina ?? 90))));
              const staminaColorClass =
                staminaPercent >= 80
                  ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87]'
                  : staminaPercent >= 50
                  ? 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]'
                  : staminaPercent >= 30
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse';

              const photoUrl = player.photo_url || player.image || player.avatar || null;

              return (
                <motion.div
                  key={player.id}
                  onClick={() => handlePitchPlayerClick(player)}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    left: `${player.x_coord}%`,
                    top: `${player.y_coord}%`,
                    scale: isSelected ? 1.12 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 100, damping: 15 },
                    top: { type: 'spring', stiffness: 100, damping: 15 },
                    scale: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[86px] md:w-[96px] flex flex-col items-center cursor-pointer group z-10 hover:z-30 transition-all active:scale-105 ${
                    isSelected ? 'ring-4 ring-cyan-400 rounded-2xl p-1 bg-cyan-950/90 shadow-[0_0_30px_rgba(0,243,255,0.7)] animate-pulse' : ''
                  }`}
                >
                  {/* Player Avatar Container + Floating Event Badges Next To Photo */}
                  <div className="relative flex items-center justify-center">
                    {/* Floating Event Badges Next To Avatar (Top-Right / Beside Avatar) */}
                    {(player.goals > 0 || player.assists > 0 || player.yellowCards > 0 || player.isRed || player.isInjured) && (
                      <div className="absolute -top-2 -right-6 flex flex-col items-start gap-0.5 pointer-events-none z-30 drop-shadow-md">
                        {player.goals > 0 && (
                          <motion.span
                            initial={{ scale: 0, x: -5 }}
                            animate={{ scale: 1, x: 0 }}
                            className="text-[9px] bg-emerald-950/95 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-400 font-black font-sport shadow-lg flex items-center gap-0.5 whitespace-nowrap"
                          >
                            ⚽🔥{player.goals > 1 ? `x${player.goals}` : ''}
                          </motion.span>
                        )}
                        {player.assists > 0 && (
                          <motion.span
                            initial={{ scale: 0, x: -5 }}
                            animate={{ scale: 1, x: 0 }}
                            className="text-[9px] bg-cyan-950/95 text-cyan-300 px-1.5 py-0.2 rounded-full border border-cyan-400 font-black font-sport shadow-lg flex items-center gap-0.5 whitespace-nowrap"
                          >
                            🅰️🎯{player.assists > 1 ? `x${player.assists}` : ''}
                          </motion.span>
                        )}
                        {player.yellowCards === 1 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] drop-shadow-lg">
                            🟨⚠️
                          </motion.span>
                        )}
                        {player.yellowCards === 2 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] drop-shadow-lg">
                            🟨🟨 🟥⛔
                          </motion.span>
                        )}
                        {player.isRed && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] drop-shadow-lg">
                            🟥⛔
                          </motion.span>
                        )}
                        {player.isInjured && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] drop-shadow-lg animate-pulse">
                            🚑🩹
                          </motion.span>
                        )}
                      </div>
                    )}

                    {/* FUT Portrait Photo Card Frame (1:1.15 Ratio) */}
                    <div className={`relative flex items-center justify-center w-12 h-14 md:w-14 md:h-16 rounded-2xl overflow-hidden border-2 shadow-xl transition-all ${
                      player.isRed
                        ? 'border-rose-600 ring-2 ring-rose-600/80 bg-rose-950/90 text-rose-300 opacity-60 grayscale'
                        : player.isInjured
                        ? 'border-amber-500 ring-2 ring-amber-500/80 bg-amber-950/90 text-amber-300 animate-pulse'
                        : player.goals > 0
                        ? 'border-emerald-400 ring-2 ring-emerald-400/60 bg-emerald-950/80'
                        : isSelected
                        ? 'border-cyan-400 bg-cyan-900/70 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.6)]'
                        : 'border-slate-400/60 bg-gradient-to-b from-[#0d162a] to-[#05080e] group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                    }`}>
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={player.name}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}

                      {/* Fallback Avatar Icon */}
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#05080e] ${photoUrl ? 'hidden' : 'flex'}`}>
                        <User size={26} className="text-slate-300 opacity-85" />
                      </div>

                      {/* Shirt Number Tag Overlay */}
                      {player.shirt_number != null && (
                        <span className="absolute bottom-0 right-0 bg-[#05080e]/95 text-cyan-300 text-[8px] md:text-[9px] font-sport font-black px-1 rounded-tl-md border-t border-l border-cyan-500/30">
                          #{player.shirt_number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge Pill: Position + Championship Gold OVR Rating */}
                  <div className="flex items-center gap-1 mt-1 shadow-lg z-10">
                    <span
                      className={`text-[8px] md:text-[9px] px-1.5 py-0.2 rounded-md shadow ${
                        POSITION_COLORS[posCode] || 'bg-purple-600 text-white font-bold'
                      }`}
                    >
                      {posCode}
                    </span>
                    <span className="text-[10.5px] md:text-xs font-black text-amber-300 bg-amber-950/90 border border-amber-400/50 px-1 rounded-md drop-shadow font-sport tracking-wide">
                      {player.overall}
                    </span>
                  </div>

                  {/* Player Name Tag */}
                  <span className="text-[9px] md:text-[10px] font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-center whitespace-nowrap leading-none mt-0.5 max-w-[84px] md:max-w-[92px] truncate bg-[#05080e]/80 px-1.5 py-0.5 rounded-md border border-white/10">
                    {player.isCaptain && (
                      <span className="bg-amber-400 text-black font-black text-[7.5px] px-1 ml-0.5 rounded">
                        C
                      </span>
                    )}
                    {player.name}
                  </span>

                  {/* Stamina / Readiness Bar under Player Name */}
                  <div 
                    className="w-13 md:w-15 h-1.5 bg-[#05080e]/95 rounded-full overflow-hidden border border-white/15 p-0.2 mt-0.5 shadow-inner"
                    title={`میزان آمادگی و استقامت: ${staminaPercent}٪`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${staminaColorClass}`}
                      style={{ width: `${staminaPercent}%` }}
                    ></div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Formation Label */}
          <div className="relative z-20 text-right pt-1 pr-1 flex justify-between items-end bg-[#080c14]/70 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <span className="text-xs text-cyan-300 font-bold">ترکیب چیدمان تیمی</span>
            <span className="text-xl md:text-3xl font-black text-white font-sport tracking-wider drop-shadow-md">
              {currentFormation}
            </span>
          </div>
        </div>

        {/* BOTTOM: BENCH & RESERVES CONTAINER (زیر چمن) */}
        <div className="bg-[#080c14]/90 rounded-3xl p-4 md:p-5 border border-slate-700/60 text-white shadow-2xl space-y-4 backdrop-blur-xl">
          {/* SECTION 1: BENCH SUBSTITUTES (نیمکت ذخیره‌ها) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-black text-sm md:text-base text-cyan-300 flex items-center gap-2">
                <Users size={18} className="text-cyan-400" />
                <span>بازیکنان نیمکت ذخیره (Substitutes - {substitutes.length} نفر)</span>
              </span>
              <span className="text-[11px] text-slate-400">کلیک جهت جابجایی دو بازیکن نیمکت یا تعویض با چمن</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
              {substitutes.map((sub) => {
                const isSelected = selectedBenchPlayerId === sub.id;
                const natPos = sub.naturalPosition || sub.position;
                const isOut = sub.isSubbedOut;
                const subStamina = Math.max(5, Math.min(100, Math.round(Number(sub.stamina ?? sub.virtual_stamina ?? 90))));
                const subStaminaColor =
                  subStamina >= 80
                    ? 'bg-[#00ff87]'
                    : subStamina >= 50
                    ? 'bg-cyan-400'
                    : subStamina >= 30
                    ? 'bg-amber-400'
                    : 'bg-rose-500';

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleBenchPlayerClick(sub, true)}
                    className={`p-2 rounded-2xl border cursor-pointer flex flex-col items-center text-center transition-all relative overflow-hidden ${
                      isOut
                        ? 'opacity-65 bg-rose-950/40 border-rose-800/60 grayscale cursor-not-allowed hover:border-rose-600'
                        : isSelected
                        ? 'bg-gradient-to-r from-cyan-950 to-purple-950 border-2 border-cyan-400 scale-105 shadow-[0_0_20px_rgba(0,243,255,0.4)] ring-2 ring-cyan-400 animate-pulse'
                        : 'bg-[#0f172a]/80 border-slate-700/60 hover:border-cyan-400/60 hover:bg-slate-800'
                    }`}
                  >
                    {isOut && (
                      <span className="absolute top-1 right-1 text-[7px] font-black bg-rose-600 text-white px-1 py-0.2 rounded-full flex items-center gap-0.5 shadow z-10 font-sport">
                        ↩️ OUT
                      </span>
                    )}

                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-600 mb-1 bg-[#05080e] relative overflow-hidden shadow-inner">
                      {sub.photo_url || sub.image || sub.avatar ? (
                        <img
                          src={sub.photo_url || sub.image || sub.avatar}
                          alt={sub.name}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <User size={18} className={isOut ? 'text-rose-400 opacity-60' : 'text-slate-400 opacity-70'} />
                      )}
                      {sub.shirt_number != null && (
                        <span className="absolute bottom-0 right-0 bg-[#05080e]/95 text-cyan-300 text-[7px] font-sport font-black px-0.5 rounded-tl border-t border-l border-cyan-500/40">
                          #{sub.shirt_number}
                        </span>
                      )}
                    </div>

                    <span className={`font-black text-[9px] leading-tight w-full truncate max-w-[70px] ${isOut ? 'line-through text-slate-400' : 'text-white'}`}>
                      {sub.name}
                    </span>

                    {/* Stamina Meter */}
                    <div className="w-11 h-1 bg-[#05080e] rounded-full overflow-hidden border border-white/10 mt-1">
                      <div className={`h-full rounded-full ${subStaminaColor}`} style={{ width: `${subStamina}%` }}></div>
                    </div>

                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[7.5px] font-black px-1 rounded ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}>
                        {natPos}
                      </span>
                      <span className="font-sport text-[10.5px] font-black text-amber-300">{sub.overall}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISUAL SEPARATOR DIVIDER */}
          {!hideReserves && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
                <span className="text-[11px] font-black text-cyan-300 px-3 py-1 bg-[#080c14] rounded-full border border-cyan-500/40 shadow-inner flex items-center gap-1.5 font-sport">
                  <ArrowLeftRight size={13} className="text-cyan-400" />
                  <span>بازیکنان خارج از بازی و لیست رختکن (Reserves / Out of Squad)</span>
                </span>
                <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              </div>

              {/* SECTION 2: RESERVES / OUT OF SQUAD */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {reserves.map((res) => {
                    const isSelected = selectedBenchPlayerId === res.id;
                    const natPos = res.naturalPosition || res.position;
                    const resStamina = Math.max(5, Math.min(100, Math.round(Number(res.stamina ?? res.virtual_stamina ?? 90))));

                    return (
                      <div
                        key={res.id}
                        onClick={() => handleBenchPlayerClick(res, false)}
                        className={`p-2.5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${
                          isSelected
                            ? 'bg-cyan-950/80 border-2 border-cyan-400 shadow-lg ring-2 ring-cyan-400 animate-pulse'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {res.shirt_number != null && (
                            <span className="text-[8.5px] font-sport text-cyan-400 font-black">#{res.shirt_number}</span>
                          )}
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}>
                            {natPos}
                          </span>
                          <span className="font-bold text-[10px] sm:text-[11px] truncate max-w-[90px]">{res.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-sport text-cyan-300 font-bold">{resStamina}%</span>
                          <span className="font-sport text-[11px] font-black text-amber-300">{res.overall}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* LIVE MODE SAVE BUTTON FOOTER */}
      {isLiveMode && onSave && (
        <div className="bg-[#180026] p-4 border-t-2 border-purple-800 flex justify-between items-center gap-3 sticky bottom-0 z-30 shadow-2xl">
          <div className="text-xs text-purple-200 hidden sm:block">
            <span className="font-bold text-white block">آماده ارسال به سرور</span>
            <span className="text-[10.5px] text-purple-300">برای اعمال تغییرات تعویض یا تاکتیک کلیک کنید.</span>
          </div>
          <button
            onClick={() => onSave({ startingXi, substitutes, reserves, currentFormation })}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-8 py-3 rounded-2xl shadow-xl hover:shadow-cyan-500/20 transition-all text-xs md:text-sm flex items-center justify-center gap-2 border border-emerald-300"
          >
            <span>ثبت و اعمال تغییرات به سرور</span>
            <span className="text-base">⚡</span>
          </button>
        </div>
      )}

      {/* ADMIN QUICK MATCH EVENT REGISTRATION MODAL */}
      {isAdminMode && adminModalPlayer && (
        <div className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans dir-rtl text-xs">
          <div className="w-full max-w-md glass-panel p-5 rounded-3xl border-2 border-cyan-500/60 space-y-4 shadow-2xl bg-slate-950">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-white text-sm">ثبت سریع اتفاقات مسابقه (داور / ادمین)</h3>
                <p className="text-[11px] text-cyan-300 mt-0.5">
                  بازیکن انتخابی: <span className="font-bold text-white">{adminModalPlayer.name} ({adminModalPlayer.position})</span> — تیم: <span className="text-purple-300 font-bold">{teamName}</span>
                </p>
              </div>
              <button
                onClick={() => setAdminModalPlayer(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700"
              >
                ✕
              </button>
            </div>

            {!subModalBenchSelect ? (
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Goal Add & Undo */}
                <div className="col-span-2 flex gap-2">
                  <button
                    onClick={handleAdminGoal}
                    className="flex-1 p-3 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/60 text-emerald-200 font-bold flex items-center justify-between transition-all shadow-md"
                  >
                    <span className="flex items-center gap-1.5">⚽🔥 ثبت گل (+۱)</span>
                    <span className="text-[10.5px] bg-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                      {adminModalPlayer.goals || 0} گل
                    </span>
                  </button>
                  {adminModalPlayer.goals > 0 && (
                    <button
                      onClick={handleAdminGoalUndo}
                      className="px-3 py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-bold flex items-center justify-center gap-1 transition-all"
                      title="لغو ثبت ۱ گل"
                    >
                      <span>↩️</span>
                      <span className="text-[11px]">لغو گل (-۱)</span>
                    </button>
                  )}
                </div>

                {/* 2. Assist Add & Undo */}
                <div className="col-span-2 flex gap-2">
                  <button
                    onClick={handleAdminAssist}
                    className="flex-1 p-3 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900/90 border border-cyan-500/60 text-cyan-200 font-bold flex items-center justify-between transition-all shadow-md"
                  >
                    <span className="flex items-center gap-1.5">🅰️🎯 ثبت پاس گل (+۱)</span>
                    <span className="text-[10.5px] bg-cyan-900 px-2 py-0.5 rounded font-mono font-bold">
                      {adminModalPlayer.assists || 0} پاس
                    </span>
                  </button>
                  {adminModalPlayer.assists > 0 && (
                    <button
                      onClick={handleAdminAssistUndo}
                      className="px-3 py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 font-bold flex items-center justify-center gap-1 transition-all"
                      title="لغو ثبت پاس گل"
                    >
                      <span>↩️</span>
                      <span className="text-[11px]">لغو پاس (-۱)</span>
                    </button>
                  )}
                </div>

                {/* 3. Yellow Card 1 */}
                <button
                  onClick={() => handleAdminCardOrInjury('TOGGLE_YELLOW_1')}
                  className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all ${
                    adminModalPlayer.yellowCards === 1
                      ? 'bg-amber-900/90 border-amber-400 text-amber-100 shadow-md ring-1 ring-amber-400'
                      : 'bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/50 text-amber-200'
                  }`}
                >
                  <span className="flex items-center gap-1">🟨⚠️ {adminModalPlayer.yellowCards === 1 ? 'لغو زرد اول' : 'کارت زرد اول'}</span>
                  {adminModalPlayer.yellowCards === 1 && <span className="text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-300 font-bold">فعال ↩️</span>}
                </button>

                {/* 4. Yellow Card 2 */}
                <button
                  onClick={() => handleAdminCardOrInjury('TOGGLE_YELLOW_2')}
                  className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all ${
                    adminModalPlayer.yellowCards === 2
                      ? 'bg-rose-900/90 border-rose-500 text-rose-100 shadow-md ring-1 ring-rose-500'
                      : 'bg-amber-950/40 hover:bg-amber-950/70 border-amber-500/50 text-amber-200'
                  }`}
                >
                  <span className="flex items-center gap-1">🟨🟨 {adminModalPlayer.yellowCards === 2 ? 'لغو زرد دوم' : 'زرد دوم (اخراج)'}</span>
                  {adminModalPlayer.yellowCards === 2 && <span className="text-[10px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">اخراج ↩️</span>}
                </button>

                {/* 5. Direct Red */}
                <button
                  onClick={() => handleAdminCardOrInjury('TOGGLE_RED')}
                  className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all ${
                    adminModalPlayer.isRed
                      ? 'bg-rose-900/90 border-rose-500 text-rose-100 shadow-md ring-1 ring-rose-500'
                      : 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/50 text-rose-200'
                  }`}
                >
                  <span className="flex items-center gap-1">🟥⛔ {adminModalPlayer.isRed ? 'لغو قرمز مستقیم' : 'کارت قرمز مستقیم'}</span>
                  {adminModalPlayer.isRed && <span className="text-[10px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">اخراج ↩️</span>}
                </button>

                {/* 6. Injury */}
                <button
                  onClick={() => handleAdminCardOrInjury('TOGGLE_INJURY')}
                  className={`p-3 rounded-2xl border font-bold flex items-center justify-between transition-all ${
                    adminModalPlayer.isInjured
                      ? 'bg-purple-900/90 border-purple-400 text-purple-100 shadow-md ring-1 ring-purple-400'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-purple-300'
                  }`}
                >
                  <span className="flex items-center gap-1">🚑🩹 {adminModalPlayer.isInjured ? 'لغو مصدومیت' : 'ثبت مصدومیت'}</span>
                  {adminModalPlayer.isInjured && <span className="text-[10px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">مصدوم ↩️</span>}
                </button>

                {/* 7. Substitution trigger */}
                <button
                  onClick={() => setSubModalBenchSelect(true)}
                  className="col-span-2 mt-1 p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all border border-purple-400/30"
                >
                  <ArrowLeftRight size={16} />
                  <span>انجام تعویض زنده با بازیکنان نیمکت 🔄⚡</span>
                </button>
              </div>
            ) : (
              /* Bench selector mode inside modal */
              <div className="space-y-3">
                <span className="text-slate-300 font-bold block">
                  انتخاب بازیکن جایگزین از نیمکت برای تعویض با «{adminModalPlayer.name}»:
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                  {substitutes.map((bPlayer) => {
                    const natPos = bPlayer.naturalPosition || bPlayer.position;
                    const isOut = bPlayer.isSubbedOut;

                    return (
                      <div
                        key={bPlayer.id}
                        onClick={() => {
                          if (isOut) {
                            showNotification(`🚫 بازیکن «${bPlayer.name}» قبلاً تعویض شده و طبق قوانین فوتبال دیگر نمی‌تواند به زمین برگردد.`);
                            return;
                          }
                          swapPitchWithBench(adminModalPlayer.id, bPlayer.id, true);
                          const text = `تعویض زنده ادمین: ورود ${bPlayer.name} (${natPos}) به جای ${adminModalPlayer.name} (${adminModalPlayer.position}) 🔄`;
                          if (onPushLiveEvent) {
                            onPushLiveEvent({
                              id: Date.now(),
                              type: 'SUB',
                              text,
                              team: teamName,
                              icon: '🔄',
                              color: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
                            });
                          }
                          setAdminModalPlayer(null);
                          setSubModalBenchSelect(false);
                        }}
                        className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${
                          isOut
                            ? 'bg-rose-950/30 border-rose-900/50 opacity-60 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-800 hover:border-cyan-400 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded">
                            {natPos}
                          </span>
                          <span className={`font-bold ${isOut ? 'line-through text-slate-400' : 'text-white'}`}>{bPlayer.name}</span>
                          {isOut && <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">↩️ OUT</span>}
                        </div>
                        <span className="font-mono text-cyan-300 font-bold">OVR {bPlayer.overall}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setSubModalBenchSelect(false)}
                  className="w-full bg-slate-800 text-slate-300 font-bold py-2 rounded-xl"
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
