import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertCircle, ArrowLeftRight, User, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../common/CustomSelect';

// Color map for position badges matching eFootball standard (13 official positions)
const POSITION_COLORS = {
  GK: 'bg-[#d9a000] text-black',
  CB: 'bg-[#007ba7] text-white',
  LB: 'bg-[#007ba7] text-white',
  RB: 'bg-[#007ba7] text-white',
  DMF: 'bg-[#008a3c] text-white',
  CMF: 'bg-[#008a3c] text-white',
  AMF: 'bg-[#008a3c] text-white',
  LMF: 'bg-[#008a3c] text-white',
  RMF: 'bg-[#008a3c] text-white',
  LWF: 'bg-[#c80058] text-white',
  RWF: 'bg-[#c80058] text-white',
  SS: 'bg-[#c80058] text-white',
  CF: 'bg-[#c80058] text-white',
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

// Demo XI starting lineup
const DEFAULT_STARTING_XI = [
  { id: '1', name: 'Alisson', position: 'GK', naturalPosition: 'GK', overall: 87, x_coord: 50, y_coord: 90 },
  { id: '2', name: 'A. Robertson', position: 'LB', naturalPosition: 'LB', overall: 84, x_coord: 15, y_coord: 72 },
  { id: '3', name: 'I. Konaté', position: 'CB', naturalPosition: 'CB', overall: 85, x_coord: 35, y_coord: 75 },
  { id: '4', name: 'V. van Dijk', position: 'CB', naturalPosition: 'CB', overall: 86, isCaptain: true, x_coord: 65, y_coord: 75 },
  { id: '5', name: 'J. Frimpong', position: 'RB', naturalPosition: 'RB', overall: 83, x_coord: 85, y_coord: 72 },
  { id: '6', name: 'R. Gravenberch', position: 'DMF', naturalPosition: 'DMF', overall: 85, x_coord: 35, y_coord: 56 },
  { id: '7', name: 'A. Mac Allister', position: 'CMF', naturalPosition: 'CMF', overall: 85, x_coord: 65, y_coord: 56 },
  { id: '8', name: 'D. Szoboszlai', position: 'AMF', naturalPosition: 'AMF', overall: 87, x_coord: 50, y_coord: 38 },
  { id: '9', name: 'Cody Gakpo', position: 'LWF', naturalPosition: 'LWF', overall: 86, x_coord: 18, y_coord: 20 },
  { id: '10', name: 'Mohamed Salah', position: 'RWF', naturalPosition: 'RWF', overall: 87, x_coord: 82, y_coord: 20 },
  { id: '11', name: 'Alexander Isak', position: 'CF', naturalPosition: 'CF', overall: 86, x_coord: 50, y_coord: 15 },
];

// Demo bench substitutes (11 players on bench)
const DEFAULT_SUBSTITUTES = [
  { id: 'b1', name: 'Mamardashvili', position: 'GK', naturalPosition: 'GK', overall: 84 },
  { id: 'b3', name: 'Joe Gomez', position: 'CB', naturalPosition: 'CB', overall: 81 },
  { id: 'b5', name: 'Milos Kerkez', position: 'LB', naturalPosition: 'LB', overall: 81 },
  { id: 'b6', name: 'Conor Bradley', position: 'RB', naturalPosition: 'RB', overall: 81 },
  { id: 'b7', name: 'Wataru Endo', position: 'DMF', naturalPosition: 'DMF', overall: 79 },
  { id: 'b9', name: 'Curtis Jones', position: 'CMF', naturalPosition: 'CMF', overall: 83 },
  { id: 'b10', name: 'Florian Wirtz', position: 'AMF', naturalPosition: 'AMF', overall: 83 },
  { id: 'b13', name: 'Harvey Elliott', position: 'AMF', naturalPosition: 'AMF', overall: 81 },
  { id: 'b11', name: 'Federico Chiesa', position: 'RWF', naturalPosition: 'RWF', overall: 81 },
  { id: 'b12', name: 'Hugo Ekitiké', position: 'CF', naturalPosition: 'CF', overall: 84 },
  { id: 'b14', name: 'Kostas Tsimikas', position: 'LB', naturalPosition: 'LB', overall: 80 },
];

// Demo reserves (out of squad / locker room - 3 players)
const DEFAULT_RESERVES = [
  { id: 'b2', name: 'Freddie Wood', position: 'GK', naturalPosition: 'GK', overall: 77 },
  { id: 'b4', name: 'Rhys Williams', position: 'CB', naturalPosition: 'CB', overall: 74 },
  { id: 'b8', name: 'Stefan Bajcetic', position: 'DMF', naturalPosition: 'DMF', overall: 77 },
];

export default function EFootballGamePlan({
  teamName = 'LIVERPOOL FC',
  formation: initialFormationProp = '4-3-3 (4-2-1-3)',
  readOnly = false,
  hideReserves = false,
  initialStartingXi = DEFAULT_STARTING_XI,
  initialSubstitutes = DEFAULT_SUBSTITUTES,
  onFormationChange,
  isLiveMode = false,
  matchState = 'FIRST_HALF', // 'FIRST_HALF', 'HALF_TIME', 'SECOND_HALF', 'FINISHED'
  halfTimeSeconds = 30,
  subsUsed = 0,
  maxSubs = 5,
  onSave,
  isAdminMode = false,
  onPushLiveEvent,
}) {
  const [currentFormation, setCurrentFormation] = useState(initialFormationProp || '4-3-3 (4-2-1-3)');
  const [startingXi, setStartingXi] = useState(() =>
    initialStartingXi.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position }))
  );
  const [substitutes, setSubstitutes] = useState(() =>
    initialSubstitutes.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position }))
  );
  const [reserves, setReserves] = useState(() =>
    DEFAULT_RESERVES.map((p) => ({ ...p, naturalPosition: p.naturalPosition || p.position }))
  );

  // Sync formation prop changes if any
  useEffect(() => {
    if (initialFormationProp && initialFormationProp !== currentFormation) {
      handleFormationChange(initialFormationProp, false);
    }
  }, [initialFormationProp]);

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
    setStartingXi((prevXi) => {
      return prevXi.map((p, index) => {
        const targetPos = preset[index] || preset[preset.length - 1];
        return {
          ...p,
          position: targetPos.pos,
          x_coord: targetPos.x,
          y_coord: targetPos.y,
        };
      });
    });

    if (notify) {
      showNotification(`چیدمان تیمی به ${newFormation} تغییر یافت.`);
    }
    if (onFormationChange) {
      onFormationChange(newFormation);
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
    if (clickedBenchPlayer.isSubbedOut) {
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
      setSubstitutes((prev) =>
        prev.map((item) => (item.id === id1 ? p2 : item.id === id2 ? p1 : item))
      );
      showNotification(`جابجایی روی نیمکت: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      return;
    }

    // Case B: Both in reserves list
    if (isRes1 && isRes2) {
      setReserves((prev) =>
        prev.map((item) => (item.id === id1 ? p2 : item.id === id2 ? p1 : item))
      );
      showNotification(`جابجایی در رختکن: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      return;
    }

    // Case C: Cross swap between substitutes and reserves
    if (isSub1 && isRes2) {
      setSubstitutes((prev) => prev.map((item) => (item.id === id1 ? p2 : item)));
      setReserves((prev) => prev.map((item) => (item.id === id2 ? p1 : item)));
      showNotification(`ورود «${p2.name}» به نیمکت ذخیره‌ها و انتقال «${p1.name}» به خارج از ترکیب 🔄`);
      return;
    }

    if (isRes1 && isSub2) {
      setReserves((prev) => prev.map((item) => (item.id === id1 ? p2 : item)));
      setSubstitutes((prev) => prev.map((item) => (item.id === id2 ? p1 : item)));
      showNotification(`ورود «${p1.name}» به نیمکت ذخیره‌ها و انتقال «${p2.name}» به خارج از ترکیب 🔄`);
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
    };

    const updatedXi = startingXi.map((p) => (p.id === pitchId ? newPitchPlayer : p));
    setStartingXi(updatedXi);

    // 2. Move pitch player to bench: RESTORED to their naturalPosition and marked as permanently subbed out!
    const newBenchPlayer = {
      ...pitchPlayer,
      naturalPosition: pitchNaturalPos,
      position: pitchNaturalPos, // Restored to natural position on bench!
      x_coord: undefined,
      y_coord: undefined,
      face: pitchPlayer.face,
      isSubbedOut: true, // Official football rule: once subbed out, cannot re-enter pitch
    };

    const isBenchSub = substitutes.some((b) => b.id === benchId);
    if (isBenchSub) {
      setSubstitutes((prev) => prev.map((b) => (b.id === benchId ? newBenchPlayer : b)));
    } else {
      setReserves((prev) => prev.map((b) => (b.id === benchId ? newBenchPlayer : b)));
    }

    showNotification(`تعویض تاکتیکی: ورود ${benchPlayer.name} به جای ${pitchPlayer.name} 🔄`);
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
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-rose-700/20 border-2 border-rose-500/60 p-1 flex items-center justify-center shadow-md">
            <Shield size={22} className="text-rose-500 fill-rose-500/30" />
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
          <div className="bg-[#180026]/90 p-3 rounded-2xl border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">انتخاب ترکیب چیدمان تیمی (Formation):</span>
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
            className="bg-[#180026]/95 p-3.5 rounded-2xl border border-purple-500/40 text-white space-y-1 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] font-black px-2 py-0.5 rounded shadow ${POSITION_COLORS[displayPosCode] || 'bg-purple-600'}`}>
                  {displayPosCode}
                </span>
                <span className="font-bold text-xs text-white">
                  {POSITION_INFO[displayPosCode].title} ({POSITION_INFO[displayPosCode].englishTitle})
                </span>
              </div>
              <span className="text-[11px] text-cyan-300 font-bold">
                {activeSelectedPlayer.name} — OVR: {activeSelectedPlayer.overall}
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
        <div className="bg-[#250033] rounded-3xl p-3 md:p-5 border-2 border-[#e6007e]/50 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[600px] md:min-h-[700px]">
          {/* Pitch Lines (Neon Pink Line Art) */}
          <div className="absolute inset-3 border-2 border-[#e6007e]/70 rounded-2xl pointer-events-none"></div>

          {/* Penalty Boxes & Circle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-[#e6007e]/70 border-t-0 rounded-b-2xl pointer-events-none"></div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-48 md:w-64 h-24 md:h-32 border-2 border-[#e6007e]/70 border-b-0 rounded-t-2xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#e6007e]/70 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 md:w-40 h-28 md:h-40 rounded-full border-2 border-[#e6007e]/70 pointer-events-none"></div>

          {/* Watermark Logo Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
            <Shield size={160} className="text-[#e6007e]" />
          </div>

          {/* PLAYERS ON PITCH */}
          <div className="relative w-full h-[540px] md:h-[640px]">
            {startingXi.map((player) => {
              const isSelected = selectedPitchPlayerId === player.id;
              const isDimmed = selectedPitchPlayerId && !isSelected;

              return (
                <motion.div
                  key={player.id}
                  onClick={() => handlePitchPlayerClick(player)}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{
                    left: `${player.x_coord}%`,
                    top: `${player.y_coord}%`,
                    scale: isSelected ? 1.15 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 100, damping: 15 },
                    top: { type: 'spring', stiffness: 100, damping: 15 },
                    scale: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group z-10 hover:z-30 transition-all active:scale-105 ${
                    isSelected ? 'ring-4 ring-cyan-400 rounded-full p-1 bg-cyan-950/80 shadow-2xl animate-pulse' : ''
                  }`}
                >
                  {/* Player Avatar Container + Floating Event Badges Next To Photo */}
                  <div className="relative flex items-center justify-center">
                    {/* Floating Event Badges Next To Avatar (Top-Right / Beside Avatar) */}
                    {(player.goals > 0 || player.assists > 0 || player.yellowCards > 0 || player.isRed || player.isInjured) && (
                      <div className="absolute -top-2 -right-7 flex flex-col items-start gap-0.5 pointer-events-none z-30 drop-shadow-md">
                        {player.goals > 0 && (
                          <motion.span
                            initial={{ scale: 0, x: -5 }}
                            animate={{ scale: 1, x: 0 }}
                            className="text-[9.5px] bg-emerald-950/95 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-400 font-black font-mono shadow-lg flex items-center gap-0.5 whitespace-nowrap"
                          >
                            ⚽🔥{player.goals > 1 ? `x${player.goals}` : ''}
                          </motion.span>
                        )}
                        {player.assists > 0 && (
                          <motion.span
                            initial={{ scale: 0, x: -5 }}
                            animate={{ scale: 1, x: 0 }}
                            className="text-[9.5px] bg-cyan-950/95 text-cyan-300 px-1.5 py-0.2 rounded-full border border-cyan-400 font-black font-mono shadow-lg flex items-center gap-0.5 whitespace-nowrap"
                          >
                            🅰️🎯{player.assists > 1 ? `x${player.assists}` : ''}
                          </motion.span>
                        )}
                        {player.yellowCards === 1 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] drop-shadow-lg">
                            🟨⚠️
                          </motion.span>
                        )}
                        {player.yellowCards === 2 && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] drop-shadow-lg">
                            🟨🟨 🟥⛔
                          </motion.span>
                        )}
                        {player.isRed && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] drop-shadow-lg">
                            🟥⛔
                          </motion.span>
                        )}
                        {player.isInjured && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[11px] drop-shadow-lg animate-pulse">
                            🚑🩹
                          </motion.span>
                        )}
                      </div>
                    )}

                    {/* Face Cutout Avatar (Icon) - Clean & Unobstructed */}
                    <div className={`relative flex items-center justify-center w-10 h-10 md:w-13 md:h-13 rounded-full overflow-hidden border-2 shadow-md transition-all ${
                      player.isRed
                        ? 'border-rose-600 ring-2 ring-rose-600/80 bg-rose-950/90 text-rose-300 opacity-60 grayscale'
                        : player.isInjured
                        ? 'border-amber-500 ring-2 ring-amber-500/80 bg-amber-950/90 text-amber-300 animate-pulse'
                        : player.goals > 0
                        ? 'border-emerald-400 ring-2 ring-emerald-400/60 bg-emerald-950/70'
                        : isSelected
                        ? 'border-cyan-400 bg-cyan-900/50 ring-2 ring-cyan-400'
                        : 'border-white/80 bg-slate-900 group-hover:border-[#e6007e]'
                    }`}>
                      <User size={28} className="text-slate-400 opacity-70" />
                    </div>
                  </div>

                  {/* Badge Pill: Position + OVR Rating */}
                  <div className="flex items-center gap-0.5 md:gap-1 mt-0.5 shadow-md">
                    <span
                      className={`text-[8.5px] md:text-[10px] font-black px-1.5 py-0.2 rounded-sm shadow ${
                        POSITION_COLORS[player.position] || 'bg-purple-600 text-white'
                      }`}
                    >
                      {player.position}
                    </span>
                    <span className="text-[10.5px] md:text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] font-mono">
                      {player.overall}
                    </span>
                  </div>

                  {/* Player Name Tag */}
                  <span className="text-[9px] md:text-[11px] font-bold text-white tracking-tight drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] text-center whitespace-nowrap leading-none mt-0.5">
                    {player.isCaptain && (
                      <span className="bg-amber-400 text-black font-black text-[7.5px] md:text-[8px] px-1 ml-0.5 rounded">
                        C
                      </span>
                    )}
                    {player.name}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Formation Label */}
          <div className="relative z-20 text-right pt-1 pr-1">
            <span className="text-xl md:text-3xl font-black text-white font-mono tracking-wider drop-shadow-md">
              {currentFormation}
            </span>
          </div>
        </div>

        {/* BOTTOM: BENCH & RESERVES CONTAINER (زیر چمن) */}
        <div className="bg-slate-900/90 rounded-3xl p-4 md:p-5 border-2 border-purple-900/40 text-white shadow-2xl space-y-4">
          {/* SECTION 1: BENCH SUBSTITUTES (نیمکت ذخیره‌ها) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-black text-sm md:text-base text-purple-300 flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                <span>بازیکنان نیمکت ذخیره (Substitutes - {substitutes.length} نفر)</span>
              </span>
              <span className="text-[11px] text-slate-400">کلیک جهت جابجایی دو بازیکن نیمکت یا تعویض با چمن</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
              {substitutes.map((sub) => {
                const isSelected = selectedBenchPlayerId === sub.id;
                const natPos = sub.naturalPosition || sub.position;
                const isOut = sub.isSubbedOut;

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleBenchPlayerClick(sub, true)}
                    className={`p-2 rounded-2xl border cursor-pointer flex flex-col items-center text-center transition-all relative overflow-hidden ${
                      isOut
                        ? 'opacity-65 bg-rose-950/40 border-rose-800/60 grayscale cursor-not-allowed hover:border-rose-600'
                        : isSelected
                        ? 'bg-gradient-to-r from-purple-900 to-indigo-900 border-2 border-cyan-400 scale-105 shadow-xl ring-2 ring-cyan-400 animate-pulse'
                        : 'bg-slate-800/80 border-slate-700 hover:border-purple-500/60 hover:bg-slate-800'
                    }`}
                  >
                    {isOut && (
                      <span className="absolute top-1 right-1 text-[7px] font-black bg-rose-600 text-white px-1 py-0.2 rounded-full flex items-center gap-0.5 shadow z-10">
                        ↩️ OUT
                      </span>
                    )}

                    <div className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-600 mb-1 bg-slate-900">
                      <User size={18} className={isOut ? 'text-rose-400 opacity-60' : 'text-slate-400 opacity-70'} />
                    </div>

                    <span className={`font-bold text-[9.5px] leading-tight w-full break-words min-h-[26px] flex items-center justify-center line-clamp-2 ${isOut ? 'line-through text-slate-400' : 'text-white'}`}>
                      {sub.name}
                    </span>

                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}>
                        {natPos}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-purple-300">{sub.overall}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISUAL SEPARATOR DIVIDER (خط جداکننده مشخص بین نیمکت و خارج از ترکیب) */}
          {!hideReserves && (
            <>
              <div className="my-4 flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>
            <span className="text-[11px] font-black text-purple-300 px-3 py-1 bg-purple-950/80 rounded-full border border-purple-500/40 shadow-inner flex items-center gap-1.5">
              <ArrowLeftRight size={13} className="text-cyan-400" />
              <span>بازیکنان خارج از بازی و لیست رختکن (Reserves / Out of Squad)</span>
            </span>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent"></div>
          </div>

          {/* SECTION 2: RESERVES / OUT OF SQUAD (خارج از بازی) */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {reserves.map((res) => {
                const isSelected = selectedBenchPlayerId === res.id;
                const natPos = res.naturalPosition || res.position;

                return (
                  <div
                    key={res.id}
                    onClick={() => handleBenchPlayerClick(res, false)}
                    className={`p-2 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${isSelected
                        ? 'bg-purple-900 border-2 border-cyan-400 shadow-lg ring-2 ring-cyan-400 animate-pulse'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}>
                        {natPos}
                      </span>
                      <span className="font-bold text-[9.5px] sm:text-[10.5px] truncate">{res.name}</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">{res.overall}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans dir-rtl text-xs">
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
