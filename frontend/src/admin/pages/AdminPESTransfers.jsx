import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Users, Shield, Star, Search, Filter, 
  CheckCircle2, AlertCircle, RefreshCw, Copy, Check, 
  Flame, Gamepad2, ArrowRight, ExternalLink, Sparkles,
  ArrowUpRight, Clock, ChevronLeft, CheckSquare, Square,
  Info, CornerDownLeft, AlertTriangle
} from 'lucide-react';
import { pesTransferApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { getNationalityFlag } from '../../utils/nationalityFlags';

const POSITION_COLORS = {
  GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  CB: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  LB: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  RB: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  DMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CMF: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  LMF: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  RMF: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  AMF: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  LWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  RWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  SS: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  CF: 'bg-red-500/20 text-red-300 border-red-500/40',
};

const getOvrColorClass = (ovr) => {
  if (ovr >= 90) return 'text-amber-400 border-amber-500/50 bg-amber-950/40 shadow-amber-500/20';
  if (ovr >= 85) return 'text-purple-400 border-purple-500/50 bg-purple-950/40 shadow-purple-500/20';
  if (ovr >= 80) return 'text-cyan-400 border-cyan-500/50 bg-cyan-950/40 shadow-cyan-500/20';
  if (ovr >= 75) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40 shadow-emerald-500/20';
  return 'text-slate-400 border-slate-700 bg-slate-900/60';
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return `$${Number(val).toLocaleString()}`;
};

export default function AdminPESTransfers() {
  const { showToast } = useToast();

  // Master Overview State
  const [overview, setOverview] = useState({
    total_pending_league: 0,
    total_clubs_with_pending: 0,
    total_clubs: 0,
    clubs: []
  });
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Club Search & Filter
  const [clubSearch, setClubSearch] = useState('');
  const [onlyPendingClubs, setOnlyPendingClubs] = useState(false);

  // Selected Club Detail View State
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [clubDetail, setClubDetail] = useState(null);
  const [loadingClub, setLoadingClub] = useState(false);
  const [activeClubTab, setActiveClubTab] = useState('SQUAD'); // 'SQUAD' | 'DEPARTURES'
  
  // Squad Filters inside Club Detail
  const [playerSearch, setPlayerSearch] = useState('');
  const [squadFilterMode, setSquadFilterMode] = useState('ALL'); // 'ALL' | 'PENDING_ONLY'
  const [posCategory, setPosCategory] = useState('ALL'); // 'ALL' | 'FW' | 'MF' | 'DF' | 'GK'

  // Clipboard & Action feedback state
  const [copiedId, setCopiedId] = useState(null);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load Overview Data
  const fetchOverview = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingOverview(true);
      else setRefreshing(true);

      const res = await pesTransferApi.getOverview();
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to load PES transfers overview:', err);
      showToast('خطا در دریافت لیست باشگاه‌ها و تغییرات PES', 'error');
    } finally {
      setLoadingOverview(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Load Club Detail
  const fetchClubDetail = useCallback(async (teamId) => {
    if (!teamId) return;
    try {
      setLoadingClub(true);
      const res = await pesTransferApi.getClubDetail(teamId);
      if (res.data) {
        setClubDetail(res.data);
        // Automatically default to PENDING_ONLY if there are unapplied transfers
        if ((res.data.club?.pending_transfers_count || 0) > 0) {
          setSquadFilterMode('PENDING_ONLY');
        } else {
          setSquadFilterMode('ALL');
        }
      }
    } catch (err) {
      console.error('Failed to load club details:', err);
      showToast('خطا در دریافت ترکیب تیم و نقل‌وانتقالات', 'error');
    } finally {
      setLoadingClub(false);
    }
  }, [showToast]);

  const handleSelectClub = (clubId) => {
    setSelectedClubId(clubId);
    setPlayerSearch('');
    setPosCategory('ALL');
    setActiveClubTab('SQUAD');
    fetchClubDetail(clubId);
  };

  const handleBackToClubs = () => {
    setSelectedClubId(null);
    setClubDetail(null);
    fetchOverview(true); // refresh summary counters
  };

  // Keyboard shortcut: Escape returns to clubs list
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedClubId) {
        handleBackToClubs();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClubId]);

  // Copy player name to clipboard
  const handleCopyPlayerName = (name, id) => {
    if (!name) return;
    navigator.clipboard.writeText(name.trim());
    setCopiedId(id);
    showToast(`نام «${name}» کپی شد`, 'success');
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  // Toggle individual player's pes_transfer_applied status
  const handleToggleApplied = async (player) => {
    const nextState = !player.pes_transfer_applied;
    const oldState = player.pes_transfer_applied;

    // Optimistic UI update in Club Detail
    setClubDetail((prev) => {
      if (!prev) return prev;
      const updatedSquad = (prev.squad || []).map((p) => {
        if (p.id === player.id) {
          return { ...p, pes_transfer_applied: nextState };
        }
        return p;
      });
      const pendingDelta = nextState ? -1 : 1;
      const newPending = Math.max(0, (prev.club?.pending_transfers_count || 0) + pendingDelta);

      return {
        ...prev,
        club: { ...prev.club, pending_transfers_count: newPending },
        squad: updatedSquad
      };
    });

    // Optimistic UI update in Overview
    setOverview((prev) => {
      const updatedClubs = (prev.clubs || []).map((c) => {
        if (c.id === selectedClubId) {
          const pendingDelta = nextState ? -1 : 1;
          const newPending = Math.max(0, (c.pending_transfers_count || 0) + pendingDelta);
          return { ...c, pending_transfers_count: newPending };
        }
        return c;
      });
      const totalPendingDelta = nextState ? -1 : 1;
      return {
        ...prev,
        total_pending_league: Math.max(0, (prev.total_pending_league || 0) + totalPendingDelta),
        clubs: updatedClubs
      };
    });

    try {
      setToggleLoadingId(player.id);
      await pesTransferApi.toggleApplied({
        player_id: player.id,
        applied: nextState
      });
      showToast(
        nextState 
          ? `بازیکن «${player.name}» به عنوان اعمال‌شده در بازی علامت خورد.` 
          : `وضعیت «${player.name}» به در انتظار اعمال تغییر یافت.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle applied state:', err);
      showToast('خطا در ذخیره وضعیت اعمال در PES', 'error');
      // Rollback on error
      setClubDetail((prev) => {
        if (!prev) return prev;
        const rolledBack = (prev.squad || []).map((p) => {
          if (p.id === player.id) return { ...p, pes_transfer_applied: oldState };
          return p;
        });
        return { ...prev, squad: rolledBack };
      });
    } finally {
      setToggleLoadingId(null);
    }
  };

  // Bulk mark all players in this club as applied
  const handleMarkAllClubApplied = async () => {
    if (!selectedClubId || !clubDetail?.club) return;
    const confirmMsg = `آیا از علامت‌گذاری تمام بازیکنان تیم «${clubDetail.club.name}» به عنوان «اعمال‌شده در بازی PES» اطمینان دارید؟`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setBulkLoading(true);
      await pesTransferApi.toggleApplied({
        team_id: selectedClubId,
        mark_all: true
      });
      showToast(`تمامی بازیکنان تیم «${clubDetail.club.name}» در PES تیک خوردند.`, 'success');
      await fetchClubDetail(selectedClubId);
      fetchOverview(true);
    } catch (err) {
      console.error('Failed to mark all as applied:', err);
      showToast('خطا در علامت‌گذاری دسته‌جمعی', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Filtered Clubs for Overview Grid
  const filteredClubs = useMemo(() => {
    return (overview.clubs || []).filter((club) => {
      const q = String(clubSearch || '').trim().toLowerCase();
      const matchesSearch = !q || String(club.name || '').toLowerCase().includes(q);
      const matchesPending = !onlyPendingClubs || (club.pending_transfers_count || 0) > 0;
      return matchesSearch && matchesPending;
    });
  }, [overview.clubs, clubSearch, onlyPendingClubs]);

  // Filtered Squad for Club Detail
  const filteredSquad = useMemo(() => {
    if (!clubDetail?.squad) return [];
    return (clubDetail.squad || []).filter((player) => {
      // Search
      const q = String(playerSearch || '').trim().toLowerCase();
      const matchesSearch = !q || 
        String(player.name || '').toLowerCase().includes(q) ||
        String(player.position || '').toLowerCase().includes(q) ||
        String(player.nationality || '').toLowerCase().includes(q) ||
        String(player.trajectory_text || '').toLowerCase().includes(q);

      // Pending filter
      let matchesPending = true;
      if (squadFilterMode === 'PENDING_ONLY') {
        matchesPending = !player.pes_transfer_applied;
      }

      // Position category filter
      let matchesPos = true;
      if (posCategory === 'FW') {
        matchesPos = ['CF', 'SS', 'LWF', 'RWF'].includes(player.position);
      } else if (posCategory === 'MF') {
        matchesPos = ['AMF', 'CMF', 'DMF', 'LMF', 'RMF'].includes(player.position);
      } else if (posCategory === 'DF') {
        matchesPos = ['CB', 'LB', 'RB'].includes(player.position);
      } else if (posCategory === 'GK') {
        matchesPos = player.position === 'GK';
      }

      return matchesSearch && matchesPending && matchesPos;
    });
  }, [clubDetail?.squad, playerSearch, squadFilterMode, posCategory]);

  return (
    <div className="admin-pes-transfers min-h-screen text-slate-100 p-4 md:p-6 pb-28 max-w-7xl mx-auto dir-rtl font-sans select-none">
      {/* Top Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white m-0 flex items-center gap-2">
                مرکز نقل‌وانتقالات PES / eFootball
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  PES HUB
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 m-0">
                مشاهده مستقیم اسکواد، سیر انتقالات از مبدا در بازی و اعمال سریع تغییرات در ترکیب‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Global League Stats & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 shadow-inner">
            <span className="text-[11px] text-slate-400">نقل‌وانتقالات معلق کل لیگ:</span>
            <span className="text-sm font-black text-amber-400 flex items-center gap-1 font-mono">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              {overview.total_pending_league}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-1.5 text-xs text-slate-400">
            <span>تیم‌های نیازمند ادیت:</span>
            <span className="font-bold text-cyan-400 font-mono">{overview.total_clubs_with_pending}</span>
            <span>از {overview.total_clubs}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedClubId) fetchClubDetail(selectedClubId);
              fetchOverview(true);
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VIEW 1: CLUBS GRID OVERVIEW (When no club is actively selected)       */}
      {/* ===================================================================== */}
      {!selectedClubId && (
        <div>
          {/* Controls Bar: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="جستجوی نام باشگاه..."
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
              {clubSearch && (
                <button
                  type="button"
                  onClick={() => setClubSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setOnlyPendingClubs(!onlyPendingClubs)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  onlyPendingClubs
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${onlyPendingClubs ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
                <span>فقط تیم‌های دارای تغییر ({overview.total_clubs_with_pending})</span>
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loadingOverview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-8 bg-slate-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-bold">هیچ باشگاهی مطابق فیلتر یافت نشد.</p>
              <p className="text-xs text-slate-500 mt-1">می‌توانید فیلترها را حذف کرده یا جستجو را پاک نمایید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredClubs.map((club) => {
                const hasPending = (club.pending_transfers_count || 0) > 0;
                return (
                  <motion.div
                    key={club.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectClub(club.id)}
                    className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-200 border flex flex-col justify-between overflow-hidden group ${
                      hasPending
                        ? 'bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-950 border-amber-500/40 shadow-lg shadow-amber-950/30 hover:border-amber-400 hover:shadow-amber-500/20'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700 shadow-md'
                    }`}
                  >
                    {/* Top glow accent for pending */}
                    {hasPending && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 shadow-[0_0_12px_#f59e0b]" />
                    )}

                    {/* Club Header Info */}
                    <div>
                      <div className="flex items-start justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-13 h-13 rounded-2xl bg-slate-950/90 border border-slate-800 p-1.5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-cyan-500/40 transition-colors">
                            {club.logo ? (
                              <img
                                src={club.logo}
                                alt={club.name}
                                className="w-full h-full object-contain drop-shadow"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Shield className="w-6 h-6 text-slate-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors line-clamp-1 m-0">
                              {club.name}
                            </h3>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                              <Users className="w-3 h-3 text-slate-500" />
                              {club.total_players} بازیکن در ترکیب
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Badges / Counters Row */}
                      <div className="flex flex-wrap items-center gap-1.5 my-2">
                        {hasPending ? (
                          <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm animate-pulse">
                            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>{club.pending_transfers_count} انتقال در انتظار</span>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>بروزرسانی کامل</span>
                          </div>
                        )}

                        {club.departures_count > 0 && (
                          <div className="px-2 py-1 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/60 text-[10px] font-mono">
                            {club.departures_count} خروجی
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs mt-3">
                      <span className="text-slate-400 group-hover:text-slate-200 text-[11px] font-medium transition-colors">
                        مشاهده اسکواد تیم
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: CLUB DETAIL VIEW (Squad, Trajectories, Departures)            */}
      {/* ===================================================================== */}
      {selectedClubId && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedClubId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {/* Club Detail Top Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-xl mb-6 shadow-xl">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={handleBackToClubs}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer group"
                >
                  <ArrowRight className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>لیست باشگاه‌ها</span>
                  <span className="text-[10px] text-slate-500 font-mono mr-1">(Esc)</span>
                </button>

                <div className="h-7 w-[1px] bg-slate-800 hidden md:block" />

                {/* Club Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 p-1 border border-slate-800 flex items-center justify-center shrink-0">
                    {clubDetail?.club?.logo ? (
                      <img
                        src={clubDetail.club.logo}
                        alt={clubDetail.club.name}
                        className="w-full h-full object-contain drop-shadow"
                      />
                    ) : (
                      <Shield className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-black text-white m-0 flex items-center gap-2">
                      {clubDetail?.club?.name || 'در حال بارگذاری باشگاه...'}
                      {clubDetail?.club?.pending_transfers_count > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                          🔥 {clubDetail.club.pending_transfers_count} در انتظار
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                          ✓ تکمیل
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">
                      {clubDetail?.club?.total_players || 0} بازیکن در لیست ترکیب فعلی
                    </span>
                  </div>
                </div>
              </div>

              {/* Bulk Action: Mark all as applied */}
              <div className="flex items-center gap-2">
                {(clubDetail?.club?.pending_transfers_count || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllClubApplied}
                    disabled={bulkLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{bulkLoading ? 'در حال تایید...' : 'تایید یکجای همه خریدهای این تیم'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* View Tabs: Squad / Departures */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6">
              <button
                type="button"
                onClick={() => setActiveClubTab('SQUAD')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeClubTab === 'SQUAD'
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ترکیب تیم و ورودی‌ها ({clubDetail?.squad?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClubTab('DEPARTURES')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  activeClubTab === 'DEPARTURES'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>جداشدگان و خروجی‌ها ({clubDetail?.departures?.length || 0})</span>
              </button>
            </div>

            {/* TAB 1: SQUAD LIST */}
            {activeClubTab === 'SQUAD' && (
              <div>
                {/* Squad Filtering Toolbar */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 mb-6">
                  {/* Search Player */}
                  <div className="relative w-full lg:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="جستجوی بازیکن، پست یا سیر باشگاه..."
                      className="w-full pl-3 pr-10 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                    />
                    {playerSearch && (
                      <button
                        type="button"
                        onClick={() => setPlayerSearch('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Mode Buttons: All vs Pending */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                    <button
                      type="button"
                      onClick={() => setSquadFilterMode('PENDING_ONLY')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        squadFilterMode === 'PENDING_ONLY'
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                          : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>فقط خریدهای جدید / نیازمند ثبت ({clubDetail?.club?.pending_transfers_count || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSquadFilterMode('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        squadFilterMode === 'ALL'
                          ? 'bg-slate-200 text-slate-950 shadow-md font-black'
                          : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      کل ترکیب ({clubDetail?.squad?.length || 0})
                    </button>
                  </div>

                  {/* Position Chips */}
                  <div className="flex items-center gap-1 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                    {['ALL', 'FW', 'MF', 'DF', 'GK'].map((cat) => {
                      const labels = { ALL: 'همه', FW: 'مهاجمین', MF: 'هافبک‌ها', DF: 'مدافعین', GK: 'دروازه‌بان' };
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPosCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                            posCategory === cat
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                              : 'bg-slate-950/60 text-slate-400 hover:text-slate-300 border border-slate-800/80'
                          }`}
                        >
                          {labels[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Squad Players Cards Grid */}
                {loadingClub ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="h-56 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-4" />
                    ))}
                  </div>
                ) : filteredSquad.length === 0 ? (
                  <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
                    <Info className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-300 font-bold">هیچ بازیکنی مطابق شرایط یافت نشد.</p>
                    {squadFilterMode === 'PENDING_ONLY' && (
                      <button
                        type="button"
                        onClick={() => setSquadFilterMode('ALL')}
                        className="mt-3 px-4 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 cursor-pointer"
                      >
                        نمایش کل ترکیب این تیم
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSquad.map((player) => {
                      const isPending = !player.pes_transfer_applied;
                      const flag = getNationalityFlag(player.nationality);

                      return (
                        <div
                          key={player.id}
                          className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
                            isPending
                              ? 'bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-slate-950 border-amber-500/50 shadow-lg shadow-amber-950/20 hover:border-amber-400'
                              : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700/80 shadow-md'
                          }`}
                        >
                          {/* Indicator line on top */}
                          {isPending && (
                            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 shadow-[0_0_8px_#f59e0b]" />
                          )}

                          {/* Player Identity: Photo, Name, Copy, OVR */}
                          <div>
                            <div className="flex items-start gap-3.5 mb-3">
                              {/* Photo */}
                              <div className="relative w-16 h-20 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                                {player.photo ? (
                                  <img
                                    src={player.photo}
                                    alt={player.name}
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/players/default.png';
                                    }}
                                  />
                                ) : (
                                  <Users className="w-8 h-8 text-slate-700" />
                                )}
                                {/* Position badge overlaid */}
                                <span className={`absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[9px] font-black font-mono border ${POSITION_COLORS[player.position] || 'bg-slate-800 text-slate-300'}`}>
                                  {player.position}
                                </span>
                              </div>

                              {/* Info Column */}
                              <div className="flex-1 min-w-0">
                                {/* Name + Copy Button */}
                                <div className="flex items-center gap-1.5 justify-between">
                                  <h4 className="text-sm font-black text-white truncate m-0 group-hover:text-cyan-400 transition-colors" title={player.name}>
                                    {player.name}
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPlayerName(player.name, player.id)}
                                    className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer shrink-0 ${
                                      copiedId === player.id
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                        : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700/60 hover:bg-slate-700'
                                    }`}
                                    title="کپی کردن نام بازیکن جهت سرچ سریع در PES"
                                  >
                                    {copiedId === player.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {/* OVR & Age & Nationality */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {/* OVR Pill */}
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono border shadow-sm ${getOvrColorClass(player.overall)}`}>
                                    {player.overall} OVR
                                  </span>

                                  {/* Age */}
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {player.age} سال
                                  </span>

                                  {/* Nationality & Flag */}
                                  <span className="text-[11px] text-slate-300 flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800/60">
                                    <span>{flag}</span>
                                    <span className="truncate max-w-[80px]">{player.nationality || 'نامشخص'}</span>
                                  </span>
                                </div>

                                {/* Status Tag */}
                                <div className="mt-2">
                                  {isPending ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      <Flame className="w-3 h-3 text-amber-400" />
                                      در انتظار ثبت در بازی
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      در PES اعمال شده
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* =================================================== */}
                            {/* Visual Trajectory Breadcrumb (سیر کامل بازیکن)     */}
                            {/* =================================================== */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1.5">
                                <span className="flex items-center gap-1">
                                  <CornerDownLeft className="w-3 h-3 text-cyan-400" />
                                  مسیر جابجایی بازیکن:
                                </span>
                                {player.base_team?.name && (
                                  <span className="text-cyan-400 text-[10px] font-mono">
                                    مبدا PES: {player.base_team.name}
                                  </span>
                                )}
                              </div>

                              {/* Interactive Breadcrumb Flow */}
                              <div className="flex flex-wrap items-center gap-1 text-xs">
                                {(player.trajectory || []).map((hop, hIdx) => {
                                  const isFirst = hIdx === 0;
                                  const isLast = hIdx === (player.trajectory.length - 1);
                                  return (
                                    <React.Fragment key={hIdx}>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                          isFirst
                                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                                            : isLast
                                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}
                                        title={hop.label}
                                      >
                                        {isFirst && <span className="text-[9px] text-cyan-400 font-mono">مبدا:</span>}
                                        {hop.club_name}
                                        {isLast && <span className="text-[9px] text-emerald-400 font-mono">(فعلی)</span>}
                                      </span>
                                      {!isLast && (
                                        <span className="text-slate-500 text-xs font-bold">➔</span>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Action Button: Checkbox Toggle in PES */}
                          <div className="mt-3 pt-3 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleToggleApplied(player)}
                              disabled={toggleLoadingId === player.id}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                isPending
                                  ? 'bg-amber-500/20 hover:bg-emerald-600 text-amber-300 hover:text-white border border-amber-500/40 hover:border-emerald-500 shadow-md shadow-amber-950/20'
                                  : 'bg-emerald-600/20 hover:bg-slate-800 text-emerald-400 hover:text-slate-300 border border-emerald-500/40'
                              }`}
                            >
                              {toggleLoadingId === player.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : isPending ? (
                                <>
                                  <Square className="w-4 h-4 text-amber-400" />
                                  <span>ثبت در بازی PES (کلیک کنید)</span>
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  <span>✓ در بازی اعمال شد (تغییر وضعیت)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DEPARTURES LIST */}
            {activeClubTab === 'DEPARTURES' && (
              <div>
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-xs text-slate-300 m-0">
                    لیست بازیکنانی که از این باشگاه خارج شده‌اند. لطفاً در بازی PES مطمئن شوید که این بازیکنان دیگر در این تیم قرار ندارند و به تیم مقصد منتقل شده‌اند.
                  </p>
                </div>

                {(!clubDetail?.departures || clubDetail.departures.length === 0) ? (
                  <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-300 font-bold">هیچ خروجی از این باشگاه ثبت نشده است.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clubDetail.departures.map((dep) => {
                      const flag = getNationalityFlag(dep.player_nationality);
                      return (
                        <div
                          key={dep.id}
                          className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-4 flex flex-col justify-between shadow-md"
                        >
                          <div>
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-14 h-16 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                <img
                                  src={dep.player_photo}
                                  alt={dep.player_name}
                                  className="w-full h-full object-cover object-top"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/players/default.png';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-white truncate m-0">
                                  {dep.player_name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${POSITION_COLORS[dep.player_position] || 'bg-slate-800'}`}>
                                    {dep.player_position}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-400">
                                    {dep.player_overall} OVR
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <span>{flag}</span>
                                    <span>{dep.player_nationality}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Destination Info Box */}
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-slate-400 text-[11px]">انتقال به مقصد:</span>
                                <span className="text-emerald-400 font-bold font-mono">
                                  {formatCurrency(dep.fee)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {dep.buyer_team_logo && (
                                  <img
                                    src={dep.buyer_team_logo}
                                    alt={dep.buyer_team_name}
                                    className="w-5 h-5 object-contain"
                                  />
                                )}
                                <span className="text-xs font-black text-white">
                                  {dep.buyer_team_name}
                                </span>
                              </div>
                              {dep.transferred_at && (
                                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                  تاریخ انتقال: {dep.transferred_at}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 pt-2 text-[11px] text-rose-400 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            <span>باید از ترکیب این تیم در بازی PES حذف/منتقل شود</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
