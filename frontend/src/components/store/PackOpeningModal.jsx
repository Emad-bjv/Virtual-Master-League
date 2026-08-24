import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Trophy, Star, Shield, Zap, CheckCircle2,
  AlertCircle, X, Clock, Flame, ChevronRight, Gem, Coins, Award
} from 'lucide-react';
import { gachaApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';

import rareCardBg from '../../assets/cards/rare_card_bg.jpg';
import epicCardBg from '../../assets/cards/epic_card_bg.jpg';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.jpg';

export default function PackOpeningModal({
  pack,
  isOpen,
  onClose,
  onPlayerClaimed
}) {
  const { team, fetchTeam } = useTeam();

  // Modal flow steps: 'INITIAL' -> 'OPENING_ANIMATION' -> 'CARDS_REVEAL' -> 'PICKED_SUCCESS'
  const [step, setStep] = useState('INITIAL');
  const [paymentMethod, setPaymentMethod] = useState(
    pack?.purchase_method === 'DIRECT' ? 'DIRECT' : 'GEMS'
  );
  const [isOpening, setIsOpening] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Session data
  const [sessionId, setSessionId] = useState(null);
  const [cards, setCards] = useState([]);
  const [revealedCardIds, setRevealedCardIds] = useState([]);
  const [pickedPlayer, setPickedPlayer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (isOpen) {
      setStep('INITIAL');
      setPaymentMethod(pack?.purchase_method === 'DIRECT' ? 'DIRECT' : 'GEMS');
      setIsOpening(false);
      setIsPicking(false);
      setErrorMsg('');
      setSessionId(null);
      setCards([]);
      setRevealedCardIds([]);
      setPickedPlayer(null);
      setTimeLeft(300);
    }
  }, [isOpen, pack]);

  // Countdown timer for active session
  useEffect(() => {
    if (step !== 'CARDS_REVEAL' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (sessionId) {
            gachaApi.expireSession(sessionId).then(() => {
              if (fetchTeam) fetchTeam();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vml_team_updated'));
              }
            }).catch(() => {});
          }
          setErrorMsg('مهلت ۵ دقیقه‌ای انتخاب کارت به پایان رسید و کل هزینه پرداختی به موجودی باشگاه شما عودت داده شد.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft, sessionId]);

  if (!isOpen || !pack) return null;

  // Tier Theme Config with FUT Card Template Artworks
  const tierConfig = {
    BRONZE: {
      cardBg: rareCardBg,
      border: 'border-blue-500/50',
      glow: 'shadow-[0_0_40px_rgba(37,99,235,0.3)]',
      badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/40',
      accent: 'text-cyan-300',
      label: 'پک آبی کمیاب (Rare)'
    },
    SILVER: {
      cardBg: epicCardBg,
      border: 'border-purple-500/50',
      glow: 'shadow-[0_0_40px_rgba(168,85,247,0.35)]',
      badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/40',
      accent: 'text-purple-300',
      label: 'پک حماسی بنفش (Epic)'
    },
    LEGENDARY: {
      cardBg: legendaryCardBg,
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_45px_rgba(245,158,11,0.4)]',
      badgeBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black border-yellow-300',
      accent: 'text-yellow-300',
      label: 'پک اساطیر طلایی (Legendary)'
    }
  }[pack.tier || 'BRONZE'];

  const handleOpenPack = async () => {
    setIsOpening(true);
    setErrorMsg('');
    try {
      const res = await gachaApi.openPack({
        pack_id: pack.id,
        payment_method: paymentMethod
      });

      if (res.data?.success) {
        setSessionId(res.data.session_id);
        setCards(res.data.cards || []);
        setStep('OPENING_ANIMATION');

        setTimeout(() => {
          setStep('CARDS_REVEAL');
          setIsOpening(false);
          if (fetchTeam) fetchTeam();
        }, 1200);
      } else {
        setErrorMsg(res.data?.error || 'خطا در باز کردن پک');
        setIsOpening(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'خطا در برقراری ارتباط با سرور.');
      setIsOpening(false);
    }
  };

  const handleFlipCard = (cardId) => {
    if (!revealedCardIds.includes(cardId)) {
      setRevealedCardIds((prev) => [...prev, cardId]);
    }
  };

  const handleFlipAll = () => {
    setRevealedCardIds(cards.map((c) => c.id));
  };

  const handlePickCard = async (card) => {
    if (!sessionId) return;
    setIsPicking(true);
    setErrorMsg('');
    try {
      const res = await gachaApi.pickCard({
        session_id: sessionId,
        pack_player_id: card.id,
        player_id: card.id
      });

      if (res.data?.success) {
        setPickedPlayer(card);
        setStep('PICKED_SUCCESS');
        if (onPlayerClaimed) onPlayerClaimed(card);
        if (fetchTeam) fetchTeam();
      } else {
        setErrorMsg(res.data?.error || 'خطا در انتخاب بازیکن');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'خطا در افزودن بازیکن به ترکیب.');
    } finally {
      setIsPicking(false);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return typeof document !== 'undefined' && createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
    >
      <div className="fixed inset-0" onClick={onClose} />

      <AnimatePresence>
        <div
          className="fixed inset-0"
          onClick={() => {
            if (!isOpening && (step !== 'CARDS_REVEAL' || !isPicking)) {
              onClose();
            }
          }}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 my-auto w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 text-white p-5 sm:p-7 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${tierConfig.badgeBg}`}>
                {tierConfig.label}
              </span>
              <h2 className="text-lg sm:text-xl font-black font-sport tracking-wide text-white">
                {pack.name}
              </h2>
            </div>

            <button
              onClick={onClose}
              disabled={isOpening || (step === 'CARDS_REVEAL' && isPicking)}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2"
            >
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* =================================================================== */}
          {/* STEP 1: INITIAL OVERVIEW & PAYMENT SELECTION */}
          {/* =================================================================== */}
          {step === 'INITIAL' && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Pack Artwork & Cover */}
              <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
                <div
                  className="relative group w-52 h-76 sm:w-60 sm:h-88 rounded-[2rem] overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.9)] flex flex-col justify-between p-4"
                >
                  <img
                    src={pack.cover_image || tierConfig.cardBg}
                    alt={pack.name}
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Tier Tag */}
                  <div className="relative z-10 flex justify-between items-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${tierConfig.badgeBg}`}>
                      {tierConfig.label}
                    </span>
                    <Sparkles size={16} className={tierConfig.accent} />
                  </div>

                  {/* Center OVR Badge */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                    {pack.ovr_range_text ? (
                      <div className="px-3.5 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-xs font-black text-amber-300 font-sport shadow-2xl">
                        {pack.ovr_range_text}
                      </div>
                    ) : null}
                  </div>

                  {/* Bottom Title */}
                  <div className="relative z-10 text-center pb-1">
                    <span className="text-sm font-black text-white block drop-shadow-lg">{pack.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Pack Info & Purchase Method */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200">مشخصات و محتویات پک</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {pack.description || 'با باز کردن این پک، ۳ کارت باکیفیت به شما نمایش داده می‌شود و می‌توانید ۱ کارت را انتخاب کرده و به ترکیب خود اضافه کنید.'}
                  </p>
                </div>

                {pack.featured_team && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                    <Flame size={18} className="text-amber-400" />
                    <div>
                      <span className="text-[11px] text-slate-400 block">تیم منتخب پک</span>
                      <span className="text-xs font-bold text-amber-300">{pack.featured_team}</span>
                    </div>
                  </div>
                )}

                {/* Pool Status Badge */}
                <div className="flex items-center gap-3 text-xs bg-slate-900/60 p-3 rounded-2xl border border-white/10">
                  <div className="flex-1">
                    <span className="text-slate-400 text-[11px] block">موجودی بازیکنان باقیمانده:</span>
                    <span className="font-black text-sm text-cyan-300 font-sport">
                      {pack.unclaimed_players_count ?? pack.total_players_count} نفر
                    </span>
                  </div>
                  {pack.is_sold_out ? (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-900/80 text-rose-300 font-bold text-[11px] border border-rose-600">
                      ظرفیت تکمیل شده
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-900/80 text-emerald-300 font-bold text-[11px] border border-emerald-600">
                      موجود برای خرید
                    </span>
                  )}
                </div>

                {/* Payment Method Selector */}
                {pack.purchase_method === 'BOTH' && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400">روش پرداخت را انتخاب کنید:</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('GEMS')}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                          paymentMethod === 'GEMS'
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Gem size={18} className="text-cyan-400" />
                          <span className="text-xs font-bold">پرداخت با جم</span>
                        </div>
                        <span className="text-xs font-black font-sport">{pack.cost_gems} 💎</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DIRECT')}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer ${
                          paymentMethod === 'DIRECT'
                            ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Coins size={18} className="text-amber-400" />
                          <span className="text-xs font-bold">دلار مجازی</span>
                        </div>
                        <span className="text-xs font-black font-sport">${pack.cost_usd}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    disabled={pack.is_sold_out || isOpening}
                    onClick={handleOpenPack}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base font-sport tracking-wide shadow-[0_0_25px_rgba(245,158,11,0.5)] transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isOpening ? (
                      <span className="animate-pulse">در حال آماده‌سازی و باز کردن پک...</span>
                    ) : (
                      <>
                        <Sparkles size={20} className="animate-spin" />
                        <span>
                          باز کردن پک (
                          {paymentMethod === 'GEMS'
                            ? `${pack.cost_gems} جم`
                            : `$${pack.cost_usd} دلار`}
                          )
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2: OPENING ANIMATION PULSE */}
          {/* =================================================================== */}
          {step === 'OPENING_ANIMATION' && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  rotate: [0, 10, -10, 0],
                  filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.8)] border-4 border-white/60"
              >
                <Trophy size={64} className="text-white drop-shadow-lg" />
              </motion.div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">در حال گشودن پک...</h3>
                <p className="text-xs text-amber-300">۳ کارت شانس در حال بارگذاری هستند</p>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 3: 3 CARDS REVEAL & PICK 1 */}
          {/* =================================================================== */}
          {step === 'CARDS_REVEAL' && (
            <div className="mt-4 space-y-6">
              {/* Header Info & Timer */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className="text-slate-300">
                    روی هر کارت کلیک کنید تا بازیکن آشکار شود. سپس ۱ نفر را برای پیوستن به تیم انتخاب کنید.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold font-sport">
                    <Clock size={14} />
                    <span>{formatTimer(timeLeft)}</span>
                  </div>

                  {revealedCardIds.length < cards.length && (
                    <button
                      onClick={handleFlipAll}
                      className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      نمایش همه کارت‌ها
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Interactive Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {cards.map((card, index) => {
                  const isFlipped = revealedCardIds.includes(card.id);

                  return (
                    <div key={card.id} className="flex flex-col items-center">
                      {/* 3D Flip Card Container */}
                      <div
                        onClick={() => handleFlipCard(card.id)}
                        className="w-full max-w-[240px] h-[340px] cursor-pointer [perspective:1000px] group"
                      >
                        <motion.div
                          initial={false}
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                          className="relative w-full h-full [transform-style:preserve-3d] shadow-2xl rounded-3xl"
                        >
                          {/* ================= CARD BACK (Face Down) ================= */}
                          <div
                            className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-between p-4"
                            style={{
                              backgroundImage: `url(${tierConfig.cardBg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-black/30 to-transparent pointer-events-none" />

                            <div className="relative z-10 flex justify-between items-center text-[11px] font-bold text-white/90">
                              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
                                کارت #{index + 1}
                              </span>
                              <Sparkles size={16} className="text-yellow-400 animate-pulse" />
                            </div>

                            <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                              <motion.div
                                animate={{ scale: [1, 1.06, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-20 h-20 rounded-2xl bg-black/55 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center shadow-2xl"
                              >
                                <Sparkles size={30} className="text-yellow-400" />
                                <span className="text-[10px] font-black text-amber-200 mt-1 uppercase font-sport tracking-widest">VML</span>
                              </motion.div>
                            </div>

                            <div className="relative z-10 text-center pb-2">
                              <span className="text-xs font-black text-white block drop-shadow-md">برای مشاهده کلیک کنید</span>
                              <span className="text-[10px] text-amber-300 font-bold">آشکارسازی بازیکن</span>
                            </div>
                          </div>

                          {/* ================= CARD FRONT (Face Up) ================= */}
                          <div
                            className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-between p-3"
                            style={{
                              backgroundImage: `url(${tierConfig.cardBg})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            {/* Ambient subtle vignette to ensure crisp stats readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-black/20 pointer-events-none" />

                            {/* Card Top: OVR + Position Badge & Age */}
                            <div className="relative z-10 flex justify-between items-start pt-2 px-1">
                              <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-white/20 shadow-lg">
                                <span className="text-2xl font-black font-sport text-amber-300 leading-none drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
                                  {card.overall}
                                </span>
                                <span className="text-[11px] font-black text-cyan-300 dir-ltr uppercase tracking-wider font-sport mt-0.5">
                                  {card.position}
                                </span>
                              </div>

                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-slate-200">
                                سن: {card.age}
                              </span>
                            </div>

                            {/* Center Player Cutout / Photo Area */}
                            <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                              <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center relative">
                                {card.card_image || card.photo ? (
                                  <img
                                    src={card.card_image || card.photo}
                                    alt={card.name}
                                    className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-amber-300/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                    <Trophy size={48} className="text-yellow-400/90 drop-shadow-md" />
                                  </div>
                                )}
                              </div>

                              {/* Player Name Banner */}
                              <div className="mt-1 px-3.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/50 shadow-lg max-w-[210px]">
                                <h4 className="text-xs sm:text-sm font-black text-white text-center truncate tracking-wide font-sport">
                                  {card.name}
                                </h4>
                              </div>
                            </div>

                            {/* Card Footer Details */}
                            <div className="relative z-10 grid grid-cols-2 gap-1.5 text-[10.5px] bg-black/75 backdrop-blur-md p-2 rounded-2xl border border-white/20 text-slate-200">
                              <div className="text-center">
                                <span className="text-slate-400 block text-[9px]">استقامت (STA)</span>
                                <span className="font-black text-emerald-400 font-sport text-xs">{card.base_stamina}</span>
                              </div>
                              <div className="text-center border-r border-white/10">
                                <span className="text-slate-400 block text-[9px]">پتانسیل (POT)</span>
                                <span className="font-black text-amber-300 font-sport text-xs">{card.potential_ovr}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Pick Card Button */}
                      <div className="w-full max-w-[240px] mt-3">
                        <button
                          disabled={!isFlipped || isPicking}
                          onClick={() => handlePickCard(card)}
                          className={`w-full py-2.5 rounded-2xl font-bold text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg ${
                            isFlipped
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          {isPicking ? (
                            <span className="animate-pulse">در حال افزودن...</span>
                          ) : (
                            <>
                              <CheckCircle2 size={15} />
                              <span>{isFlipped ? 'انتخاب این بازیکن' : 'کارت را برگردانید'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 4: CELEBRATION & PLAYER CLAIMED */}
          {/* =================================================================== */}
          {step === 'PICKED_SUCCESS' && pickedPlayer && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 flex flex-col items-center justify-center text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.7)]">
                <Award size={36} className="text-slate-950" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-emerald-300 font-sport">
                  تبریک! بازیکن با موفقیت به ترکیب تیم اضافه شد
                </h3>
                <p className="text-xs text-slate-300">
                  بازیکن «{pickedPlayer.name}» هم‌اکنون در بخش مدیریت ترکیب و لیست بازیکنان تیم شما فعال است.
                </p>
              </div>

              {/* Showcase Borderless FUT Card */}
              <div
                className="relative w-60 h-84 rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)] flex flex-col justify-between p-3.5 my-2"
                style={{
                  backgroundImage: `url(${tierConfig.cardBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-black/20 pointer-events-none" />

                {/* Top Stat Badge */}
                <div className="relative z-10 flex justify-between items-start pt-1 px-1">
                  <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-white/20 shadow-lg">
                    <span className="text-2xl font-black font-sport text-amber-300 leading-none">
                      {pickedPlayer.overall}
                    </span>
                    <span className="text-[11px] font-black text-cyan-300 dir-ltr uppercase tracking-wider font-sport mt-0.5">
                      {pickedPlayer.position}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-slate-200">
                    سن: {pickedPlayer.age}
                  </span>
                </div>

                {/* Center Cutout & Name */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto">
                  <div className="w-28 h-28 flex items-center justify-center relative">
                    {pickedPlayer.card_image || pickedPlayer.photo ? (
                      <img
                        src={pickedPlayer.card_image || pickedPlayer.photo}
                        alt={pickedPlayer.name}
                        className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-300/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <Trophy size={48} className="text-yellow-400/90 drop-shadow-md" />
                      </div>
                    )}
                  </div>

                  <div className="mt-1 px-3.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/50 shadow-lg max-w-[210px]">
                    <h4 className="text-sm font-black text-white text-center truncate tracking-wide font-sport">
                      {pickedPlayer.name}
                    </h4>
                  </div>
                </div>

                {/* Card Footer Details */}
                <div className="relative z-10 grid grid-cols-2 gap-1.5 text-[10.5px] bg-black/75 backdrop-blur-md p-2 rounded-2xl border border-white/20 text-slate-200">
                  <div className="text-center">
                    <span className="text-slate-400 block text-[9px]">استقامت (STA)</span>
                    <span className="font-black text-emerald-400 font-sport text-xs">{pickedPlayer.base_stamina}</span>
                  </div>
                  <div className="text-center border-r border-white/10">
                    <span className="text-slate-400 block text-[9px]">پتانسیل (POT)</span>
                    <span className="font-black text-amber-300 font-sport text-xs">{pickedPlayer.potential_ovr || 99}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('vml_team_updated'));
                    window.dispatchEvent(new CustomEvent('vml_roster_updated'));
                  }
                }}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] transition cursor-pointer"
              >
                تایید و مشاهده در ترکیب تیم
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
