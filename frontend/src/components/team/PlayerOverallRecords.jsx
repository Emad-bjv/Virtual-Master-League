import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  Shirt, Star, Search, ArrowUpDown, 
  User, Sparkles, HeartPulse, Zap, X, DollarSign, Check, Edit3
} from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { playerApi } from '../../services/api';

// Position colors matching authentic PES / eFootball UI
export const getPesPositionColor = (pos) => {
  const p = String(pos || '').toUpperCase();
  if (p === 'GK') return 'bg-[#ca8a04] text-slate-950 border-[#a16207]';
  if (['CB', 'LB', 'RB'].includes(p)) return 'bg-[#1e3a8a] text-cyan-200 border-[#172554]';
  if (['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(p)) return 'bg-[#166534] text-emerald-200 border-[#14532d]';
  if (['CF', 'SS', 'LWF', 'RWF'].includes(p)) return 'bg-[#991b1b] text-rose-100 border-[#7f1d1d]';
  return 'bg-slate-700 text-slate-200 border-slate-600';
};

export default function PlayerOverallRecords({ 
  players = [], 
  teamData, 
  currentGems = 0,
  handleHealInjury,
  handleRecoverStamina,
  handleGemBoost,
  actionLoading 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [selectedRecordType, setSelectedRecordType] = useState(1); // 1: Overall, 2: League, 3: Cup, 4: Friendly
  const [sortBy, setSortBy] = useState('position_order'); // 'matches', 'goals', 'assists', 'rating', 'yellow', 'red', 'position_order'
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editMarketValueInput, setEditMarketValueInput] = useState('');
  const [marketValueSaving, setMarketValueSaving] = useState(false);
  const [marketValueSuccessMsg, setMarketValueSuccessMsg] = useState('');

  const recordTabs = [
    { id: 1, label: 'Overall Records', num: '1/4', subtitle: 'مجموع کلیه رقابت‌ها' },
    { id: 2, label: 'League Records', num: '2/4', subtitle: 'مسابقات لیگ برتر' },
    { id: 3, label: 'Cup Records', num: '3/4', subtitle: 'مسابقات جام حذفی' },
    { id: 4, label: 'Friendly Records', num: '4/4', subtitle: 'بازی‌های دوستانه و آزاد' },
  ];

  const handlePrevTab = () => {
    setSelectedRecordType(prev => (prev === 1 ? 4 : prev - 1));
  };

  const handleNextTab = () => {
    setSelectedRecordType(prev => (prev === 4 ? 1 : prev + 1));
  };

  const currentTabInfo = recordTabs.find(t => t.id === selectedRecordType) || recordTabs[0];

  // Helper to extract stats for active tournament/page tab
  const getActiveStats = (p) => {
    const byTab = p?.records_by_tab;
    if (!byTab) {
      return {
        matches_played: p?.matches_played || 0,
        goals: p?.goals || 0,
        assists: p?.assists || 0,
        avg_rating: p?.avg_rating,
        yellow_cards: p?.yellow_cards || 0,
        red_cards: p?.red_cards || 0,
      };
    }
    if (selectedRecordType === 2) return byTab.league || {};
    if (selectedRecordType === 3) return byTab.cup || {};
    if (selectedRecordType === 4) return byTab.friendly || {};
    return byTab.overall || p;
  };

  // Sorting helper
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter & sort players
  const processedPlayers = useMemo(() => {
    let list = [...(players || [])];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(p => {
        const natPos = p.naturalPosition || p.position || '';
        return String(p.name || '').toLowerCase().includes(q) ||
               String(natPos).toLowerCase().includes(q);
      });
    }

    if (positionFilter !== 'ALL') {
      if (positionFilter === 'GK') {
        list = list.filter(p => (p.naturalPosition || p.position) === 'GK');
      } else if (positionFilter === 'DEF') {
        list = list.filter(p => ['CB', 'LB', 'RB'].includes(p.naturalPosition || p.position));
      } else if (positionFilter === 'MID') {
        list = list.filter(p => ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(p.naturalPosition || p.position));
      } else if (positionFilter === 'FWD') {
        list = list.filter(p => ['CF', 'SS', 'LWF', 'RWF'].includes(p.naturalPosition || p.position));
      }
    }

    // Default PES position priority
    const posPriority = {
      'GK': 1, 'CB': 2, 'RB': 3, 'LB': 4,
      'DMF': 5, 'CMF': 6, 'AMF': 7, 'RMF': 8, 'LMF': 9,
      'RWF': 10, 'LWF': 11, 'SS': 12, 'CF': 13
    };

    list.sort((a, b) => {
      const statsA = getActiveStats(a);
      const statsB = getActiveStats(b);

      let valA, valB;
      if (sortBy === 'matches') {
        valA = statsA.matches_played || 0;
        valB = statsB.matches_played || 0;
      } else if (sortBy === 'goals') {
        valA = statsA.goals || 0;
        valB = statsB.goals || 0;
      } else if (sortBy === 'assists') {
        valA = statsA.assists || 0;
        valB = statsB.assists || 0;
      } else if (sortBy === 'rating') {
        valA = statsA.avg_rating !== null && statsA.avg_rating !== undefined ? Number(statsA.avg_rating) : -1;
        valB = statsB.avg_rating !== null && statsB.avg_rating !== undefined ? Number(statsB.avg_rating) : -1;
      } else if (sortBy === 'yellow') {
        valA = statsA.yellow_cards || 0;
        valB = statsB.yellow_cards || 0;
      } else if (sortBy === 'red') {
        valA = statsA.red_cards || 0;
        valB = statsB.red_cards || 0;
      } else {
        // Position order
        const prioA = posPriority[a.naturalPosition || a.position] || 99;
        const prioB = posPriority[b.naturalPosition || b.position] || 99;
        if (prioA !== prioB) return prioA - prioB;
        return (b.overall || 0) - (a.overall || 0);
      }

      if (valA === valB) {
        return (posPriority[a.position] || 99) - (posPriority[b.position] || 99);
      }
      return sortOrder === 'desc' ? (valB - valA) : (valA - valB);
    });

    return list;
  }, [players, searchTerm, positionFilter, sortBy, sortOrder, selectedRecordType]);

  return (
    <div className="space-y-3 select-none">
      {/* Search & Position Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام یا پست بازیکن..."
            className="w-full bg-[#080c14]/90 border border-slate-700/70 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner"
          />
          <Search size={15} className="absolute right-3 top-2.5 text-slate-400" />
        </div>

        {/* Position Filter Pills */}
        <div className="flex items-center gap-1 bg-[#080c14]/90 p-1 rounded-xl border border-slate-700/60 text-[10.5px] shrink-0 justify-center">
          {['ALL', 'GK', 'DEF', 'MID', 'FWD'].map((pos) => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`px-2.5 py-1 rounded-lg transition-all font-sport font-black cursor-pointer ${
                positionFilter === pos
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Main PES Style Records Container */}
      <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#07111e]">
        {/* Banner Header: Overall Records + L1 / R1 Pager */}
        <div className="bg-gradient-to-r from-[#0b1c33] via-[#0f2442] to-[#0b1c33] px-4 py-3 flex items-center justify-between border-b border-slate-700/70">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-sm shadow-[0_0_8px_rgba(0,243,255,0.6)]"></div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide font-sport">
                {currentTabInfo.label}
              </h2>
              <span className="text-[10px] text-cyan-300 font-sans block -mt-0.5">
                {currentTabInfo.subtitle}
              </span>
            </div>
          </div>

          {/* L1 / R1 Console Bumpers & Clickable Tabs */}
          <div className="flex items-center gap-1.5 font-sport text-xs">
            <button
              onClick={handlePrevTab}
              className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 hover:text-white border border-slate-600/80 hover:border-cyan-400 font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
              title="صفحه قبل (L1)"
            >
              <span className="text-[10px] text-cyan-400">L1</span>
            </button>

            <span className="bg-slate-950 px-2.5 py-0.5 rounded-full text-white font-bold text-[11px] border border-white/10 shadow-inner">
              {currentTabInfo.num}
            </span>

            <button
              onClick={handleNextTab}
              className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 hover:text-white border border-slate-600/80 hover:border-cyan-400 font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
              title="صفحه بعد (R1)"
            >
              <span className="text-[10px] text-cyan-400">R1</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[580px]">
            {/* Header Row */}
            <thead>
              <tr className="bg-[#050c17] text-white text-[12px] font-sport uppercase tracking-wider border-b border-slate-800">
                <th className="py-2.5 px-3.5 text-left font-black w-5/12">
                  <button 
                    onClick={() => handleSort('position_order')} 
                    className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                  >
                    <span>Players</span>
                    {sortBy === 'position_order' && <ArrowUpDown size={11} className="text-cyan-400" />}
                  </button>
                </th>

                {/* 🎽 Appearances / Matches Played */}
                <th className="py-2.5 px-2 text-center font-black w-[9%]">
                  <button 
                    onClick={() => handleSort('matches')} 
                    className="w-full flex justify-center items-center hover:opacity-80 transition-opacity"
                    title="تعداد بازی‌ها (Appearances)"
                  >
                    <Shirt size={16} className="text-white fill-white/20 stroke-[2.2]" />
                  </button>
                </th>

                {/* ⚽ Goals Scored */}
                <th className="py-2.5 px-2 text-center font-black w-[9%]">
                  <button 
                    onClick={() => handleSort('goals')} 
                    className="w-full flex justify-center items-center hover:opacity-80 transition-opacity text-base"
                    title="تعداد گل‌ها (Goals)"
                  >
                    <span>⚽</span>
                  </button>
                </th>

                {/* 👟 Assists */}
                <th className="py-2.5 px-2 text-center font-black w-[9%]">
                  <button 
                    onClick={() => handleSort('assists')} 
                    className="w-full flex justify-center items-center hover:opacity-80 transition-opacity text-base"
                    title="پاس گل (Assists)"
                  >
                    <span>👟</span>
                  </button>
                </th>

                {/* ★ Average Match Rating */}
                <th className="py-2.5 px-2 text-center font-black w-[11%]">
                  <button 
                    onClick={() => handleSort('rating')} 
                    className="w-full flex justify-center items-center gap-0.5 hover:opacity-80 transition-opacity"
                    title="میانگین نمره عملکرد ثبت شده توسط ادمین (Average Rating)"
                  >
                    <Star size={15} className="text-amber-400 fill-amber-400" />
                  </button>
                </th>

                {/* 🟨 Yellow Cards */}
                <th className="py-2.5 px-2 text-center font-black w-[8%]">
                  <button 
                    onClick={() => handleSort('yellow')} 
                    className="w-full flex justify-center items-center hover:opacity-80 transition-opacity"
                    title="کارت زرد (Yellow Cards)"
                  >
                    <div className="w-2.5 h-3.5 bg-yellow-400 rounded-[2px] shadow-[0_0_6px_rgba(250,204,21,0.6)] border border-yellow-200"></div>
                  </button>
                </th>

                {/* 🟥 Red Cards */}
                <th className="py-2.5 px-2 text-center font-black w-[8%]">
                  <button 
                    onClick={() => handleSort('red')} 
                    className="w-full flex justify-center items-center hover:opacity-80 transition-opacity"
                    title="کارت قرمز (Red Cards)"
                  >
                    <div className="w-2.5 h-3.5 bg-red-600 rounded-[2px] shadow-[0_0_6px_rgba(239,68,68,0.6)] border border-red-300"></div>
                  </button>
                </th>
              </tr>
            </thead>

            {/* Table Rows with Alternating PES Sleek Blue-Slate Colors */}
            <tbody className="text-xs font-sport">
              {processedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-sans">
                    بازیکنی با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                processedPlayers.map((p, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven 
                    ? 'bg-[#c5d0dc] hover:bg-[#d4deeb] text-slate-900' 
                    : 'bg-[#aab8c9] hover:bg-[#bcc9d9] text-slate-900';
                  
                  const stats = getActiveStats(p);
                  const avgRatingFormatted = stats.avg_rating !== null && stats.avg_rating !== undefined && Number(stats.avg_rating) > 0
                    ? Number(stats.avg_rating).toFixed(1)
                    : '---';

                  const photoUrl = getPlayerPhotoUrl(p);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedPlayer(p);
                        setEditMarketValueInput(p.market_value ? String(Math.round(p.market_value)) : '1000000');
                        setMarketValueSuccessMsg('');
                      }}
                      className={`${rowBg} transition-colors border-b border-[#8ea0b5]/40 cursor-pointer font-bold`}
                    >
                      {/* Player Col: Photo Thumbnail + Position Badge + Name */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          {/* Player Photo Frame */}
                          <div className="w-8 h-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shrink-0 shadow-sm flex items-center justify-center relative">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={p.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/team-logos/default.png';
                                }}
                              />
                            ) : (
                              <User size={16} className="text-slate-400" />
                            )}
                          </div>

                          {/* Position Badge */}
                          {(() => {
                            const natPos = p.naturalPosition || p.position;
                            const hasTacticalDiff = p.tacticalPosition && p.tacticalPosition !== natPos;
                            return (
                              <span 
                                className={`px-1.5 py-0.5 rounded text-[10px] font-black border tracking-wider shadow-sm shrink-0 min-w-[34px] text-center ${getPesPositionColor(natPos)}`}
                                title={`پست اصلی: ${natPos}${hasTacticalDiff ? ` (پست در چمن: ${p.tacticalPosition})` : ''}`}
                              >
                                {natPos}
                              </span>
                            );
                          })()}

                          {/* Player Name */}
                          <span className="font-extrabold text-[12.5px] sm:text-[13px] tracking-tight truncate max-w-[150px] sm:max-w-[210px]">
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Appearances */}
                      <td className="py-2.5 px-2 text-center text-sm font-black">
                        {stats.matches_played || 0}
                      </td>

                      {/* Goals */}
                      <td className="py-2.5 px-2 text-center text-sm font-black">
                        {stats.goals || 0}
                      </td>

                      {/* Assists */}
                      <td className="py-2.5 px-2 text-center text-sm font-black">
                        {stats.assists || 0}
                      </td>

                      {/* Star Rating */}
                      <td className="py-2.5 px-2 text-center text-sm font-black tracking-tight">
                        <span className={avgRatingFormatted !== '---' ? 'text-amber-950 font-black' : 'text-slate-600 font-medium'}>
                          {avgRatingFormatted}
                        </span>
                      </td>

                      {/* Yellow Cards */}
                      <td className="py-2.5 px-2 text-center text-sm font-black">
                        {stats.yellow_cards || 0}
                      </td>

                      {/* Red Cards */}
                      <td className="py-2.5 px-2 text-center text-sm font-black">
                        {stats.red_cards || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info Strip */}
        <div className="bg-[#050c17] px-4 py-2 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 border-t border-slate-800 gap-1.5 font-sans">
          <span className="flex items-center gap-1.5">
            <span className="text-[#00ff87] font-sport font-black dir-ltr">
              {processedPlayers.length} / {players.length}
            </span>
            <span>بازیکن در فهرست {currentTabInfo.subtitle}</span>
          </span>
          <span className="text-slate-400 flex items-center gap-2">
            <span>⭐ ستاره = میانگین نمرات مسابقات</span>
            <span>•</span>
            <span>آمار ثبت شده توسط ادمین مسابقات</span>
          </span>
        </div>
      </div>

      {/* Player Detailed Performance Modal with createPortal */}
      {typeof document !== 'undefined' && selectedPlayer && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setSelectedPlayer(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-[#080e18] border border-cyan-500/40 rounded-3xl w-full max-w-lg my-auto p-5 shadow-2xl text-white space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-16 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0 shadow-md relative flex items-center justify-center">
                    {getPlayerPhotoUrl(selectedPlayer) ? (
                      <img
                        src={getPlayerPhotoUrl(selectedPlayer)}
                        alt={selectedPlayer.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/team-logos/default.png';
                        }}
                      />
                    ) : (
                      <User size={28} className="text-slate-500" />
                    )}
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-sport font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {selectedPlayer.overall}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white">{selectedPlayer.name}</h3>
                      {(() => {
                        const natPos = selectedPlayer.naturalPosition || selectedPlayer.position;
                        const hasTacticalDiff = selectedPlayer.tacticalPosition && selectedPlayer.tacticalPosition !== natPos;
                        return (
                          <span 
                            className={`px-2 py-0.5 rounded text-[10px] font-black border font-sport ${getPesPositionColor(natPos)}`}
                            title={`پست اصلی: ${natPos}${hasTacticalDiff ? ` (پست در چمن: ${selectedPlayer.tacticalPosition})` : ''}`}
                          >
                            {natPos}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-slate-400 font-sport mt-0.5 flex items-center gap-2">
                      <span>سن: <strong className="text-slate-200">{selectedPlayer.age}</strong> سال</span>
                      <span>•</span>
                      <span>ارزش: <strong className="text-emerald-400">${selectedPlayer.market_value ? Number(selectedPlayer.market_value).toLocaleString('fa-IR') : '—'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tournament Stat Breakdown (Overall, League, Cup, Friendly) */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">تفکیک آمار ثبت شده توسط ادمین در تورنمنت‌ها:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-sport">
                  {recordTabs.map((tab) => {
                    const key = tab.id === 1 ? 'overall' : tab.id === 2 ? 'league' : tab.id === 3 ? 'cup' : 'friendly';
                    const tabStat = selectedPlayer.records_by_tab ? selectedPlayer.records_by_tab[key] : {};
                    const isCurrent = tab.id === selectedRecordType;

                    return (
                      <div 
                        key={tab.id}
                        className={`p-2.5 rounded-2xl border transition-all ${
                          isCurrent 
                            ? 'bg-cyan-950/70 border-cyan-500/60 shadow-[0_0_10px_rgba(0,243,255,0.2)]' 
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 block font-sans truncate">{tab.subtitle}</span>
                        <div className="mt-1 flex items-center justify-center gap-2 text-xs font-bold">
                          <span title="بازی">{tabStat?.matches_played || 0} 🎽</span>
                          <span className="text-emerald-400" title="گل">{tabStat?.goals || 0} ⚽</span>
                          <span className="text-amber-400" title="نمره">{tabStat?.avg_rating ? Number(tabStat.avg_rating).toFixed(1) : '-'} ★</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stat Badges Grid for Active Page */}
              {(() => {
                const currentStats = getActiveStats(selectedPlayer);
                return (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-sport">
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">تعداد بازی</span>
                      <span className="text-base font-black text-white">{currentStats.matches_played || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">گل‌ها</span>
                      <span className="text-base font-black text-[#00ff87]">{currentStats.goals || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">پاس گل</span>
                      <span className="text-base font-black text-cyan-300">{currentStats.assists || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/40">
                      <span className="text-[10px] text-amber-300 block font-sans">نمره ★</span>
                      <span className="text-base font-black text-amber-400">
                        {currentStats.avg_rating ? Number(currentStats.avg_rating).toFixed(1) : '---'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-yellow-950/40 border border-yellow-500/40">
                      <span className="text-[10px] text-yellow-300 block font-sans">کارت زرد</span>
                      <span className="text-base font-black text-yellow-400">{currentStats.yellow_cards || 0}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/40">
                      <span className="text-[10px] text-rose-300 block font-sans">کارت قرمز</span>
                      <span className="text-base font-black text-rose-400">{currentStats.red_cards || 0}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Market Value / Base Price Editor (Coach Management) */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2.5 text-xs shadow-inner">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <DollarSign size={15} className="text-emerald-400" />
                    <span>ارزش بازار و قیمت پایه بازیکن (مدیریت مربی):</span>
                  </span>
                  <span className="font-sport font-black text-emerald-400 text-sm dir-ltr">
                    ${Number(selectedPlayer.market_value || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={editMarketValueInput}
                      onChange={(e) => {
                        setEditMarketValueInput(e.target.value);
                        setMarketValueSuccessMsg('');
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-sport focus:outline-none focus:border-emerald-500"
                      placeholder="قیمت به دلار (مثلاً 1500000)"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={marketValueSaving || !editMarketValueInput}
                    onClick={async () => {
                      setMarketValueSaving(true);
                      setMarketValueSuccessMsg('');
                      try {
                        const res = await playerApi.updateMarketValue(selectedPlayer.id, editMarketValueInput);
                        selectedPlayer.market_value = res.data.market_value;
                        const targetInList = players.find(p => p.id === selectedPlayer.id);
                        if (targetInList) targetInList.market_value = res.data.market_value;
                        setMarketValueSuccessMsg('ارزش پایه بازیکن با موفقیت ثبت شد!');
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('vml_team_updated'));
                          window.dispatchEvent(new CustomEvent('vml_roster_updated'));
                        }
                      } catch (err) {
                        alert(err.response?.data?.error || 'خطا در بروزرسانی ارزش بازار بازیکن.');
                      } finally {
                        setMarketValueSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {marketValueSaving ? 'در حال ثبت...' : 'ذخیره قیمت'}
                  </button>
                </div>

                {marketValueSuccessMsg && (
                  <p className="text-[11px] text-emerald-400 font-bold text-center animate-pulse">
                    ✓ {marketValueSuccessMsg}
                  </p>
                )}
              </div>

              {/* Quick Actions (Heal, Recover, Level Boost) */}
              <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Zap size={14} className="text-yellow-400" />
                    <span>وضعیت آمادگی و مدیریت بازیکن:</span>
                  </span>
                  <span className="font-sport font-black text-cyan-400 dir-ltr">
                    STAMINA: {Math.round(Number(selectedPlayer.virtual_stamina || selectedPlayer.stamina || 100))}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedPlayer.is_injured ? (
                    <button
                      onClick={() => {
                        handleHealInjury(selectedPlayer.id, selectedPlayer.name);
                        setSelectedPlayer(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-pink-600 text-white flex items-center justify-center gap-1 shadow-lg hover:from-rose-500 hover:to-pink-500 cursor-pointer"
                    >
                      <HeartPulse size={14} />
                      <span>درمان فوری مصدومیت ({teamData?.injury_heal_cost || 25}💎)</span>
                    </button>
                  ) : Number(selectedPlayer.virtual_stamina || 100) < 100 ? (
                    <button
                      onClick={() => {
                        handleRecoverStamina(selectedPlayer.id, selectedPlayer.name);
                        setSelectedPlayer(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-600 to-blue-600 text-white flex items-center justify-center gap-1 shadow-lg hover:from-cyan-500 hover:to-blue-500 cursor-pointer"
                    >
                      <Zap size={14} />
                      <span>شارژ استقامت (10💎)</span>
                    </button>
                  ) : null}

                  {(selectedPlayer.level || 1) < 20 && (
                    <button
                      onClick={() => {
                        handleGemBoost(selectedPlayer.id, selectedPlayer.name, selectedPlayer.level || 1);
                        setSelectedPlayer(null);
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center gap-1 shadow-lg hover:from-purple-500 hover:to-indigo-500 cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>ارتقای لول ({selectedPlayer.next_level_gem_cost || 10}💎)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
