import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Handshake, Users, Calendar, AlertCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import ConfirmModal from '../common/ConfirmModal';
import { formatWithCommas, makeFormattedChangeHandler } from '../../utils/formatNumber';

export default function MakeOfferModal({ player, targetTeam, myTeam, onClose, onSubmitOffer }) {
  useBodyScrollLock(true);

  const [activeTab, setActiveTab] = useState('DIRECT_TRANSFER');
  const [cashAmount, setCashAmount] = useState('');
  const [selectedSwapPlayers, setSelectedSwapPlayers] = useState([]);
  const [loanDuration, setLoanDuration] = useState('');
  const [clientError, setClientError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

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
    setClientError('');

    // Check if offering to own team
    if (myTeam && targetTeam && myTeam.id === targetTeam.id) {
      setClientError('امکان ارسال پیشنهاد برای بازیکنان تیم خودتان وجود ندارد.');
      return;
    }

    const numCash = cashAmount ? parseFloat(String(cashAmount).replace(/,/g, '')) : 0;
    if (numCash < 0) {
      setClientError('مبلغ پیشنهادی نمی‌تواند منفی باشد.');
      return;
    }

    if (myTeam && (activeTab === 'DIRECT_TRANSFER' || activeTab === 'LOAN') && numCash > Number(myTeam.budget || 0)) {
      setClientError(`مبلغ پیشنهادی (${numCash.toLocaleString()} $) بیش از بودجه موجود باشگاه شما (${Number(myTeam.budget || 0).toLocaleString()} $) است.`);
      return;
    }

    const payload = {
      sender_team_id: myTeam?.id,
      target_player_id: player.id,
      player_id: player.id,
      receiver_team_id: targetTeam.id,
      offer_type: activeTab,
      cash_amount: numCash,
      swap_players: activeTab === 'SWAP' ? selectedSwapPlayers : [],
      loan_duration_matches: activeTab === 'LOAN' ? parseInt(loanDuration || 0) : 0,
    };
    setPendingPayload(payload);
    setShowConfirm(true);
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar glass-panel p-5 rounded-2xl border border-indigo-500/30 shadow-2xl relative my-auto"
      >
        <button onClick={onClose} className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-14 h-16 rounded-2xl overflow-hidden border border-indigo-500/40 bg-gradient-to-b from-[#0f172a] to-[#05080e] shrink-0 flex items-center justify-center relative shadow-md">
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
              <User size={24} className="text-indigo-400 opacity-80" />
            )}
          </div>
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-black text-white">پیشنهاد رسمی به تیم {targetTeam.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-sport">
              <span className="text-white font-bold">{player.name}</span>
              <span className="text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-500/30">OVR {player.overall}</span>
              {player.potential_ovr && player.potential_ovr > player.overall && (
                <span className="text-cyan-300 font-bold bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-500/30">POT {player.potential_ovr}</span>
              )}
              <span className="text-slate-400 font-sans">({player.position})</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-2 font-sport pt-0.5">
              <span>ارزش بازار: <strong className="text-[#00ff87]">${Number(player.market_value || 1000000).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {clientError && (
          <div className="mb-4 bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{clientError}</span>
          </div>
        )}

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
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatWithCommas(cashAmount)}
                  onChange={makeFormattedChangeHandler(setCashAmount)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-7 text-white outline-none focus:border-indigo-500 dir-ltr font-mono tracking-wider"
                  placeholder="250,000"
                />
              </div>
              <p className="text-[10px] text-cyan-400 mt-1">* بودجه فعلی شما: <strong className="font-mono">{Number(myTeam?.budget || 0).toLocaleString('en-US')}</strong> دلار</p>
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
                    className={`flex justify-between items-center p-2 rounded-xl cursor-pointer border transition-colors ${selectedSwapPlayers.includes(p.id) ? 'bg-indigo-900/50 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-700 bg-[#05080e] shrink-0 flex items-center justify-center relative">
                        {getPlayerPhotoUrl(p) ? (
                          <img
                            src={getPlayerPhotoUrl(p)}
                            alt={p.name}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User size={14} className="text-slate-500" />
                        )}
                      </div>
                      <span className="font-bold">{p.name}</span>
                    </div>
                    <div className="text-right text-[10px] font-sport">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-amber-300 font-bold">{p.position} • OVR {p.overall}</span>
                        {p.potential_ovr && p.potential_ovr > p.overall && (
                          <span className="text-cyan-400 font-bold bg-cyan-950/70 px-1 rounded">POT {p.potential_ovr}</span>
                        )}
                      </div>
                      <span className="text-[#00ff87] text-[9.5px] block font-bold">${Number(p.market_value || 1000000).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <label className="block text-slate-300 font-bold mb-2">مبلغ نقدی مکمل (اختیاری)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatWithCommas(cashAmount)}
                    onChange={makeFormattedChangeHandler(setCashAmount)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-7 text-white outline-none focus:border-indigo-500 dir-ltr font-mono tracking-wider"
                    placeholder="در صورت معاوضه سر به سر خالی بگذارید"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LOAN' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-2">مبلغ انتقال قرضی (دلار)</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatWithCommas(cashAmount)}
                    onChange={makeFormattedChangeHandler(setCashAmount)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-7 text-white outline-none focus:border-indigo-500 dir-ltr font-mono tracking-wider"
                    placeholder="مبلغی که بابت قرض به باشگاه مقابل می‌پردازید"
                  />
                </div>
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all cursor-pointer font-sport"
            >
              ارسال پیشنهاد رسمی
            </button>
          </div>
        </form>
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="تأیید ارسال پیشنهاد رسمی"
        message={`آیا از ارسال این پیشنهاد رسمی به باشگاه ${targetTeam?.name} برای جذب «${player?.name}» اطمینان دارید؟`}
        details={
          <div className="space-y-1 font-sport text-xs">
            <div className="flex justify-between">
              <span>نوع پیشنهاد:</span>
              <span className="text-indigo-300 font-bold font-sans">
                {activeTab === 'DIRECT_TRANSFER' ? 'خرید قطعی' : activeTab === 'SWAP' ? 'معاوضه' : 'قرضی'}
              </span>
            </div>
            {pendingPayload?.cash_amount > 0 && (
              <div className="flex justify-between">
                <span>مبلغ پیشنهادی:</span>
                <span className="text-[#00ff87] font-black">${pendingPayload.cash_amount.toLocaleString()}</span>
              </div>
            )}
            {activeTab === 'SWAP' && selectedSwapPlayers.length > 0 && (
              <div className="flex justify-between">
                <span>تعداد بازیکن معاوضه:</span>
                <span className="text-amber-400 font-bold">{selectedSwapPlayers.length} بازیکن</span>
              </div>
            )}
            {activeTab === 'LOAN' && (
              <div className="flex justify-between">
                <span>مدت قرض:</span>
                <span className="text-cyan-300 font-bold">{loanDuration} مسابقه</span>
              </div>
            )}
          </div>
        }
        confirmText="بله، ارسال پیشنهاد"
        cancelText="خیر، ویرایش"
        variant="info"
        onConfirm={() => {
          setShowConfirm(false);
          if (pendingPayload) {
            onSubmitOffer(pendingPayload);
          }
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>,
    document.body
  );
}
