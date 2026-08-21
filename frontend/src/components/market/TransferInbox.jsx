import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, Check, X, ArrowRightLeft, Clock, AlertCircle, 
  Handshake, Users, Calendar, ShieldCheck, RefreshCw, Send, User,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Sparkles, Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import CounterOfferModal from './CounterOfferModal';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import ConfirmModal from '../common/ConfirmModal';

export default function TransferInbox({ teamData, onStatusMessage, onRefreshTeam }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'outgoing', 'negotiations', 'archive'
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState(null);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    offer: null,
    action: null,
    isCancelOutgoing: false,
  });

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = () => {
    setLoading(true);
    transferApi.getInbox()
      .then(res => setOffers(res.data || []))
      .catch(err => console.error('Failed to load inbox:', err))
      .finally(() => setLoading(false));
  };

  const handleAction = async (offerId, action) => {
    setActionInProgressId(offerId);
    try {
      await transferApi.actionOffer(offerId, action);
      const actionFa = action === 'accept' ? 'قبول پیشنهاد و نهایی‌سازی انتقال' : 'رد / لغو پیشنهاد';
      onStatusMessage(`${actionFa} با موفقیت انجام شد.`);
      loadInbox();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err) {
      onStatusMessage('خطا در انجام عملیات: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCounterSubmit = async (payload) => {
    try {
      await transferApi.createOffer(payload);
      onStatusMessage('پیشنهاد متقابل با موفقیت برای مربی تیم حریف ارسال شد! ⚡');
      setSelectedOfferForCounter(null);
      loadInbox();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err) {
      throw err;
    }
  };

  // Categorize offers cleanly
  const myTeamId = teamData?.id;

  const { incomingDirect, outgoingDirect, activeNegotiations, historyArchive } = useMemo(() => {
    const inc = [];
    const out = [];
    const neg = [];
    const arc = [];

    (offers || []).forEach(o => {
      const isPending = o.status === 'PENDING';
      const isCountered = o.status === 'COUNTERED';
      const isClosed = o.status === 'ACCEPTED' || o.status === 'REJECTED' || o.status === 'SUPERSEDED';

      if (isClosed) {
        arc.push(o);
      } else if (isCountered || (isPending && !!o.parent_offer)) {
        // Negotiation deal (Counter-offer in progress)
        neg.push(o);
      } else if (isPending && !o.parent_offer) {
        if (o.receiver_team === myTeamId) {
          inc.push(o);
        } else if (o.sender_team === myTeamId) {
          out.push(o);
        }
      }
    });

    return {
      incomingDirect: inc,
      outgoingDirect: out,
      activeNegotiations: neg,
      historyArchive: arc,
    };
  }, [offers, myTeamId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-sport tracking-wider text-slate-300">در حال دریافت صندوق پیشنهادات و مذاکرات...</span>
      </div>
    );
  }

  // Count of items requiring immediate attention
  const urgentCount = incomingDirect.length + activeNegotiations.filter(o => o.receiver_team === myTeamId && o.status === 'PENDING').length;

  return (
    <div className="space-y-4 font-sans dir-rtl">
      {/* Top Header & Sub-Tabs Switcher */}
      <div className="fc-card p-3 rounded-2xl border border-slate-700/60 bg-gradient-to-r from-[#080c14] via-[#0d162a] to-[#080c14] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 pr-1">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Inbox size={18} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-white">مرکز پیام‌ها و مذاکرات ترانسفر</h2>
            <span className="text-[10px] text-slate-400 font-sport">
              {urgentCount > 0 ? (
                <span className="text-amber-400 font-bold">{urgentCount} مورد نیازمند پاسخ شماست</span>
              ) : (
                'تمام مذاکرات بروز هستند'
              )}
            </span>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadInbox}
          className="self-end sm:self-center text-slate-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px] font-sport cursor-pointer"
          title="بروزرسانی"
        >
          <RefreshCw size={13} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {/* 3 Main Categories + Archive Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sport">
        {/* Tab 1: Incoming */}
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'incoming'
              ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,243,255,0.2)] font-black'
              : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowDownLeft size={15} className="text-cyan-400" />
            <span>پیشنهادات دریافتی (فروش)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
            incomingDirect.length > 0 ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-500'
          }`}>
            {incomingDirect.length}
          </span>
        </button>

        {/* Tab 2: Outgoing */}
        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'outgoing'
              ? 'bg-purple-950/80 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)] font-black'
              : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight size={15} className="text-purple-400" />
            <span>پیشنهادات ارسالی (خرید)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
            outgoingDirect.length > 0 ? 'bg-purple-500 text-white shadow' : 'bg-slate-800 text-slate-500'
          }`}>
            {outgoingDirect.length}
          </span>
        </button>

        {/* Tab 3: Negotiations */}
        <button
          type="button"
          onClick={() => setActiveTab('negotiations')}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'negotiations'
              ? 'bg-amber-950/80 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] font-black'
              : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={15} className="text-amber-400" />
            <span>مذاکرات در جریان (متقابل)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
            activeNegotiations.length > 0 ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-800 text-slate-500'
          }`}>
            {activeNegotiations.length}
          </span>
        </button>

        {/* Tab 4: Archive */}
        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
            activeTab === 'archive'
              ? 'bg-slate-800 border-slate-400 text-white shadow font-black'
              : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <span>بایگانی معاملات گذشته</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-500">
            {historyArchive.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: INCOMING OFFERS (پیشنهادات دریافتی برای فروش)       */}
      {/* ========================================================= */}
      {activeTab === 'incoming' && (
        <div className="space-y-3">
          {incomingDirect.length === 0 ? (
            <div className="fc-card p-10 text-center rounded-3xl border border-slate-800 text-slate-400 space-y-2">
              <Mail size={32} className="mx-auto text-cyan-400/40" />
              <p className="font-bold text-slate-300 text-xs">در حال حاضر پیشنهاد خرید جدیدی برای بازیکنان شما ثبت نشده است.</p>
              <p className="text-[11px] text-slate-500">پیشنهادات خریدی که مربیان دیگر ارسال کنند در این بخش نمایش داده می‌شوند.</p>
            </div>
          ) : (
            incomingDirect.map(offer => renderOfferCard(offer, 'INCOMING'))
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: OUTGOING OFFERS (پیشنهادات ارسالی شما برای خرید)    */}
      {/* ========================================================= */}
      {activeTab === 'outgoing' && (
        <div className="space-y-3">
          {outgoingDirect.length === 0 ? (
            <div className="fc-card p-10 text-center rounded-3xl border border-slate-800 text-slate-400 space-y-2">
              <Send size={32} className="mx-auto text-purple-400/40" />
              <p className="font-bold text-slate-300 text-xs">شما تاکنون پیشنهاد خریدی برای بازیکنان رقبا ارسال نکرده‌اید.</p>
              <p className="text-[11px] text-slate-500">از تب «بررسی رقبا» بازیکنان مدنظر خود را انتخاب و پیشنهاد رسمی ارسال فرمایید.</p>
            </div>
          ) : (
            outgoingDirect.map(offer => renderOfferCard(offer, 'OUTGOING'))
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: NEGOTIATIONS (مذاکرات در جریان و چانه‌زنی)            */}
      {/* ========================================================= */}
      {activeTab === 'negotiations' && (
        <div className="space-y-3">
          {activeNegotiations.length === 0 ? (
            <div className="fc-card p-10 text-center rounded-3xl border border-slate-800 text-slate-400 space-y-2">
              <ArrowRightLeft size={32} className="mx-auto text-amber-400/40" />
              <p className="font-bold text-slate-300 text-xs">مذاکره یا چانه‌زنی فعالی در جریان نیست.</p>
              <p className="text-[11px] text-slate-500">هنگامی که شما یا مربی حریف پیشنهاد متقابل ارسال کنید، روند مذاکره در اینجا پیگیری می‌شود.</p>
            </div>
          ) : (
            activeNegotiations.map(offer => renderOfferCard(offer, 'NEGOTIATION'))
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ARCHIVE (معاملات نهایی یا رد شده)                   */}
      {/* ========================================================= */}
      {activeTab === 'archive' && (
        <div className="space-y-3">
          {historyArchive.length === 0 ? (
            <div className="fc-card p-10 text-center rounded-3xl border border-slate-800 text-slate-400 text-xs">
              موردی در بایگانی موجود نیست.
            </div>
          ) : (
            historyArchive.map(offer => renderOfferCard(offer, 'ARCHIVE'))
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION DIALOG (MODAL)                               */}
      {/* ========================================================= */}
      {confirmDialog.isOpen && confirmDialog.offer && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={
            confirmDialog.action === 'accept'
              ? 'تأیید نهایی و انجام معامله'
              : confirmDialog.isCancelOutgoing
              ? 'لغو پیشنهاد ارسالی'
              : 'رد پیشنهاد'
          }
          message={
            confirmDialog.action === 'accept'
              ? `آیا از پذیرش این پیشنهاد و انجام نهایی انتقال «${confirmDialog.offer.target_player_name}» اطمینان دارید؟ مبالغ و بازیکنان فوراً جابه‌جا خواهند شد.`
              : confirmDialog.isCancelOutgoing
              ? `آیا از لغو این پیشنهاد ارسالی برای «${confirmDialog.offer.target_player_name}» اطمینان دارید؟`
              : `آیا از رد کردن پیشنهاد باشگاه «${confirmDialog.offer.sender_team_name}» برای بازیکن «${confirmDialog.offer.target_player_name}» اطمینان دارید؟`
          }
          details={
            <div className="space-y-1 font-sport text-xs">
              <div className="flex justify-between">
                <span>نوع معامله:</span>
                <span className="text-cyan-300 font-bold font-sans">
                  {confirmDialog.offer.offer_type === 'DIRECT_TRANSFER' ? 'خرید/فروش قطعی' : confirmDialog.offer.offer_type === 'SWAP' ? 'معاوضه' : 'انتقال قرضی'}
                </span>
              </div>
              {Number(confirmDialog.offer.cash_amount) > 0 && (
                <div className="flex justify-between">
                  <span>مبلغ نقدی:</span>
                  <span className="text-[#00ff87] font-black">${Number(confirmDialog.offer.cash_amount || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          }
          confirmText={
            confirmDialog.action === 'accept'
              ? 'بله، تایید و انجام معامله'
              : confirmDialog.isCancelOutgoing
              ? 'بله، لغو پیشنهاد'
              : 'بله، رد پیشنهاد'
          }
          cancelText="خیر، بازگشت"
          variant={confirmDialog.action === 'accept' ? 'success' : 'danger'}
          isLoading={actionInProgressId === confirmDialog.offer.id}
          onConfirm={() => {
            const { offer, action } = confirmDialog;
            setConfirmDialog({ isOpen: false, offer: null, action: null, isCancelOutgoing: false });
            handleAction(offer.id, action);
          }}
          onCancel={() => setConfirmDialog({ isOpen: false, offer: null, action: null, isCancelOutgoing: false })}
        />
      )}

      {/* ========================================================= */}
      {/* COUNTER-OFFER MODAL                                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedOfferForCounter && (
          <CounterOfferModal
            offer={selectedOfferForCounter}
            myTeam={teamData}
            onClose={() => setSelectedOfferForCounter(null)}
            onSubmitCounter={handleCounterSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );

  // Helper render function for each card
  function renderOfferCard(offer, contextType) {
    const isPending = offer.status === 'PENDING';
    const isMyTurnToDecide = isPending && offer.receiver_team === myTeamId;
    const isSeller = offer.seller_team_id === myTeamId || (offer.target_player && offer.target_player.team_id === myTeamId);

    return (
      <motion.div
        key={offer.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fc-card p-4 rounded-3xl border transition-all space-y-3 ${
          isMyTurnToDecide
            ? 'border-cyan-500/50 bg-gradient-to-b from-[#0b1426] via-[#080e1c] to-[#05080e] shadow-[0_0_25px_rgba(0,243,255,0.1)]'
            : 'border-slate-800 bg-[#080c14]'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          {/* Player & Teams details */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#05080e] shrink-0 flex items-center justify-center relative shadow">
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
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">{offer.target_player_name}</span>
                <span className="text-[10px] text-amber-300 font-sport bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                  OVR {offer.target_player_overall}
                </span>
                <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  {offer.target_player_position}
                </span>
              </div>

              <div className="text-[11px] text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  مبدأ (فروشنده): <strong className="text-cyan-300">{offer.seller_team_name || offer.receiver_team_name}</strong>
                </span>
                <span>➔</span>
                <span>
                  مقصد (خریدار): <strong className="text-[#00ff87]">{offer.buyer_team_name || offer.sender_team_name}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Role badge */}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
              isSeller ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300' : 'bg-purple-950/70 border-purple-500/40 text-purple-300'
            }`}>
              {isSeller ? 'نقش شما: فروشنده' : 'نقش شما: خریدار'}
            </span>

            {/* Status badge */}
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${
              isPending && isMyTurnToDecide
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                : isPending
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : offer.status === 'ACCEPTED'
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                : offer.status === 'COUNTERED'
                ? 'bg-purple-950/80 border-purple-400 text-purple-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
            }`}>
              {isPending && isMyTurnToDecide
                ? 'نوبت پاسخ شما ⏳'
                : isPending
                ? 'در انتظار پاسخ حریف ⏳'
                : offer.status === 'ACCEPTED'
                ? 'تأیید شده ✅'
                : offer.status === 'COUNTERED'
                ? 'پیشنهاد متقابل داده شد 🔄'
                : 'رد / لغو شده ❌'}
            </span>
          </div>
        </div>

        {/* Offer Details Box */}
        <div className="bg-[#05080e]/80 p-3 rounded-2xl border border-slate-800/80 text-xs space-y-1.5 font-sport">
          <div className="flex justify-between items-center text-slate-300">
            <span>نوع انتقال:</span>
            <span className="text-white font-bold font-sans">
              {offer.offer_type === 'DIRECT_TRANSFER' ? 'خرید/فروش قطعی نقدی' : offer.offer_type === 'SWAP' ? 'معاوضه بازیکن' : 'انتقال قرضی'}
            </span>
          </div>

          {Number(offer.cash_amount) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-300">مبلغ نقدی معامله (واریزی خریدار به فروشنده):</span>
              <span className="text-[#00ff87] font-black dir-ltr">${Number(offer.cash_amount).toLocaleString()}</span>
            </div>
          )}

          {offer.offer_type === 'LOAN' && (
            <div className="flex justify-between items-center text-cyan-300">
              <span>مدت زمان قرارداد قرضی:</span>
              <span className="font-bold">{offer.loan_duration_matches} مسابقه رسمی</span>
            </div>
          )}

          {offer.offer_type === 'SWAP' && offer.swap_players_details && offer.swap_players_details.length > 0 && (
            <div className="pt-1 border-t border-slate-800">
              <span className="text-slate-400 block mb-1">بازیکنان معاوضه‌ای (انتقال به تیم فروشنده):</span>
              <div className="flex flex-wrap gap-1.5">
                {offer.swap_players_details.map(sp => (
                  <span key={sp.id} className="inline-flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                    <Users size={12} className="text-cyan-400" />
                    <span>{sp.name}</span>
                    <span className="text-[10px] text-amber-300 font-sport">OVR {sp.overall}</span>
                    <span className="text-[9px] text-slate-400 font-sport">({sp.position})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons for Decision Maker */}
        {isMyTurnToDecide && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-sport">
            {/* 1. Accept */}
            <button
              onClick={() => setConfirmDialog({ isOpen: true, offer, action: 'accept', isCancelOutgoing: false })}
              disabled={actionInProgressId === offer.id}
              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check size={14} />
              <span>قبول و نهایی‌سازی</span>
            </button>

            {/* 2. Reject */}
            <button
              onClick={() => setConfirmDialog({ isOpen: true, offer, action: 'reject', isCancelOutgoing: false })}
              disabled={actionInProgressId === offer.id}
              className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <X size={14} />
              <span>رد پیشنهاد</span>
            </button>

            {/* 3. Counter Offer (فقط اگر فروشنده است یا طرفین در حال چانه‌زنی هستند) */}
            <button
              onClick={() => setSelectedOfferForCounter(offer)}
              disabled={actionInProgressId === offer.id}
              className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft size={14} />
              <span>ارسال پیشنهاد متقابل ⚡</span>
            </button>
          </div>
        )}

        {/* Cancel Button for Sender when waiting for opponent */}
        {isPending && !isMyTurnToDecide && offer.sender_team === myTeamId && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => setConfirmDialog({ isOpen: true, offer, action: 'reject', isCancelOutgoing: true })}
              disabled={actionInProgressId === offer.id}
              className="text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-sport flex items-center gap-1"
            >
              <X size={13} />
              <span>لغو پیشنهاد</span>
            </button>
          </div>
        )}
      </motion.div>
    );
  }
}
