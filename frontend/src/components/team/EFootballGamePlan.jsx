import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Users, AlertCircle, ArrowLeftRight, User, Sliders, Plus, Zap, Sparkles, Gem, HeartPulse, X, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../common/CustomSelect';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { isPackPlayer, getPackTierConfig } from '../common/PackPlayerCard';
import { playerApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import ConfirmModal from '../common/ConfirmModal';
import { autoSelectOptimalLineup } from './SimpleTacticsModal';
import FutPitchCard from './FutPitchCard';
import PlayerSlotSelectModal from './PlayerSlotSelectModal';
import futPitchImg from '../../assets/fut_pitch_3d.png';

// Perspective coordinate projection from standard 0-100% tactical coordinates to 3D trapezoid pitch
export const getProjectedPitchCoords = (formX = 50, formY = 50) => {
  const yFrac = Math.max(0, Math.min(100, Number(formY || 50))) / 100.0;
  // The 3D pitch image has:
  // - Top goal line at Y ~7.2%
  // - Bottom goal line at Y ~96.0% (height = 88.8%)
  const pitchTop = 7.2;
  const pitchHeight = 88.8;
  const yScreen = pitchTop + yFrac * pitchHeight;

  // Perspective width and horizontal inset:
  // - Top edge width: 72.0% (left margin: 14.1%)
  // - Bottom edge width: 97.0% (left margin: 1.5%)
  const leftMargin = 14.1 - yFrac * 12.6;
  const pitchWidth = 72.0 + yFrac * 25.0;
  const xScreen = leftMargin + (Number(formX || 50) / 100.0) * pitchWidth;

  return {
    x: Math.max(2, Math.min(98, xScreen)),
    y: Math.max(5, Math.min(96, yScreen)),
  };
};

// Inverse projection: convert screen percentages in pitch container back to 0-100 tactical pitch coordinates
export const getTacticalCoordsFromProjected = (xScreen = 50, yScreen = 50) => {
  const pitchTop = 7.2;
  const pitchHeight = 88.8;
  const yFrac = Math.max(0, Math.min(1, (Number(yScreen || 50) - pitchTop) / pitchHeight));
  const leftMargin = 14.1 - yFrac * 12.6;
  const pitchWidth = 72.0 + yFrac * 25.0;
  const formX = Math.max(5, Math.min(95, ((Number(xScreen || 50) - leftMargin) / (pitchWidth || 1)) * 100));
  const formY = Math.max(5, Math.min(95, yFrac * 100));
  return {
    x: Math.round(formX),
    y: Math.round(formY),
  };
};

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
  const natural = (player.naturalPosition || player.base_position || player.main_position || player.position || '').toUpperCase().trim();
  const target = String(targetPos).toUpperCase().trim();
  if (natural && natural === target) return true;

  if (player.compatible_positions) {
    const list = Array.isArray(player.compatible_positions)
      ? player.compatible_positions.map((p) => String(p).toUpperCase().trim())
      : String(player.compatible_positions)
          .split(',')
          .map((p) => p.toUpperCase().trim())
          .filter(Boolean);
    if (list.includes(target)) return true;
  }

  return false;
};

