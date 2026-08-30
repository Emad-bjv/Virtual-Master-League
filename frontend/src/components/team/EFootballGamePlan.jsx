import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Users, AlertCircle, ArrowLeftRight, User, Sliders, Plus, Zap, Sparkles, Gem, HeartPulse, X } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../common/CustomSelect';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { playerApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import ConfirmModal from '../common/ConfirmModal';

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

// Tactical compatibility map: which positions can effectively play in each target slot
export const POSITION_COMPATIBILITY = {
  GK: ['GK'],
  CB: ['CB', 'LB', 'RB', 'DMF'],
  LB: ['LB', 'CB', 'LMF', 'RB', 'DMF'],
  RB: ['RB', 'CB', 'RMF', 'LB', 'DMF'],
  DMF: ['DMF', 'CMF', 'CB', 'AMF'],
  CMF: ['CMF', 'AMF', 'DMF', 'LMF', 'RMF'],
  AMF: ['AMF', 'CMF', 'SS', 'LWF', 'RWF', 'CF'],
  LMF: ['LMF', 'LWF', 'CMF', 'LB', 'AMF', 'RMF'],
  RMF: ['RMF', 'RWF', 'CMF', 'RB', 'AMF', 'LMF'],
  LWF: ['LWF', 'RWF', 'SS', 'CF', 'LMF', 'AMF'],
  RWF: ['RWF', 'LWF', 'SS', 'CF', 'RMF', 'AMF'],
  SS: ['SS', 'CF', 'LWF', 'RWF', 'AMF'],
  CF: ['CF', 'SS', 'LWF', 'RWF', 'AMF'],
};

export const isPlayerCompatibleWithPosition = (player, targetPos) => {
  if (!player || !targetPos) return false;
  const pNat = player.naturalPosition || player.position;
  const pPos = player.position;
  if (pNat === targetPos || pPos === targetPos) return true;
  const allowed = POSITION_COMPATIBILITY[targetPos] || [targetPos];
  return allowed.includes(pNat) || allowed.includes(pPos);
};

export const isPlayerExactPosition = (player, targetPos) => {
  if (!player || !targetPos) return false;
  const pNat = player.naturalPosition || player.position;
  return pNat === targetPos || player.position === targetPos;
};

// Tiered Escalating Gem Upgrade Costs (پلکانی سناریو ۱: مجموع ~۵,۰۰۰ الماس)
export const GEM_BOOST_TIER_COSTS = {
  1: 10, 2: 15, 3: 20, 4: 25, 5: 35,
  6: 50, 7: 70, 8: 95, 9: 125, 10: 160,
  11: 200, 12: 250, 13: 310, 14: 380, 15: 460,
  16: 550, 17: 650, 18: 760, 19: 880,
};

export const getGemBoostCost = (level) => {
  return GEM_BOOST_TIER_COSTS[level] || 880;
};

export const getGemBoostTargetOvr = (player) => {
  if (!player) return 99;
  const nextLvl = (player.level || 1) + 1;
  if (nextLvl >= 20) return 99;
  const base = player.base_overall || player.overall;
  const fraction = (nextLvl - 1) / 19.0;
  const target = base + Math.round((99 - base) * fraction);
  return Math.min(99, Math.max((player.overall || base) + 1, target));
};

