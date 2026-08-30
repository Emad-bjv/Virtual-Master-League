import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Swords, Sparkles, Check, X, Award, ChevronLeft } from 'lucide-react';
import { FORMATION_PRESETS } from '../../context/TeamContext';

export const POSITION_HIERARCHY = {
  GK: ['GK'],
  CB: ['CB', 'LB', 'RB', 'DMF'],
  LB: ['LB', 'LMF', 'CB', 'RB'],
  RB: ['RB', 'RMF', 'CB', 'LB'],
  DMF: ['DMF', 'CMF', 'CB'],
  CMF: ['CMF', 'AMF', 'DMF', 'LMF', 'RMF'],
  AMF: ['AMF', 'CMF', 'SS', 'LMF', 'RMF', 'LWF', 'RWF'],
  LMF: ['LMF', 'LWF', 'CMF', 'LB', 'AMF'],
  RMF: ['RMF', 'RWF', 'CMF', 'RB', 'AMF'],
  LWF: ['LWF', 'LMF', 'SS', 'CF', 'RWF', 'AMF'],
  RWF: ['RWF', 'RMF', 'SS', 'CF', 'LWF', 'AMF'],
  SS: ['SS', 'CF', 'AMF', 'LWF', 'RWF'],
  CF: ['CF', 'SS', 'LWF', 'RWF'],
};

