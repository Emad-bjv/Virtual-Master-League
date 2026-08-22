import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRightLeft, Handshake, Users, Calendar, AlertCircle, DollarSign, Check, User } from 'lucide-react';
import { motion } from 'framer-motion';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import ConfirmModal from '../common/ConfirmModal';

/**
 * CounterOfferModal - Role-Locked for the SELLER (owner of target_player)
 * Allows the seller to specify requested cash and requested players from the BUYER's squad.
 */
export default function CounterOfferModal({ offer, myTeam, onClose, onSubmitCounter }) {
  useBodyScrollLock(true);

  if (!offer) return null;

  const [activeTab, setActiveTab] = useState(offer.offer_type || 'DIRECT_TRANSFER');
  const [cashAmount, setCashAmount] = useState(offer.cash_amount ? String(offer.cash_amount) : '');
  const [selectedSwapPlayers, setSelectedSwapPlayers] = useState(
    (offer.swap_players_details || []).map(p => p.id)
  );
  const [loanDuration, setLoanDuration] = useState(
    offer.loan_duration_matches ? String(offer.loan_duration_matches) : '10'
  );
  const [clientError, setClientError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

  // In counter-offer, the Buyer is the team that initiated the offer (sender_team of initial offer)
  // The Seller is myTeam (owner of target_player)
  const buyerTeamName = offer.sender_team_name;
  const buyerPlayers = offer.sender_players || [];

  const toggleSwapPlayer = (id) => {
    if (selectedSwapPlayers.includes(id)) {
      setSelectedSwapPlayers(selectedSwapPlayers.filter(pId => pId !== id));
    } else {
      if (selectedSwapPlayers.length >= 3) {
        setClientError('حداکثر می‌توانید ۳ بازیکن از تیم خریدار برای معاوضه انتخاب نمایید.');
        return;
      }
      setClientError('');
      setSelectedSwapPlayers([...selectedSwapPlayers, id]);
    }
  };

  const getSelectedPlayerDetails = (id) => {
    return (
      buyerPlayers.find(p => p.id === id) ||
      (offer.swap_players_details || []).find(p => p.id === id) ||
      { id, name: `بازیکن #${id}`, position: '-', overall: '-' }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setClientError('');

    const numCash = cashAmount ? parseFloat(cashAmount) : 0;
    if (numCash < 0) {
      setClientError('مبلغ درخواستی نمی‌تواند منفی باشد.');
      return;
    }

    if (activeTab === 'SWAP' && selectedSwapPlayers.length === 0 && numCash === 0) {
      setClientError('در حالت معاوضه، حداقل باید یک بازیکن از تیم خریدار انتخاب کنید یا مبلغ نقدی تعیین نمایید.');
      return;
    }

    const payload = {
      parent_offer: offer.id,
      sender_team_id: myTeam?.id,
      receiver_team_id: offer.sender_team, // Send counter-offer back to the buyer
      target_player_id: offer.target_player,
      offer_type: activeTab,
      cash_amount: numCash,
      swap_players: activeTab === 'SWAP' ? selectedSwapPlayers : [],
      loan_duration_matches: activeTab === 'LOAN' ? parseInt(loanDuration || 0) : 0,
    };
    setPendingPayload(payload);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingPayload) return;
    setIsSubmitting(true);
    try {
      await onSubmitCounter(pendingPayload);
      setShowConfirm(false);
    } catch (err) {
      setClientError(err.response?.data?.error || err.message || 'خطا در ارسال پیشنهاد متقابل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar glass-panel p-5 rounded-3xl border border-cyan-500/40 shadow-[0_0_35px_rgba(0,243,255,0.15)] relative my-auto bg-gradient-to-b from-[#0b1220] via-[#0d162a] to-[#070b14]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-xl hover:bg-slate-800"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-2xl overflow-hidden border border-cyan-500/40 bg-gradient-to-b from-[#0f172a] to-[#05080e] shrink-0 flex items-center justify-center relative shadow-md">
              {getPlayerPhotoUrl(offer.target_player_name) ? (
                <img
                  src={getPlayerPhotoUrl(offer.target_player_name)}
                  alt={offer.target_player_name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User size={22} className="text-cyan-400 opacity-80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <ArrowRightLeft size={14} className="text-cyan-400" />
                <h2 className="text-base font-black text-white tracking-tight">
                  مذاکره و تعیین شرایط فروش بازیکن
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-sport mt-1">
                <span className="text-white font-bold">{offer.target_player_name}</span>
                <span className="text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-500/30">OVR {offer.target_player_overall}</span>
                {offer.target_player_potential_ovr && offer.target_player_potential_ovr > offer.target_player_overall && (
                  <span className="text-cyan-300 font-bold bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-500/30">POT {offer.target_player_potential_ovr}</span>
                )}
                <span className="text-slate-400 font-sans">({offer.target_player_position})</span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-2 font-sport pt-0.5">
                <span>ارزش بازار: <strong className="text-[#00ff87]">${Number(offer.target_player_market_value || 1000000).toLocaleString()}</strong></span>
                <span>•</span>
                <span>➔ باشگاه خریدار: <strong className="text-cyan-300 font-sans">{buyerTeamName}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Role Notice */}
        <div className="mb-4 bg-cyan-950/40 border border-cyan-500/30 p-2.5 rounded-2xl text-[11px] text-cyan-200 flex items-center gap-2">
          <span>🛡️ <strong>نقش شما: فروشنده</strong> — شما تعیین می‌کنید که باشگاه خریدار چه مبلغی یا چه بازیکنی را باید به شما تحویل دهد.</span>
        </div>

        {/* Client Error Banner */}
        {clientError && (
          <div className="mb-4 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-2xl flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{clientError}</span>
          </div>
        )}

        {/* Offer Type Selection Tabs */}
        <div className="flex bg-[#05080e] p-1 rounded-2xl border border-slate-800 mb-5 font-sport text-xs font-bold">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'DIRECT_TRANSFER'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('DIRECT_TRANSFER')}
          >
            <Handshake size={14} />
            فروش نقدی
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'SWAP'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('SWAP')}
          >
            <Users size={14} />
            معاوضه با بازیکنان خریدار
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'LOAN'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('LOAN')}
          >
            <Calendar size={14} />
            توافق قرضی
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Direct Transfer Mode */}
          {activeTab === 'DIRECT_TRANSFER' && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-bold">
                مبلغ نقدی درخواستی شما از باشگاه {buyerTeamName} (دلار):
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-[#05080e] border border-slate-700/80 rounded-2xl py-3 pr-4 pl-10 text-white text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 dir-ltr font-mono"
                  placeholder="مبلغ موردنظر شما برای فروش قطعی"
                />
                <DollarSign className="absolute left-3 top-3 text-cyan-400" size={16} />
              </div>
              <p className="text-[10.5px] text-slate-400">
                💡 پیشنهاد قبلی خریدار:{' '}
                <strong className="text-amber-400 font-mono dir-ltr">
                  ${Number(offer.cash_amount || 0).toLocaleString()}
                </strong>
              </p>
            </div>
          )}

          {/* 2. Swap Mode */}
          {activeTab === 'SWAP' && (
            <div className="space-y-3">
              {/* Selected Players Badges Preview */}
              {selectedSwapPlayers.length > 0 && (
                <div className="bg-[#05080e]/90 p-2.5 rounded-2xl border border-cyan-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-300 font-bold">
                      بازیکنان انتخابی شما از تیم {buyerTeamName} ({selectedSwapPlayers.length} از ۳):
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSwapPlayers([])}
                      className="text-rose-400 hover:text-rose-300 text-[10px] cursor-pointer"
                    >
                      حذف همه
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSwapPlayers.map(id => {
                      const p = getSelectedPlayerDetails(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 bg-cyan-950 border border-cyan-400 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow"
                        >
                          <span>{p.name}</span>
                          <span className="text-[10px] text-amber-300 font-sport">OVR {p.overall}</span>
                          <button
                            type="button"
                            onClick={() => toggleSwapPlayer(id)}
                            className="text-slate-400 hover:text-rose-400 p-0.5 rounded-full cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List of Buyer's Players only */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">
                  انتخاب بازیکنان مدنظر شما از ترکیب باشگاه {buyerTeamName}:
                </label>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {buyerPlayers.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-[11px] bg-slate-900/50 rounded-xl">
                      بازیکنی از تیم خریدار یافت نشد.
                    </div>
                  ) : (
                    buyerPlayers.map((p) => {
                      const isSelected = selectedSwapPlayers.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleSwapPlayer(p.id)}
                          className={`flex justify-between items-center p-2.5 rounded-xl cursor-pointer border transition-all ${
                            isSelected
                              ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400'
                              : 'bg-[#05080e]/80 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700'
                            }`}>
                              {isSelected && <Check size={12} className="stroke-[3]" />}
                            </div>
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
                            <span className="text-xs font-bold">{p.name}</span>
                            <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              {p.position}
                            </span>
                          </div>
                          <div className="text-right text-[10px] font-sport">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs font-bold text-amber-300">OVR {p.overall}</span>
                              {p.potential_ovr && p.potential_ovr > p.overall && (
                                <span className="text-cyan-400 font-bold bg-cyan-950/70 px-1 rounded text-[9.5px]">POT {p.potential_ovr}</span>
                              )}
                            </div>
                            <span className="text-[#00ff87] text-[9.5px] block font-bold">${Number(p.market_value || 1000000).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="block text-slate-300 font-bold mb-1">
                  مبلغ نقدی درخواستی مازاد (اختیاری):
                </label>
                <input
                  type="number"
                  min="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-[#05080e] border border-slate-700/80 rounded-2xl py-2.5 pr-4 pl-4 text-white text-xs outline-none focus:border-cyan-400 dir-ltr font-mono"
                  placeholder="مبلغی که خریدار باید علاوه بر بازیکنان بپردازد (در صورت معاوضه سر به سر ۰ بگذارید)"
                />
              </div>
            </div>
          )}

          {/* 3. Loan Mode */}
          {activeTab === 'LOAN' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  مبلغ درخواستی برای اجاره قرضی (دلار):
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="w-full bg-[#05080e] border border-slate-700/80 rounded-2xl py-2.5 pr-4 pl-4 text-white text-xs outline-none focus:border-cyan-400 dir-ltr font-mono"
                  placeholder="مثلاً: 100000"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  مدت زمان واگذاری قرضی (تعداد بازی):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="38"
                  value={loanDuration}
                  onChange={(e) => setLoanDuration(e.target.value)}
                  className="w-full bg-[#05080e] border border-slate-700/80 rounded-2xl py-2.5 pr-4 pl-4 text-white text-xs outline-none focus:border-cyan-400 dir-ltr font-mono"
                  placeholder="مثلاً: 10 بازی"
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-bold text-xs cursor-pointer font-sport"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs font-sport"
            >
              <ArrowRightLeft size={15} />
              <span>{isSubmitting ? 'در حال ارسال...' : 'ارسال شرایط و پیشنهاد متقابل ⚡'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="تأیید ارسال پیشنهاد متقابل"
        message={`آیا از ارسال این شرایط جدید به باشگاه ${buyerTeamName} برای انتقال «${offer.target_player_name}» اطمینان دارید؟`}
        details={
          <div className="space-y-1 font-sport text-xs">
            <div className="flex justify-between">
              <span>نوع معامله:</span>
              <span className="text-cyan-300 font-bold font-sans">
                {activeTab === 'DIRECT_TRANSFER' ? 'فروش نقدی' : activeTab === 'SWAP' ? 'معاوضه با بازیکنان خریدار' : 'انتقال قرضی'}
              </span>
            </div>
            {pendingPayload?.cash_amount > 0 && (
              <div className="flex justify-between">
                <span>مبلغ دریافتی شما از خریدار:</span>
                <span className="text-[#00ff87] font-black">${pendingPayload.cash_amount.toLocaleString()}</span>
              </div>
            )}
            {activeTab === 'SWAP' && selectedSwapPlayers.length > 0 && (
              <div className="flex justify-between">
                <span>بازیکنان انتقالی به تیم شما:</span>
                <span className="text-amber-400 font-bold">{selectedSwapPlayers.length} بازیکن از {buyerTeamName}</span>
              </div>
            )}
            {activeTab === 'LOAN' && (
              <div className="flex justify-between">
                <span>مدت قرضی:</span>
                <span className="text-cyan-300 font-bold">{loanDuration} بازی</span>
              </div>
            )}
          </div>
        }
        confirmText="بله، ارسال شرایط جدید"
        cancelText="خیر، ویرایش"
        variant="info"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />
    </div>,
    document.body
  );
}
