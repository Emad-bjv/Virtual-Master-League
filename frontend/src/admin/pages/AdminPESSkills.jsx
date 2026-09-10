import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CheckCircle2, Clock, Copy, Check, Search, 
  Shield, Zap, ChevronLeft, ChevronRight, RefreshCw, 
  AlertCircle, Save, RotateCcw, AlertTriangle, X, Coins
} from 'lucide-react';
import { playerApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const POSITION_COLORS = {
  GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  LB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  RB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  DMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  AMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  LMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  RMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  LWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  RWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  SS: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  CF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export default function AdminPESSkills() {
  const [data, setData] = useState({ total_pending: 0, total_upgraded_players: 0, teams: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPLIED'
  const [posFilter, setPosFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState({});
  const [copiedPlayerId, setCopiedPlayerId] = useState(null);
  const [editingOvr, setEditingOvr] = useState({}); // { [playerId]: number }

  // Modal states for Resets
  const [resetModalPlayer, setResetModalPlayer] = useState(null);
  const [playerResetMode, setPlayerResetMode] = useState('ALL'); // 'ALL' | 'LEVEL_ONLY' | 'SKILLS_ONLY'
  const [isResetPlayerLoading, setIsResetPlayerLoading] = useState(false);

  const [isResetTeamModalOpen, setIsResetTeamModalOpen] = useState(false);
  const [teamResetMode, setTeamResetMode] = useState('ALL'); // 'ALL' | 'LEVEL_ONLY' | 'SKILLS_ONLY'
  const [isResetTeamLoading, setIsResetTeamLoading] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await playerApi.getPESSkillsOverview();
      const overview = res.data || { total_pending: 0, total_upgraded_players: 0, teams: [] };
      setData(overview);

      if (!selectedTeamId && overview.teams?.length > 0) {
        // Default to first team with pending changes, or with upgraded players, or just the first team
        const teamWithPending = overview.teams.find((t) => (t.pending_count || 0) > 0);
        const teamWithPlayers = overview.teams.find((t) => (t.players_count || 0) > 0);
        setSelectedTeamId(teamWithPending ? teamWithPending.id : (teamWithPlayers ? teamWithPlayers.id : overview.teams[0].id));
      }
    } catch (err) {
      showToast('خطا در دریافت اطلاعات مهارت‌های بازیکنان', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeTeam = useMemo(() => {
    return (data.teams || []).find((t) => t.id === selectedTeamId) || data.teams?.[0] || null;
  }, [data.teams, selectedTeamId]);

  const totalLeagueGems = useMemo(() => {
    return (data.teams || []).reduce((acc, t) => acc + (t.total_gems_invested || 0), 0);
  }, [data.teams]);

  const filteredPlayers = useMemo(() => {
    if (!activeTeam) return [];
    return (activeTeam.players || []).filter((p) => {
      const matchSearch = String(p.name || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'PENDING' && !p.has_pending) return false;
      if (statusFilter === 'APPLIED' && p.has_pending) return false;

      const pos = String(p.position || '').toUpperCase();
      if (posFilter === 'GK') return pos === 'GK';
      if (posFilter === 'DEF') return ['CB', 'LB', 'RB'].includes(pos);
      if (posFilter === 'MID') return ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(pos);
      if (posFilter === 'FWD') return ['CF', 'SS', 'LWF', 'RWF'].includes(pos);

      return true;
    });
  }, [activeTeam, searchTerm, statusFilter, posFilter]);

  // Handle Mark Skill Applied
  const handleMarkApplied = async (playerId, skillKey = null, allSkills = false) => {
    const loadingKey = `${playerId}-${skillKey || 'all'}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      await playerApi.markPESSkillApplied(playerId, skillKey, allSkills);
      showToast('وضعیت اعمال در بازی PES با موفقیت ذخیره شد.', 'success');
      await fetchData();
    } catch (err) {
      showToast('خطا در به‌روزرسانی وضعیت', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handle Mark OVR Gem Boost Applied
  const handleMarkOvrApplied = async (playerId, applied = true) => {
    const loadingKey = `ovr-apply-${playerId}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      await playerApi.markPESOvrApplied(playerId, applied);
      showToast('وضعیت اعمال اورال بازیکن در PES ثبت شد.', 'success');
      await fetchData();
    } catch (err) {
      showToast('خطا در به‌روزرسانی وضعیت اورال', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handle Save New OVR
  const handleSaveOvr = async (playerId) => {
    const newOvr = editingOvr[playerId];
    if (!newOvr || newOvr < 40 || newOvr > 99) {
      showToast('اورال باید بین ۴۰ تا ۹۹ باشد.', 'warning');
      return;
    }
    const loadingKey = `ovr-${playerId}`;
    setActionLoading((prev) => ({ ...prev, [loadingKey]: true }));
    try {
      await playerApi.updatePlayerOVR(playerId, parseInt(newOvr, 10));
      showToast('اورال جدید بازیکن با موفقیت ثبت شد.', 'success');
      await fetchData();
    } catch (err) {
      showToast('خطا در ثبت اورال جدید', 'error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Handle Confirm Reset Single Player
  const handleConfirmResetPlayer = async () => {
    if (!resetModalPlayer) return;
    setIsResetPlayerLoading(true);
    try {
      const res = await playerApi.resetPlayerBoosts(resetModalPlayer.id, playerResetMode);
      showToast(res.data?.message || 'تقویت‌های بازیکن با موفقیت ریست شد و جم‌ها عودت گردید.', 'success');
      setResetModalPlayer(null);
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ریست تقویت‌های بازیکن', 'error');
    } finally {
      setIsResetPlayerLoading(false);
    }
  };

  // Handle Confirm Reset Entire Team
  const handleConfirmResetTeam = async () => {
    if (!activeTeam) return;
    setIsResetTeamLoading(true);
    try {
      const res = await playerApi.resetTeamBoosts(activeTeam.id, teamResetMode);
      showToast(res.data?.message || 'کلیه تقویت‌های تیم ریست شد و جم‌ها به حساب باشگاه واریز شد.', 'success');
      setIsResetTeamModalOpen(false);
      await fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ریست تقویت‌های تیم', 'error');
    } finally {
      setIsResetTeamLoading(false);
    }
  };

  // Copy PES instructions for a player
  const handleCopyPESGuide = (player) => {
    const lines = [`🎮 دستور اعمال در ادیت‌مود PES: ${player.name} (${player.position})`];
    lines.push(`باشگاه: ${activeTeam?.name || ''}`);
    if (player.is_level_boosted) {
      lines.push(`• اورال کلی (OVR): از ${player.base_overall} به ${player.overall} (+${player.overall - player.base_overall} | سطح ${player.level})`);
    }
    if ((player.trained_skills || []).length > 0) {
      lines.push('• مهارت‌های تخصصی پست:');
      player.trained_skills.forEach((s) => {
        lines.push(`  - ${s.name}: از ${s.base_pes} به ${s.current_pes} (+${s.pes_bonus} واحد)`);
      });
    }
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedPlayerId(player.id);
    showToast('خلاصه تغییرات بازیکن در کلیپ‌بورد کپی شد!', 'success');
    setTimeout(() => setCopiedPlayerId(null), 3000);
  };

  // Calculate dynamic refund for current player modal selection
  const currentModalRefund = useMemo(() => {
    if (!resetModalPlayer) return 0;
    if (playerResetMode === 'LEVEL_ONLY') return resetModalPlayer.level_gems || 0;
    if (playerResetMode === 'SKILLS_ONLY') return resetModalPlayer.skills_gems || 0;
    return resetModalPlayer.total_gems_spent || 0;
  }, [resetModalPlayer, playerResetMode]);

  return (
    <div className="space-y-6 text-white font-sans dir-rtl" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg flex items-center justify-center">
                <Sparkles size={24} className="text-amber-300 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white m-0 flex items-center gap-2">
                  <span>مدیریت تقویت مهارت‌های PES بازیکنان</span>
                </h1>
                <p className="text-xs text-slate-400 m-0">
                  نظارت، بررسی تغییرات مهارت‌ها و سطح بازیکنان، اعمال در ادیت‌مود PES و استرداد جم به باشگاه‌ها
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-purple-400' : ''} />
              <span>به‌روزرسانی داده‌ها</span>
            </button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-orange-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-1">تغییرات در انتظار اعمال در PES</span>
              <span className="text-2xl font-sport font-black text-orange-400">
                {data.total_pending || 0} <span className="text-xs text-slate-400 font-normal">مورد</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/40 animate-pulse">
              <Clock size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-1">بازیکنان تقویت‌شده در لیگ</span>
              <span className="text-2xl font-sport font-black text-cyan-400">
                {data.total_upgraded_players || 0} <span className="text-xs text-slate-400 font-normal">بازیکن</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
              <Zap size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-purple-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-1">تیم‌های دارای ارتقا</span>
              <span className="text-2xl font-sport font-black text-purple-400">
                {(data.teams || []).filter((t) => (t.players_count || 0) > 0).length}{' '}
                <span className="text-xs text-slate-400 font-normal">تیم</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
              <Shield size={20} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold block mb-1">کل جم‌های سرمایه‌گذاری‌شده</span>
              <span className="text-2xl font-sport font-black text-amber-400">
                {totalLeagueGems.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-normal">💎</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Coins size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Team Tabs / Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Shield size={14} className="text-purple-400" />
            <span>انتخاب تیم برای بررسی، اعمال در بازی یا ریست:</span>
          </span>
          <span className="text-[11px] text-slate-500">
            تیم‌های دارای تغییر با نشانگر نارنجی و تیم‌های دارای بازیکن با رنگ بنفش مشخص شده‌اند
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-500/30">
          {(data.teams || []).map((t) => {
            const isSelected = t.id === selectedTeamId;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-bold shrink-0 flex items-center gap-2.5 transition-all cursor-pointer shadow-md ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-102'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <img
                  src={getTeamLogoUrl(t)}
                  alt={t.name}
                  className="w-6 h-6 object-contain rounded-full bg-slate-950/40 p-0.5"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span>{t.name}</span>

                {t.pending_count > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-orange-500 text-slate-950 text-[10px] font-sport font-black animate-pulse">
                    {t.pending_count} در انتظار
                  </span>
                ) : (t.players_count || 0) > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-900/60 text-purple-300 text-[10px] font-sport border border-purple-500/30">
                    {t.players_count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Team Player Management Panel */}
      {activeTeam && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-6 shadow-xl backdrop-blur-md">
          {/* Active Team Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={getTeamLogoUrl(activeTeam)}
                alt={activeTeam.name}
                className="w-12 h-12 object-contain rounded-2xl bg-slate-950 p-1 border border-slate-800 shadow-md"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white m-0">
                    {activeTeam.name}
                  </h2>
                  {activeTeam.pending_count > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[11px] font-bold animate-pulse">
                      {activeTeam.pending_count} تغییر نیازمند ثبت در بازی
                    </span>
                  )}
                  {(activeTeam.total_gems_invested || 0) > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                      <Coins size={12} />
                      <span>{activeTeam.total_gems_invested.toLocaleString()} جم سرمایه‌گذاری شده</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 block mt-1">
                  مجموع {activeTeam.players_count || 0} بازیکن دارای توانایی‌های تقویت‌شده در این تیم
                </span>
              </div>
            </div>

            {/* Team Actions & Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Reset Entire Team Boosts Button */}
              {(activeTeam.players_count > 0 || (activeTeam.total_gems_invested || 0) > 0) && (
                <button
                  onClick={() => setIsResetTeamModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-102"
                  title="ریست کلیه بازیکنان تقویت‌شده این باشگاه و بازگشت جم‌ها به صندوق تیم"
                >
                  <RotateCcw size={14} className="text-rose-400" />
                  <span>ریست کل تقویت‌های تیم</span>
                </button>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجوی نام بازیکن..."
                  className="bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 w-44 sm:w-52"
                />
              </div>

              {/* Status Filter */}
              <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'PENDING' ? 'bg-orange-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  در انتظار PES
                </button>
                <button
                  onClick={() => setStatusFilter('APPLIED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'APPLIED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  اعمال‌شده‌ها
                </button>
              </div>

              {/* Position Filter */}
              <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-1 text-[11px]">
                {['ALL', 'FWD', 'MID', 'DEF', 'GK'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPosFilter(p)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      posFilter === p ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p === 'ALL' ? 'همه پست‌ها' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Players Grid / List */}
          {filteredPlayers.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Shield size={28} />
              </div>
              <p className="text-sm font-bold text-slate-300">هیچ بازیکنی با این فیلترها یافت نشد.</p>
              <p className="text-xs text-slate-500">
                در این تیم هنوز بازیکنی ارتقای سطح یا مهارت نیافته، یا با شروط جستجو همخوانی ندارد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredPlayers.map((player) => {
                const posClass = POSITION_COLORS[player.position] || 'bg-slate-800 text-slate-300 border-slate-700';
                const hasPending = player.has_pending;
                const isCopied = copiedPlayerId === player.id;
                const isAllApplying = actionLoading[`${player.id}-all`];
                const isOvrSaving = actionLoading[`ovr-${player.id}`];
                const isOvrApplying = actionLoading[`ovr-apply-${player.id}`];

                return (
                  <div
                    key={player.id}
                    className={`rounded-2xl border p-5 space-y-4 transition-all ${
                      hasPending
                        ? 'bg-slate-950/90 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Player Info Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPlayerPhotoUrl(player)}
                          alt={player.name}
                          className="w-14 h-14 rounded-2xl object-cover bg-slate-900 border border-slate-800 shadow shrink-0"
                          onError={(e) => { e.target.src = '/default-avatar.png'; }}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-black text-base text-white">{player.name}</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${posClass}`}>
                              {player.position}
                            </span>
                            {player.shirt_number && (
                              <span className="text-xs font-sport text-slate-400 font-bold">
                                #{player.shirt_number}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Coins size={10} />
                              <span>{player.total_gems_spent || 0} جم</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="text-slate-400">اورال فعلی در سایت:</span>
                            <span className="font-sport font-black text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/30">
                              {player.overall}
                            </span>
                            {player.base_overall && player.base_overall !== player.overall && (
                              <span className="text-[11px] text-slate-400">
                                (پایه: <strong className="text-slate-300">{player.base_overall}</strong>)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pending Badge */}
                      <div className="shrink-0">
                        {hasPending ? (
                          <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-sm">
                            <Clock size={13} />
                            <span>{player.pending_count} در انتظار PES</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={13} />
                            <span>اعمال‌شده در بازی</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Section 1: Gem Boost (Level & Overall Progression) */}
                    <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                            <Zap size={14} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-white">ارتقای سطح و اورال با الماس (Gem Boost)</span>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>لول فعلی: <strong className="text-indigo-300 font-sport font-bold">{player.level || 1} از ۲۰</strong></span>
                              <span>•</span>
                              <span>اورال پایه: <strong className="text-slate-300">{player.base_overall}</strong> ➔ سایت: <strong className="text-cyan-400">{player.overall}</strong></span>
                              {player.overall > player.base_overall && (
                                <span className="text-emerald-400 font-bold font-sport">(+{player.overall - player.base_overall})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* PES Applied Status for Gem Boost */}
                        <div className="flex items-center gap-2">
                          {player.is_level_boosted ? (
                            player.pes_ovr_applied ? (
                              <button
                                onClick={() => handleMarkOvrApplied(player.id, false)}
                                disabled={isOvrApplying}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="کلیک برای بازگردانی به وضعیت در انتظار"
                              >
                                <CheckCircle2 size={12} />
                                <span>اورال در PES اعمال شده</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkOvrApplied(player.id, true)}
                                disabled={isOvrApplying}
                                className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow animate-pulse"
                                title="تأیید اعمال اورال این بازیکن در ادیت‌مود بازی PES"
                              >
                                <Check size={12} />
                                <span>تأیید اعمال اورال در PES</span>
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold">سطح پایه ۱ (بدون ارتقا)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Specialized PES Position Skills */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-400" />
                          <span>مهارت‌های تخصصی پست در PES (مقادیر محاسبه‌شده):</span>
                        </span>
                        {(player.trained_skills || []).length > 0 && (
                          <span className="text-[10px] text-slate-500 font-sport">
                            {player.trained_skills.length} مهارت فعال
                          </span>
                        )}
                      </div>

                      {(player.trained_skills || []).length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-900/30 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                          مهارت‌های تخصصی برای این بازیکن هنوز در پنل مربی ارتقا داده نشده است.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(player.trained_skills || []).map((skill) => {
                            const isSkillPending = !skill.pes_applied;
                            const isSkillLoading = actionLoading[`${player.id}-${skill.key}`];

                            return (
                              <div
                                key={skill.key}
                                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSkillPending
                                    ? 'bg-orange-950/20 border-orange-500/30'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-purple-400 font-bold shrink-0">
                                    <Zap size={14} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-white">{skill.name}</span>
                                      <span className="text-[10px] text-purple-300 font-sport bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                                        لول {skill.level} از ۲۰
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <span>پایه در PES: <strong className="text-slate-300">{skill.base_pes}</strong></span>
                                      <span>➔</span>
                                      <span className="text-emerald-400 font-black">
                                        مقدار جدید در PES: {skill.current_pes}
                                      </span>
                                      <span className="text-[10px] font-sport text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded border border-emerald-500/30">
                                        +{skill.pes_bonus} واحد
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action for single skill */}
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  {isSkillPending ? (
                                    <button
                                      onClick={() => handleMarkApplied(player.id, skill.key, false)}
                                      disabled={isSkillLoading}
                                      className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow"
                                      title="ثبت این تغییر به عنوان اعمال‌شده در بازی PES"
                                    >
                                      <Check size={12} />
                                      <span>تأیید اعمال در PES</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle2 size={12} />
                                      <span>اعمال شد</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Direct OVR Editor & Fast Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* OVR Override Field */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 font-bold shrink-0">
                          اورال PES:
                        </label>
                        <input
                          type="number"
                          min="40"
                          max="99"
                          value={editingOvr[player.id] ?? player.overall}
                          onChange={(e) => setEditingOvr({ ...editingOvr, [player.id]: e.target.value })}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-center text-xs font-sport font-black text-cyan-400 outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={() => handleSaveOvr(player.id)}
                          disabled={isOvrSaving}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                        >
                          <Save size={12} />
                          <span>{isOvrSaving ? '...' : 'ذخیره'}</span>
                        </button>
                      </div>

                      {/* Fast Actions: Copy Guide, Mark All, and Reset Player */}
                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {/* Reset Player Button */}
                        <button
                          onClick={() => {
                            setResetModalPlayer(player);
                            setPlayerResetMode('ALL');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="ریست تقویت‌های این بازیکن و بازگشت جم به باشگاه"
                        >
                          <RotateCcw size={12} className="text-rose-400" />
                          <span>ریست تقویت‌ها</span>
                        </button>

                        <button
                          onClick={() => handleCopyPESGuide(player)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shadow-sm"
                          title="کپی متن خلاصه تغییرات این بازیکن برای مشاهده سریع هنگام ادیت PES"
                        >
                          {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{isCopied ? 'کپی شد!' : 'کپی دستور PES'}</span>
                        </button>

                        {hasPending && (
                          <button
                            onClick={() => handleMarkApplied(player.id, null, true)}
                            disabled={isAllApplying}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <CheckCircle2 size={14} />
                            <span>{isAllApplying ? 'در حال ثبت...' : 'تأیید اعمال همه'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Reset Single Player Boosts (React Portal)                       */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {resetModalPlayer && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => !isResetPlayerLoading && setResetModalPlayer(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg my-auto p-6 space-y-5 shadow-2xl text-right"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white m-0">
                        ریست تقویت‌ها و استرداد جم
                      </h3>
                      <p className="text-xs text-slate-400 m-0">
                        بازیکن: <strong className="text-white">{resetModalPlayer.name}</strong> ({resetModalPlayer.position})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setResetModalPlayer(null)}
                    disabled={isResetPlayerLoading}
                    className="w-8 h-8 rounded-xl bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Refund Summary Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-purple-950/40 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">جم‌های مصرف‌شده برای لول/اورال:</span>
                    <span className="font-sport font-black text-indigo-300">
                      {(resetModalPlayer.level_gems || 0).toLocaleString()} 💎
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">جم‌های مصرف‌شده برای مهارت‌های تخصصی:</span>
                    <span className="font-sport font-black text-indigo-300">
                      {(resetModalPlayer.skills_gems || 0).toLocaleString()} 💎
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">مجموع جم قابل برگشت به باشگاه:</span>
                    <span className="text-base font-sport font-black text-amber-400">
                      {currentModalRefund.toLocaleString()} 💎
                    </span>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    انتخاب بخش‌های مورد نظر جهت ریست:
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setPlayerResetMode('ALL')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        playerResetMode === 'ALL'
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="playerResetMode"
                          checked={playerResetMode === 'ALL'}
                          onChange={() => setPlayerResetMode('ALL')}
                          className="accent-purple-500"
                        />
                        <div>
                          <span className="text-xs font-black block">ریست کامل (پیش‌فرض)</span>
                          <span className="text-[11px] text-slate-400 block">
                            بازگشت لول به ۱، بازگشت اورال به پایه ({resetModalPlayer.base_overall})، حذف تمام مهارت‌های PES و استرداد کل جم‌ها
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-sport font-black text-amber-400">
                        {resetModalPlayer.total_gems_spent || 0} 💎
                      </span>
                    </label>

                    <label
                      onClick={() => setPlayerResetMode('LEVEL_ONLY')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        playerResetMode === 'LEVEL_ONLY'
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="playerResetMode"
                          checked={playerResetMode === 'LEVEL_ONLY'}
                          onChange={() => setPlayerResetMode('LEVEL_ONLY')}
                          className="accent-purple-500"
                        />
                        <div>
                          <span className="text-xs font-black block">فقط ارتقای لول و اورال کلی</span>
                          <span className="text-[11px] text-slate-400 block">
                            لول به ۱ و اورال به مقدار پایه برمی‌گردد اما مهارت‌های تخصصی PES حفظ می‌شوند
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-sport font-black text-amber-400">
                        {resetModalPlayer.level_gems || 0} 💎
                      </span>
                    </label>

                    <label
                      onClick={() => setPlayerResetMode('SKILLS_ONLY')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        playerResetMode === 'SKILLS_ONLY'
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="playerResetMode"
                          checked={playerResetMode === 'SKILLS_ONLY'}
                          onChange={() => setPlayerResetMode('SKILLS_ONLY')}
                          className="accent-purple-500"
                        />
                        <div>
                          <span className="text-xs font-black block">فقط مهارت‌های تخصصی PES</span>
                          <span className="text-[11px] text-slate-400 block">
                            مهارت‌های تخصصی صفر می‌شوند اما لول و اورال فعلی بازیکن دست‌نخورده باقی می‌ماند
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-sport font-black text-amber-400">
                        {resetModalPlayer.skills_gems || 0} 💎
                      </span>
                    </label>
                  </div>
                </div>

                {/* Warning notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>
                    با تأیید شما، جم‌های مشخص‌شده مستقیماً به کیف پول تیم بازگردانده شده و به مربی پیامک/نوتیفیکیشن ارسال می‌گردد.
                  </span>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setResetModalPlayer(null)}
                    disabled={isResetPlayerLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-all"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmResetPlayer}
                    disabled={isResetPlayerLoading || currentModalRefund <= 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} className={isResetPlayerLoading ? 'animate-spin' : ''} />
                    <span>{isResetPlayerLoading ? 'در حال استرداد...' : `تأیید و استرداد ${currentModalRefund} جم`}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Reset Entire Team Boosts (React Portal)                         */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isResetTeamModalOpen && activeTeam && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => !isResetTeamLoading && setIsResetTeamModalOpen(false)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg my-auto p-6 space-y-5 shadow-2xl text-right"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={getTeamLogoUrl(activeTeam)}
                      alt={activeTeam.name}
                      className="w-10 h-10 object-contain rounded-xl bg-slate-900 p-1 border border-slate-800"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <h3 className="text-base font-black text-white m-0">
                        ریست گروهی تقویت‌های تیم {activeTeam.name}
                      </h3>
                      <p className="text-xs text-slate-400 m-0">
                        شامل {activeTeam.players_count || 0} بازیکن تقویت‌شده در این باشگاه
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResetTeamModalOpen(false)}
                    disabled={isResetTeamLoading}
                    className="w-8 h-8 rounded-xl bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Team Refund Details */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-rose-950/30 border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">تعداد کل بازیکنان دارای ارتقا:</span>
                    <span className="font-sport font-black text-white">
                      {activeTeam.players_count || 0} نفر
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">مجموع جم‌های سرمایه‌گذاری‌شده در تیم:</span>
                    <span className="font-sport font-black text-amber-400">
                      {(activeTeam.total_gems_invested || 0).toLocaleString()} 💎
                    </span>
                  </div>
                </div>

                {/* Mode Selector for Team */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    انتخاب بخش‌های مورد نظر برای ریست گروهی:
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setTeamResetMode('ALL')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        teamResetMode === 'ALL'
                          ? 'bg-rose-950/40 border-rose-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="teamResetMode"
                          checked={teamResetMode === 'ALL'}
                          onChange={() => setTeamResetMode('ALL')}
                          className="accent-rose-500"
                        />
                        <div>
                          <span className="text-xs font-black block">ریست کامل تمامی تقویت‌ها (پیش‌فرض)</span>
                          <span className="text-[11px] text-slate-400 block">
                            بازگشت تمام لول‌ها به ۱، اورال‌ها به مقدار پایه، پاکسازی کلیه مهارت‌ها و بازگشت تمام جم‌ها
                          </span>
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setTeamResetMode('LEVEL_ONLY')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        teamResetMode === 'LEVEL_ONLY'
                          ? 'bg-rose-950/40 border-rose-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="teamResetMode"
                          checked={teamResetMode === 'LEVEL_ONLY'}
                          onChange={() => setTeamResetMode('LEVEL_ONLY')}
                          className="accent-rose-500"
                        />
                        <div>
                          <span className="text-xs font-black block">فقط ارتقای سطح و اورال (Gem Boost)</span>
                          <span className="text-[11px] text-slate-400 block">
                            ریست لول‌های بازیکنان به ۱ و استرداد جم‌های لول، حفظ مهارت‌های تخصصی PES
                          </span>
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setTeamResetMode('SKILLS_ONLY')}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        teamResetMode === 'SKILLS_ONLY'
                          ? 'bg-rose-950/40 border-rose-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="teamResetMode"
                          checked={teamResetMode === 'SKILLS_ONLY'}
                          onChange={() => setTeamResetMode('SKILLS_ONLY')}
                          className="accent-rose-500"
                        />
                        <div>
                          <span className="text-xs font-black block">فقط مهارت‌های تخصصی پست در PES</span>
                          <span className="text-[11px] text-slate-400 block">
                            پاکسازی مهارت‌های تخصصی و عودت جم‌های مهارت‌ها، حفظ لول و اورال بازیکنان
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Warning notice */}
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>
                    توجه: این اقدام در یک تراکنش اتمیک انجام شده و کل جم‌های مشخص‌شده یکجا به صندوق باشگاه {activeTeam.name} مسترد می‌گردد.
                  </span>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsResetTeamModalOpen(false)}
                    disabled={isResetTeamLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer transition-all"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleConfirmResetTeam}
                    disabled={isResetTeamLoading || (activeTeam.players_count || 0) === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={14} className={isResetTeamLoading ? 'animate-spin' : ''} />
                    <span>{isResetTeamLoading ? 'در حال پردازش...' : 'تأیید ریست کل تیم و استرداد جم'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
