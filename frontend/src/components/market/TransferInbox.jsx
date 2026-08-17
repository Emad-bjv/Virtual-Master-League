import React, { useState, useEffect } from 'react';
import { Mail, Check, X, ArrowRightLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { transferApi } from '../../services/api';

export default function TransferInbox({ teamData, onStatusMessage }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = () => {
    setLoading(true);
    transferApi.getInbox()
      .then(res => setOffers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleAction = async (offerId, action) => {
    try {
      await transferApi.actionOffer(offerId, action);
      onStatusMessage(`عملیات ${action === 'accept' ? 'قبول' : 'رد'} با موفقیت انجام شد.`);
      loadInbox();
    } catch (err) {
      onStatusMessage('خطا در انجام عملیات: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-cyan-400">در حال دریافت پیام‌ها...</div>;
  }

  const incomingOffers = offers.filter(o => o.receiver_team === teamData?.id);
  const outgoingOffers = offers.filter(o => o.sender_team === teamData?.id);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Mail size={16} className="text-cyan-400" />
          <span className="font-bold text-white text-xs">صندوق ورودی (پیشنهادات دریافتی)</span>
        </div>

        <div className="space-y-3">
          {incomingOffers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">هیچ پیشنهادی دریافت نکرده‌اید.</div>
          ) : (
            incomingOffers.map(offer => (
              <div key={offer.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      پیشنهاد برای: <span className="text-cyan-400">{offer.target_player_name}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">از طرف: {offer.sender_team_name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${
                    offer.status === 'PENDING' ? 'bg-amber-900/50 border-amber-500 text-amber-400' :
                    offer.status === 'ACCEPTED' ? 'bg-green-900/50 border-green-500 text-green-400' :
                    'bg-rose-900/50 border-rose-500 text-rose-400'
                  }`}>
                    {offer.status === 'PENDING' ? 'در انتظار تصمیم' : offer.status === 'ACCEPTED' ? 'تایید شده' : 'رد شده'}
                  </span>
                </div>

                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                  {offer.offer_type === 'DIRECT_TRANSFER' && <p>نوع: <strong>خرید قطعی</strong> | مبلغ: <strong className="text-amber-400 dir-ltr">{Number(offer.cash_amount).toLocaleString()} $</strong></p>}
                  {offer.offer_type === 'LOAN' && <p>نوع: <strong>قرضی</strong> | مدت: <strong>{offer.loan_duration_matches} بازی</strong> | مبلغ: <strong className="text-amber-400 dir-ltr">{Number(offer.cash_amount).toLocaleString()} $</strong></p>}
                  {offer.offer_type === 'SWAP' && (
                    <div>
                      <p>نوع: <strong>معاوضه</strong> | پول نقد: <strong className="text-amber-400 dir-ltr">{Number(offer.cash_amount).toLocaleString()} $</strong></p>
                      <p className="mt-1">بازیکنان پیشنهادی: {offer.swap_players_details.map(p => p.name).join('، ') || 'ندارد'}</p>
                    </div>
                  )}
                </div>

                {offer.status === 'PENDING' && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleAction(offer.id, 'accept')} className="flex-1 bg-green-600/20 hover:bg-green-600 border border-green-600 text-green-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1">
                      <Check size={12} /> قبول پیشنهاد
                    </button>
                    <button onClick={() => handleAction(offer.id, 'reject')} className="flex-1 bg-rose-600/20 hover:bg-rose-600 border border-rose-600 text-rose-400 hover:text-white py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1">
                      <X size={12} /> رد پیشنهاد
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <ArrowRightLeft size={16} className="text-purple-400" />
          <span className="font-bold text-white text-xs">صندوق خروجی (ارسال شده‌ها)</span>
        </div>
        
        <div className="space-y-2">
          {outgoingOffers.length === 0 ? (
            <div className="py-4 text-center text-slate-500 text-[10px]">هیچ پیشنهادی ارسال نکرده‌اید.</div>
          ) : (
            outgoingOffers.map(offer => (
              <div key={offer.id} className="p-2.5 bg-slate-900/40 rounded-xl border border-slate-800 flex justify-between items-center text-[10px]">
                <div>
                  <span className="text-slate-300">ارسال به {offer.receiver_team_name} برای <strong className="text-white">{offer.target_player_name}</strong></span>
                </div>
                <span className={`px-1.5 py-0.5 rounded ${
                  offer.status === 'PENDING' ? 'text-amber-500' :
                  offer.status === 'ACCEPTED' ? 'text-green-500' : 'text-rose-500'
                }`}>
                  {offer.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
