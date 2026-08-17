import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Handshake, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function MakeOfferModal({ player, targetTeam, myTeam, onClose, onSubmitOffer }) {
  useBodyScrollLock(true);

  const [activeTab, setActiveTab] = useState('DIRECT_TRANSFER');
  const [cashAmount, setCashAmount] = useState('');
  const [selectedSwapPlayers, setSelectedSwapPlayers] = useState([]);
  const [loanDuration, setLoanDuration] = useState('');

  if (!player) return null;

  const toggleSwapPlayer = (id) => {
    if (selectedSwapPlayers.includes(id)) {
      setSelectedSwapPlayers(selectedSwapPlayers.filter(pId => pId !== id));
    } else {
      if (selectedSwapPlayers.length >= 3) return; // Max 3 players for swap
      setSelectedSwapPlayers([...selectedSwapPlayers, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      target_player_id: player.id,
      receiver_team_id: targetTeam.id,
      offer_type: activeTab,
      cash_amount: cashAmount ? parseFloat(cashAmount) : 0,
      swap_players: activeTab === 'SWAP' ? selectedSwapPlayers : [],
      loan_duration_matches: activeTab === 'LOAN' ? parseInt(loanDuration) : 0,
    };
    onSubmitOffer(payload);
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar glass-panel p-5 rounded-2xl border border-indigo-500/30 shadow-2xl relative my-auto"
      >
        <button onClick={onClose} className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-lg font-black text-white mb-1">پیشنهاد رسمی به تیم {targetTeam.name}</h2>
        <p className="text-xs text-slate-400 mb-5">برای جذب {player.name} (OVR {player.overall})</p>

        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 mb-5">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'DIRECT_TRANSFER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('DIRECT_TRANSFER')}
          >
            <Handshake size={14} />
            خرید قطعی
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'SWAP' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('SWAP')}
          >
            <Users size={14} />
            معاوضه
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'LOAN' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('LOAN')}
          >
            <Calendar size={14} />
            قرضی
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {activeTab === 'DIRECT_TRANSFER' && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">مبلغ پیشنهادی (دلار مجازی)</label>
              <input 
                type="number" 
                required 
                value={cashAmount} 
                onChange={e => setCashAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 dir-ltr"
                placeholder="مثلاً: 250000"
              />
              <p className="text-[10px] text-cyan-400 mt-1">* بودجه فعلی شما: {Number(myTeam?.budget || 0).toLocaleString()} دلار</p>
            </div>
          )}

          {activeTab === 'SWAP' && (
            <div className="space-y-3">
              <label className="block text-slate-300 font-bold">انتخاب بازیکنان برای معاوضه (حداکثر ۳ نفر)</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                {(myTeam?.players || []).map(p => (
                  <div 
                    key={p.id}
                    onClick={() => toggleSwapPlayer(p.id)}
                    className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${selectedSwapPlayers.includes(p.id) ? 'bg-indigo-900/50 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'}`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] opacity-70">{p.position} | OVR {p.overall}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <label className="block text-slate-300 font-bold mb-2">مبلغ نقدی مکمل (اختیاری)</label>
                <input 
                  type="number" 
                  value={cashAmount} 
                  onChange={e => setCashAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 dir-ltr"
                  placeholder="در صورت معاوضه سر به سر خالی بگذارید"
                />
              </div>
            </div>
          )}

          {activeTab === 'LOAN' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-2">مبلغ انتقال قرضی (دلار)</label>
                <input 
                  type="number" 
                  required
                  value={cashAmount} 
                  onChange={e => setCashAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 dir-ltr"
                  placeholder="مبلغی که بابت قرض به باشگاه مقابل می‌پردازید"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-2">مدت زمان (تعداد بازی)</label>
                <input 
                  type="number" 
                  required
                  value={loanDuration} 
                  onChange={e => setLoanDuration(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 dir-ltr"
                  placeholder="مثلاً: 15"
                />
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800">
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
            >
              ارسال پیشنهاد رسمی
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