// 14 Tactical Formations Presets
export const FORMATION_PRESETS = {
  '4-3-3 (4-3-3)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'CMF', x: 30, y: 52 },
    { pos: 'CMF', x: 50, y: 56 },
    { pos: 'CMF', x: 70, y: 52 },
    { pos: 'LWF', x: 18, y: 20 },
    { pos: 'RWF', x: 82, y: 20 },
    { pos: 'CF', x: 50, y: 15 },
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
  '4-4-2 (4-4-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'LB', x: 15, y: 72 },
    { pos: 'CB', x: 35, y: 75 },
    { pos: 'CB', x: 65, y: 75 },
    { pos: 'RB', x: 85, y: 72 },
    { pos: 'LMF', x: 15, y: 45 },
    { pos: 'CMF', x: 38, y: 48 },
    { pos: 'CMF', x: 62, y: 48 },
    { pos: 'RMF', x: 85, y: 45 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
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
  '3-5-2 (3-5-2)': [
    { pos: 'GK', x: 50, y: 90 },
    { pos: 'CB', x: 25, y: 75 },
    { pos: 'CB', x: 50, y: 78 },
    { pos: 'CB', x: 75, y: 75 },
    { pos: 'LMF', x: 15, y: 45 },
    { pos: 'CMF', x: 33, y: 52 },
    { pos: 'CMF', x: 50, y: 55 },
    { pos: 'CMF', x: 67, y: 52 },
    { pos: 'RMF', x: 85, y: 45 },
    { pos: 'CF', x: 38, y: 18 },
    { pos: 'CF', x: 62, y: 18 },
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
  formation: initialFormationProp = '4-3-3 (4-3-3)',
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
  onSaveGamePlan,
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

  // Helper to ensure 11 starters are populated from bench if starters departed or suspended
  const buildFullSquad = (starters = [], subs = [], res = [], formPreset) => {
    let currentStarters = [...(starters || [])];
    let currentSubs = [...(subs || [])];
    let currentRes = [...(res || [])];

    // Identify and auto-rotate out suspended or ineligible starters
    const isPlayerIneligible = (p) => {
      if (!p) return false;
      const isSuspended = Boolean((p.suspension_matches > 0) || p.is_suspended || p.isSuspended);
      const isInjured = Boolean(p.is_injured || p.isInjured);
      const isStaminaLocked = Boolean(p.is_locked || p.is_stamina_locked || ((p.virtual_stamina != null && Number(p.virtual_stamina) < 30)));
      return isSuspended || isInjured || isStaminaLocked;
    };

    const ineligibleStarters = currentStarters.filter(isPlayerIneligible);
    if (ineligibleStarters.length > 0) {
      currentStarters = currentStarters.filter((p) => !isPlayerIneligible(p));

      ineligibleStarters.forEach((ineligibleP) => {
        // Find best eligible candidate from bench or reserves
        const eligibleCandidates = [...currentSubs, ...currentRes].filter((p) => !isPlayerIneligible(p));
        const posMatch = eligibleCandidates.find((p) => p.position === ineligibleP.position) ||
                         eligibleCandidates.find((p) => (p.naturalPosition || p.position) === (ineligibleP.naturalPosition || ineligibleP.position)) ||
                         eligibleCandidates[0];

        if (posMatch) {
          currentSubs = currentSubs.filter((p) => p.id !== posMatch.id);
          currentRes = currentRes.filter((p) => p.id !== posMatch.id);

          currentStarters.push({
            ...posMatch,
            x_coord: ineligibleP.x_coord,
            y_coord: ineligibleP.y_coord,
            position: ineligibleP.position,
            naturalPosition: posMatch.naturalPosition || posMatch.position,
            is_starting: true,
          });
        }

        // Place the ineligible player into substitutes
        currentSubs.push({
          ...ineligibleP,
          is_starting: false,
        });
      });
    }

    // Auto-promote bench players if starters are fewer than 11
    if (currentStarters.length < 11 && (currentSubs.length > 0 || currentRes.length > 0)) {
      const needed = 11 - currentStarters.length;
      const eligiblePool = currentSubs.filter((p) => !isPlayerIneligible(p));
      const fromSubs = eligiblePool.splice(0, needed);
      fromSubs.forEach((p) => {
        currentSubs = currentSubs.filter((s) => s.id !== p.id);
      });
      currentStarters.push(...fromSubs);
      if (fromSubs.length < needed && currentRes.length > 0) {
        const stillNeeded = needed - fromSubs.length;
        const eligibleResPool = currentRes.filter((p) => !isPlayerIneligible(p));
        const fromRes = eligibleResPool.splice(0, stillNeeded);
        fromRes.forEach((p) => {
          currentRes = currentRes.filter((r) => r.id !== p.id);
        });
        currentStarters.push(...fromRes);
      }
    }

    const needsAutoLayout = currentStarters.length < 11 || currentStarters.some(
      p => p.x_coord == null || p.y_coord == null || (p.x_coord === 0 && p.y_coord === 0)
    );

    let alignedStarters;
    if (!needsAutoLayout && formPreset) {
      alignedStarters = currentStarters.map((p) => {
        const natPos = p.naturalPosition || p.position;
        let slotPos = p.tacticalPosition;
        if (!slotPos && formPreset) {
          let closestSlot = formPreset[0];
          let minDistance = Infinity;
          for (const s of formPreset) {
            const dx = (p.x_coord || 0) - s.x;
            const dy = (p.y_coord || 0) - s.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDistance) {
              minDistance = dist;
              closestSlot = s;
            }
          }
          if (minDistance < 250) {
            slotPos = closestSlot.pos;
          }
        }
        return {
          ...p,
          naturalPosition: natPos,
          position: slotPos || p.position || natPos,
        };
      });
    } else if (formPreset) {
      alignedStarters = matchPlayersToFormation(currentStarters, formPreset);
    } else {
      alignedStarters = currentStarters;
    }

    return {
      startingXi: alignedStarters,
      substitutes: currentSubs.map(p => ({ ...p, naturalPosition: p.naturalPosition || p.position })),
      reserves: currentRes.map(p => ({ ...p, naturalPosition: p.naturalPosition || p.position })),
    };
  };

  const resolvedInitialFormation = getResolvedFormation(initialFormationProp);
  const [currentFormation, setCurrentFormation] = useState(resolvedInitialFormation);

  const initialSquad = buildFullSquad(
    initialStartingXi,
    initialSubstitutes,
    initialReserves,
    FORMATION_PRESETS[resolvedInitialFormation]
  );

  const [startingXi, setStartingXi] = useState(initialSquad.startingXi);
  const [substitutes, setSubstitutes] = useState(initialSquad.substitutes);
  const [reserves, setReserves] = useState(initialSquad.reserves);

  // Sync formation prop changes if any
  useEffect(() => {
    const resolved = getResolvedFormation(initialFormationProp);
    if (resolved && resolved !== currentFormation) {
      handleFormationChange(resolved, false);
    }
  }, [initialFormationProp]);

  // Sync squad props when loaded asynchronously or when roster changes
  useEffect(() => {
    if (initialStartingXi && initialStartingXi.length > 0) {
      const preset = FORMATION_PRESETS[getResolvedFormation(initialFormationProp)];
      const updated = buildFullSquad(initialStartingXi, initialSubstitutes || [], initialReserves || [], preset);
      setStartingXi(updated.startingXi);
      setSubstitutes(updated.substitutes);
      setReserves(updated.reserves);
    }
  }, [initialStartingXi, initialSubstitutes, initialReserves, initialFormationProp]);

  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState(null);
  const [highlightedPosition, setHighlightedPosition] = useState(null);
  const [adminModalPlayer, setAdminModalPlayer] = useState(null);
  const [subModalBenchSelect, setSubModalBenchSelect] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Active Target Position for Highlighting Compatible Players across pitch & bench
  const activeHighlightPos = useMemo(() => {
    if (highlightedPosition) return highlightedPosition;
    if (selectedPitchPlayerId) {
      const p = startingXi.find((item) => item.id === selectedPitchPlayerId);
      return p ? p.position : null;
    }
    if (selectedBenchPlayerId) {
      const p = substitutes.find((item) => item.id === selectedBenchPlayerId) ||
                reserves.find((item) => item.id === selectedBenchPlayerId);
      return p ? (p.naturalPosition || p.position) : null;
    }
    return null;
  }, [highlightedPosition, selectedPitchPlayerId, selectedBenchPlayerId, startingXi, substitutes, reserves]);

  // Gem Player Actions (Stamina Recovery & Boost)
  const { team, updateTeamGems, updatePlayerState } = useTeam();
  const [actionPlayerToRecover, setActionPlayerToRecover] = useState(null);
  const [actionPlayerToBoost, setActionPlayerToBoost] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleRecoverStamina = async (player) => {
    if (!player) return;
    setIsActionLoading(true);
    try {
      const res = await playerApi.recoverStamina(player.id);
      const newStamina = res.data?.new_stamina || Math.min(100, (player.virtual_stamina || player.stamina || 50) + 50);

      const updateList = (list) =>
        list.map((p) => (p.id === player.id ? { ...p, virtual_stamina: newStamina, stamina: newStamina, is_locked: false } : p));

      const newXi = updateList(startingXi);
      const newSubs = updateList(substitutes);
      const newRes = updateList(reserves);

      setStartingXi(newXi);
      setSubstitutes(newSubs);
      setReserves(newRes);

      if (updatePlayerState) {
        updatePlayerState(player.id, { virtual_stamina: newStamina, stamina: newStamina, is_locked: false });
      }
      if (updateTeamGems && res.data?.remaining_gems !== undefined) {
        updateTeamGems(res.data.remaining_gems);
      }
      showNotification(`⚡ استقامت «${player.name}» با موفقیت ۵۰٪ شارژ شد! (استقامت فعلی: ${Math.round(newStamina)}٪)`);
      setActionPlayerToRecover(null);
      if (onLineupChange) {
        onLineupChange({ startingXi: newXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
      }
    } catch (err) {
      showNotification('خطا در شارژ استقامت: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGemBoost = async (player) => {
    if (!player) return;
    setIsActionLoading(true);
    try {
      const res = await playerApi.gemBoost(player.id);
      const updatedP = res.data?.player;
      const newLevel = updatedP?.level || (player.level || 1) + 1;
      const newOvr = updatedP?.overall || player.overall + 1;

      const updateList = (list) =>
        list.map((p) => (p.id === player.id ? { ...p, level: newLevel, overall: newOvr } : p));

      const newXi = updateList(startingXi);
      const newSubs = updateList(substitutes);
      const newRes = updateList(reserves);

      setStartingXi(newXi);
      setSubstitutes(newSubs);
      setReserves(newRes);

      if (updatePlayerState) {
        updatePlayerState(player.id, { level: newLevel, overall: newOvr });
      }
      if (updateTeamGems && res.data?.remaining_gems !== undefined) {
        updateTeamGems(res.data.remaining_gems);
      }
      showNotification(`💎 سطح «${player.name}» با موفقیت به لول ${newLevel} و OVR ${newOvr} ارتقا یافت! ✨`);
      setActionPlayerToBoost(null);
      if (onLineupChange) {
        onLineupChange({ startingXi: newXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
      }
    } catch (err) {
      showNotification('خطا در ارتقای بازیکن: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  const isTacticsDisabled = false;

  // Change Formation Handler
  const handleFormationChange = (newFormation, notify = true) => {
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
  const handleAdminSetRating = (ratingVal) => {
    if (!adminModalPlayer) return;
    const targetId = adminModalPlayer.id;
    setStartingXi((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, rating: ratingVal } : p))
    );
    setSubstitutes((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, rating: ratingVal } : p))
    );
    const text = `نمره مسابقه برای ${adminModalPlayer.name} (${teamName}) روی ${ratingVal} ★ ثبت شد ⭐`;
    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'RATING',
        text,
        team: teamName,
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
        icon: '⭐',
        color: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

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
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
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
        type: 'UNDO_GOAL',
        text,
        team: teamName,
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
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
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
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
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
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
        player_id: adminModalPlayer.id,
        player_name: adminModalPlayer.name,
        icon,
        color,
      });
    }
    showNotification(text);
    setAdminModalPlayer(null);
  };

  // Toggle Position Highlight Mode
  // Toggle Position Highlight Mode
  const handlePositionHighlight = (posCode) => {
    if (!posCode) return;
    const nextPos = highlightedPosition === posCode ? null : posCode;
    setHighlightedPosition(nextPos);
    setSelectedPitchPlayerId(null);
    setSelectedBenchPlayerId(null);
    if (nextPos) {
      const info = POSITION_INFO[nextPos]?.title || nextPos;
      showNotification(`هایلایت بازیکنان تخصصی و سازگار پست «${nextPos} (${info})» ⭐`);
    }
  };

  // Pitch Player Click Handler
  const handlePitchPlayerClick = (clickedPlayer) => {
    if (isAdminMode) {
      setAdminModalPlayer(clickedPlayer);
      setSubModalBenchSelect(false);
      return;
    }

    if (readOnly) return;

    // Scenario 1: A bench/reserve player was pre-selected -> Swap pitch player with bench player
    if (selectedBenchPlayerId) {
      swapPitchWithBench(clickedPlayer.id, selectedBenchPlayerId);
      setSelectedBenchPlayerId(null);
      setHighlightedPosition(null);
      return;
    }

    // Scenario 2: No player currently selected -> Select this pitch player on FIRST CLICK
    if (!selectedPitchPlayerId) {
      setSelectedPitchPlayerId(clickedPlayer.id);
      setHighlightedPosition(clickedPlayer.position);
      const posTitle = POSITION_INFO[clickedPlayer.position]?.title || clickedPlayer.position;
      showNotification(`پست «${clickedPlayer.position} - ${posTitle}» انتخاب شد. بازیکنان واجد شرایط با ⭐ مشخص شدند.`);
      return;
    }

    // Scenario 3: Clicked the same player -> Unselect
    if (selectedPitchPlayerId === clickedPlayer.id) {
      setSelectedPitchPlayerId(null);
      setHighlightedPosition(null);
      return;
    }

    // Scenario 4: Clicked another player on the pitch -> Swap their coordinates on pitch!
    swapPitchPositions(selectedPitchPlayerId, clickedPlayer.id);
    setSelectedPitchPlayerId(null);
    setHighlightedPosition(null);
  };

  // Bench / Reserve Player Click Handler
  const handleBenchPlayerClick = (clickedBenchPlayer, isFromSubstitutes = true) => {
    if (isAdminMode) {
      setAdminModalPlayer(clickedBenchPlayer);
      return;
    }

    if (readOnly) return;

    // Scenario 1: A pitch player was pre-selected -> Swap pitch player with clicked bench player
    if (selectedPitchPlayerId) {
      swapPitchWithBench(selectedPitchPlayerId, clickedBenchPlayer.id, isFromSubstitutes);
      setSelectedPitchPlayerId(null);
      setHighlightedPosition(null);
      return;
    }

    // Scenario 2: A bench player was ALREADY selected -> Swap two bench/reserve players!
    if (selectedBenchPlayerId) {
      if (selectedBenchPlayerId === clickedBenchPlayer.id) {
        setSelectedBenchPlayerId(null); // Clicked same -> unselect
        setHighlightedPosition(null);
      } else {
        swapBenchOrReserves(selectedBenchPlayerId, clickedBenchPlayer.id);
        setSelectedBenchPlayerId(null);
        setHighlightedPosition(null);
      }
      return;
    }

    // Scenario 3: Select bench/reserve player on FIRST CLICK
    setSelectedBenchPlayerId(clickedBenchPlayer.id);
    const naturalPos = clickedBenchPlayer.naturalPosition || clickedBenchPlayer.position;
    setHighlightedPosition(naturalPos);
    const posTitle = POSITION_INFO[naturalPos]?.title || naturalPos;
    showNotification(`بازیکن «${clickedBenchPlayer.name} (${naturalPos} - ${posTitle})» انتخاب شد. خانه‌های مناسب در چمن با ⭐ مشخص شدند.`);
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
    const pitchPlayer = startingXi.find((p) => p.id === pitchId);
    const benchSourceList = isFromSubstitutes ? substitutes : reserves;
    const benchPlayer = benchSourceList.find((b) => b.id === benchId) || substitutes.find((b) => b.id === benchId) || reserves.find((b) => b.id === benchId);

    if (!pitchPlayer || !benchPlayer) return;

    if (benchPlayer.suspension_matches > 0 || benchPlayer.is_suspended || benchPlayer.isSuspended) {
      showNotification(`⚠️ بازیکن «${benchPlayer.name}» به دلیل محرومیت (کارت قرمز) نمی‌تواند در ترکیب اصلی قرار گیرد 🟥`);
      return;
    }

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

    // 2. Move pitch player to bench: RESTORED to their naturalPosition
    const newBenchPlayer = {
      ...pitchPlayer,
      naturalPosition: pitchNaturalPos,
      position: pitchNaturalPos, // Restored to natural position on bench!
      x_coord: undefined,
      y_coord: undefined,
      face: pitchPlayer.face,
      is_starting: false,
      isSubbedOut: false,
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

  // Helper to calculate any unoccupied slots in current formation
  const currentPreset = FORMATION_PRESETS[currentFormation] || [];
  const unoccupiedSlots = useMemo(() => {
    if (startingXi.length >= 11) return [];
    const occupiedCoords = new Set(
      startingXi.map((p) => `${Math.round(p.x_coord || 0)}_${Math.round(p.y_coord || 0)}`)
    );
    return currentPreset.filter((slot) => !occupiedCoords.has(`${Math.round(slot.x)}_${Math.round(slot.y)}`));
  }, [startingXi, currentPreset]);

  // Click handler for empty pitch slots
  const handleEmptySlotClick = (slot) => {
    if (readOnly) return;
    if (selectedBenchPlayerId) {
      const benchPlayer = substitutes.find((b) => b.id === selectedBenchPlayerId) || reserves.find((r) => r.id === selectedBenchPlayerId);
      if (!benchPlayer) return;

      if (benchPlayer.suspension_matches > 0 || benchPlayer.is_suspended || benchPlayer.isSuspended) {
        showNotification(`⚠️ بازیکن «${benchPlayer.name}» به دلیل محرومیت (کارت قرمز) نمی‌تواند در ترکیب اصلی قرار گیرد 🟥`);
        return;
      }

      const newPitchPlayer = {
        ...benchPlayer,
        naturalPosition: benchPlayer.naturalPosition || benchPlayer.position,
        position: slot.pos,
        x_coord: slot.x,
        y_coord: slot.y,
        is_starting: true,
      };

      const updatedXi = [...startingXi, newPitchPlayer];
      const newSubs = substitutes.filter((b) => b.id !== selectedBenchPlayerId);
      const newRes = reserves.filter((r) => r.id !== selectedBenchPlayerId);

      setStartingXi(updatedXi);
      setSubstitutes(newSubs);
      setReserves(newRes);
      setSelectedBenchPlayerId(null);
      setHighlightedPosition(null);
      showNotification(`بازیکن «${benchPlayer.name}» در پست ${slot.pos} در ترکیب اصلی قرار گرفت ✅`);
      if (onLineupChange) {
        onLineupChange({ startingXi: updatedXi, substitutes: newSubs, reserves: newRes, formation: currentFormation });
      }
    } else {
      handlePositionHighlight(slot.pos);
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
          <div className="p-3.5 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg bg-[#080c14]/90 border-cyan-500/40 text-cyan-200">
            <div className="flex items-center gap-2.5">
              <span className="text-base">{matchState === 'HALF_TIME' ? '⏸️' : matchState === 'FINISHED' ? '🏁' : '🟢'}</span>
              <div>
                <p className="font-black text-white text-xs md:text-sm flex items-center gap-2">
                  <span>
                    وضعیت مسابقه:{' '}
                    {matchState === 'FIRST_HALF' || matchState === '1ST_HALF'
                      ? 'شروع نیمه اول'
                      : matchState === 'HALF_TIME'
                      ? 'بین دو نیمه'
                      : matchState === 'SECOND_HALF' || matchState === '2ND_HALF'
                      ? 'شروع نیمه دوم'
                      : matchState === 'FINISHED'
                      ? 'پایان بازی'
                      : 'در انتظار شروع مسابقه'}
                  </span>
                  {matchState === 'HALF_TIME' && (
                    <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-sport font-black text-xs animate-pulse">
                      ⏱️ {halfTimeSeconds} ثانیه
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  ارسال و اعمال تغییرات تاکتیکی و جابجایی بازیکنان بدون محدودیت تعداد فعال است.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10.5px] font-sport font-black bg-cyan-950 text-cyan-300 px-3 py-1 rounded-xl border border-cyan-500/40">
                ارسال تغییرات: نامحدود ⚡
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

        {/* ACTIVE POSITION HIGHLIGHT BANNER */}
        {activeHighlightPos && (
          <div className="bg-gradient-to-r from-emerald-950/95 via-[#081f1d] to-[#080c14] border border-emerald-400/60 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.25)] backdrop-blur-xl animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="text-base animate-bounce">⭐</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-xs sm:text-sm">
                    {highlightedPosition ? 'هایلایت پست:' : 'انتخاب پست چیدمان:'}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded shadow ${POSITION_COLORS[activeHighlightPos] || 'bg-emerald-600 text-slate-950'}`}>
                    {activeHighlightPos} ({POSITION_INFO[activeHighlightPos]?.title || activeHighlightPos})
                  </span>
                </div>
                <p className="text-[10.5px] text-emerald-300/80 mt-0.5 hidden sm:block">
                  تمام بازیکنان تخصصی و سازگار با این پست با ستاره طلایی ⭐ و کادر سبز در چمن و نیمکت مشخص شده‌اند.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHighlightedPosition(null);
                setSelectedPitchPlayerId(null);
                setSelectedBenchPlayerId(null);
              }}
              className="flex items-center gap-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/50 transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
            >
              <X size={14} />
              <span>لغو هایلایت</span>
            </button>
          </div>
        )}

        {/* SELECTED PLAYER POSITION & QUICK GEM ACTIONS BAR */}
        {activeSelectedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="fc-card-elevated p-3 sm:p-4 rounded-3xl border border-cyan-500/40 text-white space-y-2.5 shadow-2xl bg-gradient-to-b from-[#0f172a] via-[#0b1120] to-[#05080e]"
          >
            {/* Top Row: Photo + Details + Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Portrait Photo */}
                <div className="w-12 h-14 rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-[#1e293b] to-[#0f172a] shrink-0 flex items-center justify-center relative shadow-inner">
                  {getPlayerPhotoUrl(activeSelectedPlayer) ? (
                    <img
                      src={getPlayerPhotoUrl(activeSelectedPlayer)}
                      alt={activeSelectedPlayer.name}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <User size={22} className="text-slate-400 opacity-75" />
                  )}
                </div>

                {/* Info */}
                <div className="space-y-0.5 font-sport">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9.5px] font-black px-2 py-0.5 rounded shadow ${POSITION_COLORS[displayPosCode] || 'bg-purple-600'}`}>
                      {displayPosCode}
                    </span>
                    <span className="font-black text-xs sm:text-sm text-white font-sans">
                      {activeSelectedPlayer.name}
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                      OVR {activeSelectedPlayer.overall}
                    </span>
                    <span className="text-[9.5px] text-cyan-300 font-bold bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                      لول {activeSelectedPlayer.level || 1}/۲۰
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-300">
                    <span>
                      استقامت:{' '}
                      <strong
                        className={
                          Math.round(Number(activeSelectedPlayer.virtual_stamina || activeSelectedPlayer.stamina || 90)) < 50
                            ? 'text-rose-400 font-bold'
                            : 'text-[#00ff87] font-bold'
                        }
                      >
                        {Math.round(Number(activeSelectedPlayer.virtual_stamina || activeSelectedPlayer.stamina || 90))}%
                      </strong>
                    </span>
                    {activeSelectedPlayer.potential_ovr && (
                      <span>
                        پتانسیل: <strong className="text-purple-300 font-bold">{activeSelectedPlayer.potential_ovr}</strong>
                      </span>
                    )}
                    {activeSelectedPlayer.is_injured && (
                      <span className="text-rose-400 font-bold bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/40">
                        مصدوم
                      </span>
                    )}
                    {(activeSelectedPlayer.suspension_matches > 0 || activeSelectedPlayer.is_suspended) && (
                      <span className="text-red-300 font-bold bg-red-950/90 px-2 py-0.5 rounded-full border border-red-500/60 shadow flex items-center gap-1">
                        <span>🟥</span> محروم ({activeSelectedPlayer.suspension_matches || 1} بازی)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gem Quick Action Buttons (Compact, non-intrusive) */}
              {!readOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Recover Stamina Button */}
                  <button
                    onClick={() => setActionPlayerToRecover(activeSelectedPlayer)}
                    disabled={Math.round(Number(activeSelectedPlayer.virtual_stamina || activeSelectedPlayer.stamina || 90)) >= 100}
                    className={`px-3 py-2 rounded-2xl font-sport text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      Math.round(Number(activeSelectedPlayer.virtual_stamina || activeSelectedPlayer.stamina || 90)) >= 100
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 border border-emerald-400/50 active:scale-95'
                    }`}
                    title="شارژ فوری ۵۰٪ استقامت بازیکن با ۱۵ جم"
                  >
                    <Zap size={14} className={Math.round(Number(activeSelectedPlayer.virtual_stamina || activeSelectedPlayer.stamina || 90)) >= 100 ? 'text-slate-500' : 'text-slate-950 fill-slate-950'} />
                    <span>ریکاوری استقامت (۱۵ 💎)</span>
                  </button>

                  {/* Gem Boost / Level Up Button */}
                  <button
                    onClick={() => setActionPlayerToBoost(activeSelectedPlayer)}
                    disabled={(activeSelectedPlayer.level || 1) >= 20}
                    className={`px-3 py-2 rounded-2xl font-sport text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      (activeSelectedPlayer.level || 1) >= 20
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/50 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    }`}
                    title={`ارتقای لول و قدرت با ${activeSelectedPlayer.next_level_gem_cost || getGemBoostCost(activeSelectedPlayer.level || 1)} الماس`}
                  >
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>ارتقای بازیکن ({activeSelectedPlayer.next_level_gem_cost || getGemBoostCost(activeSelectedPlayer.level || 1)} 💎)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tactical Position Description */}
            {POSITION_INFO[displayPosCode] && (
              <p className="text-[10.5px] text-slate-400 leading-relaxed border-t border-slate-800/80 pt-1.5">
                <strong className="text-cyan-300">{POSITION_INFO[displayPosCode].title}: </strong>
                {POSITION_INFO[displayPosCode].desc}
              </p>
            )}
          </motion.div>
        )}

        {/* TOP: GREEN FOOTBALL PITCH CONTAINER */}
        <div 
          onClick={() => {
            if (highlightedPosition) setHighlightedPosition(null);
          }}
          className="fc-pitch-turf rounded-2xl sm:rounded-3xl p-2 sm:p-3 md:p-5 border-2 border-cyan-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative flex flex-col justify-between min-h-[480px] sm:min-h-[560px] md:min-h-[680px] overflow-hidden select-none"
        >
          {/* Turf Mowing Stripes & Center Spotlight */}
          <div className="absolute inset-0 fc-pitch-mow-stripes opacity-70 pointer-events-none"></div>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[400px] md:w-[450px] h-[320px] sm:h-[400px] md:h-[450px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(0, 243, 255, 0.08) 0%, rgba(0, 255, 135, 0.04) 50%, transparent 80%)',
            }}
          />

          {/* Pitch Lines (Neon Cyan Line Art) */}
          <div className="absolute inset-2 sm:inset-3 border-2 border-cyan-400/60 rounded-xl sm:rounded-2xl pointer-events-none shadow-[0_0_15px_rgba(0,243,255,0.2)]"></div>

          {/* Penalty Boxes & Circle */}
          <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 w-36 sm:w-48 md:w-64 h-16 sm:h-24 md:h-32 border-2 border-cyan-400/60 border-t-0 rounded-b-xl sm:rounded-b-2xl pointer-events-none overflow-hidden">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-18 sm:w-24 h-7 sm:h-10 border-2 border-cyan-400/40 border-t-0 rounded-b-lg sm:rounded-b-xl"></div>
          </div>
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 w-36 sm:w-48 md:w-64 h-16 sm:h-24 md:h-32 border-2 border-cyan-400/60 border-b-0 rounded-t-xl sm:rounded-t-2xl pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-18 sm:w-24 h-7 sm:h-10 border-2 border-cyan-400/40 border-b-0 rounded-t-lg sm:rounded-t-xl"></div>
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400/60 pointer-events-none shadow-[0_0_8px_rgba(0,243,255,0.3)]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 sm:w-28 md:w-40 h-20 sm:h-28 md:h-40 rounded-full border-2 border-cyan-400/60 pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-cyan-300 pointer-events-none shadow-[0_0_10px_#00f3ff]"></div>

          {/* Watermark Logo Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <Shield size={140} className="text-cyan-400" />
          </div>

          {/* PLAYERS ON PITCH */}
          <div className="relative w-full h-[450px] sm:h-[530px] md:h-[630px]">
            {startingXi.map((player) => {
              const isSelected = selectedPitchPlayerId === player.id;
              const natPos = player.naturalPosition || player.position;
              const isPositionMatch = Boolean(activeHighlightPos && isPlayerCompatibleWithPosition(player, activeHighlightPos));
              const isExactMatch = Boolean(activeHighlightPos && (player.naturalPosition === activeHighlightPos || player.position === activeHighlightPos));
              const isDimmed = (activeHighlightPos && !isSelected && !isPositionMatch);
              const isOutOfPosition = Boolean(player.naturalPosition && player.position && player.naturalPosition !== player.position);
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
                  : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';

              const photoUrl = getPlayerPhotoUrl(player);

              return (
                <motion.div
                  key={player.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePitchPlayerClick(player);
                  }}
                  initial={false}
                  animate={{
                    left: `${player.x_coord}%`,
                    top: `${player.y_coord}%`,
                    scale: isPositionMatch ? 1.08 : isSelected ? 1.05 : 1,
                    opacity: isDimmed ? 0.35 : 1,
                  }}
                  transition={{
                    duration: 0.12,
                    ease: 'easeOut',
                  }}
                  style={{ willChange: 'left, top, transform' }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[62px] sm:w-[76px] md:w-[94px] flex flex-col items-center cursor-pointer group z-10 hover:z-30 transition-transform duration-100 active:scale-105 ${
                    isSelected ? 'ring-2 sm:ring-4 ring-cyan-400 rounded-xl sm:rounded-2xl p-0.5 sm:p-1 bg-cyan-950/90 shadow-[0_0_20px_rgba(0,243,255,0.6)]' : ''
                  }`}
                >
                  {/* Player Avatar Container + Floating Event Badges */}
                  <div className="relative flex items-center justify-center">
                    {/* Golden Star for Position Highlight Match */}
                    {isPositionMatch && (
                      <span className="absolute -top-1.5 -left-1.5 z-40 text-amber-300 text-[13px] sm:text-[15px] drop-shadow-[0_0_6px_#f59e0b] animate-bounce pointer-events-none" title={isExactMatch ? 'پست تخصصی اصلی ⭐' : 'پست سازگار و قابل بازی ⭐'}>
                        ⭐
                      </span>
                    )}

                    {/* Out of Position Warning Badge */}
                    {isOutOfPosition && (
                      <span
                        className="absolute -top-1.5 -right-1.5 z-50 bg-amber-500 text-black text-[10px] sm:text-[11px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white shadow-[0_0_10px_rgba(245,158,11,0.9)] flex items-center justify-center leading-none pointer-events-none animate-pulse"
                        title={`⚠️ پست غیرتخصصی! پست اصلی: ${player.naturalPosition} (پست در چمن: ${player.position})`}
                      >
                        ⚠️
                      </span>
                    )}

                    {/* Top-Right Blue Rating Pill Badge (Only in Live/Admin match mode) */}
                    {(isLiveMode || isAdminMode) && (player.rating != null || (isAdminMode && player.goals > 0)) && (
                      <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2.5 z-30 bg-sky-500 text-slate-950 font-black text-[7.5px] sm:text-[9px] md:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full shadow-md border border-sky-300 flex items-center gap-0.5 font-sport leading-none pointer-events-none">
                        {player.rating || (player.goals >= 3 ? '10.0' : player.goals >= 1 ? '8.5' : '7.0')} ★
                      </span>
                    )}

                    {/* Top-Left Subbed-Off / Booked Minute Badge (Only in Live/Admin match mode) */}
                    {(isLiveMode || isAdminMode) && player.subMinute && (
                      <span className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2.5 z-30 bg-black/95 text-white font-black text-[7px] sm:text-[8.5px] md:text-[9.5px] px-1 sm:px-1.5 py-0.2 rounded-full border border-rose-500 shadow-md flex items-center gap-0.5 font-sport leading-none pointer-events-none">
                        <span>{player.subMinute}'</span>
                        <span className="text-rose-400 font-black">←</span>
                      </span>
                    )}

                    {/* FUT Portrait Photo Card Frame (Circular/Pill Frame) */}
                    <div className={`relative flex items-center justify-center w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-1.5 sm:border-2 shadow-xl transition-all ${
                      (player.isRed || player.is_suspended || player.suspension_matches > 0)
                        ? 'border-rose-600 ring-2 ring-rose-600/80 bg-rose-950/90 text-rose-300 opacity-70 grayscale'
                        : (player.isInjured || player.is_injured)
                        ? 'border-amber-500 ring-2 ring-amber-500/80 bg-amber-950/90 text-amber-300 animate-pulse'
                        : isPositionMatch
                        ? 'border-emerald-400 bg-emerald-950/80 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                        : ((isLiveMode || isAdminMode) && (player.in_match_goals || player.goals) > 0)
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
                        <User size={20} className="text-slate-300 opacity-85" />
                      </div>

                      {/* Shirt Number Tag Overlay */}
                      {player.shirt_number != null && (
                        <span className="absolute bottom-0 right-0 bg-[#05080e]/95 text-cyan-300 text-[7px] sm:text-[8px] md:text-[9px] font-sport font-black px-0.5 sm:px-1 rounded-tl-md border-t border-l border-cyan-500/30">
                          #{player.shirt_number}
                        </span>
                      )}
                    </div>

                    {/* In Coach Mode: Clean Injury or Suspension Pill Indicator */}
                    {!isLiveMode && !isAdminMode && (player.is_injured || player.isInjured || (player.suspension_matches > 0) || player.is_suspended) && (
                      <div className="absolute -bottom-2 z-30 flex items-center justify-center pointer-events-none drop-shadow">
                        {(player.is_injured || player.isInjured) ? (
                          <span className="bg-rose-950 text-rose-300 border border-rose-500 text-[7px] sm:text-[8px] font-black px-1.5 py-0.2 rounded-full shadow flex items-center gap-0.5">
                            🩹 مصدوم
                          </span>
                        ) : (
                          <span className="bg-red-950 text-red-300 border border-red-500 text-[7px] sm:text-[8px] font-black px-1.5 py-0.2 rounded-full shadow flex items-center gap-0.5">
                            🟥 محروم
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Overlapping Event Badges (Only in Live / Admin Match Broadcast) */}
                    {(isLiveMode || isAdminMode) && ((player.in_match_goals || 0) > 0 || (player.in_match_assists || 0) > 0 || player.yellowCards > 0 || player.isRed || player.isInjured) && (
                      <div className="absolute -bottom-2.5 z-30 flex items-center justify-center -space-x-1 drop-shadow-md pointer-events-none">
                        {/* Assist Badges (Shoes) */}
                        {Array.from({ length: player.in_match_assists || 0 }).map((_, aIdx) => (
                          <div key={`ast-${aIdx}`} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white border border-slate-400 shadow-md flex items-center justify-center text-[8px] sm:text-[10px] md:text-[11px] shrink-0" title="پاس گل">
                            👟
                          </div>
                        ))}
                        {/* Goal Badges (Soccer Balls) */}
                        {Array.from({ length: player.in_match_goals || 0 }).map((_, gIdx) => (
                          <div key={`goal-${gIdx}`} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-white border border-slate-400 shadow-md flex items-center justify-center text-[8px] sm:text-[10px] md:text-[11px] shrink-0" title="گل">
                            ⚽
                          </div>
                        ))}
                        {/* Yellow Card Badge */}
                        {player.yellowCards === 1 && (
                          <div className="w-3.5 h-4 sm:w-4 sm:h-5 rounded bg-amber-400 border border-amber-300 shadow flex items-center justify-center text-[7.5px] sm:text-[9px] font-bold text-black shrink-0" title="کارت زرد">
                            🟨
                          </div>
                        )}
                        {/* Second Yellow / Red Card */}
                        {player.yellowCards === 2 && (
                          <div className="w-3.5 h-4 sm:w-4 sm:h-5 rounded bg-rose-600 border border-rose-400 shadow flex items-center justify-center text-[7.5px] sm:text-[9px] font-bold text-white shrink-0" title="کارت قرمز (دو کارته)">
                            🟥
                          </div>
                        )}
                        {/* Direct Red Card */}
                        {player.isRed && player.yellowCards !== 2 && (
                          <div className="w-3.5 h-4 sm:w-4 sm:h-5 rounded bg-rose-600 border border-rose-400 shadow flex items-center justify-center text-[7.5px] sm:text-[9px] font-bold text-white shrink-0" title="کارت قرمز مستقیم">
                            🟥
                          </div>
                        )}
                        {/* Injury Badge */}
                        {player.isInjured && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-950 border border-rose-400 shadow flex items-center justify-center text-[8px] sm:text-[9px] shrink-0 animate-pulse" title="مصدوم">
                            🩹
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badge Pill: Position + Championship Gold OVR Rating */}
                  <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 shadow-lg z-10">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePositionHighlight(posCode);
                      }}
                      className={`text-[7px] sm:text-[8px] md:text-[9px] px-1 sm:px-1.5 py-0.2 rounded-md shadow cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
                        POSITION_COLORS[posCode] || 'bg-purple-600 text-white font-bold'
                      }`}
                      title={`کلیک جهت هایلایت همه بازیکنان ${posCode}`}
                    >
                      {posCode}
                    </span>
                    <span className="text-[9px] sm:text-[10.5px] md:text-xs font-black text-amber-300 bg-amber-950/90 border border-amber-400/50 px-0.5 sm:px-1 rounded-md drop-shadow font-sport tracking-wide">
                      {player.overall}
                    </span>
                  </div>

                  {/* Player Name Tag */}
                  <span className="text-[7.5px] sm:text-[8.5px] md:text-[10px] font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] text-center whitespace-nowrap leading-none mt-0.5 max-w-[60px] sm:max-w-[74px] md:max-w-[90px] truncate bg-[#05080e]/85 px-1 sm:px-1.5 py-0.5 rounded-md border border-white/10">
                    {player.isCaptain && (
                      <span className="bg-amber-400 text-black font-black text-[6.5px] sm:text-[7.5px] px-0.5 ml-0.5 rounded">
                        C
                      </span>
                    )}
                    {player.name}
                  </span>

                  {/* Stamina / Readiness Bar under Player Name */}
                  <div 
                    className="w-9 sm:w-12 md:w-14 h-1 sm:h-1.5 bg-[#05080e]/95 rounded-full overflow-hidden border border-white/15 p-0.2 mt-0.5 shadow-inner"
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

            {/* Render Empty Formation Slots if fewer than 11 players on pitch */}
            {unoccupiedSlots.map((slot, sIdx) => {
              const isSlotHighlighted = Boolean(activeHighlightPos && (activeHighlightPos === slot.pos || (POSITION_COMPATIBILITY[activeHighlightPos] || []).includes(slot.pos)));
              return (
                <motion.div
                  key={`empty-slot-${sIdx}-${slot.pos}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmptySlotClick(slot);
                  }}
                  initial={false}
                  animate={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    scale: isSlotHighlighted ? 1.08 : 1,
                    opacity: 1,
                  }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  style={{ willChange: 'left, top, transform' }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[62px] sm:w-[76px] md:w-[94px] flex flex-col items-center cursor-pointer group z-10 hover:z-30 transition-all ${
                    isSlotHighlighted ? 'ring-2 ring-emerald-400 rounded-xl sm:rounded-2xl p-0.5 bg-emerald-950/70 shadow-[0_0_20px_rgba(52,211,153,0.7)]' : ''
                  }`}
                >
                  <div className={`relative flex items-center justify-center w-10 h-12 sm:w-12 sm:h-14 md:w-14 md:h-16 rounded-xl sm:rounded-2xl border-2 border-dashed shadow-lg flex-col gap-0.5 sm:gap-1 transition-all group-hover:scale-105 ${
                    isSlotHighlighted
                      ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300 ring-2 ring-emerald-400'
                      : 'border-cyan-400/80 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 animate-pulse'
                  }`}>
                    <User size={20} className={isSlotHighlighted ? 'text-emerald-300 opacity-85' : 'text-cyan-300/70 opacity-75'} />
                    <span className="text-[7.5px] sm:text-[8.5px] font-black tracking-tight">خالی</span>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1 shadow-lg z-10">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePositionHighlight(slot.pos);
                      }}
                      className={`text-[7px] sm:text-[8px] md:text-[9px] px-1 sm:px-1.5 py-0.2 rounded-md shadow cursor-pointer transition-transform hover:scale-110 active:scale-95 ${
                        POSITION_COLORS[slot.pos] || 'bg-purple-600 text-white font-bold'
                      }`}
                      title={`کلیک جهت هایلایت همه بازیکنان ${slot.pos}`}
                    >
                      {slot.pos}
                    </span>
                    <span className={`text-[7.5px] sm:text-[8.5px] px-1 py-0.2 rounded-md font-black border ${
                      isSlotHighlighted
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/50'
                        : 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40'
                    }`}>
                      +انتخاب
                    </span>
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-black text-cyan-200/80 tracking-tight text-center whitespace-nowrap leading-none mt-0.5 bg-[#05080e]/80 px-1 py-0.5 rounded-md border border-cyan-500/20">
                    جای خالی
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Formation Label */}
          <div className="relative z-20 text-right pt-1 pr-1 flex justify-between items-end bg-[#080c14]/70 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/10 backdrop-blur-md">
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
                const isPosMatch = Boolean(activeHighlightPos && isPlayerCompatibleWithPosition(sub, activeHighlightPos));
                const isExactMatch = Boolean(activeHighlightPos && isPlayerExactPosition(sub, activeHighlightPos));
                const isDimmed = activeHighlightPos && !isSelected && !isPosMatch;
                const isOut = sub.isSubbedOut;
                const isSuspended = Boolean((sub.suspension_matches > 0) || sub.is_suspended || sub.isSuspended);
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
                      isDimmed ? 'opacity-35' : ''
                    } ${
                      isSuspended
                        ? 'bg-red-950/40 border-red-700/80 hover:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : isOut
                        ? 'opacity-65 bg-rose-950/40 border-rose-800/60 grayscale cursor-not-allowed hover:border-rose-600'
                        : isPosMatch
                        ? 'bg-emerald-950/70 border-2 border-emerald-400 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.5)] ring-2 ring-emerald-400'
                        : isSelected
                        ? 'bg-gradient-to-r from-cyan-950 to-purple-950 border-2 border-cyan-400 scale-105 shadow-[0_0_15px_rgba(0,243,255,0.4)] ring-2 ring-cyan-400'
                        : 'bg-[#0f172a]/80 border-slate-700/60 hover:border-cyan-400/60 hover:bg-slate-800'
                    }`}
                  >
                    {isPosMatch && (
                      <span className="absolute top-1 left-1 text-amber-300 text-[12px] drop-shadow-[0_0_6px_#f59e0b] z-20 animate-bounce pointer-events-none" title={isExactMatch ? 'پست تخصصی اصلی ⭐' : 'پست سازگار و قابل بازی ⭐'}>
                        ⭐
                      </span>
                    )}
                    {isSuspended && (
                      <span className="absolute top-1 right-1 text-[7px] font-black bg-red-600 text-white px-1 py-0.2 rounded-full flex items-center gap-0.5 shadow z-10 font-sport">
                        🟥 محروم
                      </span>
                    )}
                    {isOut && !isSuspended && (
                      <span className="absolute top-1 right-1 text-[7px] font-black bg-rose-600 text-white px-1 py-0.2 rounded-full flex items-center gap-0.5 shadow z-10 font-sport">
                        ↩️ OUT
                      </span>
                    )}

                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-600 mb-1 bg-[#05080e] relative overflow-hidden shadow-inner">
                      {getPlayerPhotoUrl(sub) ? (
                        <img
                          src={getPlayerPhotoUrl(sub)}
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
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePositionHighlight(natPos);
                        }}
                        className={`text-[7.5px] font-black px-1 rounded cursor-pointer hover:scale-110 active:scale-95 transition-transform ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}
                        title={`کلیک جهت هایلایت همه بازیکنان ${natPos}`}
                      >
                        {natPos}
                      </span>
                      <span className="font-sport text-[10.5px] font-black text-amber-300">{sub.overall}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISUAL SEPARATOR DIVIDER & SECTION 2: RESERVES / OUT OF SQUAD */}
          {!hideReserves && !isLiveMode && (
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
                    const isPosMatch = Boolean(activeHighlightPos && isPlayerCompatibleWithPosition(res, activeHighlightPos));
                    const isExactMatch = Boolean(activeHighlightPos && isPlayerExactPosition(res, activeHighlightPos));
                    const isDimmed = activeHighlightPos && !isSelected && !isPosMatch;
                    const isSuspended = Boolean((res.suspension_matches > 0) || res.is_suspended || res.isSuspended);
                    const resStamina = Math.max(5, Math.min(100, Math.round(Number(res.stamina ?? res.virtual_stamina ?? 90))));

                    return (
                      <div
                        key={res.id}
                        onClick={() => handleBenchPlayerClick(res, false)}
                        className={`p-2.5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${
                          isDimmed ? 'opacity-35' : ''
                        } ${
                          isSuspended
                            ? 'bg-red-950/30 border-red-700/80 hover:border-red-500 text-red-200 shadow'
                            : isPosMatch
                            ? 'bg-emerald-950/70 border-2 border-emerald-400 shadow-lg ring-2 ring-emerald-400 scale-[1.02]'
                            : isSelected
                            ? 'bg-cyan-950/80 border-2 border-cyan-400 shadow-lg ring-2 ring-cyan-400 animate-pulse'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-600 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isPosMatch && (
                            <span className="text-amber-300 text-[12px] drop-shadow-[0_0_6px_#f59e0b] animate-bounce pointer-events-none" title={isExactMatch ? 'پست تخصصی اصلی ⭐' : 'پست سازگار و قابل بازی ⭐'}>
                              ⭐
                            </span>
                          )}
                          {isSuspended && (
                            <span className="text-[7.5px] font-black bg-red-600 text-white px-1 py-0.2 rounded-full font-sport">
                              🟥
                            </span>
                          )}
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center border border-slate-700 bg-[#05080e] relative overflow-hidden shrink-0 shadow-inner">
                            {getPlayerPhotoUrl(res) ? (
                              <img
                                src={getPlayerPhotoUrl(res)}
                                alt={res.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <User size={12} className="text-slate-500" />
                            )}
                          </div>
                          {res.shirt_number != null && (
                            <span className="text-[8.5px] font-sport text-cyan-400 font-black">#{res.shirt_number}</span>
                          )}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePositionHighlight(natPos);
                            }}
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded cursor-pointer hover:scale-110 active:scale-95 transition-transform ${POSITION_COLORS[natPos] || 'bg-slate-700 text-white'}`}
                            title={`کلیک جهت هایلایت همه بازیکنان ${natPos}`}
                          >
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

      {/* LIVE MODE UNIFIED SAVE BUTTON FOOTER */}
      {isLiveMode && (onSave || onSaveGamePlan) && (
        <div className="bg-[#0b101d] p-4 border-t-2 border-cyan-500/40 flex justify-between items-center gap-3 sticky bottom-0 z-30 shadow-2xl backdrop-blur-xl">
          <div className="text-xs text-cyan-200 hidden sm:block">
            <span className="font-bold text-white block">آماده ارسال ترکیب و تغییرات تاکتیکی به اتاق داوری</span>
            <span className="text-[10.5px] text-cyan-300">تغییرات شما به صورت آنی به پنل داوری و نظارت مسابقه ارسال می‌گردد.</span>
          </div>
          <button
            onClick={() => (onSave || onSaveGamePlan)({ startingXi, substitutes, reserves, currentFormation })}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black px-8 py-3 rounded-2xl shadow-xl hover:shadow-cyan-500/20 transition-all text-xs md:text-sm flex items-center justify-center gap-2 border border-emerald-300 cursor-pointer active:scale-95 font-sport"
          >
            <span>ارسال ترکیب و تاکتیک به داوری</span>
            <span className="text-base">⚡</span>
          </button>
        </div>
      )}

      {/* ADMIN QUICK MATCH EVENT REGISTRATION MODAL */}
      {isAdminMode && adminModalPlayer && createPortal(
        <div 
          className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md font-sans dir-rtl select-none"
          onClick={() => {
            setAdminModalPlayer(null);
            setSubModalBenchSelect(false);
          }}
        >
          <div 
            className="w-full max-w-sm sm:max-w-md bg-[#0a1222] border-2 border-cyan-500/60 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[88vh] relative my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-slate-800/80 pb-3 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
                  {adminModalPlayer.photo_url ? (
                    <img src={getPlayerPhotoUrl(adminModalPlayer.photo_url)} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span>{adminModalPlayer.position}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm sm:text-base">{adminModalPlayer.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                      #{adminModalPlayer.shirt_number || 10}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="text-cyan-400 font-bold">{adminModalPlayer.position}</span>
                    <span>•</span>
                    <span className="text-purple-300 font-bold">{teamName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAdminModalPlayer(null);
                  setSubModalBenchSelect(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center border border-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 py-3 space-y-3">
              {!subModalBenchSelect ? (
                <>
                  {/* FotMob Match Rating Chip Bar */}
                  <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-300">⭐ نمره عملکرد بازیکن (FotMob Rating):</span>
                      <span className="font-black text-sky-400 font-sport text-xs">{adminModalPlayer.rating || '7.0'} ★</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 font-sport">
                      {[10.0, 9.5, 9.0, 8.5, 7.5, 6.0].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleAdminSetRating(r)}
                          className={`py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                            adminModalPlayer.rating === r
                              ? 'bg-sky-500 text-slate-950 shadow-md ring-2 ring-sky-300'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Goal & Assist Row */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Goal */}
                    <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                      <button
                        onClick={handleAdminGoal}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md shadow-emerald-900/30"
                      >
                        <span className="flex items-center gap-1">⚽ ثبت گل</span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">+۱</span>
                      </button>
                      {adminModalPlayer.goals > 0 && (
                        <button
                          onClick={handleAdminGoalUndo}
                          className="w-full py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <span>↩️ لغو ۱ گل ({adminModalPlayer.goals})</span>
                        </button>
                      )}
                    </div>

                    {/* Assist */}
                    <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
                      <button
                        onClick={handleAdminAssist}
                        className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md shadow-cyan-900/30"
                      >
                        <span className="flex items-center gap-1">🅰️ پاس گل</span>
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">+۱</span>
                      </button>
                      {adminModalPlayer.assists > 0 && (
                        <button
                          onClick={handleAdminAssistUndo}
                          className="w-full py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <span>↩️ لغو پاس ({adminModalPlayer.assists})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards & Status: 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Yellow 1 */}
                    <button
                      onClick={() => handleAdminCardOrInjury('TOGGLE_YELLOW_1')}
                      className={`p-2.5 rounded-2xl border font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                        adminModalPlayer.yellowCards === 1
                          ? 'bg-amber-900/90 border-amber-400 text-amber-100 ring-1 ring-amber-400'
                          : 'bg-slate-900/90 hover:bg-amber-950/40 border-slate-800 hover:border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <span className="flex items-center gap-1">🟨 {adminModalPlayer.yellowCards === 1 ? 'لغو زرد اول' : 'کارت زرد اول'}</span>
                      {adminModalPlayer.yellowCards === 1 && <span className="text-[9px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-300 font-bold">فعال ↩️</span>}
                    </button>

                    {/* Yellow 2 */}
                    <button
                      onClick={() => handleAdminCardOrInjury('TOGGLE_YELLOW_2')}
                      className={`p-2.5 rounded-2xl border font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                        adminModalPlayer.yellowCards === 2
                          ? 'bg-rose-900/90 border-rose-500 text-rose-100 ring-1 ring-rose-500'
                          : 'bg-slate-900/90 hover:bg-amber-950/40 border-slate-800 hover:border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <span className="flex items-center gap-1">🟨🟨 {adminModalPlayer.yellowCards === 2 ? 'لغو زرد دوم' : 'زرد دوم (اخراج)'}</span>
                      {adminModalPlayer.yellowCards === 2 && <span className="text-[9px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">اخراج ↩️</span>}
                    </button>

                    {/* Direct Red */}
                    <button
                      onClick={() => handleAdminCardOrInjury('TOGGLE_RED')}
                      className={`p-2.5 rounded-2xl border font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                        adminModalPlayer.isRed
                          ? 'bg-rose-900/90 border-rose-500 text-rose-100 ring-1 ring-rose-500'
                          : 'bg-slate-900/90 hover:bg-rose-950/40 border-slate-800 hover:border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <span className="flex items-center gap-1">🟥 {adminModalPlayer.isRed ? 'لغو قرمز مستقیم' : 'قرمز مستقیم'}</span>
                      {adminModalPlayer.isRed && <span className="text-[9px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">اخراج ↩️</span>}
                    </button>

                    {/* Injury */}
                    <button
                      onClick={() => handleAdminCardOrInjury('TOGGLE_INJURY')}
                      className={`p-2.5 rounded-2xl border font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                        adminModalPlayer.isInjured
                          ? 'bg-purple-900/90 border-purple-400 text-purple-100 ring-1 ring-purple-400'
                          : 'bg-slate-900/90 hover:bg-purple-950/40 border-slate-800 hover:border-purple-500/40 text-purple-300'
                      }`}
                    >
                      <span className="flex items-center gap-1">🚑 {adminModalPlayer.isInjured ? 'لغو مصدومیت' : 'ثبت مصدومیت'}</span>
                      {adminModalPlayer.isInjured && <span className="text-[9px] bg-rose-950 px-1.5 py-0.5 rounded text-rose-300 font-bold">مصدوم ↩️</span>}
                    </button>
                  </div>

                  {/* Substitution Trigger Button */}
                  <button
                    onClick={() => setSubModalBenchSelect(true)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all border border-purple-400/30 cursor-pointer active:scale-98 text-xs"
                  >
                    <ArrowLeftRight size={15} />
                    <span>انجام تعویض زنده با بازیکنان نیمکت 🔄⚡</span>
                  </button>
                </>
              ) : (
                /* Bench selector mode */
                <div className="space-y-2.5">
                  <span className="text-slate-300 font-bold text-xs block">
                    انتخاب بازیکن جایگزین از نیمکت برای تعویض با «{adminModalPlayer.name}»:
                  </span>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
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
                          className={`p-2.5 rounded-2xl border flex justify-between items-center transition-all ${
                            isOut
                              ? 'bg-rose-950/30 border-rose-900/50 opacity-60 cursor-not-allowed'
                              : 'bg-slate-900 border-slate-800 hover:border-cyan-400 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded">
                              {natPos}
                            </span>
                            <span className={`font-bold text-xs ${isOut ? 'line-through text-slate-400' : 'text-white'}`}>{bPlayer.name}</span>
                            {isOut && <span className="text-[9px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">↩️ OUT</span>}
                          </div>
                          <span className="font-mono text-cyan-300 font-bold text-xs">OVR {bPlayer.overall}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setSubModalBenchSelect(false)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 rounded-xl border border-slate-800 transition-colors text-xs cursor-pointer"
                  >
                    بازگشت به گزینه اتفاقات
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM MODAL: STAMINA RECOVERY */}
      {actionPlayerToRecover && (
        <ConfirmModal
          isOpen={!!actionPlayerToRecover}
          title="شارژ فوری استقامت بازیکن (Stamina Recovery)"
          message={`آیا از شارژ ۵۰٪ استقامت «${actionPlayerToRecover.name}» با استفاده از ۱۵ الماس (جم 💎) اطمینان دارید؟`}
          details={
            <div className="space-y-1.5 font-sport text-xs">
              <div className="flex justify-between text-slate-300">
                <span>استقامت فعلی:</span>
                <span className="text-amber-400 font-bold dir-ltr">
                  {Math.round(Number(actionPlayerToRecover.virtual_stamina || actionPlayerToRecover.stamina || 50))}%
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>استقامت پس از شارژ:</span>
                <span className="text-[#00ff87] font-black dir-ltr">
                  {Math.min(100, Math.round(Number(actionPlayerToRecover.virtual_stamina || actionPlayerToRecover.stamina || 50)) + 50)}% (+۵۰٪)
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>هزینه الماس:</span>
                <span className="text-cyan-300 font-black">۱۵ 💎</span>
              </div>
            </div>
          }
          confirmText="بله، شارژ استقامت ⚡"
          cancelText="خیر، انصراف"
          onConfirm={() => handleRecoverStamina(actionPlayerToRecover)}
          onCancel={() => setActionPlayerToRecover(null)}
          loading={isActionLoading}
        />
      )}

      {/* CONFIRM MODAL: GEM BOOST / LEVEL UP */}
      {actionPlayerToBoost && (
        <ConfirmModal
          isOpen={!!actionPlayerToBoost}
          title="ارتقای بازیکن با الماس (Gem Boost)"
          message={`آیا از ارتقای مستقیم سطح و قدرت «${actionPlayerToBoost.name}» با الماس اطمینان دارید؟`}
          details={
            <div className="space-y-2 font-sport text-xs">
              <div className="flex justify-between text-slate-300">
                <span>لول فعلی ➔ لول جدید:</span>
                <span className="text-cyan-300 font-bold dir-ltr">
                  سطح {actionPlayerToBoost.level || 1} ➔ سطح {(actionPlayerToBoost.level || 1) + 1}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>قدرت کلی (OVR):</span>
                <span className="text-[#00ff87] font-black dir-ltr">
                  {actionPlayerToBoost.overall} ➔ {actionPlayerToBoost.next_level_target_ovr || getGemBoostTargetOvr(actionPlayerToBoost)}
                  {(actionPlayerToBoost.level || 1) + 1 >= 20 ? ' (حداکثر PES 99 ⭐)' : ''}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>سقف پتانسیل عادی:</span>
                <span className="text-purple-300 font-bold dir-ltr">
                  {actionPlayerToBoost.potential_ovr} (با الماس تا ۹۹ شکسته می‌شود)
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-700/80 pt-1.5">
                <span className="text-amber-400 font-bold">هزینه ارتقای این مرحله:</span>
                <span className="text-amber-300 font-black text-sm">
                  {actionPlayerToBoost.next_level_gem_cost || getGemBoostCost(actionPlayerToBoost.level || 1)} 💎
                </span>
              </div>
            </div>
          }
          confirmText="بله، ارتقای لول ✨"
          cancelText="خیر، انصراف"
          onConfirm={() => handleGemBoost(actionPlayerToBoost)}
          onCancel={() => setActionPlayerToBoost(null)}
          loading={isActionLoading}
        />
      )}
    </div>
  );
}
