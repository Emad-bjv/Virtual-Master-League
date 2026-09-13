import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, Shield, User, AlertCircle, Check } from 'lucide-react';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import { isPlayerCompatibleWithPosition, isPlayerExactPosition } from './EFootballGamePlan';

export default function PlayerSlotSelectModal({
  isOpen = false,
  onClose,
  targetSlot = null,
  availablePlayers = [],
  onSelectPlayer,
}) {
  const [search, setSearch] = useState('');

  const targetPos = targetSlot?.pos || 'CMF';

  // Sort and group players by compatibility for this slot
  const sortedPlayers = useMemo(() => {
    const list = (availablePlayers || []).filter((p) => {
      if (!p) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = String(p.name || '').toLowerCase();
      const pos = String(p.position || '').toLowerCase();
      return name.includes(q) || pos.includes(q);
    });

    return list.sort((a, b) => {
      const aExact = isPlayerExactPosition(a, targetPos);
      const bExact = isPlayerExactPosition(b, targetPos);
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aCompat = isPlayerCompatibleWithPosition(a, targetPos);
      const bCompat = isPlayerCompatibleWithPosition(b, targetPos);
      if (aCompat && !bCompat) return -1;
      if (!aCompat && bCompat) return 1;

      // Higher overall first
      return (b.overall || 0) - (a.overall || 0);
    });
  }, [availablePlayers, targetPos, search]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="fixed inset-0" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl my-auto p-5 shadow-2xl text-slate-100 dir-rtl"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 font-black font-sport text-xs">
                    {targetPos}
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-black text-white m-0">
                    انتخاب بازیکن برای پست {targetPos}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    بازیکنان تخصصی و سازگار با این پست در ابتدای لیست قرار دارند.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="my-3 relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی بازیکن در لیست تیم..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Players List */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
              {sortedPlayers.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  بازیکنی برای انتخاب یافت نشد.
                </div>
              ) : (
                sortedPlayers.map((p) => {
                  const isExact = isPlayerExactPosition(p, targetPos);
                  const isCompat = isPlayerCompatibleWithPosition(p, targetPos);
                  const photo = getPlayerPhotoUrl(p);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectPlayer(p);
                        onClose();
                      }}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isExact
                          ? 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-950/50 hover:border-emerald-400'
                          : isCompat
                          ? 'bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/40 hover:border-cyan-400'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {photo ? (
                            <img src={photo} alt={p.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <User size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {isExact && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title="پست تخصصی">
                                <Star size={12} fill="#f59e0b" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>پست اصلی: <strong className="text-slate-200">{p.naturalPosition || p.position}</strong></span>
                            {isExact ? (
                              <span className="text-emerald-400 font-bold">تخصصی ⭐</span>
                            ) : isCompat ? (
                              <span className="text-cyan-400 font-bold">سازگار ✓</span>
                            ) : (
                              <span className="text-amber-400">غیرتخصصی ⚠️</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-black font-sport text-amber-300">
                            {p.overall || 75}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sport leading-none">OVR</span>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
                        >
                          انتخاب
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
