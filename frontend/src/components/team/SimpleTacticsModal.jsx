import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Swords, Users, Sparkles, Check, X, ChevronLeft, Award } from 'lucide-react';
import { FORMATION_PRESETS, matchPlayersToFormationSlots } from '../../context/TeamContext';

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
    formation: '3-4-3 (3-2-2-3)',
    icon: '🔥',
    category: 'فوق‌تهاجمی',
    tagColor: 'from-rose-600 to-red-700',
    description: 'هجوم پردامنه با بال‌ها و مهاجمین متعدد، پرس پرفشار و نفوذ از جناحین',
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

export function autoSelectOptimalLineup(playersList, formationName) {
  const preset = FORMATION_PRESETS[formationName] || FORMATION_PRESETS['4-3-3 (4-2-1-3)'];
  if (!preset || !playersList || playersList.length === 0) return playersList;

  // 1. Separate suspended players
  const isSuspended = (p) => Boolean((p.suspension_matches > 0) || p.is_suspended || p.isSuspended);
  const eligible = playersList.filter(p => !isSuspended(p));
  const suspended = playersList.filter(p => isSuspended(p)).map(p => ({ ...p, is_starting: false }));

  // Sort eligible by overall descending (healthy prioritized)
  const sortedEligible = [...eligible].sort((a, b) => {
    const aPenalty = (a.is_injured ? 15 : 0) + ((Number(a.stamina ?? 100) < 40) ? 10 : 0);
    const bPenalty = (b.is_injured ? 15 : 0) + ((Number(b.stamina ?? 100) < 40) ? 10 : 0);
    const aScore = (Number(a.overall) || 75) - aPenalty;
    const bScore = (Number(b.overall) || 75) - bPenalty;
    return bScore - aScore;
  });

  const targetStarters = sortedEligible.slice(0, 11);
  const mappedStarters = matchPlayersToFormationSlots(targetStarters, preset);
  const remainingSubs = sortedEligible.slice(11).map(p => ({ ...p, is_starting: false, tacticalPosition: null }));

  return [...mappedStarters, ...remainingSubs, ...suspended];
}

export default function SimpleTacticsModal({
  isOpen,
  onClose,
  currentFormation,
  currentPresetName,
  players = [],
  onApplySimpleTactics, // ({ preset, mode, newPlayers, newFormation, newTactics })
}) {
  const [selectedMode, setSelectedMode] = useState('lineup_and_tactics'); // 'lineup_and_tactics' | 'only_tactics' | 'only_lineup'
  const [selectedPresetId, setSelectedPresetId] = useState('quick_counter');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  if (typeof document === 'undefined') return null;

  const handleApply = (preset) => {
    const targetPreset = preset || SIMPLE_TACTICAL_PRESETS.find(p => p.id === selectedPresetId);
    if (!targetPreset && selectedMode !== 'only_lineup') return;

    let targetFormation = currentFormation;
    let targetTactics = null;
    let targetPlayers = players;

    if (selectedMode === 'only_lineup') {
      // Pick best players for current formation
      targetPlayers = autoSelectOptimalLineup(players, currentFormation);
      targetPresetName = currentPresetName || 'چیدمان خودکار هوشمند';
      onApplySimpleTactics({
        presetName: targetPresetName,
        mode: 'only_lineup',
        newPlayers: targetPlayers,
        newFormation: currentFormation,
        newTactics: null,
      });
    } else if (selectedMode === 'only_tactics') {
      // Change formation & tactics, preserve current starting assignments as much as possible
      targetFormation = targetPreset.formation;
      targetTactics = targetPreset.tactics;
      onApplySimpleTactics({
        presetName: targetPreset.name,
        mode: 'only_tactics',
        newPlayers: null, // keep players
        newFormation: targetFormation,
        newTactics: targetTactics,
      });
    } else {
      // lineup_and_tactics
      targetFormation = targetPreset.formation;
      targetTactics = targetPreset.tactics;
      targetPlayers = autoSelectOptimalLineup(players, targetFormation);
      onApplySimpleTactics({
        presetName: targetPreset.name,
        mode: 'lineup_and_tactics',
        newPlayers: targetPlayers,
        newFormation: targetFormation,
        newTactics: targetTactics,
      });
    }

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
    }, 900);
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
                    <span>انتخاب سریع تاکتیک و ترکیب ساده</span>
                    <span className="text-[10px] sm:text-xs font-black bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/40">
                      PES 2021 Presets
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    سبک بازی مدنظر خود را انتخاب کنید تا چیدمان و دستورات تاکتیکی به شکل بهینه و استاندارد اعمال شوند.
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

            {/* Mode Selector (3 options from simple_tac.md Section 0) */}
            <div className="my-4 bg-[#05080e]/90 p-1.5 rounded-2xl border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedMode('lineup_and_tactics')}
                className={`py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedMode === 'lineup_and_tactics'
                    ? 'bg-gradient-to-r from-[#00ff87] to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(0,255,135,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles size={16} />
                <span>ترکیب و تاکتیک هوشمند</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('only_tactics')}
                className={`py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedMode === 'only_tactics'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(0,243,255,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Swords size={16} />
                <span>فقط تاکتیک و چیدمان</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('only_lineup')}
                className={`py-2.5 px-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedMode === 'only_lineup'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users size={16} />
                <span>فقط چیدمان بهترین بازیکنان</span>
              </button>
            </div>

            {/* Mode Explainer Banner */}
            <div className="bg-cyan-950/40 border border-cyan-500/20 px-3.5 py-2 rounded-xl text-[11px] text-cyan-200 mb-4 flex items-center justify-between">
              <span>
                {selectedMode === 'lineup_and_tactics'
                  ? '⚡ در این حالت، سبک تاکتیکی و سیستم انتخاب‌شده اعمال شده و بهترین بازیکنان تیم به صورت خودکار در پست‌های اصلی قرار می‌گیرند.'
                  : selectedMode === 'only_tactics'
                  ? '🎯 در این حالت، سیستم و ۱۴ دستور تاکتیکی اعمال می‌شوند اما چینش فعلی بازیکنان شما دست‌نخورده باقی می‌ماند.'
                  : '👤 در این حالت، سیستم بهترین ۱۱ بازیکن را برای سیستم فعلی شما انتخاب می‌کند بدون اینکه تنظیمات حمله و دفاع تغییر کند.'}
              </span>
              {selectedMode === 'only_lineup' && (
                <button
                  type="button"
                  onClick={() => handleApply()}
                  className="bg-[#00ff87] text-slate-950 px-3 py-1 rounded-lg font-black text-xs shrink-0 cursor-pointer shadow hover:scale-105 active:scale-95 transition-all"
                >
                  چیدمان فوری ۱۱ نفر برتر
                </button>
              )}
            </div>

            {/* 9 Simple Tactical Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
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