export const SIMPLE_TACTICAL_PRESETS = [
  {
    id: 'long_ball',
    name: 'توپ بلند',
    formation: '4-3-3 (4-2-1-3)',
    icon: '🚀',
    category: 'ضدحمله',
    tagColor: 'from-amber-500 to-orange-600',
    description: 'ضدحمله مستقیم با ارسال پاس‌های بلند به کناره‌ها و فضای پشت دفاع حریف',
    attackSummary: 'ضدحمله • پاس بلند • کناره • حفظ ترکیب',
    defenseSummary: 'همه دفاع • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'ضد حمله',
      build_up: 'پاس بلند',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 8,
      defensive_style: 'همه دفاع',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 4,
      compactness: 7,
      adv_offense_1: 'اهداف مرکز',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'خط دفاعی عمیق',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'quick_counter',
    name: 'ضد حمله سریع',
    formation: '4-3-3 (4-1-2-3)',
    icon: '⚡',
    category: 'سرعتی',
    tagColor: 'from-cyan-500 to-blue-600',
    description: 'انتقال فوق‌سریع توپ از دفاع به حمله با پاس‌های کوتاه و پرس شدید تهاجمی از جلو',
    attackSummary: 'ضدحمله • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • تهاجمی',
    tactics: {
      attacking_style: 'ضد حمله',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 7,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'تهاجمی',
      defensive_line: 7,
      compactness: 6,
      adv_offense_1: 'تیکی تاکا',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'فشار',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'possession',
    name: 'بازی مالکانه',
    formation: '4-5-1 (4-2-3-1)',
    icon: '👑',
    category: 'کنترل بازی',
    tagColor: 'from-emerald-500 to-teal-600',
    description: 'کنترل کامل نبض بازی، گردش مداوم توپ در میانه میدان و پرس تهاجمی بازپس‌گیری',
    attackSummary: 'مالکانه • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • تهاجمی',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 5,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'تهاجمی',
      defensive_line: 7,
      compactness: 7,
      adv_offense_1: 'تیکی تاکا',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'فشار',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'park_the_bus',
    name: 'همه دفاع',
    formation: '4-5-1 (4-3-2-1)',
    icon: '🛡️',
    category: 'دفاعی',
    tagColor: 'from-blue-600 to-indigo-700',
    description: 'بستن تمام راه‌های نفوذ حریف، تجمع متراکم در یک‌سوم دفاعی و انتقال با پاس‌های مطمئن',
    attackSummary: 'مالکانه • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'همه دفاع • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 4,
      defensive_style: 'همه دفاع',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 2,
      compactness: 9,
      adv_offense_1: 'هیچکدام',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'خط دفاعی عمیق',
      adv_defense_2: 'شلوغی در محوطه جریمه',
    }
  },
  {
    id: 'all_out_attack',
    name: 'همه حمله',
    formation: '3-3-4 (3-3-4)',
    icon: '🔥',
    category: 'فوق‌تهاجمی',
    tagColor: 'from-rose-600 to-red-700',
    description: 'هجوم پردامنه با ۴ مهاجم (وینگرها و دو مهاجم نوک)، ۳ مدافع میانی و پرس پرفشار',
    attackSummary: 'ضدحمله • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'ضد حمله',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 8,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 8,
      compactness: 5,
      adv_offense_1: 'دوران بال‌ها',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'فشار',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'out_wide_attacking',
    name: 'جناح کناری (تهاجمی)',
    formation: '4-3-3 (4-1-2-3)',
    icon: '🦅',
    category: 'کناره‌ها',
    tagColor: 'from-purple-500 to-pink-600',
    description: 'حمله بر پایه عرض زمین، استفاده از بال‌های سرعتی و ارسال‌های مداوم روی دروازه',
    attackSummary: 'بازی مالکانه • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 6,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 6,
      compactness: 6,
      adv_offense_1: 'بال غلط',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'هیچکدام',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'out_wide_defensive',
    name: 'جناح کناری (دفاعی)',
    formation: '4-5-1 (4-2-3-1)',
    icon: '🏰',
    category: 'کناره‌ها',
    tagColor: 'from-slate-600 to-slate-800',
    description: 'پوشش مستحکم جناحین، حمایت دفاعی هافبک‌های کناری و نفوذ با احتیاط',
    attackSummary: 'بازی مالکانه • پاس کوتاه • کناره • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'کناره',
      positioning: 'حفظ ترکیب',
      support_range: 5,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 4,
      compactness: 8,
      adv_offense_1: 'هیچکدام',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'بال عقب',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'central_attacking',
    name: 'میانه عقب (تهاجمی)',
    formation: '3-5-2 (3-2-3-2)',
    icon: '🎯',
    category: 'عمقی',
    tagColor: 'from-amber-600 to-rose-600',
    description: 'نفوذ عمقی و قدرتمند از قلب دفاع حریف با پاس‌های عمقی تودر و مهاجم دوم',
    attackSummary: 'بازی مالکانه • پاس کوتاه • مرکز • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'مرکز',
      positioning: 'حفظ ترکیب',
      support_range: 7,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 6,
      compactness: 6,
      adv_offense_1: 'شماره ۹ کاذب',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'مقابله با هدف',
      adv_defense_2: 'هیچکدام',
    }
  },
  {
    id: 'central_defensive',
    name: 'میانه عقب (دفاعی)',
    formation: '4-4-2 (4-3-1-2)',
    icon: '🧱',
    category: 'عمقی',
    tagColor: 'from-emerald-700 to-cyan-800',
    description: 'تراکم حداکثری هافبک‌های میانی در مرکز زمین و ضدحملات برنامه‌ریزی‌شده با دو مهاجم',
    attackSummary: 'بازی مالکانه • پاس کوتاه • مرکز • حفظ ترکیب',
    defenseSummary: 'فشار خط مقدم • کناره • محافظه‌کار',
    tactics: {
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'مرکز',
      positioning: 'حفظ ترکیب',
      support_range: 5,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'کناره',
      pressing: 'محافظه کار',
      defensive_line: 5,
      compactness: 8,
      adv_offense_1: 'لنگر انداختن',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'خط دفاعی عمیق',
      adv_defense_2: 'هیچکدام',
    }
  },
];

/**
 * Enhanced Auto-Selection Algorithm:
 * Strictly matches every formation slot with the most compatible player having the highest OVR.
 */