export const isPlayerExactPosition = (player, targetPos) => {
  if (!player || !targetPos) return false;
  const natural = (player.naturalPosition || player.base_position || player.main_position || player.position || '').toUpperCase().trim();
  const target = String(targetPos).toUpperCase().trim();
  return natural === target;
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

// 14 Tactical Formations Presets (PES 2021 Standards)
export const FORMATION_PRESETS = {
  // Category 1: 4 Defenders
  '4-5-1 (4-2-3-1)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'DMF', x: 36, y: 52 },
    { pos: 'DMF', x: 64, y: 52 },
    { pos: 'LMF', x: 14, y: 32 },
    { pos: 'AMF', x: 50, y: 32 },
    { pos: 'RMF', x: 86, y: 32 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '4-5-1 (4-1-4-1)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'DMF', x: 50, y: 54 },
    { pos: 'LMF', x: 14, y: 34 },
    { pos: 'AMF', x: 38, y: 34 },
    { pos: 'AMF', x: 62, y: 34 },
    { pos: 'RMF', x: 86, y: 34 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '4-5-1 (4-3-2-1)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'CMF', x: 26, y: 50 },
    { pos: 'DMF', x: 50, y: 54 },
    { pos: 'CMF', x: 74, y: 50 },
    { pos: 'AMF', x: 36, y: 30 },
    { pos: 'AMF', x: 64, y: 30 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '4-4-2 (4-2-2-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'CMF', x: 36, y: 50 },
    { pos: 'CMF', x: 64, y: 50 },
    { pos: 'LMF', x: 14, y: 32 },
    { pos: 'RMF', x: 86, y: 32 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
  ],
  '4-4-2 (4-3-1-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'CMF', x: 26, y: 48 },
    { pos: 'DMF', x: 50, y: 54 },
    { pos: 'CMF', x: 74, y: 48 },
    { pos: 'AMF', x: 50, y: 32 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
  ],
  '4-3-3 (4-2-1-3)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'DMF', x: 36, y: 52 },
    { pos: 'DMF', x: 64, y: 52 },
    { pos: 'AMF', x: 50, y: 34 },
    { pos: 'LWF', x: 16, y: 16 },
    { pos: 'RWF', x: 84, y: 16 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '4-3-3 (4-1-2-3)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 14, y: 68 },
    { pos: 'CB', x: 38, y: 70 },
    { pos: 'CB', x: 62, y: 70 },
    { pos: 'RB', x: 86, y: 68 },
    { pos: 'DMF', x: 50, y: 54 },
    { pos: 'AMF', x: 34, y: 36 },
    { pos: 'AMF', x: 66, y: 36 },
    { pos: 'LWF', x: 16, y: 16 },
    { pos: 'RWF', x: 84, y: 16 },
    { pos: 'CF', x: 50, y: 12 },
  ],

  // Category 2: 3 & 5 Defenders
  '3-6-1 (3-2-4-1)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'CB', x: 25, y: 70 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 75, y: 70 },
    { pos: 'DMF', x: 36, y: 54 },
    { pos: 'DMF', x: 64, y: 54 },
    { pos: 'LMF', x: 14, y: 34 },
    { pos: 'AMF', x: 38, y: 32 },
    { pos: 'AMF', x: 62, y: 32 },
    { pos: 'RMF', x: 86, y: 34 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '3-5-2 (3-2-3-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'CB', x: 25, y: 70 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 75, y: 70 },
    { pos: 'DMF', x: 36, y: 54 },
    { pos: 'DMF', x: 64, y: 54 },
    { pos: 'LMF', x: 14, y: 34 },
    { pos: 'AMF', x: 50, y: 34 },
    { pos: 'RMF', x: 86, y: 34 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
  ],
  '3-5-2 (3-3-2-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'CB', x: 25, y: 70 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 75, y: 70 },
    { pos: 'CMF', x: 26, y: 50 },
    { pos: 'DMF', x: 50, y: 55 },
    { pos: 'CMF', x: 74, y: 50 },
    { pos: 'AMF', x: 36, y: 32 },
    { pos: 'AMF', x: 64, y: 32 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
  ],
  '3-4-3 (3-2-2-3)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'CB', x: 25, y: 70 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 75, y: 70 },
    { pos: 'CMF', x: 36, y: 52 },
    { pos: 'CMF', x: 64, y: 52 },
    { pos: 'LMF', x: 14, y: 34 },
    { pos: 'RMF', x: 86, y: 34 },
    { pos: 'LWF', x: 16, y: 16 },
    { pos: 'RWF', x: 84, y: 16 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '3-3-4 (3-3-4)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'CB', x: 25, y: 70 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 75, y: 70 },
    { pos: 'DMF', x: 50, y: 54 },
    { pos: 'CMF', x: 28, y: 44 },
    { pos: 'CMF', x: 72, y: 44 },
    { pos: 'LWF', x: 14, y: 16 },
    { pos: 'CF', x: 38, y: 12 },
    { pos: 'CF', x: 62, y: 12 },
    { pos: 'RWF', x: 86, y: 16 },
  ],
  '5-4-1 (5-2-2-1)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 10, y: 66 },
    { pos: 'CB', x: 30, y: 71 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 70, y: 71 },
    { pos: 'RB', x: 90, y: 66 },
    { pos: 'DMF', x: 36, y: 50 },
    { pos: 'DMF', x: 64, y: 50 },
    { pos: 'LMF', x: 14, y: 32 },
    { pos: 'RMF', x: 86, y: 32 },
    { pos: 'CF', x: 50, y: 12 },
  ],
  '5-3-2 (5-2-1-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 10, y: 66 },
    { pos: 'CB', x: 30, y: 71 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 70, y: 71 },
    { pos: 'RB', x: 90, y: 66 },
    { pos: 'DMF', x: 36, y: 50 },
    { pos: 'DMF', x: 64, y: 50 },
    { pos: 'AMF', x: 50, y: 32 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
  ],
  '5-3-2 (5-3-2)': [
    { pos: 'GK', x: 50, y: 89 },
    { pos: 'LB', x: 10, y: 66 },
    { pos: 'CB', x: 30, y: 71 },
    { pos: 'CB', x: 50, y: 71 },
    { pos: 'CB', x: 70, y: 71 },
    { pos: 'RB', x: 90, y: 66 },
    { pos: 'CMF', x: 27, y: 46 },
    { pos: 'DMF', x: 50, y: 53 },
    { pos: 'CMF', x: 73, y: 46 },
    { pos: 'SS', x: 36, y: 16 },
    { pos: 'CF', x: 64, y: 12 },
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
  currentMinute = 45,
}) {
  // Helper to match DB short formations (e.g. '4-3-3') to full presets (e.g. '4-3-3 (4-2-1-3)')
  const getResolvedFormation = (form) => {
    if (!form) return '4-3-3 (4-2-1-3)';
    if (FORMATION_PRESETS[form]) return form;
    const cleaned = String(form).trim();
    if (FORMATION_PRESETS[cleaned]) return cleaned;

    const match = Object.keys(FORMATION_PRESETS).find(
      (f) => f.startsWith(cleaned) || f.includes(cleaned) || cleaned.includes(f)
    );
    if (match) return match;

    const digitMatch = Object.keys(FORMATION_PRESETS).find((f) => {
      const fClean = f.replace(/[^0-9]/g, '');
      const cClean = cleaned.replace(/[^0-9]/g, '');
      return fClean === cClean || (fClean.length >= 3 && (fClean.includes(cClean) || cClean.includes(fClean)));
    });
    if (digitMatch) return digitMatch;

    return '4-3-3 (4-2-1-3)';
  };

  // Normalizes starting 11 players strictly to the 11 preset slots of the formation
  // Preserves legitimate user swaps while snapping any corrupted or misplaced coordinates back to formation slots
  const normalizeStartersToPreset = (starters = [], preset = []) => {
    if (!preset || preset.length === 0 || !Array.isArray(starters) || starters.length === 0) {
      return starters || [];
    }

    const unassignedSlots = preset.map((s) => ({ ...s }));
    const assignedPlayers = new Array(starters.length).fill(null);

    // Pass 1: Players that already match a slot's exact (or very close within 5%) x, y coordinates
    starters.forEach((p, pIdx) => {
      if (!p) return;
      const px = Number(p.x_coord ?? -999);
      const py = Number(p.y_coord ?? -999);
      const slotIdx = unassignedSlots.findIndex((s) => {
        if (!s) return false;
        const dx = Math.abs(px - s.x);
        const dy = Math.abs(py - s.y);
        return dx <= 5 && dy <= 5;
      });

      if (slotIdx !== -1) {
        const slot = unassignedSlots[slotIdx];
        assignedPlayers[pIdx] = {
          ...p,
          x_coord: slot.x,
          y_coord: slot.y,
          position: slot.pos,
          naturalPosition: p.naturalPosition || p.position || slot.pos,
          is_starting: true,
        };
        unassignedSlots[slotIdx] = null;
      }
    });

    // Pass 2: Any unassigned or displaced players (e.g. corrupted coordinates from old drags)
    starters.forEach((p, pIdx) => {
      if (assignedPlayers[pIdx] !== null || !p) return;

      let bestSlotIdx = unassignedSlots.findIndex((s) => s && (s.pos === p.position || s.pos === p.naturalPosition));
      if (bestSlotIdx === -1) {
        bestSlotIdx = unassignedSlots.findIndex((s) => s && isPlayerCompatibleWithPosition(p, s.pos));
      }
      if (bestSlotIdx === -1) {
        bestSlotIdx = unassignedSlots.findIndex((s) => s !== null);
      }

      if (bestSlotIdx !== -1) {
        const slot = unassignedSlots[bestSlotIdx];
        assignedPlayers[pIdx] = {
          ...p,
          x_coord: slot.x,
          y_coord: slot.y,
          position: slot.pos,
          naturalPosition: p.naturalPosition || p.position || slot.pos,
          is_starting: true,
        };
        unassignedSlots[bestSlotIdx] = null;
      } else {
        assignedPlayers[pIdx] = { ...p, is_starting: true };
      }
    });

    return assignedPlayers.filter(Boolean);
  };

  // Helper to intelligently match players to tactical slots based on their natural position
  const matchPlayersToFormation = (players = [], preset) => {
    if (!preset || !Array.isArray(players) || players.length === 0) return players || [];
    const unassignedPlayers = [...players];
    const availableSlots = [...preset];
    const newXi = new Array(Math.min(players.length, availableSlots.length)).fill(null);

    // Pass 1: Exact Natural Position Match
    for (let i = 0; i < availableSlots.length; i++) {
      if (availableSlots[i] === null) continue;
      const targetPos = availableSlots[i].pos;
      const playerIndex = unassignedPlayers.findIndex(
        p => p && (p.naturalPosition || p.position) === targetPos
      );

      if (playerIndex !== -1 && i < newXi.length) {
        newXi[i] = {
          ...unassignedPlayers[playerIndex],
          naturalPosition: unassignedPlayers[playerIndex]?.naturalPosition || unassignedPlayers[playerIndex]?.position || targetPos,
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
      if (availableSlots[i] !== null && i < newXi.length) {
        const playerIndex = unassignedPlayers.findIndex(p => p !== null);
        if (playerIndex !== -1) {
          newXi[i] = {
            ...unassignedPlayers[playerIndex],
            naturalPosition: unassignedPlayers[playerIndex]?.naturalPosition || unassignedPlayers[playerIndex]?.position || availableSlots[i].pos,
            position: availableSlots[i].pos,
            x_coord: availableSlots[i].x,
            y_coord: availableSlots[i].y,
          };
          unassignedPlayers[playerIndex] = null;
        }
      }
    }
    
    // Fallback for any leftovers
    return newXi.map((p, idx) => {
      if (p) return p;
      const fallbackP = players[idx];
      if (!fallbackP) return null;
      return {
        ...fallbackP,
        naturalPosition: fallbackP?.naturalPosition || fallbackP?.position || 'SUB',
      };
    }).filter(Boolean);
  };

  // Helper to ensure 11 starters are populated from bench if starters departed or suspended
  const buildFullSquad = (starters = [], subs = [], res = [], formPreset) => {
    let currentStarters = [...(starters || [])].filter(Boolean);
    let currentSubs = [...(subs || [])].filter(Boolean);
    let currentRes = [...(res || [])].filter(Boolean);

    // Identify and auto-rotate out suspended or ineligible starters (Only in pre-match non-live mode)
    const isPlayerIneligible = (p) => {
      if (!p || isLiveMode || isAdminMode) return false;
      const isSuspended = Boolean((p.suspension_matches > 0) || p.is_suspended || p.isSuspended);
      const isInjured = Boolean(p.is_injured || p.isInjured || (p.injury_matches > 0));
      return isSuspended || isInjured;
    };

    const ineligibleStarters = currentStarters.filter(isPlayerIneligible);
    if (ineligibleStarters.length > 0) {
      currentStarters = currentStarters.filter((p) => !isPlayerIneligible(p));

      ineligibleStarters.forEach((ineligibleP) => {
        // Find best eligible candidate from bench or reserves
        const eligibleCandidates = [...currentSubs, ...currentRes].filter((p) => p && !isPlayerIneligible(p));
        const posMatch = eligibleCandidates.find((p) => p.position === ineligibleP.position) ||
                         eligibleCandidates.find((p) => (p.naturalPosition || p.position) === (ineligibleP.naturalPosition || ineligibleP.position)) ||
                         eligibleCandidates[0];

        if (posMatch) {
          currentSubs = currentSubs.filter((p) => p && p.id !== posMatch.id);
          currentRes = currentRes.filter((p) => p && p.id !== posMatch.id);

          currentStarters.push({
            ...posMatch,
            x_coord: ineligibleP.x_coord,
            y_coord: ineligibleP.y_coord,
            position: ineligibleP.position,
            naturalPosition: posMatch.naturalPosition || posMatch.position || ineligibleP.position,
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
      const eligiblePool = currentSubs.filter((p) => p && !isPlayerIneligible(p));
      const fromSubs = eligiblePool.splice(0, needed);
      fromSubs.forEach((p) => {
        if (p) currentSubs = currentSubs.filter((s) => s && s.id !== p.id);
      });
      currentStarters.push(...fromSubs);
      if (fromSubs.length < needed && currentRes.length > 0) {
        const stillNeeded = needed - fromSubs.length;
        const eligibleResPool = currentRes.filter((p) => p && !isPlayerIneligible(p));
        const fromRes = eligibleResPool.splice(0, stillNeeded);
        fromRes.forEach((p) => {
          if (p) currentRes = currentRes.filter((r) => r && r.id !== p.id);
        });
        currentStarters.push(...fromRes);
      }
    }

    // Check if currentStarters already have valid coordinates (e.g. from existing lineup, user swap, or saved plan)
    const hasValidCoords =
      currentStarters.length > 0 &&
      currentStarters.every(
        (p) => p && p.x_coord != null && p.y_coord != null && (p.position || p.tacticalPosition)
      );

    // Normalize to preset slots: preserves legitimate swaps while fixing any corrupted coordinates
    let alignedStarters;
    if (formPreset && currentStarters.length === 11) {
      if (hasValidCoords) {
        alignedStarters = normalizeStartersToPreset(currentStarters, formPreset);
      } else {
        alignedStarters = matchPlayersToFormation(currentStarters, formPreset);
      }
    } else if (hasValidCoords || !formPreset) {
      alignedStarters = currentStarters.map((p) => ({
        ...p,
        naturalPosition: p.naturalPosition || p.position,
        position: p.position || p.tacticalPosition || p.naturalPosition,
      }));
    } else {
      alignedStarters = matchPlayersToFormation(currentStarters, formPreset);
    }

    return {
      startingXi: alignedStarters,
      substitutes: currentSubs.filter(Boolean).map(p => ({ ...p, naturalPosition: p.naturalPosition || p.position || 'SUB' })),
      reserves: currentRes.filter(Boolean).map(p => ({ ...p, naturalPosition: p.naturalPosition || p.position || 'RES' })),
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

  // Responsive mobile touch device detection for tap-to-swap
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        typeof window !== 'undefined' &&
        (window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 768))
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync formation prop changes if any
  useEffect(() => {
    const resolved = getResolvedFormation(initialFormationProp);
    if (resolved && resolved !== currentFormation) {
      handleFormationChange(resolved, false);
    }
  }, [initialFormationProp]);

  // Squad signature for robust external sync without undoing coach edits
  const squadSignature = useMemo(() => {
    const sSig = (initialStartingXi || []).map(p => `${p?.id}_${p?.position || p?.tacticalPosition}_${p?.x_coord}_${p?.y_coord}`).join('|');
    const bSig = (initialSubstitutes || []).map(p => `${p?.id}`).join('|');
    const rSig = (initialReserves || []).map(p => `${p?.id}`).join('|');
    return `${sSig}#${bSig}#${rSig}#${initialFormationProp}`;
  }, [initialStartingXi, initialSubstitutes, initialReserves, initialFormationProp]);

  const lastSyncedSignature = useRef(squadSignature);

  // Sync squad props when loaded asynchronously or when roster changes externally
  useEffect(() => {
    if (!initialStartingXi || initialStartingXi.length === 0) return;
    if (lastSyncedSignature.current === squadSignature) return;

    lastSyncedSignature.current = squadSignature;
    const preset = FORMATION_PRESETS[getResolvedFormation(initialFormationProp)];
    const updated = buildFullSquad(initialStartingXi, initialSubstitutes || [], initialReserves || [], preset);
    setStartingXi(updated.startingXi);
    setSubstitutes(updated.substitutes);
    setReserves(updated.reserves);
  }, [squadSignature]);

  const notifyLineupChange = (newXi, newSubs = substitutes, newRes = reserves, newForm = currentFormation) => {
    const sSig = (newXi || []).map(p => `${p?.id}_${p?.position || p?.tacticalPosition}_${p?.x_coord}_${p?.y_coord}`).join('|');
    const bSig = (newSubs || []).map(p => `${p?.id}`).join('|');
    const rSig = (newRes || []).map(p => `${p?.id}`).join('|');
    lastSyncedSignature.current = `${sSig}#${bSig}#${rSig}#${newForm || currentFormation}`;
    if (onLineupChange) {
      onLineupChange({ startingXi: newXi, substitutes: newSubs, reserves: newRes, formation: newForm || currentFormation });
    }
  };

  const pitchContainerRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState(null);
  const [highlightedPosition, setHighlightedPosition] = useState(null);
  const [adminQuickDockPlayer, setAdminQuickDockPlayer] = useState(null);
  const [quickEventMinute, setQuickEventMinute] = useState(currentMinute || 45);

  useEffect(() => {
    if (currentMinute !== undefined && currentMinute !== null) {
      setQuickEventMinute(currentMinute);
    }
  }, [currentMinute]);

  const [statusMsg, setStatusMsg] = useState('');
  const [quickSubModal, setQuickSubModal] = useState({ isOpen: false, sourcePlayer: null, targetType: null });

  const [slotModalState, setSlotModalState] = useState({ isOpen: false, targetSlot: null });

  const selectedPitchPlayer = useMemo(() => {
    return selectedPitchPlayerId
      ? (startingXi || []).find((p) => p && String(p.id) === String(selectedPitchPlayerId)) || null
      : null;
  }, [selectedPitchPlayerId, startingXi]);

  const selectedBenchPlayer = useMemo(() => {
    return selectedBenchPlayerId
      ? ((substitutes || []).find((b) => b && String(b.id) === String(selectedBenchPlayerId)) ||
         (reserves || []).find((r) => r && String(r.id) === String(selectedBenchPlayerId)) ||
         null)
      : null;
  }, [selectedBenchPlayerId, substitutes, reserves]);

  // Active Target Position for Highlighting Compatible Players across pitch & bench
  const activeHighlightPos = useMemo(() => {
    if (highlightedPosition) return highlightedPosition;
    if (selectedPitchPlayer) {
      return selectedPitchPlayer.position;
    }
    if (selectedBenchPlayer) {
      return selectedBenchPlayer.naturalPosition || selectedBenchPlayer.position;
    }
    return null;
  }, [highlightedPosition, selectedPitchPlayer, selectedBenchPlayer]);

  // Gem Player Actions (Boost / Level Up)
  const { team, updateTeamGems, updatePlayerState } = useTeam();
  const [actionPlayerToBoost, setActionPlayerToBoost] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showNotification = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
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
        (list || []).map((p) => (String(p.id) === String(player.id) ? { ...p, level: newLevel, overall: newOvr } : p));

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
      notifyLineupChange(newXi, newSubs, newRes, currentFormation);
    } catch (err) {
      showNotification('خطا در ارتقای بازیکن: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  const isTacticsDisabled = false;

  // Change Formation Handler: Adapts current starters to new formation slots
  const handleFormationChange = (newFormation, notify = true) => {
    const preset = FORMATION_PRESETS[newFormation];
    if (!preset) return;

    setCurrentFormation(newFormation);
    const updatedXi = matchPlayersToFormation(startingXi, preset);

    setStartingXi(updatedXi);

    if (notify) {
      showNotification(`چیدمان تیمی به «${newFormation}» تغییر یافت ⚡`);
    }
    if (onFormationChange) {
      onFormationChange(newFormation);
    }
    notifyLineupChange(updatedXi, substitutes, reserves, newFormation);
  };

  // Smart Auto-Select Optimal Lineup Handler (AI Best 11 by OVR & Position)
  const handleAutoOptimizeLineup = () => {
    const fullSquad = [...(startingXi || []), ...(substitutes || []), ...(reserves || [])];
    const isSuspended = (p) => Boolean((p?.suspension_matches > 0) || p?.is_suspended || p?.isSuspended);
    const optimized = autoSelectOptimalLineup(fullSquad, currentFormation);
    const updatedXi = (optimized || []).filter((p) => p && p.is_starting && !isSuspended(p)).slice(0, 11);
    const nonStarting = (optimized || []).filter((p) => p && (!p.is_starting || isSuspended(p)));
    const updatedSubs = nonStarting.slice(0, 12);
    const updatedRes = nonStarting.slice(12);
    setStartingXi(updatedXi);
    setSubstitutes(updatedSubs);
    setReserves(updatedRes);
    showNotification(`۱۱ بازیکن برتر بر اساس قدرت (OVR) و پست تخصصی چیده شدند ✨`);
    notifyLineupChange(updatedXi, updatedSubs, updatedRes, currentFormation);
  };

  // Dedicated Reset/Realign Handler: Snaps current 11 players strictly to standard formation slots
  const handleRealignLineup = () => {
    const preset = FORMATION_PRESETS[currentFormation];
    if (!preset) return;
    const aligned = normalizeStartersToPreset(startingXi, preset);
    setStartingXi(aligned);
    setSelectedPitchPlayerId(null);
    setSelectedBenchPlayerId(null);
    showNotification('موقعیت تمام بازیکنان بر اساس نقاط رسمی این چیدمان تراز شد ✨');
    notifyLineupChange(aligned, substitutes, reserves, currentFormation);
  };

  // Direct 1-Click Player Placement from PlayerSlotSelectModal
  const handleSelectPlayerForSlot = (player, slot) => {
    if (!player || !slot) return;
    const targetPlayerId = String(player.id);

    if (slot.isBench) {
      // Placing or swapping into Bench slot
      const benchIdx = slot.slotIndex ?? (substitutes || []).length;
      let newSubs = [...(substitutes || [])];
      let newRes = [...(reserves || [])];

      // Remove player from wherever they were
      newSubs = newSubs.filter((p) => p && String(p.id) !== targetPlayerId);
      newRes = newRes.filter((p) => p && String(p.id) !== targetPlayerId);

      if (benchIdx < newSubs.length) {
        newSubs.splice(benchIdx, 0, { ...player, is_starting: false });
      } else {
        newSubs.push({ ...player, is_starting: false });
      }

      setSubstitutes(newSubs);
      setReserves(newRes);
      setSlotModalState({ isOpen: false, targetSlot: null });
      showNotification(`«${player.name}» به نیمکت ذخیره‌ها اضافه شد ✅`);
      notifyLineupChange(startingXi, newSubs, newRes, currentFormation);
      return;
    }

    // Placing into Starting XI Slot
    const newPitchPlayer = {
      ...player,
      naturalPosition: player.naturalPosition || player.position,
      position: slot.pos,
      x_coord: slot.x,
      y_coord: slot.y,
      is_starting: true,
    };

    const updatedXi = [...(startingXi || []).filter((p) => p && String(p.id) !== targetPlayerId), newPitchPlayer];
    const newSubs = (substitutes || []).filter((b) => b && String(b.id) !== targetPlayerId);
    const newRes = (reserves || []).filter((r) => r && String(r.id) !== targetPlayerId);

    setStartingXi(updatedXi);
    setSubstitutes(newSubs);
    setReserves(newRes);
    setSlotModalState({ isOpen: false, targetSlot: null });
    showNotification(`«${player.name}» در پست ${slot.pos} در ترکیب قرار گرفت ✅`);
    notifyLineupChange(updatedXi, newSubs, newRes, currentFormation);
  };



  // Instant 1-Click Match Event Stamping Handler for Admin Mode (FotMob Style)
  const handleAdminQuickEvent = (targetPlayer, actionType) => {
    if (!targetPlayer) return;
    const pId = String(targetPlayer.id);
    let pushType = actionType;
    let text = '';
    let icon = '⚡';
    let newInMatchGoals = targetPlayer.in_match_goals || 0;
    let newInMatchAssists = targetPlayer.in_match_assists || 0;
    let newOwnGoals = targetPlayer.own_goals || targetPlayer.in_match_own_goals || 0;
    let newYellowCards = targetPlayer.yellowCards || 0;
    let newIsRed = targetPlayer.isRed || false;
    let newIsInjured = targetPlayer.isInjured || false;

    if (actionType === 'GOAL') {
      newInMatchGoals += 1;
      text = `گل توسط ${targetPlayer.name} (${teamName}) ⚽`;
      icon = '⚽';
    } else if (actionType === 'ASSIST') {
      newInMatchAssists += 1;
      text = `پاس‌گل توسط ${targetPlayer.name} (${teamName}) 👟`;
      icon = '👟';
    } else if (actionType === 'YELLOW') {
      if (newYellowCards >= 1) {
        newYellowCards = 2;
        newIsRed = true;
        pushType = 'SECOND_YELLOW';
        text = `کارت زرد دوم و اخراج برای ${targetPlayer.name} (${teamName}) 🟨🟥`;
        icon = '🟨🟥';
      } else {
        newYellowCards = 1;
        text = `کارت زرد برای ${targetPlayer.name} (${teamName}) 🟨`;
        icon = '🟨';
      }
    } else if (actionType === 'RED') {
      newIsRed = true;
      newYellowCards = Math.max(newYellowCards, 1);
      text = `کارت قرمز مستقیم و اخراج برای ${targetPlayer.name} (${teamName}) 🟥⛔`;
      icon = '🟥';
    } else if (actionType === 'PENALTY_SCORED') {
      newInMatchGoals += 1;
      text = `گل پنالتی توسط ${targetPlayer.name} (${teamName}) 🎯⚽`;
      icon = '🎯';
    } else if (actionType === 'OWN_GOAL') {
      newOwnGoals += 1;
      text = `گل به خودی توسط ${targetPlayer.name} (${teamName}) 🤦‍♂️`;
      icon = '🤦‍♂️';
    } else if (actionType === 'INJURY') {
      newIsInjured = true;
      text = `مصدومیت ${targetPlayer.name} (${teamName}) 🚑🩹`;
      icon = '🚑';
    } else if (actionType === 'UNDO') {
      pushType = 'UNDO_EVENT';
      if (newInMatchGoals > 0) {
        newInMatchGoals -= 1;
        text = `لغو ثبت گل برای ${targetPlayer.name} ↩️`;
      } else if (newInMatchAssists > 0) {
        newInMatchAssists -= 1;
        text = `لغو ثبت پاس‌گل برای ${targetPlayer.name} ↩️`;
      } else if (newOwnGoals > 0) {
        newOwnGoals -= 1;
        text = `لغو گل به خودی برای ${targetPlayer.name} ↩️`;
      } else if (newIsRed) {
        newIsRed = false;
        if (newYellowCards === 2) newYellowCards = 1;
        text = `لغو کارت قرمز برای ${targetPlayer.name} ↩️`;
      } else if (newYellowCards > 0) {
        newYellowCards -= 1;
        text = `لغو کارت زرد برای ${targetPlayer.name} ↩️`;
      } else if (newIsInjured) {
        newIsInjured = false;
        text = `بهبودی و لغو مصدومیت ${targetPlayer.name} 🩹✨`;
      } else {
        text = `لغو آخرین رویداد ${targetPlayer.name} ↩️`;
      }
      icon = '↩️';
    }

    // 1. Optimistic local state update on startingXi and substitutes
    const updater = (p) => {
      if (String(p.id) !== pId) return p;
      return {
        ...p,
        in_match_goals: newInMatchGoals,
        goals: newInMatchGoals,
        in_match_assists: newInMatchAssists,
        assists: newInMatchAssists,
        own_goals: newOwnGoals,
        in_match_own_goals: newOwnGoals,
        yellowCards: newYellowCards,
        isRed: newIsRed,
        isInjured: newIsInjured,
      };
    };

    setStartingXi((prev) => prev.map(updater));
    setSubstitutes((prev) => prev.map(updater));

    // 2. Dispatch to parent callback (which handles backend logging, scores, and broadcast)
    if (onPushLiveEvent) {
      const chosenMinute = parseInt(quickEventMinute, 10) || currentMinute || 45;
      onPushLiveEvent({
        id: Date.now(),
        type: pushType,
        event_type: pushType,
        player_id: targetPlayer.id,
        player: targetPlayer.id,
        player_name: targetPlayer.name,
        team: teamName,
        minute: chosenMinute,
        text,
        icon,
      });
    }

    showNotification(text);
    setAdminQuickDockPlayer(null);
  };

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

  // Pitch Player Click Handler: Direct on-pitch click-to-swap & highlight for Coach Mode (No Modal)
  const handlePitchPlayerClick = (clickedPlayer) => {
    if (!clickedPlayer) return;
    setHighlightedPosition(null);

    // In Admin Mode: Toggle the floating action bar for this player!
    if (isAdminMode) {
      setAdminQuickDockPlayer((prev) => {
        if (String(prev?.id) === String(clickedPlayer.id)) {
          return null;
        }
        setQuickEventMinute(currentMinute || 45);
        return clickedPlayer;
      });
      return;
    }

    if (readOnly) return;

    const clickedId = String(clickedPlayer.id);

    // Case 1: Clicking the already selected pitch player -> Deselect and cancel highlights
    if (String(selectedPitchPlayerId) === clickedId) {
      setSelectedPitchPlayerId(null);
      setSelectedBenchPlayerId(null);
      return;
    }

    // Case 2: A bench player was already selected -> Directly swap pitch player with bench player!
    if (selectedBenchPlayerId) {
      swapPitchWithBench(clickedPlayer.id, selectedBenchPlayerId);
      setSelectedBenchPlayerId(null);
      setSelectedPitchPlayerId(null);
      return;
    }

    // Case 3: Another pitch player was already selected -> Directly swap the two pitch players' positions!
    if (selectedPitchPlayerId) {
      swapPitchPositions(selectedPitchPlayerId, clickedPlayer.id);
      setSelectedPitchPlayerId(null);
      setSelectedBenchPlayerId(null);
      return;
    }

    // Case 4: First click on this pitch player -> Select player, highlight playable positions (green 🟢), and show stars ⭐ on candidates
    setSelectedPitchPlayerId(clickedPlayer.id);
    setSelectedBenchPlayerId(null);
    showNotification(`«${clickedPlayer.name}» (${clickedPlayer.position}) انتخاب شد. برای جابجایی روی بازیکن مقصد یا نیمکت کلیک کنید ⭐`);
  };

  // Bench / Reserve Player Click Handler: Direct on-pitch click-to-swap & highlight for Coach Mode (No Modal)
  const handleBenchPlayerClick = (clickedBenchPlayer, isFromSubstitutes = true) => {
    if (!clickedBenchPlayer) return;
    setHighlightedPosition(null);

    // In Admin Mode: Toggle the floating action bar for this bench player!
    if (isAdminMode) {
      setAdminQuickDockPlayer((prev) => {
        if (String(prev?.id) === String(clickedBenchPlayer.id)) {
          return null;
        }
        setQuickEventMinute(currentMinute || 45);
        return { ...clickedBenchPlayer, isBench: true };
      });
      return;
    }

    if (readOnly) return;

    const clickedId = String(clickedBenchPlayer.id);

    // Case 1: Clicking the already selected bench player -> Deselect and cancel highlights
    if (String(selectedBenchPlayerId) === clickedId) {
      setSelectedBenchPlayerId(null);
      setSelectedPitchPlayerId(null);
      return;
    }

    // Case 2: A pitch player was already selected -> Directly swap pitch player with this bench player!
    if (selectedPitchPlayerId) {
      swapPitchWithBench(selectedPitchPlayerId, clickedBenchPlayer.id, isFromSubstitutes);
      setSelectedPitchPlayerId(null);
      setSelectedBenchPlayerId(null);
      return;
    }

    // Case 3: Another bench player was already selected -> Swap two bench players
    if (selectedBenchPlayerId) {
      swapBenchOrReserves(selectedBenchPlayerId, clickedBenchPlayer.id);
      setSelectedBenchPlayerId(null);
      setSelectedPitchPlayerId(null);
      return;
    }

    // Case 4: First click on this bench player -> Select bench player, highlight playable slots (green 🟢), and show stars ⭐ on pitch players
    setSelectedBenchPlayerId(clickedBenchPlayer.id);
    setSelectedPitchPlayerId(null);
    const natPos = clickedBenchPlayer.naturalPosition || clickedBenchPlayer.position;
    showNotification(`بازیکن نیمکت «${clickedBenchPlayer.name}» (${natPos}) انتخاب شد. برای تعویض روی بازیکن مورد نظر در چمن کلیک کنید 🔄`);
  };

  // Admin Direct Substitution Execution Handler
  const handleAdminExecuteSub = (pitchId, benchId) => {
    const sPitchId = String(pitchId);
    const sBenchId = String(benchId);
    const pitchPlayer = (startingXi || []).find((p) => String(p?.id) === sPitchId);
    const benchPlayer = (substitutes || []).find((b) => String(b?.id) === sBenchId) || (reserves || []).find((r) => String(r?.id) === sBenchId);

    if (!pitchPlayer || !benchPlayer) return;

    if (benchPlayer.suspension_matches > 0 || benchPlayer.is_suspended || benchPlayer.isSuspended) {
      showNotification(`⚠️ بازیکن «${benchPlayer.name}» به دلیل محرومیت (کارت قرمز) نمی‌تواند در ترکیب اصلی قرار گیرد 🟥`);
      return;
    }

    swapPitchWithBench(pitchId, benchId);

    const natPos = benchPlayer.naturalPosition || benchPlayer.position;
    const text = `تعویض زنده داوری: ورود ${benchPlayer.name} (${natPos}) به جای ${pitchPlayer.name} (${pitchPlayer.position}) 🔄`;

    if (onPushLiveEvent) {
      onPushLiveEvent({
        id: Date.now(),
        type: 'SUB',
        event_type: 'SUB',
        player_out_id: pitchPlayer.id,
        player_in_id: benchPlayer.id,
        player_out_name: pitchPlayer.name,
        player_in_name: benchPlayer.name,
        text,
        team: teamName,
        minute: 45,
      });
    }

    showNotification(text);
    setAdminModalPlayer(null);
  };

  const lastClickTimeRef = useRef(0);
  const handlePitchPlayerClickSafely = (clickedPlayer) => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 200) return;
    lastClickTimeRef.current = now;
    handlePitchPlayerClick(clickedPlayer);
  };

  // Swap two pitch players' positions (x_coord & y_coord)
  const swapPitchPositions = (id1, id2) => {
    const sId1 = String(id1);
    const sId2 = String(id2);
    if (sId1 === sId2) return;

    const p1 = (startingXi || []).find((p) => String(p?.id) === sId1);
    const p2 = (startingXi || []).find((p) => String(p?.id) === sId2);
    if (!p1 || !p2) return;

    const updatedXi = (startingXi || []).map((p) => {
      if (String(p?.id) === sId1) {
        return {
          ...p,
          x_coord: p2.x_coord,
          y_coord: p2.y_coord,
          position: p2.position,
          naturalPosition: p.naturalPosition || p.position,
        };
      }
      if (String(p?.id) === sId2) {
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

    const preset = FORMATION_PRESETS[currentFormation];
    const normalizedXi = preset ? normalizeStartersToPreset(updatedXi, preset) : updatedXi;

    setStartingXi(normalizedXi);
    setSelectedPitchPlayerId(null);
    setSelectedBenchPlayerId(null);
    showNotification(`پست تاکتیکی «${p1.name}» و «${p2.name}» روی چمن جابجا شد 🔄`);
    notifyLineupChange(normalizedXi, substitutes, reserves, currentFormation);
  };

  // Pitch Player Drag End: Detect drop onto another pitch player to swap, or drop onto empty slot
  const handlePitchPlayerDragEnd = (player, info) => {
    if (readOnly) return;
    const dragDist = Math.hypot(info?.offset?.x || 0, info?.offset?.y || 0);
    if (dragDist < 8) return;

    const rect = pitchContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropPercentX = (((info?.point?.x || 0) - rect.left) / rect.width) * 100;
    const dropPercentY = (((info?.point?.y || 0) - rect.top) / rect.height) * 100;

    // Check if dropped onto another pitch player (swap with generous 22% radius)
    let targetPlayer = null;
    let minDistance = 9999;

    (startingXi || []).forEach((other) => {
      if (!other || String(other.id) === String(player.id)) return;
      const otherProj = getProjectedPitchCoords(other.x_coord, other.y_coord);
      const d = Math.hypot(dropPercentX - otherProj.x, dropPercentY - otherProj.y);
      if (d < 22 && d < minDistance) {
        minDistance = d;
        targetPlayer = other;
      }
    });

    if (targetPlayer) {
      swapPitchPositions(player.id, targetPlayer.id);
      return;
    }

    // Check if dropped onto an unoccupied slot (if fewer than 11 players)
    let targetEmptySlot = null;
    let minSlotDist = 9999;
    (unoccupiedSlots || []).forEach((slot) => {
      const slotProj = getProjectedPitchCoords(slot.x, slot.y);
      const d = Math.hypot(dropPercentX - slotProj.x, dropPercentY - slotProj.y);
      if (d < 20 && d < minSlotDist) {
        minSlotDist = d;
        targetEmptySlot = slot;
      }
    });

    if (targetEmptySlot) {
      const updatedXi = (startingXi || []).map((p) =>
        String(p.id) === String(player.id)
          ? {
              ...p,
              x_coord: targetEmptySlot.x,
              y_coord: targetEmptySlot.y,
              position: targetEmptySlot.pos,
            }
          : p
      );
      setStartingXi(updatedXi);
      setSelectedPitchPlayerId(null);
      setSelectedBenchPlayerId(null);
      showNotification(`«${player.name}» به پست ${targetEmptySlot.pos} منتقل شد 📍`);
      notifyLineupChange(updatedXi, substitutes, reserves, currentFormation);
      return;
    }

    // If dropped towards the substitutes bench (Y > 88%): swap with first compatible bench player or selected bench player
    if (dropPercentY > 88 && (substitutes || []).length > 0) {
      const targetBench = selectedBenchPlayerId
        ? (substitutes || []).find((b) => String(b?.id) === String(selectedBenchPlayerId))
        : (substitutes || []).find((b) => b && isPlayerCompatibleWithPosition(b, player.position)) || (substitutes || [])[0];
      if (targetBench) {
        swapPitchWithBench(player.id, targetBench.id);
        return;
      }
    }

    // If dropped on open grass without matching a target:
    // Framer Motion dragSnapToOrigin will safely snap player back to their spot without modifying coordinates!
  };

  // Swap two bench or reserve players (between bench-bench, reserve-reserve, or bench-reserve)
  const swapBenchOrReserves = (id1, id2) => {
    const sId1 = String(id1);
    const sId2 = String(id2);
    const isSub1 = (substitutes || []).some((b) => String(b?.id) === sId1);
    const isSub2 = (substitutes || []).some((b) => String(b?.id) === sId2);

    const isRes1 = (reserves || []).some((r) => String(r?.id) === sId1);
    const isRes2 = (reserves || []).some((r) => String(r?.id) === sId2);

    const p1 = (substitutes || []).find((b) => String(b?.id) === sId1) || (reserves || []).find((r) => String(r?.id) === sId1);
    const p2 = (substitutes || []).find((b) => String(b?.id) === sId2) || (reserves || []).find((r) => String(r?.id) === sId2);

    if (!p1 || !p2) return;

    // Case A: Both in bench substitutes list
    if (isSub1 && isSub2) {
      const newSubs = (substitutes || []).map((item) => (String(item?.id) === sId1 ? p2 : String(item?.id) === sId2 ? p1 : item));
      setSubstitutes(newSubs);
      showNotification(`جابجایی روی نیمکت: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      notifyLineupChange(startingXi, newSubs, reserves, currentFormation);
      return;
    }

    // Case B: Both in reserves list
    if (isRes1 && isRes2) {
      const newRes = (reserves || []).map((item) => (String(item?.id) === sId1 ? p2 : String(item?.id) === sId2 ? p1 : item));
      setReserves(newRes);
      showNotification(`جابجایی در رختکن: جایگاه «${p1.name}» و «${p2.name}» تعویض شد 🔄`);
      notifyLineupChange(startingXi, substitutes, newRes, currentFormation);
      return;
    }

    // Case C: Cross swap between substitutes and reserves
    if (isSub1 && isRes2) {
      const newSubs = (substitutes || []).map((item) => (String(item?.id) === sId1 ? p2 : item));
      const newRes = (reserves || []).map((item) => (String(item?.id) === sId2 ? p1 : item));
      setSubstitutes(newSubs);
      setReserves(newRes);
      showNotification(`ورود «${p2.name}» به نیمکت ذخیره‌ها و انتقال «${p1.name}» به خارج از ترکیب 🔄`);
      notifyLineupChange(startingXi, newSubs, newRes, currentFormation);
      return;
    }

    if (isRes1 && isSub2) {
      const newRes = (reserves || []).map((item) => (String(item?.id) === sId1 ? p2 : item));
      const newSubs = (substitutes || []).map((item) => (String(item?.id) === sId2 ? p1 : item));
      setReserves(newRes);
      setSubstitutes(newSubs);
      showNotification(`ورود «${p1.name}» به نیمکت ذخیره‌ها و انتقال «${p2.name}» به خارج از ترکیب 🔄`);
      notifyLineupChange(startingXi, newSubs, newRes, currentFormation);
      return;
    }
  };

  // Swap a pitch player with a bench/reserve player
  const swapPitchWithBench = (pitchId, benchId, isFromSubstitutes = true) => {
    const sPitchId = String(pitchId);
    const sBenchId = String(benchId);
    const pitchPlayer = (startingXi || []).find((p) => String(p?.id) === sPitchId);
    const benchSourceList = isFromSubstitutes ? (substitutes || []) : (reserves || []);
    const benchPlayer = benchSourceList.find((b) => String(b?.id) === sBenchId) ||
                        (substitutes || []).find((b) => String(b?.id) === sBenchId) ||
                        (reserves || []).find((b) => String(b?.id) === sBenchId);

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

    const updatedXi = (startingXi || []).map((p) => (String(p?.id) === sPitchId ? newPitchPlayer : p));
    const preset = FORMATION_PRESETS[currentFormation];
    const normalizedXi = preset ? normalizeStartersToPreset(updatedXi, preset) : updatedXi;
    setStartingXi(normalizedXi);

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

    let newSubs = substitutes || [];
    let newRes = reserves || [];
    const isBenchSub = (substitutes || []).some((b) => String(b?.id) === sBenchId);
    if (isBenchSub) {
      newSubs = (substitutes || []).map((b) => (String(b?.id) === sBenchId ? newBenchPlayer : b));
      setSubstitutes(newSubs);
    } else {
      newRes = (reserves || []).map((b) => (String(b?.id) === sBenchId ? newBenchPlayer : b));
      setReserves(newRes);
    }

    setSelectedPitchPlayerId(null);
    setSelectedBenchPlayerId(null);
    showNotification(`تعویض تاکتیکی: ورود «${benchPlayer.name}» به جای «${pitchPlayer.name}» 🔄`);
    notifyLineupChange(normalizedXi, newSubs, newRes, currentFormation);
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
      const sBenchId = String(selectedBenchPlayerId);
      const benchPlayer = (substitutes || []).find((b) => String(b?.id) === sBenchId) || (reserves || []).find((r) => String(r?.id) === sBenchId);
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

      const updatedXi = [...(startingXi || []), newPitchPlayer];
      const newSubs = (substitutes || []).filter((b) => String(b?.id) !== sBenchId);
      const newRes = (reserves || []).filter((r) => String(r?.id) !== sBenchId);

      setStartingXi(updatedXi);
      setSubstitutes(newSubs);
      setReserves(newRes);
      setSelectedBenchPlayerId(null);
      setSelectedPitchPlayerId(null);
      setHighlightedPosition(null);
      showNotification(`بازیکن «${benchPlayer.name}» در پست ${slot.pos} در ترکیب اصلی قرار گرفت ✅`);
      notifyLineupChange(updatedXi, newSubs, newRes, currentFormation);
      return;
    }

    // Case 2: A pitch player was already selected -> Move them directly to this empty slot
    if (selectedPitchPlayerId) {
      const sPitchId = String(selectedPitchPlayerId);
      const pitchPlayer = (startingXi || []).find((p) => String(p?.id) === sPitchId);
      if (pitchPlayer) {
        const updatedXi = (startingXi || []).map((item) =>
          String(item?.id) === sPitchId
            ? { ...item, position: slot.pos, x_coord: slot.x, y_coord: slot.y }
            : item
        );
        setStartingXi(updatedXi);
        setSelectedPitchPlayerId(null);
        setSelectedBenchPlayerId(null);
        setHighlightedPosition(null);
        showNotification(`«${pitchPlayer.name}» به پست خالی ${slot.pos} منتقل شد ✅`);
        notifyLineupChange(updatedXi, substitutes, reserves, currentFormation);
        return;
      }
    }

    // Case 3: In Admin Mode, keep modal
    if (isAdminMode) {
      setAdminModalPlayer({ id: `empty_${slot.pos}`, position: slot.pos, name: `پست ${slot.pos}`, isPitchPlayer: true });
      setAdminModalTab('SUB');
      return;
    }

    // Case 4: In Coach mode, open direct player slot select modal and highlight suitable bench candidates
    setHighlightedPosition(slot.pos);
    setSlotModalState({ isOpen: true, targetSlot: slot });
  };

  const activeSelectedPlayer =
    (startingXi || []).find((p) => String(p?.id) === String(selectedPitchPlayerId)) ||
    (substitutes || []).find((p) => String(p?.id) === String(selectedBenchPlayerId)) ||
    (reserves || []).find((r) => String(r?.id) === String(selectedBenchPlayerId));

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

        {/* FORMATION SELECTOR BAR & SMART ACTIONS */}
        {!readOnly && (
          <div className="bg-[#080c14]/90 p-3 sm:p-4 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Sliders size={18} />
              </div>
              <div>
                <span className="text-xs font-black text-white block">انتخاب ترکیب چیدمان (Formation):</span>
                <span className="text-[10px] text-slate-400">۱۴ آرایش رسمی بدون تداخل کارت</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <div className="w-full sm:w-56">
                <CustomSelect
                  value={currentFormation}
                  onChange={handleFormationChange}
                  colorTheme="cyan"
                  options={FORMATION_OPTIONS}
                  disabled={isTacticsDisabled}
                />
              </div>

              <button
                type="button"
                onClick={handleRealignLineup}
                title="تراز خودکار بازیکنان بر اساس نقاط رسمی این چیدمان بدون تغییر بازیکنان"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Sliders size={14} />
                <span>تراز چیدمان</span>
              </button>

              <button
                type="button"
                onClick={handleAutoOptimizeLineup}
                title="چینش خودکار بهترین ۱۱ بازیکن بر اساس قدرت (OVR) و پست تخصصی"
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Wand2 size={15} />
                <span>چینش هوشمند</span>
              </button>
            </div>
          </div>
        )}

        {/* TOP: FUTBIN 3D PERSPECTIVE FOOTBALL PITCH CONTAINER */}
        <div 
          ref={pitchContainerRef}
          onClick={() => {
            if (selectedPitchPlayerId) setSelectedPitchPlayerId(null);
            if (selectedBenchPlayerId) setSelectedBenchPlayerId(null);
            if (highlightedPosition) setHighlightedPosition(null);
            if (adminQuickDockPlayer) setAdminQuickDockPlayer(null);
          }}
          className="relative w-full max-w-4xl mx-auto rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] select-none bg-[#050811] border border-slate-800/80 -mx-0 sm:mx-auto"
        >
          {/* Aspect-Ratio 3D Pitch Container */}
          <div className="relative w-full h-[510px] xs:h-[540px] sm:h-auto sm:aspect-[924/760] sm:min-h-[620px] md:min-h-[720px] flex items-center justify-center">
            {/* 3D Pitch Image Asset */}
            <img
              src={futPitchImg}
              alt="3D Stadium Pitch"
              className="absolute inset-0 w-full h-full object-fill sm:object-contain pointer-events-none select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
            />

            {/* MANAGER CARD / BADGE SLOT (Top-Left corner outside grass touchline) */}
            <div className="absolute top-2 left-2 sm:top-[3.5%] sm:left-[3.5%] z-30 pointer-events-auto">
              {/* Mobile: Sleek compact floating badge */}
              <div className="flex sm:hidden items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-xl border border-sky-500/40 shadow-lg">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-sky-400/50 flex items-center justify-center shrink-0">
                  {(team?.manager_avatar || team?.logo_url) ? (
                    <img
                      src={team?.manager_avatar || team?.logo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={13} className="text-sky-300" />
                  )}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[7.5px] text-sky-300 font-bold">سرمربی</span>
                  <span className="text-[9px] font-black text-white truncate max-w-[70px]">
                    {team?.manager_name || team?.manager || 'سرمربی'}
                  </span>
                </div>
              </div>

              {/* Desktop: Full authentic FUT Manager Card */}
              <div className="hidden sm:block">
                <FutPitchCard
                  isManager={true}
                  managerData={{
                    name: team?.manager_name || team?.manager || 'سرمربی',
                    avatar: team?.manager_avatar || team?.logo_url,
                  }}
                  cardSize="bench"
                  showPillUnderCard={true}
                />
              </div>
            </div>

            {/* CURRENT FORMATION BADGE (Bottom-Right corner) */}
            <div className="absolute bottom-[2%] right-[2%] sm:bottom-[3%] sm:right-[3%] z-20 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg pointer-events-none">
              <span className="text-[10px] text-emerald-400 font-bold">ترکیب تیمی:</span>
              <span className="text-xs sm:text-sm font-black text-white font-sport tracking-wider">
                {currentFormation}
              </span>
            </div>

            {/* PLAYERS ON 3D PITCH SURFACE */}
            <div className="absolute inset-0 pointer-events-none">
              {(startingXi || []).map((player) => {
                if (!player) return null;
                const isSelected = String(selectedPitchPlayerId) === String(player.id);
                const natPos = player.naturalPosition || player.base_position || player.main_position || player.position;
                const slotPos = player.position || natPos || 'CMF';
                const selectedPitchSlot = selectedPitchPlayer ? selectedPitchPlayer.position : null;

                // Green Highlight: Can the selected player play in this specific formation slot?
                const isSlotPlayableBySelectedPitch = Boolean(
                  selectedPitchPlayer && !isSelected && isPlayerCompatibleWithPosition(selectedPitchPlayer, slotPos)
                );
                const isSlotPlayableBySelectedBench = Boolean(
                  selectedBenchPlayer && isPlayerCompatibleWithPosition(selectedBenchPlayer, slotPos)
                );
                const isGreenSlot = Boolean(
                  isSlotPlayableBySelectedPitch ||
                  isSlotPlayableBySelectedBench ||
                  (highlightedPosition && slotPos === highlightedPosition)
                );

                // Star Highlight: Can this player play in the selected player's current slot or highlighted position?
                const isPlayerPlayableInSelectedSlot = Boolean(
                  selectedPitchPlayer && !isSelected && isPlayerCompatibleWithPosition(player, selectedPitchSlot)
                );
                const isExactPlayerMatchForSelectedSlot = Boolean(
                  selectedPitchPlayer && !isSelected && isPlayerExactPosition(player, selectedPitchSlot)
                );
                const isHighlightedMatch = Boolean(
                  highlightedPosition && isPlayerCompatibleWithPosition(player, highlightedPosition)
                );
                const isExactHighlightedMatch = Boolean(
                  highlightedPosition && isPlayerExactPosition(player, highlightedPosition)
                );

                const hasStarRating = Boolean(
                  isPlayerPlayableInSelectedSlot ||
                  (selectedBenchPlayer && isSlotPlayableBySelectedBench) ||
                  isHighlightedMatch
                );
                const isExactMatch = Boolean(
                  isExactPlayerMatchForSelectedSlot ||
                  (selectedBenchPlayer && isPlayerExactPosition(selectedBenchPlayer, slotPos)) ||
                  isExactHighlightedMatch
                );

                // Dimming
                const isDimmed = Boolean(
                  (selectedPitchPlayerId && !isSelected && !isGreenSlot && !hasStarRating) ||
                  (selectedBenchPlayerId && !isGreenSlot) ||
                  (highlightedPosition && !isHighlightedMatch && !isGreenSlot)
                );

                const isOutOfPosition = Boolean(!isPlayerCompatibleWithPosition(player, slotPos));
                const projected = getProjectedPitchCoords(player.x_coord, player.y_coord);

                return (
                  <motion.div
                    key={player.id}
                    drag={!readOnly && !isAdminMode && !isMobile}
                    dragConstraints={pitchContainerRef}
                    dragSnapToOrigin={true}
                    dragElastic={0.08}
                    dragMomentum={false}
                    whileDrag={{ scale: 1.15, zIndex: 100 }}
                    onDragEnd={(e, info) => {
                      if (isMobile) return;
                      const dist = Math.hypot(info?.offset?.x || 0, info?.offset?.y || 0);
                      if (dist < 8) {
                        handlePitchPlayerClickSafely(player);
                        return;
                      }
                      lastClickTimeRef.current = Date.now();
                      handlePitchPlayerDragEnd(player, info);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePitchPlayerClickSafely(player);
                    }}
                    initial={false}
                    animate={{
                      left: `${projected.x}%`,
                      top: `${projected.y}%`,
                    }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ willChange: 'left, top' }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 hover:z-30 pointer-events-auto select-none ${
                      isMobile
                        ? 'touch-auto cursor-pointer'
                        : !readOnly && !isAdminMode
                        ? 'touch-none cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer'
                    }`}
                  >
                    <FutPitchCard
                      player={player}
                      slotPos={slotPos}
                      isSelected={isSelected}
                      isGreenSlot={isGreenSlot}
                      hasStarRating={hasStarRating}
                      isExactMatch={isExactMatch}
                      isDimmed={isDimmed}
                      isOutOfPosition={isOutOfPosition}
                      isLiveMode={isLiveMode}
                      isAdminMode={isAdminMode}
                      cardSize="normal"
                    />
                  </motion.div>
                );
              })}

              {/* Render Empty Formation Slots if fewer than 11 players on pitch */}
              {unoccupiedSlots.map((slot, sIdx) => {
                const isSlotHighlighted = Boolean(
                  (highlightedPosition && highlightedPosition === slot.pos) ||
                  (selectedBenchPlayer && isPlayerCompatibleWithPosition(selectedBenchPlayer, slot.pos)) ||
                  (selectedPitchPlayer && isPlayerCompatibleWithPosition(selectedPitchPlayer, slot.pos))
                );
                const projected = getProjectedPitchCoords(slot.x, slot.y);

                return (
                  <motion.div
                    key={`empty-slot-${sIdx}-${slot.pos}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmptySlotClick(slot);
                    }}
                    initial={false}
                    animate={{
                      left: `${projected.x}%`,
                      top: `${projected.y}%`,
                    }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ willChange: 'left, top' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 hover:z-30 cursor-pointer pointer-events-auto select-none touch-auto"
                  >
                    <FutPitchCard
                      player={null}
                      slotPos={slot.pos}
                      isGreenSlot={isSlotHighlighted}
                      cardSize="normal"
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ACTIVE POSITION HIGHLIGHT BANNER */}
        {(activeHighlightPos || selectedPitchPlayerId || selectedBenchPlayerId) && (
          <div className="bg-gradient-to-r from-emerald-950/95 via-[#081f1d] to-[#080c14] border border-emerald-400/60 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.25)] backdrop-blur-xl animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="text-base animate-bounce">🟢</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-white text-xs sm:text-sm">
                    {selectedPitchPlayerId
                      ? `پست‌های قابل بازی ${activeSelectedPlayer?.name || 'بازیکن'} در این ترکیب (سبز 🟢) و گزینه‌های جانشین (ستاره ⭐):`
                      : selectedBenchPlayerId
                      ? `موقعیت‌های مناسب در زمین برای ورود ${activeSelectedPlayer?.name || 'بازیکن'} (سبز 🟢):`
                      : 'هایلایت پست:'}
                  </span>
                  {activeHighlightPos && (
                    <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded shadow ${POSITION_COLORS[activeHighlightPos] || 'bg-emerald-600 text-slate-950'}`}>
                      {activeHighlightPos} ({POSITION_INFO[activeHighlightPos]?.title || activeHighlightPos})
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-emerald-300/80 mt-0.5 hidden sm:block">
                  {selectedPitchPlayerId
                    ? 'پست‌های این چیدمان که بازیکن توانایی بازی در آنها را دارد سبز 🟢 شده و سایر بازیکنان آماده برای این پست با ستاره ⭐ مشخص شده‌اند.'
                    : selectedBenchPlayerId
                    ? 'پست‌های مناسب این بازیکن در چمن با کادر سبز 🟢 مشخص شده‌اند.'
                    : 'تمام بازیکنان تخصصی و سازگار با این پست با ستاره طلایی ⭐ و کادر سبز مشخص شده‌اند.'}
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

        {/* BOTTOM: BENCH & RESERVES CONTAINER (12-Slot Bench with Row Wrap) */}
        <div className="bg-[#080c14]/90 rounded-3xl p-4 md:p-5 border border-slate-700/60 text-white shadow-2xl space-y-5 backdrop-blur-xl">
          {/* SECTION 1: BENCH SUBSTITUTES (۱۲ اسلات نیمکت) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <span className="font-black text-sm md:text-base text-cyan-300 flex items-center gap-2">
                <Users size={18} className="text-cyan-400" />
                <span>بازیکنان نیمکت ذخیره (Substitutes - ۱۲ اسلات)</span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                کلیک روی کارت جهت تعویض با چمن یا کلیک روی + برای افزودن بازیکن به نیمکت
              </span>
            </div>

            {/* 12 Bench Slots with Row Wrap (7 in Row 1, 5 in Row 2 on desktop) */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-4xl mx-auto py-1">
              {Array.from({ length: 12 }).map((_, idx) => {
                const sub = (substitutes || [])[idx];
                if (!sub) {
                  return (
                    <FutPitchCard
                      key={`empty-bench-slot-${idx}`}
                      player={null}
                      slotPos="SUB"
                      cardSize="bench"
                      onClick={() => {
                        setSlotModalState({
                          isOpen: true,
                          targetSlot: { pos: 'SUB', isBench: true, slotIndex: idx },
                        });
                      }}
                    />
                  );
                }

                const isSelected = String(selectedBenchPlayerId) === String(sub.id);
                const natPos = sub.naturalPosition || sub.base_position || sub.main_position || sub.position;
                const targetPos = highlightedPosition || (selectedPitchPlayer ? selectedPitchPlayer.position : null);
                const isPosMatch = !selectedBenchPlayerId && Boolean(targetPos && isPlayerCompatibleWithPosition(sub, targetPos));
                const isExactMatch = Boolean(targetPos && isPlayerExactPosition(sub, targetPos));
                const isDimmed = !selectedBenchPlayerId && Boolean(targetPos && !isSelected && !isPosMatch);

                return (
                  <div key={sub.id || `bench-${idx}`} className="relative shrink-0">
                    <FutPitchCard
                      player={sub}
                      slotPos={natPos || 'SUB'}
                      isSelected={isSelected}
                      isGreenSlot={isPosMatch}
                      hasStarRating={isPosMatch}
                      isExactMatch={isExactMatch}
                      isDimmed={isDimmed}
                      isLiveMode={isLiveMode}
                      isAdminMode={isAdminMode}
                      cardSize="bench"
                      onClick={() => handleBenchPlayerClick(sub, true)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: RESERVES / SQUAD EXTENSION (NO SCROLLBAR, ROW WRAP) */}
          {!hideReserves && !isLiveMode && (() => {
            const extraBench = (substitutes || []).slice(12);
            const allRes = [...extraBench, ...(reserves || [])];
            if (allRes.length === 0) return null;

            return (
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                  <span className="text-[11px] font-black text-cyan-300 px-3 py-1 bg-[#080c14] rounded-full border border-cyan-500/40 shadow-inner flex items-center gap-1.5 font-sport">
                    <ArrowLeftRight size={13} className="text-cyan-400" />
                    <span>سایر بازیکنان و لیست رختکن (Reserves - {allRes.length} نفر)</span>
                  </span>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
                  {allRes.map((res) => {
                    if (!res) return null;
                    const isSelected = String(selectedBenchPlayerId) === String(res.id);
                    const natPos = res.naturalPosition || res.base_position || res.main_position || res.position;
                    const targetPos = highlightedPosition || (selectedPitchPlayer ? selectedPitchPlayer.position : null);
                    const isPosMatch = !selectedBenchPlayerId && Boolean(targetPos && isPlayerCompatibleWithPosition(res, targetPos));
                    const isExactMatch = Boolean(targetPos && isPlayerExactPosition(res, targetPos));
                    const isDimmed = !selectedBenchPlayerId && Boolean(targetPos && !isSelected && !isPosMatch);

                    return (
                      <div key={res.id} className="relative shrink-0">
                        <FutPitchCard
                          player={res}
                          slotPos={natPos || 'RES'}
                          isSelected={isSelected}
                          isGreenSlot={isPosMatch}
                          hasStarRating={isPosMatch}
                          isExactMatch={isExactMatch}
                          isDimmed={isDimmed}
                          isLiveMode={isLiveMode}
                          isAdminMode={isAdminMode}
                          cardSize="bench"
                          onClick={() => handleBenchPlayerClick(res, false)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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


      {/* CONFIRM MODAL: STAMINA RECOVERY */}


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

      {/* QUICK SUBSTITUTION PHOTO PICKER MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {quickSubModal.isOpen && quickSubModal.sourcePlayer && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
              <div
                className="fixed inset-0"
                onClick={() => setQuickSubModal({ isOpen: false, sourcePlayer: null, targetType: null })}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative z-10 bg-slate-950 border-2 border-emerald-500/40 rounded-3xl w-full max-w-2xl my-auto p-4 sm:p-6 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-right"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      <ArrowLeftRight size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-white">
                        {quickSubModal.targetType === 'bench' ? 'تعویض بازیکن: انتخاب جانشین از روی نیمکت' : 'تعویض بازیکن: انتخاب بازیکن داخل زمین برای خروج'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {quickSubModal.targetType === 'bench'
                          ? `خروج «${quickSubModal.sourcePlayer.name}» از زمین و ورود یک بازیکن از نیمکت`
                          : `ورود «${quickSubModal.sourcePlayer.name}» به جای یکی از ۱۱ بازیکن داخل زمین`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuickSubModal({ isOpen: false, sourcePlayer: null, targetType: null })}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Source Player Banner */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                      {getPlayerPhotoUrl(quickSubModal.sourcePlayer) ? (
                        <img
                          src={getPlayerPhotoUrl(quickSubModal.sourcePlayer)}
                          alt={quickSubModal.sourcePlayer.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">
                          {String(quickSubModal.sourcePlayer.name || 'PL').slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{quickSubModal.sourcePlayer.name}</span>
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-sport font-black text-xs border border-emerald-500/30">
                          {quickSubModal.sourcePlayer.position || quickSubModal.sourcePlayer.naturalPosition}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-sport font-black text-xs border border-amber-500/30">
                          OVR {quickSubModal.sourcePlayer.overall || 75}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {quickSubModal.targetType === 'bench' ? '⬅️ بازیکن در حال خروج از زمین' : '➡️ بازیکن در حال ورود به زمین'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidates List Header */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    {quickSubModal.targetType === 'bench'
                      ? 'روی بازیکن دلخواه از نیمکت کلیک کنید تا تعویض فوراً انجام شود:'
                      : 'روی بازیکنی از ۱۱ نفر اصلی کلیک کنید تا با این بازیکن جابجا شود:'}
                  </span>
                  <span className="font-sport text-cyan-400 font-bold">
                    {quickSubModal.targetType === 'bench'
                      ? `${(substitutes || []).length} بازیکن نیمکت`
                      : '۱۱ بازیکن ترکیب اصلی'}
                  </span>
                </div>

                {/* Candidate Players Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {(quickSubModal.targetType === 'bench' ? (substitutes || []) : (startingXi || [])).map((candidate) => {
                    const candPhoto = getPlayerPhotoUrl(candidate);
                    const isCandidateCompatible = quickSubModal.targetType === 'bench'
                      ? ((candidate.naturalPosition || candidate.position) === quickSubModal.sourcePlayer.position)
                      : (quickSubModal.sourcePlayer.naturalPosition === (candidate.position || candidate.naturalPosition));

                    return (
                      <button
                        key={candidate.id}
                        onClick={() => {
                          if (quickSubModal.targetType === 'bench') {
                            swapPitchWithBench(quickSubModal.sourcePlayer.id, candidate.id);
                            showNotification(`تعویض انجام شد: «${candidate.name}» به جای «${quickSubModal.sourcePlayer.name}» وارد زمین شد 🔄`);
                          } else {
                            swapPitchWithBench(candidate.id, quickSubModal.sourcePlayer.id);
                            showNotification(`تعویض انجام شد: «${quickSubModal.sourcePlayer.name}» به جای «${candidate.name}» وارد زمین شد 🔄`);
                          }
                          setQuickSubModal({ isOpen: false, sourcePlayer: null, targetType: null });
                        }}
                        className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 group cursor-pointer hover:scale-[1.01] ${
                          isCandidateCompatible
                            ? 'bg-emerald-950/40 border-emerald-500/50 hover:bg-emerald-900/60 hover:border-emerald-400 shadow-md'
                            : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/90 hover:border-cyan-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shrink-0 group-hover:border-emerald-400 transition-colors">
                            {candPhoto ? (
                              <img
                                src={candPhoto}
                                alt={candidate.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">
                                {String(candidate.name || 'PL').slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
                              {candidate.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-sport font-black text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                                {candidate.position || candidate.naturalPosition}
                              </span>
                              <span className="font-sport font-bold text-[10px] text-amber-300">
                                OVR {candidate.overall || 75}
                              </span>
                              {isCandidateCompatible && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-500/30">
                                  سازگار ⭐
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow group-hover:bg-emerald-400 group-hover:text-black transition-all">
                            <span>تعویض</span>
                            <ArrowLeftRight size={13} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ADMIN RAPID EVENT FLOATING ACTION BAR (Mounted to document.body via Portal) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isAdminMode && adminQuickDockPlayer && (
            <div
              className="fixed inset-0 z-[99999] flex flex-col justify-end items-center p-3 sm:p-6 bg-black/60 backdrop-blur-[2px] overflow-y-auto"
              onClick={() => setAdminQuickDockPlayer(null)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 80, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="relative z-10 w-full max-w-2xl bg-[#080d1a]/95 backdrop-blur-2xl border-2 border-cyan-500/70 shadow-[0_0_50px_rgba(6,182,212,0.45)] rounded-3xl p-3 sm:p-4 my-auto sm:my-0 sm:mb-2 space-y-3 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header: Player Info, Minute Selector, Close */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Player Avatar */}
                    <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/50 shrink-0 shadow-md">
                      {getPlayerPhotoUrl(adminQuickDockPlayer) ? (
                        <img
                          src={getPlayerPhotoUrl(adminQuickDockPlayer)}
                          alt={adminQuickDockPlayer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-cyan-300 text-xs">
                          {String(adminQuickDockPlayer.name || 'PL').slice(0, 2)}
                        </div>
                      )}
                    </div>

                    {/* Name & Badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-sm truncate">
                          {adminQuickDockPlayer.name}
                        </span>
                        {adminQuickDockPlayer.isBench && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold shrink-0">
                            نیمکت
                          </span>
                        )}
                        <span className="font-sport font-black text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-500/30 shrink-0">
                          {adminQuickDockPlayer.position || adminQuickDockPlayer.naturalPosition || 'PL'}
                        </span>
                      </div>
                      
                      {/* Active Player In-Match Stats */}
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-sport mt-0.5 flex-wrap">
                        <span>{teamName}</span>
                        {Number(adminQuickDockPlayer.in_match_goals || 0) > 0 && (
                          <span className="text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            ⚽ {adminQuickDockPlayer.in_match_goals}
                          </span>
                        )}
                        {Number(adminQuickDockPlayer.in_match_assists || 0) > 0 && (
                          <span className="text-blue-300 font-bold bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-500/30">
                            🅰️ {adminQuickDockPlayer.in_match_assists}
                          </span>
                        )}
                        {Number(adminQuickDockPlayer.own_goals || adminQuickDockPlayer.in_match_own_goals || 0) > 0 && (
                          <span className="text-purple-300 font-bold bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-500/30">
                            🤦‍♂️ {adminQuickDockPlayer.own_goals || adminQuickDockPlayer.in_match_own_goals}
                          </span>
                        )}
                        {Number(adminQuickDockPlayer.yellowCards || 0) > 0 && (
                          <span className="text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30">
                            🟨 {adminQuickDockPlayer.yellowCards}
                          </span>
                        )}
                        {adminQuickDockPlayer.isRed && (
                          <span className="text-rose-300 font-bold bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/30">
                            🟥 اخراج
                          </span>
                        )}
                        {adminQuickDockPlayer.isInjured && (
                          <span className="text-red-300 font-bold bg-red-950/80 px-1.5 py-0.2 rounded border border-red-500/30">
                            🚑 مصدوم
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Minute Adjuster & Close Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-xl">
                      <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">دقیقه:</span>
                      <input
                        type="number"
                        min="1"
                        max="130"
                        value={quickEventMinute}
                        onChange={(e) => setQuickEventMinute(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-12 bg-slate-950 border border-cyan-500/50 rounded-lg text-center text-cyan-300 font-sport font-black text-xs py-0.5 focus:outline-none focus:border-cyan-400"
                      />
                      <span className="text-[11px] text-cyan-400 font-sport font-bold">'</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdminQuickDockPlayer(null)}
                      className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center text-sm cursor-pointer transition-colors shrink-0"
                      title="بستن پنجره"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'GOAL')}
                    title="ثبت گل"
                    className="p-2 rounded-2xl bg-emerald-950/70 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">⚽</span>
                    <span className="text-[11px] font-bold">گل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'ASSIST')}
                    title="ثبت پاس‌گل"
                    className="p-2 rounded-2xl bg-blue-950/70 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 text-blue-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🅰️</span>
                    <span className="text-[11px] font-bold">پاس‌گل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'YELLOW')}
                    title="ثبت کارت زرد"
                    className="p-2 rounded-2xl bg-amber-950/70 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 text-amber-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🟨</span>
                    <span className="text-[11px] font-bold">کارت زرد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'RED')}
                    title="کارت قرمز مستقیم"
                    className="p-2 rounded-2xl bg-rose-950/70 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 text-rose-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🟥</span>
                    <span className="text-[11px] font-bold">کارت قرمز</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'PENALTY_SCORED')}
                    title="گل از روی پنالتی"
                    className="p-2 rounded-2xl bg-teal-950/70 hover:bg-teal-600 border border-teal-500/50 hover:border-teal-400 text-teal-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🎯</span>
                    <span className="text-[11px] font-bold">پنالتی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'OWN_GOAL')}
                    title="گل به خودی"
                    className="p-2 rounded-2xl bg-purple-950/70 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 text-purple-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🤦‍♂️</span>
                    <span className="text-[11px] font-bold">به خودی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'INJURY')}
                    title="مصدومیت بازیکن"
                    className="p-2 rounded-2xl bg-red-950/70 hover:bg-red-600 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">🚑</span>
                    <span className="text-[11px] font-bold">مصدومیت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdminQuickEvent(adminQuickDockPlayer, 'UNDO')}
                    title="لغو رویداد اخیر این بازیکن"
                    className="p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white transition-all duration-150 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 group shadow-sm"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">↩️</span>
                    <span className="text-[11px] font-bold">لغو</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* DIRECT PLAYER SLOT SELECT MODAL */}
      <PlayerSlotSelectModal
        isOpen={slotModalState.isOpen}
        onClose={() => setSlotModalState({ isOpen: false, targetSlot: null })}
        targetSlot={slotModalState.targetSlot}
        availablePlayers={
          slotModalState.targetSlot?.isBench
            ? [...(substitutes || []).slice(12), ...(reserves || [])]
            : [...(substitutes || []), ...(reserves || [])]
        }
        onSelectPlayer={(player) => handleSelectPlayerForSlot(player, slotModalState.targetSlot)}
      />
    </div>
  );
}
