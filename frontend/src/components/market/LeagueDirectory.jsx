import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Users, ArrowRight, Star, Shield, Sparkles, 
  DollarSign, ChevronLeft, Filter, UserCheck, Eye, ArrowUpDown,
  Building2, Trophy, Flame, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import StarRating from '../common/StarRating';
import Pagination from '../common/Pagination';

// Position Categorization & Colors
const POSITION_CATEGORIES = {
  ALL: 'همه',
  FWD: ['CF', 'SS', 'LWF', 'RWF', 'ST'],
  MID: ['AMF', 'CMF', 'DMF', 'LMF', 'RMF'],
  DEF: ['CB', 'LB', 'RB'],
  GK: ['GK'],
};

const POSITION_BADGE_STYLES = {
  CF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  SS: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  LWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  RWF: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  ST: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  AMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  DMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  LMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  RMF: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  CB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  LB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  RB: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
};

function getOverallBadgeColor(ovr) {
  if (ovr >= 85) return 'from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
  if (ovr >= 80) return 'from-cyan-400 via-teal-300 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,243,255,0.4)]';
  if (ovr >= 75) return 'from-purple-500 via-indigo-400 to-purple-600 text-white';
  return 'from-slate-700 to-slate-800 text-slate-200';
}

export function getTeamStarRating(team) {
  if (team && team.star_rating != null && !isNaN(Number(team.star_rating)) && Number(team.star_rating) > 0) {
    return Number(team.star_rating);
  }
  const players = team?.players || [];
  if (players.length === 0) return 4.0;
  const starters = players.filter(p => p.is_starting);
  const pool = starters.length >= 11 ? starters : [...players].sort((a, b) => (b.overall || 0) - (a.overall || 0)).slice(0, 11);
  const avg = pool.reduce((sum, p) => sum + (p.overall || 0), 0) / pool.length;
  if (avg >= 85.6) return 5.0;
  if (avg >= 84.0) return 4.5;
  if (avg >= 82.0) return 4.0;
  if (avg >= 80.0) return 3.5;
  if (avg >= 77.0) return 3.0;
  if (avg >= 74.0) return 2.5;
  return 2.0;
}