export function autoSelectOptimalLineup(playersList, formationName) {
  const preset = FORMATION_PRESETS[formationName] || FORMATION_PRESETS['4-3-3 (4-2-1-3)'];
  if (!preset || !playersList || playersList.length === 0) return playersList;

  // 1. Filter out suspended players
  const isSuspended = (p) => Boolean((p?.suspension_matches > 0) || p?.is_suspended || p?.isSuspended);
  const eligible = playersList.filter(p => !isSuspended(p));
  const suspended = playersList.filter(p => isSuspended(p)).map(p => ({
    ...p,
    is_starting: false,
    tacticalPosition: null,
  }));

  // Pool of available players to assign
  let available = [...eligible];
  const starters = new Array(preset.length).fill(null);

  // Sorting order of slots for best tactical coverage:
  // GK -> CF/SS -> CB -> DMF -> LB/RB -> LWF/RWF -> AMF -> LMF/RMF -> CMF
  const slotPriority = {
    GK: 10,
    CF: 9,
    CB: 8,
    DMF: 7,
    LB: 6,
    RB: 6,
    LWF: 5,
    RWF: 5,
    AMF: 4,
    SS: 4,
    LMF: 3,
    RMF: 3,
    CMF: 2,
  };

  const sortedSlotIndices = preset
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => (slotPriority[b.slot.pos] || 0) - (slotPriority[a.slot.pos] || 0));

  for (const { slot, index } of sortedSlotIndices) {
    const targetPos = slot.pos;
    if (available.length === 0) break;

    let bestPlayerIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < available.length; i++) {
      const p = available[i];
      const naturalPos = p.naturalPosition || p.position;
      const compList = Array.isArray(p.compatible_positions) ? p.compatible_positions : [];
      const hierarchy = POSITION_HIERARCHY[targetPos] || [targetPos];

      let matchScore = 0;

      if (targetPos === 'GK') {
        if (naturalPos === 'GK') {
          matchScore = 2000;
        } else {
          matchScore = 10;
        }
      } else {
        if (naturalPos === 'GK') {
          matchScore = 0; // Do not place GK in outfield
        } else if (naturalPos === targetPos) {
          matchScore = 1000;
        } else if (hierarchy.includes(naturalPos) || compList.includes(targetPos)) {
          const hIdx = hierarchy.indexOf(naturalPos);
          matchScore = 600 - (hIdx >= 0 ? hIdx * 40 : 0);
        } else {
          // General positional group
          const defs = ['CB', 'LB', 'RB'];
          const mids = ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'];
          const fwds = ['CF', 'SS', 'LWF', 'RWF'];
          if (defs.includes(targetPos) && defs.includes(naturalPos)) matchScore = 300;
          else if (mids.includes(targetPos) && mids.includes(naturalPos)) matchScore = 300;
          else if (fwds.includes(targetPos) && fwds.includes(naturalPos)) matchScore = 300;
          else matchScore = 50;
        }
      }

      const ovr = Number(p.overall) || Number(p.base_overall) || Number(p.rating) || 70;
      const injuryPenalty = (p.is_injured || p.isInjured) ? 150 : 0;
      const stamina = Number(p.virtual_stamina || p.stamina || 90);
      const staminaPenalty = stamina < 30 ? 80 : 0;

      // Make OVR weigh heavily so between players for the same position, the highest OVR always wins
      const totalScore = matchScore * 10 + ovr * 2 - injuryPenalty - staminaPenalty;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPlayerIdx = i;
      }
    }

    if (bestPlayerIdx !== -1) {
      const chosen = available[bestPlayerIdx];
      starters[index] = {
        ...chosen,
        naturalPosition: chosen.naturalPosition || chosen.position,
        position: targetPos,
        tacticalPosition: targetPos,
        x_coord: slot.x,
        y_coord: slot.y,
        is_starting: true,
      };
      available.splice(bestPlayerIdx, 1);
    }
  }

  // Remaining players become bench/reserves
  const remainingSubs = available.map(p => ({
    ...p,
    naturalPosition: p.naturalPosition || p.position,
    tacticalPosition: null,
    is_starting: false,
  }));

  // Fallback check: fill any empty slot from remainingSubs if squad < 11
  for (let i = 0; i < starters.length; i++) {
    if (!starters[i] && remainingSubs.length > 0) {
      const slot = preset[i];
      const p = remainingSubs.shift();
      starters[i] = {
        ...p,
        naturalPosition: p.naturalPosition || p.position,
        position: slot.pos,
        tacticalPosition: slot.pos,
        x_coord: slot.x,
        y_coord: slot.y,
        is_starting: true,
      };
    }
  }

  const finalStarters = starters.filter(Boolean);
  return [...finalStarters, ...remainingSubs, ...suspended];
}

