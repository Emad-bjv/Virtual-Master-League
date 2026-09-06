import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Gem, HeartPulse, X, Search, Filter, 
  ChevronLeft, Award, User, ArrowUpRight, Check, AlertTriangle,
  ChevronDown, ChevronUp, Layers, Flame, Target, ShieldCheck, Clock
} from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { getGemBoostCost, getGemBoostTargetOvr } from './EFootballGamePlan';
import { playerApi } from '../../services/api';
import ConfirmModal from '../common/ConfirmModal';

const POSITION_COLORS = {
  GK: 'bg-amber-500 text-slate-950',
  CB: 'bg-cyan-600 text-white',
  LB: 'bg-cyan-600 text-white',
  RB: 'bg-cyan-600 text-white',
  DMF: 'bg-emerald-600 text-white',
  CMF: 'bg-emerald-600 text-white',
  AMF: 'bg-emerald-600 text-white',
  LMF: 'bg-emerald-600 text-white',
  RMF: 'bg-emerald-600 text-white',
  LWF: 'bg-rose-600 text-white',
  RWF: 'bg-rose-600 text-white',
  SS: 'bg-rose-600 text-white',
  CF: 'bg-rose-600 text-white',
};

export default function PlayerBoostDrawer({
  isOpen,
  onClose,
  players = [],
  currentGems = 0,
  onGemBoost,
  onRecoverStamina,
  onHealInjury,
  actionLoading = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('OVR_DESC'); // 'OVR_DESC' | 'LVL_ASC' | 'STAMINA_ASC'
  const [confirmBoostPlayer, setConfirmBoostPlayer] = useState(null);
  const [expandedSkillsPlayerId, setExpandedSkillsPlayerId] = useState(null);
  const [cmfRoleMap, setCmfRoleMap] = useState({});
  const [skillsMap, setSkillsMap] = useState({});
  const [skillLoadingKey, setSkillLoadingKey] = useState(null);
  const [skillFeedback, setSkillFeedback] = useState(null);

  const handleToggleSkills = async (player) => {
    if (expandedSkillsPlayerId === player.id) {
      setExpandedSkillsPlayerId(null);
      return;
    }
    setExpandedSkillsPlayerId(player.id);
    // If not loaded yet or need refresh
    const role = cmfRoleMap[player.id] || null;
    try {
      const res = await playerApi.getSkills(player.id, role);
      if (res.data?.skills) {
        setSkillsMap((prev) => ({ ...prev, [player.id]: res.data.skills }));
      }
    } catch (e) {
      // Fallback to player.skills_breakdown if available
      if (player.skills_breakdown) {
        setSkillsMap((prev) => ({ ...prev, [player.id]: player.skills_breakdown }));
      }
    }
  };

  const handleRoleChange = async (player, role) => {
    setCmfRoleMap((prev) => ({ ...prev, [player.id]: role }));
    try {
      const res = await playerApi.getSkills(player.id, role);
      if (res.data?.skills) {
        setSkillsMap((prev) => ({ ...prev, [player.id]: res.data.skills }));
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSkillUpgradeClick = async (player, skillKey) => {
    const loadingKey = `${player.id}-${skillKey}`;
    setSkillLoadingKey(loadingKey);
    const role = cmfRoleMap[player.id] || null;
    try {
      const res = await playerApi.upgradeSkill(player.id, skillKey, role);
      if (res.data?.skills) {
        setSkillsMap((prev) => ({ ...prev, [player.id]: res.data.skills }));
      }
      setSkillFeedback({ playerId: player.id, message: res.data.status || 'ارتقا انجام شد!' });
      // If parent gave us onGemBoost or onRefresh, let's trigger
      if (onGemBoost && res.data.remaining_gems !== undefined) {
        // Trigger parent state update if available
      }
    } catch (err) {
      setSkillFeedback({ playerId: player.id, message: err.response?.data?.error || 'خطا در ارتقای مهارت', isError: true });
    } finally {
      setSkillLoadingKey(null);
      setTimeout(() => setSkillFeedback(null), 3500);
    }
  };

  const filteredPlayers = useMemo(() => {
    return (players || [])
      .filter((p) => {
        if (!p) return false;
        const matchesSearch = String(p.name || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
        const pos = (p.naturalPosition || p.position || 'CMF').toUpperCase();
        if (!matchesSearch) return false;
        if (posFilter === 'ALL') return true;
        if (posFilter === 'GK') return pos === 'GK';
        if (posFilter === 'DEF') return ['CB', 'LB', 'RB'].includes(pos);
        if (posFilter === 'MID') return ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(pos);
        if (posFilter === 'FWD') return ['CF', 'SS', 'LWF', 'RWF'].includes(pos);
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'OVR_DESC') {
          return (Number(b.overall) || 70) - (Number(a.overall) || 70);
        }
        if (sortBy === 'LVL_ASC') {
          return (Number(a.level) || 1) - (Number(b.level) || 1);
        }
        return 0;
      });
  }, [players, searchTerm, posFilter, sortBy]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end font-sans overflow-hidden">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide-Over Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 w-full max-w-lg h-full bg-gradient-to-b from-[#0e1628] via-[#090d18] to-[#04060c] border-l border-purple-500/40 shadow-[-20px_0_50px_rgba(168,85,247,0.25)] flex flex-col text-white"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#060a12]/90 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.6)]">
                  <Sparkles size={22} className="text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>مرکز تقویت و ارتقای بازیکنان</span>
                    <span className="text-[10px] font-black bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40 font-sport">
                      GEM BOOST
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    ارتقای مستقیم قدرت (OVR تا ۹۹)، ریکاوری استقامت و درمان فوری مصدومیت
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Gems Badge */}
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-950 to-indigo-950 px-3 py-1.5 rounded-xl border border-purple-500/40 text-xs font-black text-amber-300 font-sport shadow">
                  <Gem size={14} className="text-cyan-400 fill-cyan-400" />
                  <span>{currentGems?.toLocaleString('fa-IR') || 0}</span>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="p-3 sm:p-4 border-b border-white/5 space-y-2.5 bg-[#05080e]/60 shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجوی بازیکن بر اساس نام..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0b101c] border border-slate-700/80 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all font-sport"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Position Filter Tabs + Sort */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 bg-[#080d17] p-1 rounded-xl border border-white/5">
                  {[
                    { id: 'ALL', label: 'همه' },
                    { id: 'GK', label: 'GK' },
                    { id: 'DEF', label: 'DEF' },
                    { id: 'MID', label: 'MID' },
                    { id: 'FWD', label: 'FWD' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPosFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        posFilter === tab.id
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#080d17] border border-slate-700 text-slate-300 text-[11px] rounded-xl px-2 py-1.5 focus:outline-none font-sport cursor-pointer"
                >
                  <option value="OVR_DESC">بیشترین OVR</option>
                  <option value="LVL_ASC">کمترین لول (آماده ارتقا)</option>
                </select>
              </div>
            </div>

            {/* Player Cards Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {filteredPlayers.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <User size={32} className="opacity-30 mb-2" />
                  <p>بازیکنی با این مشخصات یافت نشد.</p>
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const currentLvl = Number(player.level) || 1;
                  const isMaxLevel = currentLvl >= 20;
                  const targetOvr = getGemBoostTargetOvr(player);
                  const boostCost = getGemBoostCost(currentLvl);
                  const stamina = Math.round(Number(player.virtual_stamina || player.stamina || 90));
                  const isInjured = Boolean(player.is_injured || player.isInjured);
                  const isSuspended = Boolean((player.suspension_matches > 0) || player.is_suspended);
                  const natPos = (player.naturalPosition || player.position || 'CMF').toUpperCase();
                  const photo = getPlayerPhotoUrl(player);
                  const isLoading = actionLoading === player.id || actionLoading === player.id.toString();

                  return (
                    <div
                      key={player.id}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0c1424] via-[#090f1c] to-[#060a14] border border-slate-700/60 hover:border-purple-500/50 transition-all shadow-md space-y-3 group"
                    >
                      {/* Top Row: Photo + Name + OVR Evolution */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-12 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative flex items-center justify-center shadow-inner">
                            {photo ? (
                              <img
                                src={photo}
                                alt={player.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <User size={20} className="text-slate-400 opacity-60" />
                            )}
                            {player.shirt_number && (
                              <span className="absolute bottom-0 right-0 bg-black/90 text-cyan-300 text-[8px] font-sport font-black px-1 rounded-tl">
                                #{player.shirt_number}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 font-sport">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded shadow ${POSITION_COLORS[natPos] || 'bg-purple-600 text-white'}`}>
                                {natPos}
                              </span>
                              <h3 className="text-xs sm:text-sm font-black text-white font-sans truncate">
                                {player.name}
                              </h3>
                              {player.is_starting && (
                                <span className="text-[9px] bg-emerald-950 text-[#00ff87] px-1.5 py-0.2 rounded font-black border border-emerald-500/30">
                                  ترکیب اصلی
                                </span>
                              )}
                            </div>

                            {/* Level Progress Indicator */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-purple-300 font-bold">
                                لول {currentLvl}/۲۰
                              </span>
                              <div className="w-24 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10 p-0.2">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all"
                                  style={{ width: `${(currentLvl / 20) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* OVR Upgrade Badge */}
                        <div className="text-left font-sport shrink-0">
                          <div className="text-[10px] text-slate-400">قدرت کلی:</div>
                          <div className="flex items-center gap-1 text-sm font-black">
                            <span className="text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
                              {player.overall}
                            </span>
                            {!isMaxLevel && (
                              <>
                                <span className="text-purple-400 font-black">➔</span>
                                <span className="text-[#00ff87] bg-emerald-950/90 px-2 py-0.5 rounded-lg border border-emerald-400/50 shadow-[0_0_10px_rgba(0,255,135,0.3)]">
                                  {targetOvr}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Row */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
                        <div className="flex items-center gap-1.5 font-sport">
                          <span className="text-slate-400">وضعیت بدنی:</span>
                          <span className="text-[#00ff87] font-bold">۱۰۰٪ آماده</span>
                        </div>

                        {/* Injury / Suspension Status */}
                        <div>
                          {isInjured && onHealInjury ? (
                            <button
                              type="button"
                              onClick={() => onHealInjury(player.id, player.name)}
                              disabled={isLoading}
                              className="px-2 py-0.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1 cursor-pointer animate-pulse"
                            >
                              <HeartPulse size={11} />
                              <span>درمان فوری (۲۵ 💎)</span>
                            </button>
                          ) : isSuspended ? (
                            <span className="text-[10px] text-red-400 font-bold">
                              🟥 محروم ({player.suspension_matches || 1} بازی)
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check size={11} />
                              آماده بازی
                            </span>
                          )}
                        </div>
                      </div>

                      {/* PES Position-Specific Skills Accordion */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSkills(player)}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm ${
                            expandedSkillsPlayerId === player.id
                              ? 'bg-purple-950/70 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-750 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-400" />
                            <span>تقویت مهارت‌های تخصصی PES (۲۰ لول)</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-purple-400">
                            <span>{expandedSkillsPlayerId === player.id ? 'بستن منو' : 'مشاهده و ارتقا'}</span>
                            {expandedSkillsPlayerId === player.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </button>

                        {/* Expanded Skills View */}
                        {expandedSkillsPlayerId === player.id && (
                          <div className="p-3 rounded-xl bg-[#070b14] border border-purple-500/30 space-y-3">
                            {/* CMF Role Toggle if applicable */}
                            {natPos === 'CMF' && (
                              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                                <span className="text-slate-400 font-bold">سبک هافبک:</span>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleRoleChange(player, 'TECHNICAL')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                      (cmfRoleMap[player.id] || 'TECHNICAL') === 'TECHNICAL'
                                        ? 'bg-purple-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    طراح و تکنیکی
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRoleChange(player, 'PHYSICAL')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                                      cmfRoleMap[player.id] === 'PHYSICAL'
                                        ? 'bg-emerald-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    دفاعی و تخریبی
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Temporary feedback alert */}
                            {skillFeedback && skillFeedback.playerId === player.id && (
                              <div className={`p-2 rounded-lg text-xs font-bold text-center ${skillFeedback.isError ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'}`}>
                                {skillFeedback.message}
                              </div>
                            )}

                            {/* Skills List */}
                            <div className="space-y-2">
                              {((skillsMap[player.id] || player.skills_breakdown || [])).map((skill) => {
                                const isSkillMaxed = skill.level >= 20;
                                const isUpgrading = skillLoadingKey === `${player.id}-${skill.key}`;
                                const canAfford = currentGems >= skill.next_gem_cost;

                                return (
                                  <div
                                    key={skill.key}
                                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <Sparkles size={12} className="text-amber-400" />
                                        <span className="text-xs font-black text-white">{skill.name}</span>
                                      </div>
                                      <span className="text-[10px] font-sport font-black text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">
                                        لول {skill.level} / ۲۰
                                      </span>
                                    </div>

                                    {/* Level 20 Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                      <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all"
                                        style={{ width: `${(skill.level / 20) * 100}%` }}
                                      />
                                    </div>

                                    {/* PES Stat Impact + Upgrade Button */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                      <div className="text-[10.5px] text-slate-400 flex items-center gap-1 flex-wrap">
                                        <span>پایه: <strong className="text-slate-300">{skill.base_pes}</strong></span>
                                        <span>➔</span>
                                        <span className="text-[#00ff87] font-black">
                                          در بازی: {skill.current_pes}
                                        </span>
                                        {skill.pes_bonus > 0 && (
                                          <span className="text-[9px] text-emerald-400 font-black bg-emerald-950 px-1 rounded border border-emerald-500/30">
                                            +{skill.pes_bonus}
                                          </span>
                                        )}
                                      </div>

                                      {isSkillMaxed ? (
                                        <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                                          <Check size={11} />
                                          <span>مکس شد</span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleSkillUpgradeClick(player, skill.key)}
                                          disabled={isUpgrading || !canAfford}
                                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black flex items-center gap-1.5 transition-all cursor-pointer shadow ${
                                            canAfford
                                              ? 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white'
                                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                          }`}
                                        >
                                          <span>{isUpgrading ? '...' : 'ارتقا'}</span>
                                          <span className="flex items-center gap-0.5 text-amber-300">
                                            {skill.next_gem_cost}
                                            <Gem size={10} className="fill-amber-300" />
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Main Action: Gem Boost Upgrade Button */}
                      <div>
                        {isMaxLevel ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-300 text-center text-xs font-black font-sport flex items-center justify-center gap-1.5">
                            <Award size={15} className="text-amber-300" />
                            <span>حداکثر لول ارتقا یافته (MAX 99 ⭐)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmBoostPlayer(player)}
                            disabled={isLoading || currentGems < boostCost}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-between gap-2 font-sport transition-all cursor-pointer shadow-lg active:scale-98 ${
                              currentGems < boostCost
                                ? 'bg-slate-800 text-slate-400 border border-slate-700 opacity-75'
                                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white border border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-sans">
                              <Sparkles size={14} className="text-amber-300 animate-pulse" />
                              <span>ارتقای لول به سطح {currentLvl + 1} (افزایش OVR)</span>
                            </div>

                            <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg text-amber-300 border border-amber-500/30 font-black">
                              <span>{boostCost}</span>
                              <Gem size={12} className="text-cyan-300 fill-cyan-300" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary Notice */}
            <div className="p-3 border-t border-white/10 bg-[#060a12] text-[10.5px] text-slate-400 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Zap size={14} />
                <span>ارتقای بازیکنان بلافاصله در ترکیب مسابقه و اتاق داوری اعمال می‌شود.</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white px-2 py-1 underline cursor-pointer"
              >
                بستن
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal for Level Up */}
      {confirmBoostPlayer && (
        <ConfirmModal
          isOpen={!!confirmBoostPlayer}
          title="ارتقای بازیکن با الماس (Gem Boost)"
          message={`آیا از ارتقای سطح و افزایش مستقیم قدرت «${confirmBoostPlayer.name}» اطمینان دارید؟`}
          details={
            <div className="space-y-2 font-sport text-xs">
              <div className="flex justify-between text-slate-300">
                <span>لول فعلی ➔ لول جدید:</span>
                <span className="text-cyan-300 font-bold dir-ltr">
                  سطح {confirmBoostPlayer.level || 1} ➔ سطح {(confirmBoostPlayer.level || 1) + 1}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>قدرت کلی (OVR):</span>
                <span className="text-[#00ff87] font-black dir-ltr">
                  {confirmBoostPlayer.overall} ➔ {getGemBoostTargetOvr(confirmBoostPlayer)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 border-t border-slate-700/80 pt-1.5">
                <span className="text-amber-400 font-bold">هزینه ارتقا:</span>
                <span className="text-amber-300 font-black text-sm">
                  {getGemBoostCost(Number(confirmBoostPlayer.level) || 1)} 💎
                </span>
              </div>
            </div>
          }
          confirmText="بله، ارتقای لول ✨"
          cancelText="خیر، انصراف"
          onConfirm={() => {
            if (onGemBoost) {
              onGemBoost(confirmBoostPlayer.id, confirmBoostPlayer.name, confirmBoostPlayer.level || 1);
            }
            setConfirmBoostPlayer(null);
          }}
          onCancel={() => setConfirmBoostPlayer(null)}
          loading={Boolean(actionLoading)}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
