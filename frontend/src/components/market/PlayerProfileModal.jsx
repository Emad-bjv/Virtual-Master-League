import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Activity, DollarSign, Crosshair, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function PlayerProfileModal({ player, team, onClose, onMakeOffer }) {
  useBodyScrollLock(true);

  if (!player) return null;

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar glass-panel p-5 rounded-2xl border border-cyan-500/30 shadow-2xl relative my-auto"
      >
        <button onClick={onClose} className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full p-1 mb-3">
            <div className="w-full h-full bg-slate-900 rounded-full flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-cyan-400 leading-none">{player.overall}</span>
              {player.potential_ovr && (
                <span className="text-[10px] text-amber-400 font-bold leading-none mt-0.5">POT: {player.potential_ovr}</span>
              )}
            </div>
          </div>
          <h2 className="text-xl font-black text-white">{player.name}</h2>
          <span className="text-sm text-cyan-400 font-bold">{player.position}</span>
          <span className="text-[11px] text-slate-400 mt-1">تیم فعلی: {team?.name || 'بازیکن آزاد'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
            <User className="text-purple-400" size={16} />
            <div>
              <span className="block text-[10px] text-slate-400">سن / پتانسیل</span>
              <span className="block text-xs font-bold text-white">{player.age || 25} سال {player.potential_ovr ? `(پتانسیل ${player.potential_ovr})` : ''}</span>
            </div>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-400" size={16} />
            <div>
              <span className="block text-[10px] text-slate-400">دستمزد هفتگی</span>
              <span className="block text-xs font-bold text-white dir-ltr">{Number(player.wage || 0).toLocaleString()} €</span>
            </div>
          </div>
          <div className="col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
            <Crosshair className="text-amber-400" size={16} />
            <div>
              <span className="block text-[10px] text-slate-400">ارزش پایه بازار (Market Value)</span>
              <span className="block text-sm font-black text-emerald-400 dir-ltr">{Number(player.market_value || player.wage * 50 || 1000000).toLocaleString()} €</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onMakeOffer(player, team)}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all flex items-center justify-center gap-2"
        >
          <ArrowRightLeft size={16} />
          ارائه پیشنهاد رسمی
        </button>
      </motion.div>
    </div>,
    document.body
  );
}