export default function LeagueDirectory({ currentTeamId, onPlayerSelect }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  // Search & Filter States
  const [clubSearchQuery, setClubSearchQuery] = useState('');
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL'); // 'ALL' | 'FWD' | 'MID' | 'DEF' | 'GK'
  const [sortBy, setSortBy] = useState('overall'); // 'overall' | 'name' | 'age' | 'wage'

  useEffect(() => {
    transferApi.getLeagueTeams()
      .then(res => setTeams(res.data || []))
      .catch(err => console.error('Failed to load league teams:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filtered clubs for the square cards grid
  const filteredClubs = useMemo(() => {
    return teams.filter(t => {
      const q = clubSearchQuery.trim().toLowerCase();
      if (!q) return true;
      const matchTeam = t.name?.toLowerCase().includes(q);
      const matchManager = t.manager_name?.toLowerCase().includes(q) || t.manager_full_name?.toLowerCase().includes(q);
      const matchPlayer = (t.players || []).some(p => p.name?.toLowerCase().includes(q));
      return matchTeam || matchManager || matchPlayer;
    });
  }, [teams, clubSearchQuery]);

  // Filtered & Sorted players for the selected club view
  const filteredPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    let list = selectedTeam.players || [];

    // Filter by position
    if (positionFilter !== 'ALL') {
      const allowed = POSITION_CATEGORIES[positionFilter] || [];
      list = list.filter(p => allowed.includes(p.position));
    }

    // Filter by search query
    if (playerSearchQuery.trim()) {
      const pq = playerSearchQuery.trim().toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(pq) || p.position?.toLowerCase().includes(pq));
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === 'overall') return (b.overall || 0) - (a.overall || 0);
      if (sortBy === 'market_value') return (Number(b.market_value) || 0) - (Number(a.market_value) || 0);
      if (sortBy === 'potential') return (Number(b.potential_ovr || b.overall || 0)) - (Number(a.potential_ovr || a.overall || 0));
      if (sortBy === 'age') return (a.age || 0) - (b.age || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'fa');
      return 0;
    });
  }, [selectedTeam, positionFilter, playerSearchQuery, sortBy]);

  // Squad Players Pagination
  const [playerPage, setPlayerPage] = useState(1);
  const PLAYERS_PER_PAGE = 12;

  useEffect(() => {
    setPlayerPage(1);
  }, [selectedTeam?.id, positionFilter, playerSearchQuery, sortBy]);

  const paginatedPlayers = useMemo(() => {
    const start = (playerPage - 1) * PLAYERS_PER_PAGE;
    return filteredPlayers.slice(start, start + PLAYERS_PER_PAGE);
  }, [filteredPlayers, playerPage]);

  const playerTotalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE) || 1;

  // Squad Summary Stats
  const teamStats = useMemo(() => {
    if (!selectedTeam) return null;
    const players = selectedTeam.players || [];
    const count = players.length;
    if (count === 0) return { avgOvr: 0, avgPot: 0, totalValue: 0, fwdCount: 0, midCount: 0, defCount: 0, gkCount: 0 };

    const totalOvr = players.reduce((sum, p) => sum + (p.overall || 0), 0);
    const totalPot = players.reduce((sum, p) => sum + (p.potential_ovr || p.overall || 0), 0);
    const totalVal = players.reduce((sum, p) => sum + (Number(p.market_value) || 1000000), 0);
    const avgOvr = Math.round(totalOvr / count);
    const avgPot = Math.round(totalPot / count);

    const fwdCount = players.filter(p => POSITION_CATEGORIES.FWD.includes(p.position)).length;
    const midCount = players.filter(p => POSITION_CATEGORIES.MID.includes(p.position)).length;
    const defCount = players.filter(p => POSITION_CATEGORIES.DEF.includes(p.position)).length;
    const gkCount = players.filter(p => POSITION_CATEGORIES.GK.includes(p.position)).length;

    return { avgOvr, avgPot, totalValue: totalVal, fwdCount, midCount, defCount, gkCount };
  }, [selectedTeam]);

  if (loading) {
    return (
      <div className="p-16 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-sport tracking-wider text-slate-300">در حال بارگذاری لیست باشگاه‌های لیگ برتر...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans dir-rtl">
      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* VIEW 1: SQUARE CLUB CARDS DIRECTORY                       */}
        {/* ========================================================= */}
        {!selectedTeam ? (
          <motion.div
            key="club_grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Guide & Search Header Card */}
            <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#080c14] via-[#0d162a] to-[#080c14] space-y-3.5 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(0,243,255,0.4)] font-black">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                      استعدادیابی و بررسی باشگاه‌های لیگ
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      روی هر باشگاه کلیک کنید تا لیست کامل و مشخصات بازیکنان آن نمایش داده شود.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-sport text-xs">
                  <span className="bg-cyan-950/80 text-cyan-300 px-3 py-1 rounded-xl border border-cyan-500/40 font-black">
                    {teams.length} باشگاه
                  </span>
                </div>
              </div>

              {/* Club Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="جستجوی باشگاه، مربی یا بازیکن مورد نظر..."
                  value={clubSearchQuery}
                  onChange={(e) => setClubSearchQuery(e.target.value)}
                  className="w-full bg-[#05080e]/90 border border-slate-700/70 rounded-2xl py-3 pr-11 pl-4 text-white text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-slate-500"
                />
                <Search className="absolute right-3.5 top-3.5 text-cyan-400" size={17} />
              </div>
            </div>

            {/* Square Club Cards Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredClubs.map((team) => {
                const isOwnTeam = team.id === currentTeamId;
                const players = team.players || [];
                const avgOvr = players.length > 0
                  ? Math.round(players.reduce((sum, p) => sum + (p.overall || 0), 0) / players.length)
                  : 0;

                return (
                  <motion.div
                    key={team.id}
                    whileHover={{ scale: 1.04, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedTeam(team)}
                    className={`aspect-square p-3.5 sm:p-4 rounded-3xl border flex flex-col items-center justify-between cursor-pointer transition-all shadow-xl relative overflow-hidden group ${
                      isOwnTeam
                        ? 'bg-gradient-to-b from-[#0e1726] via-[#101b33] to-[#080c14] border-cyan-500/50 ring-1 ring-cyan-500/30'
                        : 'bg-gradient-to-b from-[#080c14] via-[#0b1020] to-[#05080e] border-slate-800 hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                    }`}
                  >
                    {/* Top Status & Squad Tag */}
                    <div className="w-full flex items-center justify-between z-10">
                      <div className="flex items-center gap-1">
                        <span className="text-[9.5px] font-sport font-black text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                          {players.length} بازیکن
                        </span>
                        {isOwnTeam && (
                          <span className="text-[8.5px] font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            تیم شما
                          </span>
                        )}
                      </div>
                      <StarRating rating={getTeamStarRating(team)} size={11} showNumber={true} />
                    </div>

                    {/* Team Crest Logo Box */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 team-crest-badge p-2 sm:p-2.5 rounded-2xl flex items-center justify-center shrink-0 my-auto shadow-[0_0_25px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] group-hover:scale-105 transition-all">
                      {getTeamLogoUrl(team) ? (
                        <img
                          src={getTeamLogoUrl(team)}
                          alt={team.name}
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      ) : (
                        <span className="font-sport font-black text-slate-800 text-base sm:text-lg">
                          {team.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Team Name and Manager Footer */}
                    <div className="w-full text-center z-10 space-y-0.5">
                      <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                        {team.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {team.manager_full_name ? `مربی: ${team.manager_full_name}` : team.manager_name ? `مربی: @${team.manager_name}` : 'آماده استعدادیابی'}
                      </p>
                    </div>

                    {/* Hover Glow Light */}
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </motion.div>
                );
              })}
            </div>

            {filteredClubs.length === 0 && (
              <div className="fc-card p-12 text-center text-slate-400 rounded-3xl border border-slate-800 space-y-2">
                <span className="text-3xl">🔍</span>
                <p className="text-xs font-bold text-white">باشگاهی مطابق با عبارت جستجو شده پیدا نشد.</p>
                <p className="text-[11px] text-slate-500">لطفاً عبارت دیگری را امتحان کنید.</p>
              </div>
            )}
          </motion.div>
        ) : (
          /* ========================================================= */
          /* VIEW 2: COMPACT TEAM PLAYERS ROSTER VIEW                  */
          /* ========================================================= */
          <motion.div
            key="player_roster"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Back Button & Club Header Banner */}
            <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#080c14] via-[#0d162a] to-[#080c14] space-y-4 shadow-2xl">
              {/* Back to Club Grid Bar */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <button
                  onClick={() => {
                    setSelectedTeam(null);
                    setPlayerSearchQuery('');
                    setPositionFilter('ALL');
                  }}
                  className="flex items-center gap-2 text-xs font-black text-cyan-300 hover:text-white bg-cyan-950/80 hover:bg-cyan-900/90 px-3.5 py-2 rounded-2xl border border-cyan-500/40 shadow-lg transition-all active:scale-95 cursor-pointer font-sport"
                >
                  <ArrowRight size={15} />
                  <span>بازگشت به لیست باشگاه‌ها</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-amber-950/80 border border-amber-500/40 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-300 font-sport">قدرت تیم:</span>
                    <StarRating rating={getTeamStarRating(selectedTeam)} size={12} showNumber={true} />
                  </div>
                  <span className="text-xs font-sport font-black text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-xl border border-cyan-500/40">
                    👥 {selectedTeam.players?.length || 0} بازیکن
                  </span>
                </div>
              </div>

              {/* Selected Club Hero Details */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-right">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 team-crest-badge p-2.5 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.3)] shrink-0">
                    {getTeamLogoUrl(selectedTeam) ? (
                      <img
                        src={getTeamLogoUrl(selectedTeam)}
                        alt={selectedTeam.name}
                        className="w-full h-full object-contain drop-shadow-md"
                      />
                    ) : (
                      <span className="font-sport font-black text-slate-800 text-lg">
                        {selectedTeam.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span>{selectedTeam.name}</span>
                      <StarRating rating={getTeamStarRating(selectedTeam)} size={15} showNumber={false} />
                      {selectedTeam.id === currentTeamId && (
                        <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-md font-sans">
                          تیم شما
                        </span>
                      )}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 justify-center sm:justify-start text-xs">
                      {selectedTeam.manager_full_name ? (
                        <>
                          <span className="text-cyan-300 font-bold">سرمربی: {selectedTeam.manager_full_name}</span>
                          {selectedTeam.manager_birth_date && (
                            <span className="text-slate-400 text-[11px] font-sport">• متولد: {selectedTeam.manager_birth_date}</span>
                          )}
                        </>
                      ) : selectedTeam.manager_name ? (
                        <span className="text-cyan-300 font-bold">سرمربی: @{selectedTeam.manager_name}</span>
                      ) : (
                        <span className="text-slate-400">باشگاه رسمی لیگ برتر</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      جهت بررسی مشخصات مالی، پتانسیل رشد و ارسال پیشنهاد رسمی خرید، روی هر بازیکن کلیک کنید.
                    </p>
                  </div>
                </div>

                {/* Financial Summary Cards */}
                <div className="grid grid-cols-3 gap-2 w-full lg:w-auto font-sport">
                  <div className="bg-[#05080e]/90 p-2.5 sm:p-3 rounded-2xl border border-emerald-500/30 text-center shadow">
                    <span className="text-[9.5px] text-emerald-400 block font-bold">ارزش کل تیم</span>
                    <span className="text-xs sm:text-sm font-black text-[#00ff87] dir-ltr block mt-0.5">
                      €{Number(teamStats?.totalValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#05080e]/90 p-2.5 sm:p-3 rounded-2xl border border-amber-500/30 text-center shadow">
                    <span className="text-[9.5px] text-amber-400 block font-bold">میانگین پتانسیل</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300 dir-ltr block mt-0.5 font-sport">
                      POT {teamStats?.avgPot || 0}
                    </span>
                  </div>
                  <div className="bg-[#05080e]/90 p-2.5 sm:p-3 rounded-2xl border border-cyan-500/30 text-center shadow">
                    <span className="text-[9.5px] text-cyan-400 block font-bold">بودجه باشگاه</span>
                    <span className="text-xs sm:text-sm font-black text-cyan-300 dir-ltr block mt-0.5">
                      ${Number(selectedTeam.budget || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Pills, Sorting & Live Search Bar */}
            <div className="fc-card p-3 rounded-2xl border border-slate-700/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-lg">
              {/* Position Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar font-sport text-xs font-black">
                <button
                  onClick={() => setPositionFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    positionFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  همه ({selectedTeam.players?.length || 0})
                </button>
                <button
                  onClick={() => setPositionFilter('FWD')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    positionFilter === 'FWD'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  مهاجمان ({teamStats?.fwdCount || 0})
                </button>
                <button
                  onClick={() => setPositionFilter('MID')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    positionFilter === 'MID'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  هافبک‌ها ({teamStats?.midCount || 0})
                </button>
                <button
                  onClick={() => setPositionFilter('DEF')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    positionFilter === 'DEF'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  مدافعان ({teamStats?.defCount || 0})
                </button>
                <button
                  onClick={() => setPositionFilter('GK')}
                  className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                    positionFilter === 'GK'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/60 hover:border-slate-500'
                  }`}
                >
                  دروازه‌بان ({teamStats?.gkCount || 0})
                </button>
              </div>

              {/* Sorting and Search Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center gap-1.5 w-full sm:w-auto bg-[#05080e] px-2.5 py-1.5 rounded-xl border border-slate-700/70">
                  <ArrowUpDown size={13} className="text-cyan-400 shrink-0" />
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">مرتب‌سازی:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="overall" className="bg-slate-900 text-white">امتیاز کلی (OVR)</option>
                    <option value="market_value" className="bg-slate-900 text-white">ارزش بازار (Value)</option>
                    <option value="potential" className="bg-slate-900 text-white">سقف پتانسیل (POT)</option>
                    <option value="age" className="bg-slate-900 text-white">سن بازیکن</option>
                    <option value="name" className="bg-slate-900 text-white">نام بازیکن</option>
                  </select>
                </div>

                {/* Player Search Input */}
                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    placeholder="جستجوی بازیکن..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="w-full bg-[#05080e] border border-slate-700/70 rounded-xl py-1.5 pr-8 pl-3 text-white text-xs outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500"
                  />
                  <Search className="absolute right-2.5 top-2 text-cyan-400" size={13} />
                </div>
              </div>
            </div>

            {/* Compact Player Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
              {paginatedPlayers.map((player) => {
                const ovrColor = getOverallBadgeColor(player.overall);
                const posStyle = POSITION_BADGE_STYLES[player.position] || 'bg-slate-800 text-slate-200 border-slate-700';
                const estValue = Number(player.market_value || (player.wage || 100) * 50);
                const potGap = (player.potential_ovr || player.overall) - player.overall;
                const isHighPotential = (player.potential_ovr || 0) >= 90;

                return (
                  <motion.div
                    key={player.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`p-3 rounded-2xl border transition-all shadow-md flex flex-col justify-between gap-2.5 group ${
                      player.rarity === 'LEGENDARY'
                        ? 'border-amber-500/40 bg-gradient-to-b from-[#141208] via-[#0d162a] to-[#05080e] hover:border-amber-400'
                        : player.rarity === 'EPIC'
                        ? 'border-purple-500/40 bg-gradient-to-b from-[#12081c] via-[#0d162a] to-[#05080e] hover:border-purple-400'
                        : 'border-slate-700/60 bg-gradient-to-b from-[#080c14] via-[#0a0f1e] to-[#05080e] hover:border-cyan-400/60'
                    }`}
                  >
                    {/* Top Row: OVR, Position, Shirt #, Starter */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-sport font-black px-2 py-0.5 rounded-lg border ${posStyle}`}>
                          {player.position}
                        </span>
                        {player.shirt_number != null && (
                          <span className="text-[10px] font-sport font-black text-slate-400 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                            #{player.shirt_number}
                          </span>
                        )}
                        {player.is_starting && (
                          <span className="text-[9px] font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            فیکس
                          </span>
                        )}
                      </div>

                      {/* Overall & Potential Rating Badge */}
                      <div className="flex items-center gap-1.5">
                        {potGap > 0 ? (
                          <span className={`text-[9.5px] font-sport font-black px-1.5 py-0.5 rounded-lg border flex items-center gap-0.5 ${
                            isHighPotential
                              ? 'text-amber-300 bg-amber-950/90 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse'
                              : 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40'
                          }`}>
                            ⚡ POT {player.potential_ovr}
                            <span className="text-[8.5px] opacity-80">(+{potGap})</span>
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-sport font-bold text-slate-300 bg-slate-900/90 border border-slate-700/70 px-1.5 py-0.5 rounded-lg shadow-sm">
                            POT {player.potential_ovr || player.overall}
                          </span>
                        )}
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${ovrColor} flex items-center justify-center font-sport font-black text-xs shrink-0`}>
                          {player.overall}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Player Portrait Photo, Name & Details */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 rounded-2xl overflow-hidden border border-slate-700 bg-gradient-to-b from-[#0f172a] to-[#05080e] shrink-0 flex items-center justify-center relative shadow-inner">
                        {getPlayerPhotoUrl(player) ? (
                          <img
                            src={getPlayerPhotoUrl(player)}
                            alt={player.name}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User size={20} className="text-slate-400 opacity-75" />
                        )}
                      </div>
                      <div className="space-y-0.5 truncate flex-1">
                        <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                          {player.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-sport">
                          <span>سن: <strong className="text-slate-200 font-sans">{player.age || 25} سال</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Value & Action Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 font-sport">
                      <div className="truncate">
                        <span className="text-[9.5px] text-slate-400 block leading-tight">ارزش بازار</span>
                        <span className="text-xs font-black text-[#00ff87] dir-ltr block">
                          €{estValue.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => onPlayerSelect(player, selectedTeam)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10.5px] flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <Eye size={12} className="text-slate-950" />
                        <span>بررسی و پیشنهاد ⚡</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredPlayers.length > 0 && (
              <Pagination
                currentPage={playerPage}
                totalPages={playerTotalPages}
                totalItems={filteredPlayers.length}
                pageSize={PLAYERS_PER_PAGE}
                onPageChange={setPlayerPage}
              />
            )}

            {filteredPlayers.length === 0 && (
              <div className="fc-card p-10 text-center text-slate-400 rounded-3xl border border-slate-800 space-y-2">
                <span className="text-2xl">👤</span>
                <p className="text-xs font-bold text-white">هیچ بازیکنی در این فیلتر یافت نشد.</p>
                <p className="text-[11px] text-slate-500">فیلتر پست یا عبارت جستجو را تغییر دهید.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
