import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SubNav from '../common/SubNav';
import {
  Gift, Coins, Award, Check, Sparkles, Crown, Zap,
  CreditCard, ShieldCheck, Copy, CheckCircle, UploadCloud,
  FileImage, Clock, AlertCircle, XCircle, ChevronRight, ChevronLeft, Eye, Gem,
  Star, User, DollarSign, Calendar, Trophy, Lock, CheckCircle2,
  ArrowLeft, ArrowRight, Flame, Target, PartyPopper, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { economyApi, gachaApi, seasonPassApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import Toast from '../common/Toast';
import ConfirmModal from '../common/ConfirmModal';
import PackOpeningModal from './PackOpeningModal';
import PackCardFXOverlay from '../common/PackCardFXOverlay';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

import rareCardBg from '../../assets/cards/rare_card_bg.png';
import epicCardBg from '../../assets/cards/epic_card_bg.png';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.png';
import { PACKAGE_TAGS } from '../../utils/storePackageTags';

const STORE_SUBNAV = [
  { id: 'gems', label: 'الماس (جم 💎)' },
  { id: 'coins', label: 'بودجه باشگاه (دلار 💵)' },
  { id: 'packs', label: 'پک‌ها (🎁)' },
  { id: 'pass', label: 'Season Pass (👑)' },
  { id: 'receipts', label: 'پیگیری واریزها' },
];

function StorePackCountdownBadge({ available_from, available_until }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const start = available_from ? new Date(available_from).getTime() : null;
      const end = available_until ? new Date(available_until).getTime() : null;

      if (start && now < start) {
        setStatusText('شروع در آینده');
        const diff = start - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d > 0 ? `${d} روز و ` : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        setIsExpired(false);
        return;
      }

      if (end) {
        if (now > end) {
          setStatusText('مهلت پایان یافته');
          setTimeLeft('منقضی شده');
          setIsExpired(true);
          return;
        }
        const diff = end - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d > 0 ? `${d} روز و ` : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        setStatusText('مهلت باقیمانده');
        setIsExpired(false);
        return;
      }

      setTimeLeft('');
      setStatusText('');
      setIsExpired(false);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [available_from, available_until]);

  if (!timeLeft) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black font-sport border backdrop-blur-md shadow-lg ${
        isExpired
          ? 'bg-rose-950/90 text-rose-300 border-rose-500/60'
          : statusText === 'شروع در آینده'
          ? 'bg-blue-950/90 text-blue-300 border-blue-500/60'
          : 'bg-gradient-to-r from-amber-950/95 to-yellow-950/90 text-amber-300 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
      }`}
    >
      <Clock size={13} className={!isExpired ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
      <span>{statusText}:</span>
      <span className="font-mono tracking-wider font-black dir-ltr">{timeLeft}</span>
    </div>
  );
}

export default function StoreTab({ teamData, initialSub = 'gems', onRefreshTeam }) {
  const { team, fetchTeam } = useTeam();
  const [activeSub, setActiveSub] = useState(initialSub || 'gems');
  const teamId = teamData?.id || team?.id;
  const [storePackages, setStorePackages] = useState([]);
  const [gachaPacks, setGachaPacks] = useState([]);
  const [cardInfo, setCardInfo] = useState(null);
  const [myPaymentRequests, setMyPaymentRequests] = useState([]);
  const [selectedPackForModal, setSelectedPackForModal] = useState(null);

  // Season Pass state
  const [seasonPassData, setSeasonPassData] = useState(null);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [seasonPassLevels, setSeasonPassLevels] = useState([]);
  const [xpRates, setXpRates] = useState(null);
  const [claimedRewardPopup, setClaimedRewardPopup] = useState(null);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState(null);

  const fetchSeasonPassData = async () => {
    setPassLoading(true);
    setPassError(null);
    try {
      const res = await seasonPassApi.getStatus();
      setSeasonPassData(res.data.season_pass);
      setWeeklyTasks(res.data.weekly_tasks || []);
      setSeasonPassLevels(res.data.levels || []);
      setXpRates(res.data.xp_rates || null);
    } catch (err) {
      console.error('Season pass data fetch failed', err);
      setPassError(err.response?.data?.error || 'خطا در بارگذاری اطلاعات سیزن پس');
    } finally {
      setPassLoading(false);
    }
  };

  // Daily rewards state
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Payment modal state
  const [selectedCoinPkg, setSelectedCoinPkg] = useState(null);
  const [currentPaymentReq, setCurrentPaymentReq] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1); // 1: Card info, 2: Upload receipt, 3: Completed
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isCopiedCard, setIsCopiedCard] = useState(false);
  const [isCopiedAmount, setIsCopiedAmount] = useState(false);
  const [viewReceiptImage, setViewReceiptImage] = useState(null);

  const fetchPaymentData = () => {
    economyApi.getCardInfo()
      .then(res => setCardInfo(res.data))
      .catch(() => setCardInfo(null));

    economyApi.getMyPaymentRequests()
      .then(res => setMyPaymentRequests(res.data || []))
      .catch(() => setMyPaymentRequests([]));
  };

  useEffect(() => {
    economyApi.getPackages()
      .then((res) => setStorePackages(res.data || []))
      .catch(() => setStorePackages([]));

    gachaApi.getPacks()
      .then((res) => setGachaPacks(res.data || []))
      .catch(() => setGachaPacks([]));

    fetchPaymentData();
    fetchSeasonPassData();
  }, [teamId, activeSub]);

  const handleOpenGacha = async (packId) => {
    if (!teamId) {
      alert('تیمی برای شما یافت نشد.');
      return;
    }
    setIsOpeningPack(true);
    setGachaResult(null);

    try {
      const res = await gachaApi.openPack({ pack_id: packId });
      setTimeout(() => {
        setGachaResult(res.data);
        setIsOpeningPack(false);
        if (fetchTeam) fetchTeam();
      }, 1000);
    } catch (err) {
      setTimeout(() => {
        setIsOpeningPack(false);
        const errMsg = err.response?.data?.error || 'خطا در باز کردن پک';
        alert(errMsg);
      }, 500);
    }
  };

  const ladderScrollRef = useRef(null);
  const [animatingClaimLevel, setAnimatingClaimLevel] = useState(null);

  const scrollToLevel = useCallback((targetLvl) => {
    if (!ladderScrollRef.current) return;
    const el = ladderScrollRef.current.querySelector(`[data-level-stage="${targetLvl}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  const scrollLadder = (direction) => {
    if (!ladderScrollRef.current) return;
    const scrollAmount = direction === 'left' ? -350 : 350;
    ladderScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Auto scroll to current active level when pass tab is active and levels loaded
  useEffect(() => {
    if (activeSub === 'pass' && seasonPassData && seasonPassLevels.length > 0) {
      const curLvl = seasonPassData.current_level || 1;
      const timer = setTimeout(() => {
        scrollToLevel(curLvl);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeSub, seasonPassData?.current_level, seasonPassLevels.length, scrollToLevel]);

  // Payment Handlers
  const handleStartPayment = (pkg) => {
    setSelectedCoinPkg(pkg);
    setPaymentStep(1);
    setReceiptFile(null);
    setReceiptPreview(null);
    setCurrentPaymentReq(null);
  };

  const handleClaimWeeklyTask = async (taskId) => {
    try {
      await seasonPassApi.claimTask(taskId);
      setToastMessage('امتیاز تسک دریافت شد (+۵۶ XP)');
      // Refresh season pass status
      const res = await seasonPassApi.getStatus();
      setSeasonPassData(res.data.season_pass);
      setWeeklyTasks(res.data.weekly_tasks || []);
      setSeasonPassLevels(res.data.levels || []);
      setXpRates(res.data.xp_rates || null);
      if (fetchTeam) fetchTeam();
    } catch (err) {
      setToastMessage(err.response?.data?.error || 'خطا در دریافت جایزه');
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleClaimLevel = async (level) => {
    setAnimatingClaimLevel(level);
    try {
      const resClaim = await seasonPassApi.claimLevel(level);
      const nextLvl = Math.min(20, level + 1);
      
      setClaimedRewardPopup({
        ...resClaim.data,
        claimedLevel: level,
        nextLevel: nextLvl
      });
      setToastMessage(`پاداش مرحله ${level} با موفقیت دریافت شد! 🎉`);
      
      const res = await seasonPassApi.getStatus();
      setSeasonPassData(res.data.season_pass);
      setWeeklyTasks(res.data.weekly_tasks || []);
      setSeasonPassLevels(res.data.levels || []);
      setXpRates(res.data.xp_rates || null);
      if (fetchTeam) fetchTeam();

      // Smoothly scroll horizontal ladder to next level
      setTimeout(() => {
        scrollToLevel(nextLvl);
      }, 500);
    } catch (err) {
      setToastMessage(err.response?.data?.error || 'خطا در دریافت پاداش');
    } finally {
      setTimeout(() => setAnimatingClaimLevel(null), 1200);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const handleCopyCard = (cardNumber) => {
    navigator.clipboard.writeText(String(cardNumber || '').replace(/-/g, ''));
    setIsCopiedCard(true);
    setTimeout(() => setIsCopiedCard(false), 2000);
  };

  const handleCopyAmount = (amount) => {
    navigator.clipboard.writeText(String(amount || ''));
    setIsCopiedAmount(true);
    setTimeout(() => setIsCopiedAmount(false), 2000);
  };

  const handleCreatePaymentRequest = async () => {
    if (!selectedCoinPkg?.id) return;
    try {
      const res = await economyApi.createPaymentRequest({ package_id: selectedCoinPkg.id });
      setCurrentPaymentReq(res.data);
      setPaymentStep(2);
    } catch (err) {
      alert(err.response?.data?.error || 'خطا در ثبت درخواست پرداخت');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !currentPaymentReq) {
      alert('لطفاً عکس رسید را انتخاب کنید.');
      return;
    }
    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('receipt_image', receiptFile);
      await economyApi.uploadReceipt(currentPaymentReq.payment_request_id, formData);
      setPaymentStep(3);
      fetchPaymentData();
    } catch (err) {
      alert(err.response?.data?.error || 'خطا در آپلود رسید. لطفاً مجدداً تلاش کنید.');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Filter packages strictly from backend storePackages
  const gemPackages = (storePackages || []).filter(
    (p) => p && (p.currency_type === 'GEMS' || (!p.currency_type && (String(p.name || '').includes('جم') || String(p.name || '').includes('الماس'))))
  );

  const dollarPackages = (storePackages || []).filter(
    (p) => p && (p.currency_type === 'BUDGET' || (!p.currency_type && !(String(p.name || '').includes('جم') || String(p.name || '').includes('الماس'))))
  );

  const pendingReceiptsCount = (myPaymentRequests || []).filter(
    (r) => r && (r.status === 'PENDING_REVIEW' || r.status === 'AWAITING_RECEIPT')
  ).length;

  const storeSubnavItems = [
    { id: 'gems', label: 'الماس (جم 💎)' },
    { id: 'coins', label: 'بودجه باشگاه (دلار 💵)' },
    { id: 'packs', label: 'پک‌ها (🎁)' },
    { id: 'pass', label: 'Season Pass (👑)' },
    { id: 'receipts', label: 'پیگیری واریزها', badge: pendingReceiptsCount > 0 ? pendingReceiptsCount : null },
  ];

  return (
    <div className="space-y-4 font-sans pb-12">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      {/* Sub navigation bar */}
      <SubNav items={storeSubnavItems} activeId={activeSub} onChange={setActiveSub} />

      {/* Packs SubNav and Content */}

      {/* Subtab 1: Gem Packages (💎 Crystal Neon Purple/Cyan Cards) */}
      {activeSub === 'gems' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-purple-950/60 border border-cyan-500/40 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 text-slate-300">
              <Gem size={18} className="text-cyan-400 animate-pulse" />
              <span>الماس (جم) اختصاصی برای ارتقای تمام امکانات باشگاه، ریکاوری فوری بازیکنان و گاشا</span>
            </div>
            <button
              onClick={() => setActiveSub('receipts')}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <span>پیگیری واریزها</span>
              <ChevronRight size={14} className="rotate-180" />
            </button>
          </div>

          {gemPackages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              {gemPackages.map((pkg) => {
                const baseAmount = Number(pkg.reward_amount || pkg.usd_amount || 0);
                const bonusAmount = Number(pkg.bonus_amount || 0);
                const totalAmount = baseAmount + bonusAmount;
                const tagData = pkg.badge_tag && PACKAGE_TAGS[pkg.badge_tag];

                return (
                  <div
                    key={pkg.id}
                    className={`fc-card p-4 rounded-3xl border text-center space-y-3 bg-gradient-to-b from-cyan-950/40 via-purple-950/30 to-[#05080e] transition-all relative overflow-hidden flex flex-col justify-between ${
                      tagData
                        ? `${tagData.border} ${tagData.shadow}`
                        : 'border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.15)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)]'
                    }`}
                  >
                    {/* Floating Neon Badge Tag */}
                    {tagData && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${tagData.badgeClass}`}>
                          {tagData.label}
                        </span>
                      </div>
                    )}

                    {/* Icon */}
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-purple-600 border border-cyan-300/40 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,243,255,0.4)] mt-1 shrink-0">
                      <Gem size={24} className="text-cyan-200 animate-pulse" />
                    </div>

                    {/* Titles and Amounts */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                      <span className="font-black text-white text-sm block tracking-tight">{pkg.name}</span>
                      
                      {/* Base Amount */}
                      <span className="text-[13px] text-cyan-300 font-black font-sport dir-ltr block">
                        +{baseAmount.toLocaleString('fa-IR')} 💎 الماس
                      </span>

                      {/* Bonus Reward Badge & Total */}
                      {bonusAmount > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-cyan-500/20">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-black font-sport dir-ltr text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg animate-pulse">
                            <span>🎁 +{bonusAmount.toLocaleString('fa-IR')} هدیه</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            مجموع دریافتی: {totalAmount.toLocaleString('fa-IR')} جم
                          </span>
                        </div>
                      )}

                      {pkg.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">{pkg.description}</p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleStartPayment(pkg)}
                      className="fc-btn-cyan text-slate-950 px-3 py-2 rounded-2xl font-black w-full transition-all shadow-md font-sport cursor-pointer"
                    >
                      {(pkg.price_irr || 0).toLocaleString('fa-IR')} تومان
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-2">
              <Gem size={32} className="mx-auto text-cyan-400/50" />
              <p className="font-bold text-slate-300">بسته‌ای برای خرید الماس در حال حاضر فعال نیست.</p>
              <p className="text-[11px] text-slate-500">برای تعریف بسته‌های جدید، از پنل ادمین جنگو در بخش Store Packages اقدام فرمایید.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Subtab 2: Coin / Dollar Budget Packages (💵 Gold Championship Cards) */}
      {activeSub === 'coins' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 text-slate-300">
              <Coins size={18} className="text-amber-400 animate-bounce" />
              <span>بودجه دلاری اختصاصی برای خرید بازیکنان در بازار نقل و انتقالات و دستمزدها</span>
            </div>
            <button
              onClick={() => setActiveSub('receipts')}
              className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <span>پیگیری واریزها</span>
              <ChevronRight size={14} className="rotate-180" />
            </button>
          </div>

          {dollarPackages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              {dollarPackages.map((pkg) => {
                const baseAmount = Number(pkg.reward_amount || pkg.usd_amount || 0);
                const bonusAmount = Number(pkg.bonus_amount || 0);
                const totalAmount = baseAmount + bonusAmount;
                const tagData = pkg.badge_tag && PACKAGE_TAGS[pkg.badge_tag];

                return (
                  <div
                    key={pkg.id}
                    className={`fc-card p-4 rounded-3xl border text-center space-y-3 bg-gradient-to-b from-amber-950/40 via-slate-900 to-[#05080e] transition-all relative overflow-hidden flex flex-col justify-between ${
                      tagData
                        ? `${tagData.border} ${tagData.shadow}`
                        : 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                    }`}
                  >
                    {/* Floating Neon Badge Tag */}
                    {tagData && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${tagData.badgeClass}`}>
                          {tagData.label}
                        </span>
                      </div>
                    )}

                    {/* Icon */}
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 border border-amber-300/40 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] mt-1 shrink-0">
                      <Coins size={24} className="text-slate-950" />
                    </div>

                    {/* Titles and Amounts */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                      <span className="font-black text-white text-sm block tracking-tight">{pkg.name}</span>
                      
                      {/* Base Amount */}
                      <span className="text-[13px] text-amber-300 font-black font-sport dir-ltr block">
                        +${baseAmount.toLocaleString('fa-IR')} USD
                      </span>

                      {/* Bonus Reward Badge & Total */}
                      {bonusAmount > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-amber-500/20">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-black font-sport dir-ltr text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg animate-pulse">
                            <span>🎁 +${bonusAmount.toLocaleString('fa-IR')} هدیه</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            مجموع دریافتی: ${totalAmount.toLocaleString('fa-IR')}
                          </span>
                        </div>
                      )}

                      {pkg.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">{pkg.description}</p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleStartPayment(pkg)}
                      className="fc-btn-gold text-slate-950 px-3 py-2 rounded-2xl font-black w-full transition-all shadow-md font-sport cursor-pointer"
                    >
                      {(pkg.price_irr || 0).toLocaleString('fa-IR')} تومان
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-2">
              <Coins size={32} className="mx-auto text-amber-400/50" />
              <p className="font-bold text-slate-300">بسته‌ای برای بودجه دلاری در حال حاضر فعال نیست.</p>
              <p className="text-[11px] text-slate-500">برای تعریف بسته‌های جدید، از پنل ادمین جنگو در بخش Store Packages اقدام فرمایید.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Subtab 3: Packs (Bronze, Silver, Legendary) */}
      {activeSub === 'packs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-amber-950/60 border border-purple-500/40 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 text-slate-300">
              <Gift size={18} className="text-amber-400 animate-bounce" />
              <span>پک‌های شانس فصلی و اساطیری — ۳ کارت شانس آشکار می‌شود و ۱ بازیکن را برای تیم خود انتخاب می‌کنید.</span>
            </div>
            <button
              onClick={() => {
                gachaApi.getPacks().then((res) => setGachaPacks(res.data || []));
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              بروزرسانی پک‌ها
            </button>
          </div>

          <div className="flex flex-wrap gap-6 items-start justify-center sm:justify-start">
            {gachaPacks.length > 0 ? (
              gachaPacks.map((pack) => {
                const tierStyles = {
                  BRONZE: {
                    defaultBg: rareCardBg,
                    dropGlow: 'drop-shadow-[0_0_25px_rgba(37,99,235,0.55)]',
                    badge: 'bg-blue-950/90 text-blue-300 border-blue-500/40 shadow-md',
                    btn: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold',
                    label: 'پک آبی کمیاب (Rare)',
                  },
                  SILVER: {
                    defaultBg: epicCardBg,
                    dropGlow: 'drop-shadow-[0_0_25px_rgba(168,85,247,0.55)]',
                    badge: 'bg-purple-950/90 text-purple-300 border-purple-500/40 shadow-md',
                    btn: 'from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold',
                    label: 'پک حماسی (Epic)',
                  },
                  LEGENDARY: {
                    defaultBg: legendaryCardBg,
                    dropGlow: 'drop-shadow-[0_0_30px_rgba(245,158,11,0.65)]',
                    badge: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black border-yellow-300 shadow-lg',
                    btn: 'from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.6)]',
                    label: 'پک اساطیر (Legendary)',
                  }
                }[String(pack.tier || 'BRONZE').toUpperCase()] || {
                  defaultBg: rareCardBg,
                  dropGlow: 'drop-shadow-[0_0_25px_rgba(37,99,235,0.55)]',
                  badge: 'bg-blue-950/90 text-blue-300 border-blue-500/40 shadow-md',
                  btn: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold',
                  label: 'پک کمیاب (Rare)',
                };

                const now = Date.now();
                const isTimeExpired = pack.available_until && now > new Date(pack.available_until).getTime();
                const isNotStarted = pack.available_from && now < new Date(pack.available_from).getTime();
                const isButtonDisabled = pack.is_sold_out || isTimeExpired || isNotStarted;

                return (
                  <motion.div
                    key={pack.id}
                    whileHover={{ y: -6, scale: 1.03 }}
                    transition={{ duration: 0.25 }}
                    className={`group relative w-[215px] sm:w-[235px] h-[340px] sm:h-[370px] overflow-visible flex flex-col justify-between p-3 border-0 bg-transparent select-none transition-all duration-300 ${tierStyles.dropGlow}`}
                    style={{
                      backgroundImage: `url(${pack.cover_image || tierStyles.defaultBg})`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Dynamic Rotating Stars, Sparks & Sheen FX */}
                    <PackCardFXOverlay tier={pack.tier} intensity="normal" />

                    {/* Top Row: Floating Tier Badge & Remaining Pool */}
                    <div className="relative z-10 flex justify-between items-center px-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black border uppercase tracking-wider ${tierStyles.badge}`}>
                        {pack.tier_display || tierStyles.label}
                      </span>

                      {pack.is_sold_out ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-900/90 text-rose-200 font-bold text-[9px] border border-rose-500 shadow-md">
                          تکمیل
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 text-slate-300 font-sport text-[9px] border border-white/15 backdrop-blur-md">
                          موجودی: <strong className="text-cyan-300 font-bold">{pack.unclaimed_players_count ?? pack.total_players_count}</strong>
                        </span>
                      )}
                    </div>

                    {/* Center Spotlight: OVR Range Floating Badge & Live Countdown Timer */}
                    <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center text-center space-y-1.5">
                      {pack.ovr_range_text ? (
                        <div className="px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 shadow-lg text-xs font-black text-amber-300 tracking-wider font-sport">
                          {pack.ovr_range_text}
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-inner">
                          <Trophy size={24} className="text-amber-400" />
                        </div>
                      )}

                      {/* Live Animated Countdown Timer */}
                      {(pack.available_from || pack.available_until) && (
                        <StorePackCountdownBadge
                          available_from={pack.available_from}
                          available_until={pack.available_until}
                        />
                      )}

                      {/* Early Bird Anti-Snipe Boost Badge */}
                      {pack.odds?.is_early_bird_active && (
                        <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-400/50 text-orange-300 text-[9px] font-black flex items-center gap-1 shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                          <Rocket size={11} className="text-orange-400" />
                          <span>بانس پیشتازان فعال است</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Content Area */}
                    <div className="relative z-10 space-y-1.5 pt-1 text-center">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white drop-shadow truncate">{pack.name}</h4>
                        {pack.featured_team && (
                          <div className="text-[8.5px] text-amber-300 font-bold truncate mt-0.5">
                            تیم منتخب: {pack.featured_team}
                          </div>
                        )}
                      </div>

                      {/* Price & Open Button Footer */}
                      <div className="pt-1.5 border-t border-white/15 flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2 font-sport text-xs font-black">
                          {pack.cost_gems > 0 && (
                            <span className="text-cyan-300 flex items-center gap-0.5">
                              <Gem size={13} /> {pack.cost_gems}
                            </span>
                          )}
                          {pack.cost_usd > 0 && (
                            <span className="text-amber-300 flex items-center gap-0.5">
                              <Coins size={13} /> ${pack.cost_usd}
                            </span>
                          )}
                        </div>

                        <button
                          disabled={isButtonDisabled}
                          onClick={() => setSelectedPackForModal(pack)}
                          className={`w-full py-2 rounded-xl bg-gradient-to-r ${tierStyles.btn} font-black text-xs shadow-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 hover:scale-105 active:scale-95`}
                        >
                          <Sparkles size={14} />
                          <span>
                            {pack.is_sold_out
                              ? 'تکمیل ظرفیت'
                              : isTimeExpired
                              ? 'مهلت پایان یافته'
                              : isNotStarted
                              ? 'به زودی'
                              : 'مشاهده و باز کردن'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-2">
                <Gift size={36} className="mx-auto text-purple-400/50" />
                <p className="font-bold text-slate-300">در حال حاضر پکی فعال نیست.</p>
                <p className="text-[11px] text-slate-500">پک‌های جدید به زودی توسط مدیریت افزوده خواهند شد.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Interactive 3-Card Pack Opening Modal */}
      {selectedPackForModal && (
        <PackOpeningModal
          pack={selectedPackForModal}
          isOpen={!!selectedPackForModal}
          onClose={() => setSelectedPackForModal(null)}
          onPlayerClaimed={() => {
            if (onRefreshTeam) onRefreshTeam();
            if (fetchTeam) fetchTeam(team?.id);
            gachaApi.getPacks().then((res) => setGachaPacks(res.data || []));
          }}
        />
      )}

      {/* Subtab 4: Payment Requests Tracking */}
      {activeSub === 'receipts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-white text-sm">تاریخچه تراکنش‌ها و رسیدهای واریزی</h3>
            <button
              onClick={fetchPaymentData}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              بروزرسانی
            </button>
          </div>

          {myPaymentRequests.length === 0 ? (
            <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400 text-xs">
              شما تاکنون درخواست واریزی ثبت نکرده‌اید.
            </div>
          ) : (
            myPaymentRequests.map((req) => (
              <div
                key={req.id}
                className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between text-xs bg-slate-900/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{req.package_name || 'بسته شارژ'}</span>
                    <span className="text-cyan-400 font-bold dir-ltr font-sport">
                      {req.currency_type === 'GEMS' ? `+${req.reward_amount || req.usd_amount} 💎` : `+$${req.reward_amount || req.usd_amount} USD`}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    مبلغ: <span className="text-amber-400 font-bold">{(req.amount_irr || 0).toLocaleString('fa-IR')} تومان</span>
                    {' • '}
                    <span>{new Date(req.created_at).toLocaleDateString('fa-IR')}</span>
                  </div>
                  {req.admin_note && (
                    <div className="text-[10.5px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/20">
                      یادداشت ادمین: {req.admin_note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {req.receipt_image && (
                    <button
                      onClick={() => setViewReceiptImage(req.receipt_image)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 border border-slate-700 cursor-pointer"
                    >
                      <Eye size={14} /> فیش
                    </button>
                  )}

                  {req.status === 'APPROVED' && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30 text-[10.5px]">
                      <CheckCircle size={14} /> تایید شد
                    </span>
                  )}
                  {req.status === 'PENDING_REVIEW' && (
                    <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-500/30 text-[10.5px]">
                      <Clock size={14} /> در انتظار تایید
                    </span>
                  )}
                  {req.status === 'AWAITING_RECEIPT' && (
                    <button
                      onClick={() => {
                        setSelectedCoinPkg({ id: req.package, name: req.package_name, price_irr: req.amount_irr, usd_amount: req.usd_amount, reward_amount: req.reward_amount, bonus_amount: req.bonus_amount, currency_type: req.currency_type });
                        setCurrentPaymentReq({ payment_request_id: req.id });
                        setPaymentStep(2);
                      }}
                      className="text-cyan-400 font-bold flex items-center gap-1 bg-cyan-950/60 px-2.5 py-1 rounded-xl border border-cyan-500/30 text-[10.5px] hover:bg-cyan-900 cursor-pointer"
                    >
                      <UploadCloud size={14} /> ارسال رسید
                    </button>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-500/30 text-[10.5px]">
                      <XCircle size={14} /> رد شد
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Subtab 5: Season Pass (VIP & Rewards) */}
      {activeSub === 'pass' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {passError && !seasonPassData && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{String(passError)}</span>
              </div>
              <button
                onClick={fetchSeasonPassData}
                className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-xl font-bold cursor-pointer transition-all"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {/* Header & Main Progress Panel with Integrated Battle Pass Stage Track */}
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/60 via-slate-900 to-amber-950/40 shadow-2xl space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-purple-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
                  <Crown size={26} className="text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>پاس فصلی لیگ برتر (Season Pass)</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-sport font-bold">
                      فصل ۱۴۰۵
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    پیشرفت با پیروزی و تساوی در مسابقات و انجام تسک‌های هفتگی تا هفته ۱۷ لیگ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollToLevel(Number(seasonPassData?.current_level || 1))}
                  className="px-3 py-2 rounded-2xl bg-purple-950/90 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                >
                  <Target size={14} className="text-purple-400" />
                  <span>پرش به مرحله من ({Number(seasonPassData?.current_level || 1)})</span>
                </button>

                <div className="text-left bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 block font-bold">سطح کنونی:</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-lg font-black text-amber-400 font-sport">
                      LEVEL {Number(seasonPassData?.current_level || 1)}
                    </span>
                    <span className="text-xs text-slate-400">/ ۲۰</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total XP Progress Bar */}
            {(() => {
              const curXp = Number(seasonPassData?.current_xp || 0);
              const progressPct = Math.min(100, Math.max(0, Math.round((curXp / 3500) * 100)));
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-sport">
                    <span className="text-cyan-300 font-bold font-sans">
                      مجموع تجربه (XP): <strong className="font-sport text-white font-bold">{curXp}</strong> / ۳,۵۰۰ XP
                    </span>
                    <span className="text-purple-300 font-bold font-sans">
                      {progressPct}% تکمیل کل سیزن پس
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, progressPct)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-400 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                    />
                  </div>
                </div>
              );
            })()}

            {/* Integrated Horizontal Battle Pass Stages Ladder */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" />
                  <span className="font-black text-white text-xs sm:text-sm">نقشه مراحل و دریافت جوایز (۲۰ مرحله)</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => scrollLadder('right')}
                    className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                    title="مراحل قبلی"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => scrollLadder('left')}
                    className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                    title="مراحل بعدی"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>

              {/* Horizontal Stage Container */}
              <div
                ref={ladderScrollRef}
                className="flex gap-4 overflow-x-auto py-3 px-1 scroll-smooth snap-x snap-mandatory rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-inner relative scrollbar-thin scrollbar-thumb-purple-600/40 scrollbar-track-slate-950/80"
                style={{ scrollbarWidth: 'thin' }}
              >
                {(seasonPassLevels || []).map((lvl, index) => {
                  if (!lvl) return null;
                  const currentXp = Number(seasonPassData?.current_xp || 0);
                  const reqXp = Number(lvl.xp_required || 0);
                  const lvlNum = Number(lvl.level || index + 1);
                  const isUnlocked = currentXp >= reqXp;
                  const claimedList = Array.isArray(seasonPassData?.claimed_levels) ? seasonPassData.claimed_levels : [];
                  const isClaimed = claimedList.includes(lvlNum);
                  const isFinal = Boolean(lvl.is_final_level);
                  const isCurrentActive = Number(seasonPassData?.current_level || 1) === lvlNum;
                  const isAnimating = animatingClaimLevel === lvlNum;

                  return (
                    <motion.div
                      key={lvl.id || lvlNum}
                      data-level-stage={lvlNum}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: isAnimating ? [1, 1.06, 0.98, 1] : 1
                      }}
                      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
                      className={`min-w-[280px] sm:min-w-[310px] max-w-[310px] shrink-0 snap-center rounded-3xl border transition-all duration-300 p-4 flex flex-col justify-between relative overflow-hidden ${
                        isAnimating
                          ? 'border-yellow-400 bg-amber-950 shadow-[0_0_40px_rgba(245,158,11,0.8)] z-20'
                          : isClaimed
                          ? 'bg-slate-900/40 border-emerald-500/40 shadow-inner'
                          : isUnlocked
                          ? 'bg-gradient-to-b from-purple-950/80 via-slate-900 to-amber-950/60 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
                          : isFinal
                          ? 'bg-gradient-to-b from-amber-950/50 via-slate-950 to-indigo-950/70 border-2 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Glowing Top Ambient for Unlocked or Final */}
                      {(isUnlocked || isFinal) && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-20 bg-gradient-to-b from-amber-500/30 to-transparent rounded-full blur-2xl pointer-events-none" />
                      )}

                      <div>
                        {/* Stage Node Header with Pipeline Indicator */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black font-sport text-xs shadow-md transition-all ${
                                isClaimed
                                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                  : isUnlocked
                                  ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                                  : isFinal
                                  ? 'bg-gradient-to-tr from-amber-500 to-purple-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {isClaimed ? (
                                <Check size={16} className="stroke-[3]" />
                              ) : isFinal ? (
                                <Crown size={16} />
                              ) : (
                                lvlNum
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-black text-white text-xs">
                                  مرحله {lvlNum}
                                </span>
                                {isCurrentActive && (
                                  <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-md font-bold">
                                    موقعیت شما
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block line-clamp-1">
                                {String(lvl.reward_title || `پاداش مرحله ${lvlNum}`)}
                              </span>
                            </div>
                          </div>

                          {/* XP Required Badge */}
                          <div className="text-left bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800/80">
                            <span className="text-xs font-sport font-black text-cyan-400 dir-ltr block">
                              {reqXp} XP
                            </span>
                          </div>
                        </div>

                        {/* Reward Details Box */}
                        <div className="space-y-1.5 text-xs mb-3">
                          {/* Free Reward Track */}
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 font-bold">پاداش رایگان:</span>
                              <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 rounded">Free</span>
                            </div>
                            <div className="flex justify-between items-center font-sport text-xs">
                              <span className="text-[#00ff87] font-black">
                                +${Number(lvl.free_reward_coins || 0).toLocaleString()} USD
                              </span>
                              <span className="text-cyan-300 font-black">
                                +{Number(lvl.free_reward_gems || 0)} 💎
                              </span>
                            </div>
                          </div>

                          {/* VIP Reward Track */}
                          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-950/50 to-slate-950/80 border border-purple-500/30 space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-purple-300 font-bold flex items-center gap-1">
                                <Crown size={10} className="text-amber-400" />
                                <span>پاداش ویژه:</span>
                              </span>
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 rounded font-bold">
                                VIP
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-sport text-xs">
                              <span className="text-amber-300 font-black">
                                +${Number(lvl.vip_reward_coins || 0).toLocaleString()} USD
                              </span>
                              <span className="text-amber-400 font-black">
                                +{Number(lvl.vip_reward_gems || 0)} 💎
                              </span>
                            </div>
                          </div>

                          {/* Special Level 20 Legend Card Showcase */}
                          {isFinal && (
                            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-950 to-purple-950/70 border border-amber-400/60 text-center space-y-1 shadow-lg">
                              <div className="flex items-center justify-center gap-1.5 text-amber-300 font-black text-[10.5px]">
                                <Sparkles size={13} className="text-amber-400 animate-spin-slow" />
                                <span>⭐ پاداش بزرگ پایانی سیزن</span>
                              </div>
                              <span className="text-[9.5px] text-slate-300 block">
                                بازیکن لجند اختصاصی و یکتای تیم شما مستقیماً به ترکیب اضافه می‌شود!
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stage Action Area */}
                      <div className="pt-2.5 border-t border-slate-800/80">
                        {isClaimed ? (
                          <div className="py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>جایزه این مرحله دریافت شد</span>
                          </div>
                        ) : isUnlocked ? (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleClaimLevel(lvlNum)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Gift size={15} className="text-slate-950 animate-bounce" />
                            <span>دریافت جایزه مرحله {lvlNum}</span>
                            <Sparkles size={13} className="text-slate-950" />
                          </motion.button>
                        ) : (
                          <div className="py-2 rounded-xl bg-slate-950 border border-slate-800/90 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5 font-sport">
                            <Lock size={12} className="text-slate-500" />
                            <span>
                              قفل ({Math.max(0, reqXp - currentXp)} XP مانده)
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* XP Rates Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">برد مسابقه لیگ:</span>
                <span className="text-emerald-400 font-black font-sport dir-ltr">+{Number(xpRates?.win_xp || 165)} XP</span>
              </div>
              <span className="text-[10px] text-slate-500 block">۱۵ برد = ۲,۴۷۵ XP (۷۰٪ مسیر)</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">مساوی مسابقه:</span>
                <span className="text-amber-400 font-black font-sport dir-ltr">+{Number(xpRates?.draw_xp || 70)} XP</span>
              </div>
              <span className="text-[10px] text-slate-500 block">امتیاز شرکت و نبرد</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">تکمیل هر تسک:</span>
                <span className="text-cyan-400 font-black font-sport dir-ltr">+{Number(xpRates?.task_xp || 56)} XP</span>
              </div>
              <span className="text-[10px] text-slate-500 block">۲۵ تسک = ۱,۴۰۰ XP (۴۰٪ مسیر)</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">هدف پایان سیزن:</span>
                <span className="text-purple-300 font-bold">هفته ۱۷ فصل</span>
              </div>
              <span className="text-[10px] text-slate-500 block">تکمیل کامل قبل از پایان لیگ</span>
            </div>
          </div>

          {/* Dedicated Legendary Player Showcase (Reward for Level 20) */}
          {(() => {
            const legend = seasonPassData?.assigned_legend_player;
            if (!legend || typeof legend !== 'object' || !legend.name) return null;
            return (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-950 to-purple-950/70 border border-amber-500/50 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-20 rounded-2xl bg-slate-950 border-2 border-amber-400/80 overflow-hidden shrink-0 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                      {getPlayerPhotoUrl(legend.name) ? (
                        <img
                          src={getPlayerPhotoUrl(legend.name)}
                          alt={String(legend.name)}
                          className="w-full h-full object-cover object-top"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <User size={28} className="text-amber-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                          ⭐ پاداش اختصاصی سطح ۲۰ تیم شما
                        </span>
                        {Boolean(seasonPassData?.legend_claimed) && (
                          <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Check size={12} /> در ترکیب تیم
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-white">
                        {String(legend.name)}
                      </h4>
                      <p className="text-xs text-slate-300 font-sport">
                        پست: <strong className="text-cyan-300">{String(legend.position || 'CF')}</strong> • 
                        قدرت کل (OVR): <strong className="text-amber-400">{Number(legend.overall || 90)}</strong> • 
                        سن: {Number(legend.age || 28)}
                      </p>
                    </div>
                  </div>

                  <div className="text-center md:text-left space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      این بازیکن اسطوره‌ای به صورت یکتا به باشگاه شما اختصاص یافته است.
                    </span>
                    {!Boolean(seasonPassData?.legend_claimed) && (
                      <span className="text-xs font-bold text-amber-300 block">
                        با رسیدن به سطح ۲۰ سیزن پس، مستقیماً به اسکواد شما ملحق می‌شود!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Claimed Reward Celebration Modal with Next-Level Auto-Navigation */}
      {typeof document !== 'undefined' && claimedRewardPopup && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => setClaimedRewardPopup(null)} />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-gradient-to-b from-purple-950/90 via-slate-950 to-slate-950 border-2 border-amber-400/80 rounded-3xl w-full max-w-md my-auto p-6 space-y-5 shadow-[0_0_60px_rgba(245,158,11,0.4)] text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Celebration Particle Glow */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-amber-500/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-purple-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(245,158,11,0.8)] border-2 border-white/60">
              <PartyPopper size={38} className="animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-0.5 rounded-full font-bold">
                مرحله {claimedRewardPopup?.claimedLevel || ''} با موفقیت فتح شد!
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                تبریک! پاداش دریافت شد 🎉
              </h3>
              <p className="text-xs text-slate-300">
                {String(claimedRewardPopup?.message || 'جوایز این مرحله به حساب باشگاه شما افزوده شدند.')}
              </p>
            </div>

            {/* Granted Rewards Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs font-sport">
              <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-sans">بودجه دلاری واریز شده:</span>
                <span className="text-[#00ff87] font-black text-sm">
                  +${Number(claimedRewardPopup?.coins_granted || 0).toLocaleString()} USD
                </span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-sans">الماس (جم) واریز شده:</span>
                <span className="text-cyan-300 font-black text-sm">
                  +{Number(claimedRewardPopup?.gems_granted || 0)} 💎
                </span>
              </div>

              {claimedRewardPopup?.legend_player && (
                <div className="pt-3 mt-2 border-t border-slate-800 space-y-2 text-center font-sans">
                  <span className="text-amber-300 font-bold block text-xs flex items-center justify-center gap-1">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>⭐ بازیکن لجند اختصاصی به ترکیب تیم ملحق شد!</span>
                  </span>
                  <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-500/60 flex items-center gap-3">
                    <div className="w-14 h-16 rounded-xl bg-slate-950 border-2 border-amber-400 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                      {getPlayerPhotoUrl(claimedRewardPopup.legend_player.name) ? (
                        <img
                          src={getPlayerPhotoUrl(claimedRewardPopup.legend_player.name)}
                          alt={String(claimedRewardPopup.legend_player.name)}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <User size={26} className="text-amber-400" />
                      )}
                    </div>
                    <div className="text-right">
                      <h5 className="font-black text-white text-sm">
                        {String(claimedRewardPopup.legend_player.name)}
                      </h5>
                      <p className="text-xs text-slate-300 font-sport mt-0.5">
                        پست: <strong className="text-cyan-300">{String(claimedRewardPopup.legend_player.position || 'CF')}</strong> • 
                        قدرت کل: <strong className="text-amber-400">{Number(claimedRewardPopup.legend_player.overall || 90)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Next Stage Navigation Action */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const nextLvl = Number(claimedRewardPopup?.nextLevel || 2);
                setClaimedRewardPopup(null);
                setTimeout(() => {
                  scrollToLevel(nextLvl);
                }, 300);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              <span>عالیه، حرکت به سمت مرحله بعدی (مرحله {claimedRewardPopup?.nextLevel || 2})</span>
              <ArrowLeft size={16} />
            </motion.button>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          Card-to-Card Payment Modal (createPortal to document.body)
      ────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && selectedCoinPkg && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => { setSelectedCoinPkg(null); setPaymentStep(1); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="relative z-10 w-full max-w-md my-auto glass-panel p-5 rounded-3xl border border-cyan-500/50 space-y-4 text-xs bg-gradient-to-b from-[#0e1626] to-[#070b14] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard size={18} className="text-cyan-400" /> پرداخت کارت‌به‌کارت
              </span>
              <button
                onClick={() => { setSelectedCoinPkg(null); setPaymentStep(1); }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Card Info, Persian Guide & Copy Actions */}
            {paymentStep === 1 && (
              <div className="space-y-3.5">
                {/* Step-by-Step Guide Banner */}
                <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <ShieldCheck size={15} className="text-cyan-400 shrink-0" />
                    <span>راهنمای گام‌به‌گام واریز:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed pr-1 text-[10.5px]">
                    <li>دقیقاً مبلغ مشخص‌شده را به شماره کارت زیر واریز فرمایید.</li>
                    <li>پس از انجام واریز، تصویر فیش / اسکرین‌شات رسید را ذخیره کنید.</li>
                    <li>روی دکمه «پرداخت کردم (ارسال رسید)» زده و عکس فیش را آپلود کنید.</li>
                    <li>پس از تایید ادمین، شارژ بلافاصله در پنل تیم شما اعمال می‌شود.</li>
                  </ol>
                </div>

                {/* Selected Package Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 flex justify-between items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 text-[10.5px] block">بسته انتخابی:</span>
                      {selectedCoinPkg.badge_tag && PACKAGE_TAGS[selectedCoinPkg.badge_tag] && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${PACKAGE_TAGS[selectedCoinPkg.badge_tag].badgeClass}`}>
                          {PACKAGE_TAGS[selectedCoinPkg.badge_tag].shortLabel}
                        </span>
                      )}
                    </div>
                    <strong className="text-white font-bold text-sm block mt-0.5">{selectedCoinPkg.name}</strong>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-cyan-300 font-bold text-xs dir-ltr font-sport">
                        {selectedCoinPkg.currency_type === 'GEMS'
                          ? `+${Number(selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount || 0).toLocaleString('fa-IR')} 💎 الماس`
                          : `+$${Number(selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount || 0).toLocaleString('fa-IR')} USD`}
                      </span>
                      {Number(selectedCoinPkg.bonus_amount || 0) > 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg font-black font-sport dir-ltr animate-pulse">
                          +{Number(selectedCoinPkg.bonus_amount).toLocaleString('fa-IR')} هدیه 🎁
                        </span>
                      )}
                    </div>
                    {Number(selectedCoinPkg.bonus_amount || 0) > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                        مجموع شارژ تیم شما: {selectedCoinPkg.currency_type === 'GEMS'
                          ? `${(Number(selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount || 0) + Number(selectedCoinPkg.bonus_amount || 0)).toLocaleString('fa-IR')} جم 💎`
                          : `$${(Number(selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount || 0) + Number(selectedCoinPkg.bonus_amount || 0)).toLocaleString('fa-IR')} USD`}
                      </span>
                    )}
                  </div>
                  <div className="text-left space-y-1 shrink-0">
                    <span className="text-slate-400 text-[10.5px] block">مبلغ واریزی (تومان):</span>
                    <div className="flex items-center gap-1.5 justify-end">
                      <strong className="text-amber-400 font-bold text-sm dir-ltr font-sport">
                        {(selectedCoinPkg.price_irr || 19000).toLocaleString('fa-IR')} تومان
                      </strong>
                      <button
                        onClick={() => handleCopyAmount(selectedCoinPkg.price_irr || 19000)}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-amber-500/40 cursor-pointer"
                        title="کپی مبلغ"
                      >
                        {isCopiedAmount ? <Check size={11} /> : <Copy size={11} />}
                        <span>{isCopiedAmount ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bank Card Info Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-cyan-950/80 border border-indigo-500/40 space-y-2 shadow-lg relative overflow-hidden">
                  <div className="flex justify-between items-center text-slate-300 text-[11px]">
                    <span className="font-bold">{cardInfo?.bank_name || 'بانک ملی ایران'}</span>
                    <span className="text-cyan-300 text-[10px]">واریز کارت‌به‌کارت شتابی</span>
                  </div>

                  {/* Card Number with Copy Button */}
                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 flex items-center justify-between">
                    <span className="font-mono text-base font-black tracking-widest text-cyan-300 dir-ltr">
                      {cardInfo?.card_number || '6037-9975-1234-5678'}
                    </span>
                    <button
                      onClick={() => handleCopyCard(cardInfo?.card_number || '6037-9975-1234-5678')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10.5px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                    >
                      {isCopiedCard ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopiedCard ? 'کپی شد' : 'کپی شماره کارت'}</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-slate-400">به نام صاحب حساب:</span>
                    <span className="font-bold text-white">{cardInfo?.card_holder_name || 'مدیریت لیگ مجازی (VML)'}</span>
                  </div>
                </div>

                <button
                  onClick={handleCreatePaymentRequest}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-2xl shadow-lg transition-all text-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                >
                  <UploadCloud size={16} />
                  <span>پرداخت کردم (مرحله بعد: ارسال تصویر رسید)</span>
                </button>
              </div>
            )}

            {/* Step 2: Upload Receipt Form */}
            {paymentStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300 leading-relaxed">
                  لطفاً تصویر یا اسکرین‌شات واضح از رسید واریز را بارگذاری نمایید تا برای تایید به ادمین ارسال گردد.
                </div>

                {/* File Upload Box */}
                <label className="border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {receiptPreview ? (
                    <div className="space-y-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        className="max-h-40 rounded-xl mx-auto object-contain border border-slate-700"
                      />
                      <span className="text-[10px] text-cyan-300 block">برای تغییر تصویر کلیک کنید</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <span className="font-bold text-white block">انتخاب تصویر فیش واریز</span>
                        <span className="text-[10px] text-slate-400">فرمت‌های JPG, PNG حداکثر ۵ مگابایت</span>
                      </div>
                    </>
                  )}
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentStep(1)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold cursor-pointer transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    onClick={handleSubmitReceipt}
                    disabled={!receiptFile || isUploadingReceipt}
                    className={`w-2/3 py-2.5 rounded-xl font-black transition-all cursor-pointer ${
                      receiptFile && !isUploadingReceipt
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isUploadingReceipt ? 'در حال ارسال فیش...' : 'ثبت و ارسال نهایی رسید'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Confirmation Screen */}
            {paymentStep === 3 && (
              <div className="text-center space-y-3 py-3">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto animate-pulse shadow-lg">
                  <CheckCircle size={36} />
                </div>
                <h4 className="text-base font-bold text-white">رسید با موفقیت ارسال شد!</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  اطلاعات واریز شما برای ادمین ارسال شد. پس از بررسی و تایید، مبلغ{' '}
                  <strong className="text-cyan-300 dir-ltr font-sport">
                    {selectedCoinPkg?.currency_type === 'GEMS'
                      ? `${(Number(selectedCoinPkg?.reward_amount || selectedCoinPkg?.usd_amount || 0) + Number(selectedCoinPkg?.bonus_amount || 0)).toLocaleString('fa-IR')} 💎 الماس`
                      : `$${(Number(selectedCoinPkg?.reward_amount || selectedCoinPkg?.usd_amount || 0) + Number(selectedCoinPkg?.bonus_amount || 0)).toLocaleString('fa-IR')} USD`}
                  </strong>
                  {Number(selectedCoinPkg?.bonus_amount || 0) > 0 && (
                    <span className="text-amber-300 font-bold"> (شامل {Number(selectedCoinPkg?.bonus_amount).toLocaleString('fa-IR')} پاداش هدیه)</span>
                  )}{' '}
                  مستقیماً به حساب تیم شما افزوده خواهد شد.
                </p>

                <button
                  onClick={() => {
                    setSelectedCoinPkg(null);
                    setPaymentStep(1);
                    setActiveSub('receipts');
                  }}
                  className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl shadow-lg mt-2 cursor-pointer hover:opacity-90 transition-all"
                >
                  مشاهده وضعیت در پیگیری واریزها
                </button>
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}

      {/* Full Image Preview Modal (createPortal to document.body) */}
      {typeof document !== 'undefined' && viewReceiptImage && createPortal(
        <div
          onClick={() => setViewReceiptImage(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 max-w-lg max-h-[85vh] my-auto p-2 glass-panel rounded-2xl border border-slate-700 overflow-hidden bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-300">تصویر رسید واریزی</span>
              <button
                onClick={() => setViewReceiptImage(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                بستن ✕
              </button>
            </div>
            <img
              src={viewReceiptImage}
              alt="Full Receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