export default function SimpleTacticsModal({
  isOpen,
  onClose,
  currentFormation,
  currentPresetName,
  players = [],
  onApplySimpleTactics, // ({ presetName, newPlayers, newFormation, newTactics })
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('quick_counter');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (typeof document === 'undefined') return null;

  const handleApply = (preset) => {
    const targetPreset = preset || SIMPLE_TACTICAL_PRESETS.find(p => p.id === selectedPresetId);
    if (!targetPreset) return;

    const targetFormation = targetPreset.formation;
    const targetTactics = targetPreset.tactics;
    const targetPlayers = autoSelectOptimalLineup(players, targetFormation);

    onApplySimpleTactics({
      presetName: targetPreset.name,
      newPlayers: targetPlayers,
      newFormation: targetFormation,
      newTactics: targetTactics,
    });

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 700);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto font-sans">
          <div className="fixed inset-0" onClick={onClose} />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 bg-gradient-to-b from-[#0e1628] via-[#090d16] to-[#04060a] border border-cyan-500/30 rounded-3xl w-full max-w-4xl my-auto p-4 sm:p-6 shadow-[0_0_50px_rgba(0,243,255,0.2)] text-white"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-[#00ff87] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.5)]">
                  <Zap className="text-slate-950 fill-slate-950" size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>انتخاب سبک تاکتیکی آماده (ترکیب و تاکتیک ساده)</span>
                    <span className="text-[10px] sm:text-xs font-black bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                      PES 2021 Presets
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    با انتخاب هر سبک، سیستم و دستورات حمله و دفاع متناسب اعمال شده و ۱۱ بازیکن برتر تیم به‌صورت هوشمند چیده می‌شوند.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 9 Simple Tactical Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-4 max-h-[55vh] overflow-y-auto pr-1">
              {SIMPLE_TACTICAL_PRESETS.map((preset, idx) => {
                const isSelected = selectedPresetId === preset.id;
                const isCurrentActive = currentPresetName === preset.name;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-[#0f1b2e] border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(0,243,255,0.25)]'
                        : 'bg-[#090e18]/80 border-white/10 hover:border-cyan-500/40 hover:bg-[#0c1322]'
                    }`}
                  >
                    {/* Active Ribbon Badge */}
                    {isCurrentActive && (
                      <span className="absolute -top-2 -left-2 bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full shadow border border-white flex items-center gap-1">
                        <Check size={10} />
                        فعال فعلی
                      </span>
                    )}

                    <div>
                      {/* Top Row: Icon + Name + Formation */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{preset.icon}</span>
                          <div>
                            <h3 className="font-black text-white text-xs sm:text-sm group-hover:text-cyan-300 transition-colors">
                              {idx + 1}. {preset.name}
                            </h3>
                            <span className="text-[10px] font-sport text-cyan-400 font-bold">
                              {preset.formation}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r ${preset.tagColor} text-white shadow-sm`}>
                          {preset.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {preset.description}
                      </p>

                      {/* Tactical Specs Mini Grid */}
                      <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1 text-[10px]">
                        <div className="flex items-center gap-1 text-rose-300/90 truncate">
                          <span className="font-bold">حمله:</span>
                          <span className="text-slate-300 truncate">{preset.attackSummary}</span>
                        </div>
                        <div className="flex items-center gap-1 text-cyan-300/90 truncate">
                          <span className="font-bold">دفاع:</span>
                          <span className="text-slate-300 truncate">{preset.defenseSummary}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPresetId(preset.id);
                        handleApply(preset);
                      }}
                      className={`w-full mt-3 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#00ff87] to-cyan-400 text-slate-950 font-black hover:scale-[1.02] active:scale-95'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {appliedSuccess && isSelected ? (
                        <>
                          <Check size={14} className="text-emerald-950 font-black" />
                          <span>با موفقیت اعمال شد!</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          <span>اعمال این سبک ⚡</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer Notice for Admin Sync */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px] text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-300/90">
                <Award size={14} />
                <span>سبک انتخابی و هرگونه جابجایی دستی بازیکنان، مستقیماً به اتاق داوری و ادمین اطلاع داده می‌شود.</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white px-3 py-1 text-xs underline cursor-pointer"
              >
                بستن پنجره
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
