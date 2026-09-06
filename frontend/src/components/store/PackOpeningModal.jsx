import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Trophy, Star, Shield, Zap, CheckCircle2,
  AlertCircle, X, Clock, Flame, ChevronRight, Gem, Coins, Award, Globe,
  Volume2, VolumeX, FastForward, ArrowRight, Flag
} from 'lucide-react';
import { gachaApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import { packAudio } from '../../services/packAudio';
import { getNationalityFlag } from '../../utils/nationalityFlags';

import rareCardBg from '../../assets/cards/rare_card_bg.png';
import epicCardBg from '../../assets/cards/epic_card_bg.png';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.png';

export default function PackOpeningModal({
  pack,
  isOpen,
  onClose,
  onPlayerClaimed
}) {
  const { team, fetchTeam } = useTeam();

  // Modal flow steps: 'INITIAL' -> 'FC26_CINEMATIC' -> 'CARDS_REVEAL' -> 'PICKED_SUCCESS'
  const [step, setStep] = useState('INITIAL');
  const [paymentMethod, setPaymentMethod] = useState(
    pack?.purchase_method === 'DIRECT' ? 'DIRECT' : 'GEMS'
  );
  const [isOpening, setIsOpening] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // FC 26 Walkout Cinematic State
  // walkoutStage: 'POSITION' -> 'OVR' -> 'NATIONALITY' -> 'CARD_SLAM'
  const [walkoutStage, setWalkoutStage] = useState('POSITION');
  const [topCard, setTopCard] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(packAudio.isMuted);
  const stageTimerRef = useRef(null);

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
      setTopCard(null);
      setWalkoutStage('POSITION');
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
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
  }, [step, timeLeft, sessionId, fetchTeam]);

  // Cinematic FC 26 Walkout Stage Progression
  useEffect(() => {
    if (step !== 'FC26_CINEMATIC' || !topCard) return;

    if (walkoutStage === 'POSITION') {
      packAudio.playPositionSlam();
      stageTimerRef.current = setTimeout(() => {
        setWalkoutStage('OVR');
      }, 1250);
    } else if (walkoutStage === 'OVR') {
      packAudio.playOvrImpact();
      stageTimerRef.current = setTimeout(() => {
        setWalkoutStage('NATIONALITY');
      }, 1250);
    } else if (walkoutStage === 'NATIONALITY') {
      packAudio.playNationalityFanfare();
      stageTimerRef.current = setTimeout(() => {
        setWalkoutStage('CARD_SLAM');
      }, 1250);
    } else if (walkoutStage === 'CARD_SLAM') {
      packAudio.playCardDropExplosion();
    }

    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    };
  }, [step, walkoutStage, topCard]);

  if (!isOpen || !pack) return null;

  // Tier Theme Config with FUT Card Template Artworks & Color Grading
  const tierConfig = {
    BRONZE: {
      cardBg: rareCardBg,
      border: 'border-blue-500/50',
      glow: 'shadow-[0_0_40px_rgba(37,99,235,0.4)]',
      dropGlow: 'drop-shadow-[0_0_25px_rgba(37,99,235,0.55)]',
      badgeBg: 'bg-blue-950 text-blue-300 border-blue-500/40',
      accent: 'text-cyan-300',
      ovrColor: 'text-cyan-300',
      label: 'پک آبی کمیاب (Rare)',
      backlightRadial: 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 70%)',
      neonPill: 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.5)]',
      laserColor: 'from-cyan-500/40 via-blue-500/20 to-transparent'
    },
    SILVER: {
      cardBg: epicCardBg,
      border: 'border-purple-500/50',
      glow: 'shadow-[0_0_40px_rgba(168,85,247,0.45)]',
      dropGlow: 'drop-shadow-[0_0_25px_rgba(168,85,247,0.55)]',
      badgeBg: 'bg-purple-950 text-purple-300 border-purple-500/40',
      accent: 'text-purple-300',
      ovrColor: 'text-fuchsia-300',
      label: 'پک حماسی بنفش (Epic)',
      backlightRadial: 'radial-gradient(circle, rgba(192,132,252,0.5) 0%, transparent 70%)',
      neonPill: 'border-fuchsia-400 bg-fuchsia-950/80 text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.5)]',
      laserColor: 'from-fuchsia-500/40 via-purple-500/20 to-transparent'
    },
    LEGENDARY: {
      cardBg: legendaryCardBg,
      border: 'border-amber-500/50',
      glow: 'shadow-[0_0_55px_rgba(245,158,11,0.55)]',
      dropGlow: 'drop-shadow-[0_0_30px_rgba(245,158,11,0.65)]',
      badgeBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black border-yellow-300',
      accent: 'text-yellow-300',
      ovrColor: 'text-amber-300',
      label: 'پک اساطیر طلایی (Legendary)',
      backlightRadial: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
      neonPill: 'border-amber-400 bg-amber-950/80 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.6)]',
      laserColor: 'from-amber-500/40 via-yellow-500/20 to-transparent'
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
        const receivedCards = res.data.cards || [];
        setSessionId(res.data.session_id);
        setCards(receivedCards);

        // Find the top card (highest overall rating) for the FC 26 walkout cinematic
        const bestCard = receivedCards.reduce(
          (max, c) => ((c.overall || 0) > (max?.overall || 0) ? c : max),
          receivedCards[0] || null
        );
        setTopCard(bestCard);

        // Audio tension riser & cinematic trigger
        packAudio.playTensionRiser(0.7);
        setWalkoutStage('POSITION');
        setStep('FC26_CINEMATIC');
        setIsOpening(false);
        if (fetchTeam) fetchTeam();
      } else {
        setErrorMsg(res.data?.error || 'خطا در باز کردن پک');
        setIsOpening(false);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'خطا در برقراری ارتباط با سرور.');
      setIsOpening(false);
    }
  };

  const handleFastForwardWalkout = () => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    if (walkoutStage === 'POSITION') {
      setWalkoutStage('OVR');
    } else if (walkoutStage === 'OVR') {
      setWalkoutStage('NATIONALITY');
    } else if (walkoutStage === 'NATIONALITY') {
      setWalkoutStage('CARD_SLAM');
    } else if (walkoutStage === 'CARD_SLAM') {
      handleSkipCinematic();
    }
  };

  const handleSkipCinematic = () => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    setStep('CARDS_REVEAL');
  };

  const handleToggleAudio = (e) => {
    if (e) e.stopPropagation();
    const muted = packAudio.toggleMute();
    setIsAudioMuted(muted);
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
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-y-auto"
      style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
    >
      <div className="fixed inset-0" onClick={onClose} />

      <AnimatePresence>
        <div
          className="fixed inset-0"
          onClick={() => {
            if (!isOpening && (step !== 'CARDS_REVEAL' || !isPicking) && step !== 'FC26_CINEMATIC') {
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
          {/* Top Header (Shown in INITIAL, CARDS_REVEAL, PICKED_SUCCESS) */}
          {step !== 'FC26_CINEMATIC' && (
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
          )}

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
                  className={`relative group w-44 h-[280px] sm:w-52 sm:h-[330px] overflow-visible ${tierConfig.dropGlow} flex flex-col justify-between p-3 border-0 bg-transparent`}
                  style={{
                    backgroundImage: `url(${pack.cover_image || tierConfig.cardBg})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Top Tier Tag */}
                  <div className="relative z-10 flex justify-between items-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${tierConfig.badgeBg}`}>
                      {tierConfig.label}
                    </span>
                    <Sparkles size={15} className={tierConfig.accent} />
                  </div>

                  {/* Center OVR Badge */}
                  <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                    {pack.ovr_range_text ? (
                      <div className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-xs font-black text-amber-300 font-sport shadow-xl">
                        {pack.ovr_range_text}
                      </div>
                    ) : null}
                  </div>

                  {/* Bottom Title */}
                  <div className="relative z-10 text-center pb-0.5">
                    <span className="text-xs sm:text-sm font-black text-white block drop-shadow-lg">{pack.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Pack Info & Purchase Method */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-200">مشخصات و محتویات پک</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {pack.description || 'با باز کردن این پک، انیمیشن مهیج FC 26 آغاز شده و ۳ کارت باکیفیت به شما نمایش داده می‌شود تا ۱ بازیکن برگزیده را به ترکیب خود اضافه کنید.'}
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
          {/* STEP 2: FC 26 WALKOUT CINEMATIC ANIMATION STAGE                     */}
          {/* =================================================================== */}
          {step === 'FC26_CINEMATIC' && topCard && (
            <div
              onClick={handleFastForwardWalkout}
              className={`relative -m-5 sm:-m-7 min-h-[560px] sm:min-h-[620px] rounded-3xl bg-slate-950 overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none cursor-pointer border border-white/10 ${
                walkoutStage === 'CARD_SLAM' ? 'animate-fc-shake' : ''
              }`}
              style={{
                background: 'radial-gradient(ellipse at 50% 100%, #0c142b 0%, #05080e 55%, #010204 100%)'
              }}
            >
              {/* Sweeping Stadium Spotlight Beams */}
              <div
                className={`pointer-events-none absolute -bottom-20 left-1/6 w-36 sm:w-48 h-[130vh] origin-bottom -rotate-[22deg] bg-gradient-to-t ${tierConfig.laserColor} blur-2xl animate-fc-laser`}
              />
              <div
                className={`pointer-events-none absolute -bottom-20 right-1/6 w-36 sm:w-48 h-[130vh] origin-bottom rotate-[22deg] bg-gradient-to-t ${tierConfig.laserColor} blur-2xl animate-fc-laser`}
              />

              {/* Ambient Stadium Fog / Glow Floor */}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-slate-950/80 to-transparent flex items-center justify-center">
                <div className="w-[360px] sm:w-[500px] h-[70px] rounded-full bg-cyan-500/15 blur-2xl" />
              </div>

              {/* Top Controls Bar */}
              <div className="relative z-30 flex items-center justify-between w-full">
                {/* Audio Toggle */}
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-slate-300 hover:text-white flex items-center gap-2 text-xs transition cursor-pointer shadow-lg"
                  title={isAudioMuted ? 'فعال‌سازی صدا' : 'قطع صدا'}
                >
                  {isAudioMuted ? <VolumeX size={16} className="text-rose-400" /> : <Volume2 size={16} className="text-cyan-400" />}
                  <span className="text-[11px] font-bold">{isAudioMuted ? 'صدا خاموش' : 'صدا روشن'}</span>
                </button>

                {/* Walkout Stage Step Pills */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] sm:text-xs font-bold font-sport">
                  <span className={`px-2 py-0.5 rounded-full transition ${walkoutStage === 'POSITION' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400'}`}>
                    1. پست
                  </span>
                  <span className="text-slate-600">›</span>
                  <span className={`px-2 py-0.5 rounded-full transition ${walkoutStage === 'OVR' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400'}`}>
                    2. اورال
                  </span>
                  <span className="text-slate-600">›</span>
                  <span className={`px-2 py-0.5 rounded-full transition ${walkoutStage === 'NATIONALITY' ? 'bg-emerald-400 text-slate-950 font-black' : 'text-slate-400'}`}>
                    3. ملیت
                  </span>
                  <span className="text-slate-600">›</span>
                  <span className={`px-2 py-0.5 rounded-full transition ${walkoutStage === 'CARD_SLAM' ? 'bg-yellow-400 text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.6)]' : 'text-slate-400'}`}>
                    4. کارت
                  </span>
                </div>

                {/* Instant Skip Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipCinematic();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shadow-lg hover:border-cyan-400"
                >
                  <span>رد کردن</span>
                  <FastForward size={14} className="text-amber-400" />
                </button>
              </div>

              {/* ================= STAGE 1: POSITION REVEAL ================= */}
              {walkoutStage === 'POSITION' && (
                <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center space-y-4">
                  <motion.div
                    initial={{ scale: 3, opacity: 0, y: -40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                    className="relative flex flex-col items-center justify-center"
                  >
                    {/* Shockwave Flare */}
                    <div className="absolute w-44 h-44 rounded-full bg-cyan-400/25 blur-3xl animate-ping pointer-events-none" />

                    <div className={`px-8 py-6 rounded-3xl border-2 backdrop-blur-xl flex flex-col items-center justify-center shadow-2xl ${tierConfig.neonPill}`}>
                      <span className="text-6xl sm:text-8xl font-black font-sport tracking-widest leading-none drop-shadow-[0_0_35px_rgba(0,243,255,0.8)]">
                        {topCard.position}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-1"
                  >
                    <span className="text-xs sm:text-sm font-black text-cyan-300 uppercase tracking-widest block font-sport">
                      موقعیت تخصصی بازیکن
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold block">
                      PLAYER POSITION
                    </span>
                  </motion.div>
                </div>
              )}

              {/* ================= STAGE 2: OVR RATING REVEAL ================= */}
              {walkoutStage === 'OVR' && (
                <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center space-y-4">
                  {/* Top position pill */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-4 py-1 rounded-full bg-black/60 border border-cyan-400/40 text-cyan-300 text-xs font-black font-sport tracking-widest"
                  >
                    {topCard.position}
                  </motion.div>

                  {/* Giant OVR Rating */}
                  <motion.div
                    initial={{ scale: 2.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 220 }}
                    className="relative flex flex-col items-center justify-center"
                  >
                    {/* Expanding shockwave ring */}
                    <div className="absolute w-60 h-60 rounded-full border-4 border-amber-400/60 animate-fc-shockwave pointer-events-none" />
                    <div className="absolute w-52 h-52 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

                    <div className="flex items-center justify-center">
                      <span className="text-7xl sm:text-9xl font-black font-sport leading-none text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600 drop-shadow-[0_0_40px_rgba(245,158,11,0.85)]">
                        {topCard.overall}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-amber-300">
                      <Star size={16} fill="currentColor" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-widest font-sport">
                        رتبه کلی بازیکن (OVR)
                      </span>
                      <Star size={16} fill="currentColor" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold block">
                      OVERALL RATING
                    </span>
                  </motion.div>
                </div>
              )}

              {/* ================= STAGE 3: NATIONALITY REVEAL ================= */}
              {walkoutStage === 'NATIONALITY' && (
                <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center space-y-4">
                  {/* Top Telemetry */}
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1 rounded-full bg-black/70 border border-cyan-400/40 text-cyan-300 text-xs font-black font-sport">
                      {topCard.position}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-black/70 border border-amber-400/40 text-amber-300 text-xs font-black font-sport">
                      OVR: {topCard.overall}
                    </span>
                  </div>

                  {/* Nationality Flag & Country Name */}
                  <motion.div
                    initial={{ scale: 2.2, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 13, stiffness: 200 }}
                    className="relative flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-black/70 backdrop-blur-xl border border-white/30 flex items-center justify-center text-5xl sm:text-6xl shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                      {getNationalityFlag(topCard.nationality)}
                    </div>

                    <h3 className="text-2xl sm:text-4xl font-black text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.7)] font-sport tracking-wider">
                      {topCard.nationality || 'ملیت ناشناخته'}
                    </h3>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <span className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-widest block font-sport">
                      ملیت و پرچم بازیکن
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold block">
                      PLAYER NATIONALITY
                    </span>
                  </motion.div>
                </div>
              )}

              {/* ================= STAGE 4: FULL OVERSIZED CARD SLAM ================= */}
              {walkoutStage === 'CARD_SLAM' && (
                <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ y: -180, scale: 1.15, opacity: 0, rotateX: 20 }}
                    animate={{ y: 0, scale: 1, opacity: 1, rotateX: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    className="relative [perspective:1000px] flex flex-col items-center"
                  >
                    {/* Golden Sparks & Burst Aura Behind Card */}
                    <div className="absolute inset-0 -m-8 rounded-[3rem] bg-amber-500/25 blur-3xl pointer-events-none animate-pulse" />

                    {/* The Oversized Ultimate Team Card */}
                    <div
                      className={`relative w-60 h-[345px] sm:w-68 sm:h-[385px] overflow-visible ${tierConfig.dropGlow} border-0 bg-transparent`}
                      style={{
                        backgroundImage: `url(${tierConfig.cardBg})`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center'
                      }}
                    >
                      {/* Top Telemetry Badge */}
                      <div className="absolute top-2 inset-x-2 z-30 flex items-start justify-between pointer-events-none">
                        <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 shadow-xl min-w-[48px] pointer-events-auto">
                          <span className={`text-2xl sm:text-3xl font-black font-sport leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${tierConfig.ovrColor}`}>
                            {topCard.overall}
                          </span>
                          <span className="text-[10px] font-black font-sport text-cyan-300 uppercase tracking-wider mt-0.5 dir-ltr">
                            {topCard.position}
                          </span>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="text-xs">{getNationalityFlag(topCard.nationality)}</span>
                          </div>
                        </div>

                        {/* Rarity / Tier Pill */}
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 pointer-events-auto">
                          <Sparkles size={12} className={tierConfig.accent} />
                          <span className="text-[9px] font-black font-sport text-white uppercase">
                            {topCard.rarity || pack.tier}
                          </span>
                        </div>
                      </div>

                      {/* Center: Oversized 3D Pop-out Player Cutout */}
                      <div className="absolute inset-x-0 top-8 bottom-12 z-20 flex items-center justify-center overflow-visible pointer-events-none">
                        {/* Radial Tier Backlight */}
                        <div
                          className="absolute inset-0 pointer-events-none rounded-full blur-2xl opacity-60"
                          style={{ background: tierConfig.backlightRadial }}
                        />

                        {topCard.card_image || topCard.photo ? (
                          <img
                            src={topCard.card_image || topCard.photo}
                            alt={topCard.name}
                            className="max-h-full w-auto scale-115 sm:scale-125 object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-amber-300/90 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                            <Trophy size={52} className="text-yellow-400 drop-shadow-md" />
                          </div>
                        )}
                      </div>

                      {/* Lower-Third: Nameplate Banner (In front of photo) */}
                      <div className="absolute bottom-11 inset-x-2 text-center z-30">
                        <div className="inline-block px-3.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-white/20 shadow-xl max-w-[200px]">
                          <h4 className="text-xs sm:text-sm font-black text-white font-sport tracking-wider uppercase truncate drop-shadow-md">
                            {topCard.name}
                          </h4>
                        </div>
                      </div>

                      {/* Card Footer: Prime Club & Country (In front of photo) */}
                      <div className="absolute bottom-2 inset-x-2 z-30 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 text-white shadow-xl flex items-center justify-between gap-1 text-[9.5px]">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-5 h-5 rounded-md bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            {topCard.club_logo ? (
                              <img src={topCard.club_logo} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Shield size={11} className="text-amber-400" />
                            )}
                          </div>
                          <span className="text-[9px] font-black text-white truncate font-sport">
                            {topCard.prime_club || 'تیم پرایم'}
                          </span>
                        </div>

                        <div className="h-3.5 w-px bg-white/20 shrink-0" />

                        <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                          <span className="text-xs shrink-0">{getNationalityFlag(topCard.nationality)}</span>
                          <span className="text-[9px] font-black text-amber-300 truncate font-sport">
                            {topCard.nationality || 'ملیت'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Bottom Cinematic Bar */}
              <div className="relative z-30 flex items-center justify-center pt-2">
                {walkoutStage !== 'CARD_SLAM' ? (
                  <span className="text-[11px] text-slate-400 font-bold animate-pulse">
                    برای سرعت بخشیدن به انیمیشن هر کجای صفحه کلیک کنید
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSkipCinematic();
                    }}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm font-sport tracking-wider shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
                  >
                    <span>مشاهده هر ۳ کارت و انتخاب بازیکن</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 3: 3 CARDS REVEAL & PICK 1 (WITH OVERSIZED CUTOUT & FX)        */}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-items-center">
                {(cards || []).map((card, index) => {
                  const isFlipped = revealedCardIds.includes(card.id);

                  return (
                    <div key={card.id} className="flex flex-col items-center">
                      {/* 3D Flip Card Container */}
                      <div
                        onClick={() => handleFlipCard(card.id)}
                        className={`w-[185px] sm:w-[210px] h-[285px] sm:h-[320px] cursor-pointer [perspective:1000px] group transition-transform duration-200 hover:scale-105 ${tierConfig.dropGlow}`}
                      >
                        <motion.div
                          initial={false}
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                          className="relative w-full h-full [transform-style:preserve-3d]"
                        >
                          {/* ================= CARD BACK (Face Down) ================= */}
                          <div
                            className="absolute inset-0 w-full h-full [backface-visibility:hidden] overflow-visible flex flex-col justify-between p-2.5 border-0 bg-transparent"
                            style={{
                              backgroundImage: `url(${tierConfig.cardBg})`,
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }}
                          >
                            <div className="relative z-10 flex justify-between items-center text-[10px] font-bold text-white/90">
                              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                                کارت #{index + 1}
                              </span>
                              <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                            </div>

                            <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                              <motion.div
                                animate={{ scale: [1, 1.06, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-2xl"
                              >
                                <Trophy size={26} className="text-yellow-400" />
                                <span className="text-[9px] font-black text-amber-200 mt-0.5 uppercase font-sport tracking-widest">VML 26</span>
                              </motion.div>
                            </div>

                            <div className="relative z-10 text-center pb-1">
                              <span className="text-[11px] font-black text-white block drop-shadow-md">برای مشاهده کلیک کنید</span>
                              <span className="text-[9px] text-amber-300 font-bold">آشکارسازی کارت</span>
                            </div>
                          </div>

                          {/* ================= CARD FRONT (Face Up with Heroic Player Cutout) ================= */}
                          <div
                            className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-visible border-0 bg-transparent"
                            style={{
                              backgroundImage: `url(${tierConfig.cardBg})`,
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }}
                          >
                            {/* Top Telemetry Badge */}
                            <div className="absolute top-1.5 inset-x-1.5 z-30 flex justify-between items-start pointer-events-none">
                              <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-xl border border-white/15 shadow-md min-w-[42px] pointer-events-auto">
                                <span className={`text-xl sm:text-2xl font-black font-sport leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${tierConfig.ovrColor}`}>
                                  {card.overall}
                                </span>
                                <span className="text-[8.5px] font-black text-cyan-300 dir-ltr uppercase tracking-wider font-sport mt-0.5">
                                  {card.position}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/15 pointer-events-auto">
                                <span className="text-xs">{getNationalityFlag(card.nationality)}</span>
                              </div>
                            </div>

                            {/* Center: Heroic Player Cutout (Fills the Card) */}
                            <div className="absolute inset-x-0 top-6 bottom-11 z-20 flex items-center justify-center overflow-visible pointer-events-none">
                              {/* Radial Backlight */}
                              <div
                                className="absolute inset-0 pointer-events-none rounded-full blur-xl opacity-50"
                                style={{ background: tierConfig.backlightRadial }}
                              />

                              {card.card_image || card.photo ? (
                                <img
                                  src={card.card_image || card.photo}
                                  alt={card.name}
                                  className="max-h-full w-auto scale-115 sm:scale-125 object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)] transition-transform duration-300 group-hover:scale-130"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-amber-300/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                  <Trophy size={40} className="text-yellow-400/90 drop-shadow-md" />
                                </div>
                              )}
                            </div>

                            {/* Nameplate Banner (In front of photo) */}
                            <div className="absolute bottom-10 inset-x-1 text-center z-30">
                              <div className="inline-block px-3 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 shadow-md max-w-[170px]">
                                <h4 className="text-[11px] sm:text-xs font-black text-white font-sport uppercase tracking-wider truncate drop-shadow">
                                  {card.name}
                                </h4>
                              </div>
                            </div>

                            {/* Footer: Prime Club & Country (In front of photo) */}
                            <div className="absolute bottom-1.5 inset-x-1.5 z-30 bg-black/85 backdrop-blur-md px-2 py-1 rounded-xl border border-white/15 text-white shadow-md flex items-center justify-between gap-1 text-[9px]">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <div className="w-4 h-4 rounded bg-white/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                  {card.club_logo ? (
                                    <img src={card.club_logo} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <Shield size={10} className="text-amber-400" />
                                  )}
                                </div>
                                <span className="text-[8.5px] font-black text-white truncate font-sport">
                                  {card.prime_club || 'تیم پرایم'}
                                </span>
                              </div>

                              <div className="h-3 w-px bg-white/20 shrink-0" />

                              <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                                <span className="text-[11px] shrink-0">{getNationalityFlag(card.nationality)}</span>
                                <span className="text-[8.5px] font-black text-amber-300 truncate font-sport">
                                  {card.nationality || 'ملیت'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Pick Card Button */}
                      <div className="w-[185px] sm:w-[210px] mt-2.5">
                        <button
                          disabled={!isFlipped || isPicking}
                          onClick={() => handlePickCard(card)}
                          className={`w-full py-2 rounded-xl font-bold text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg ${
                            isFlipped
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                          }`}
                        >
                          {isPicking ? (
                            <span className="animate-pulse">در حال افزودن...</span>
                          ) : (
                            <>
                              <CheckCircle2 size={14} />
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
          {/* STEP 4: CELEBRATION & PLAYER CLAIMED (OVERSIZED CARD)               */}
          {/* =================================================================== */}
          {step === 'PICKED_SUCCESS' && pickedPlayer && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-4 flex flex-col items-center justify-center text-center space-y-4"
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

              {/* Showcase Borderless Oversized FUT Card */}
              <div
                className={`relative w-56 h-[325px] sm:w-64 sm:h-[365px] overflow-visible ${tierConfig.dropGlow} border-0 bg-transparent my-2`}
                style={{
                  backgroundImage: `url(${tierConfig.cardBg})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              >
                {/* Top Stat Badge */}
                <div className="absolute top-2 inset-x-2 z-30 flex justify-between items-start pointer-events-none">
                  <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-xl border border-white/15 shadow-md min-w-[46px] pointer-events-auto">
                    <span className={`text-xl sm:text-2xl font-black font-sport leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${tierConfig.ovrColor}`}>
                      {pickedPlayer.overall}
                    </span>
                    <span className="text-[9px] font-black text-cyan-300 dir-ltr uppercase tracking-wider font-sport mt-0.5">
                      {pickedPlayer.position}
                    </span>
                  </div>

                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-slate-200 pointer-events-auto">
                    سن: {pickedPlayer.age}
                  </span>
                </div>

                {/* Center Cutout */}
                <div className="absolute inset-x-0 top-7 bottom-12 z-20 flex items-center justify-center overflow-visible pointer-events-none">
                  <div
                    className="absolute inset-0 pointer-events-none rounded-full blur-xl opacity-50"
                    style={{ background: tierConfig.backlightRadial }}
                  />

                  {pickedPlayer.card_image || pickedPlayer.photo ? (
                    <img
                      src={pickedPlayer.card_image || pickedPlayer.photo}
                      alt={pickedPlayer.name}
                      className="max-h-full w-auto scale-115 sm:scale-125 object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-amber-300/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                      <Trophy size={42} className="text-yellow-400/90 drop-shadow-md" />
                    </div>
                  )}
                </div>

                {/* Nameplate (In front of photo) */}
                <div className="absolute bottom-11 inset-x-2 text-center z-30">
                  <div className="inline-block px-3 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/15 shadow-md max-w-[180px]">
                    <h4 className="text-[11px] sm:text-xs font-black text-white font-sport uppercase tracking-wider truncate drop-shadow-md">
                      {pickedPlayer.name}
                    </h4>
                  </div>
                </div>

                {/* Card Footer Details (In front of photo) */}
                <div className="absolute bottom-2 inset-x-2 z-30 grid grid-cols-2 gap-1 text-[9.5px] bg-black/85 backdrop-blur-md p-1.5 rounded-xl border border-white/15 text-slate-200">
                  <div className="text-center">
                    <span className="text-slate-400 block text-[8px]">استقامت (STA)</span>
                    <span className="font-black text-emerald-400 font-sport text-xs">{pickedPlayer.base_stamina}</span>
                  </div>
                  <div className="text-center border-r border-white/10">
                    <span className="text-slate-400 block text-[8px]">پتانسیل (POT)</span>
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
