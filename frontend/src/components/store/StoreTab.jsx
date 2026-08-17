import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import {
  Gift, Coins, Award, Check, Sparkles, Crown, Zap,
  CreditCard, ShieldCheck, Copy, CheckCircle, UploadCloud,
  FileImage, Clock, AlertCircle, XCircle, ChevronRight, Eye, Gem
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { economyApi, gachaApi, seasonPassApi } from '../../services/api';
import { useTeam } from '../../context/TeamContext';
import Toast from '../common/Toast';

const STORE_SUBNAV = [
  { id: 'gems', label: 'الماس (جم 💎)' },
  { id: 'coins', label: 'بودجه باشگاه (دلار 💵)' },
  { id: 'packs', label: 'پک‌ها (گاشا 🎁)' },
  { id: 'pass', label: 'پاس فصلی (VIP 👑)' },
  { id: 'receipts', label: 'پیگیری واریزها' },
];

export default function StoreTab({ teamData, initialSub = 'gems' }) {
  const { team, fetchTeam } = useTeam();
  const [activeSub, setActiveSub] = useState(initialSub || 'gems');
  const teamId = teamData?.id || team?.id;
  const [storePackages, setStorePackages] = useState([]);
  const [gachaPacks, setGachaPacks] = useState([]);
  const [cardInfo, setCardInfo] = useState(null);
  const [myPaymentRequests, setMyPaymentRequests] = useState([]);

  useEffect(() => {
    if (initialSub) {
      setActiveSub(initialSub);
    }
  }, [initialSub]);

  // Pack opening animation state
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [gachaResult, setGachaResult] = useState(null);

  // Season Pass state
  const [seasonPassData, setSeasonPassData] = useState(null);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [seasonPassLevels, setSeasonPassLevels] = useState([]);

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

    if (teamId) {
      seasonPassApi.getStatus()
        .then((res) => {
          setSeasonPassData(res.data.season_pass);
          setWeeklyTasks(res.data.weekly_tasks || []);
          setSeasonPassLevels(res.data.levels || []);
        })
        .catch(err => console.log('Season pass data fetch failed', err));
    }
  }, [teamId]);

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

  const handleClaimDaily = () => {
    setDailyClaimed(true);
    setToastMessage('جایزه روزانه با موفقیت دریافت شد!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleClaimWeeklyTask = async (taskId) => {
    try {
      await seasonPassApi.claimTask(taskId);
      setToastMessage('امتیاز تسک دریافت شد!');
      // Refresh season pass status
      const res = await seasonPassApi.getStatus();
      setSeasonPassData(res.data.season_pass);
      setWeeklyTasks(res.data.weekly_tasks || []);
      setSeasonPassLevels(res.data.levels || []);
    } catch (err) {
      setToastMessage(err.response?.data?.error || 'خطا در دریافت جایزه');
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleClaimLevel = async (level) => {
    try {
      await seasonPassApi.claimLevel(level);
      setToastMessage(`پاداش سطح ${level} دریافت شد!`);
      const res = await seasonPassApi.getStatus();
      setSeasonPassData(res.data.season_pass);
      setWeeklyTasks(res.data.weekly_tasks || []);
      setSeasonPassLevels(res.data.levels || []);
    } catch (err) {
      setToastMessage(err.response?.data?.error || 'خطا در دریافت پاداش');
    } finally {
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  // Payment Handlers
  const handleStartPayment = (pkg) => {
    setSelectedCoinPkg(pkg);
    setPaymentStep(1);
    setReceiptFile(null);
    setReceiptPreview(null);
    setCurrentPaymentReq(null);
  };

  const handleCopyCard = (cardNumber) => {
    navigator.clipboard.writeText(cardNumber.replace(/-/g, ''));
    setIsCopiedCard(true);
    setTimeout(() => setIsCopiedCard(false), 2000);
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
      await economyApi.uploadReceipt(currentPaymentReq.payment_request_id, receiptFile);
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
    (p) => p.currency_type === 'GEMS' || (!p.currency_type && (p.name?.includes('جم') || p.name?.includes('الماس')))
  );

  const dollarPackages = (storePackages || []).filter(
    (p) => p.currency_type === 'BUDGET' || (!p.currency_type && !(p.name?.includes('جم') || p.name?.includes('الماس')))
  );

  return (
    <div className="space-y-4 font-sans pb-12">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

      {/* Sub navigation bar */}
      <SubNav items={STORE_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Gacha Open Animation Modal */}
      <AnimatePresence>
        {isOpeningPack && (
          <div className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-center space-y-4"
            >
              <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.8)] border-2 border-white/40">
                <Gift size={56} className="text-white animate-pulse" />
              </div>
              <span className="text-base font-black text-white block">در حال باز کردن پک...</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gacha Result Card Overlay */}
      <AnimatePresence>
        {gachaResult && (
          <div className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-panel p-6 rounded-3xl border-2 border-amber-400 max-w-xs w-full text-center space-y-4 bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            >
              <div className="text-xs font-black text-amber-300">تبریک! بازیکن جدید جذب شد</div>
              
              <div className="fut-card p-4 rounded-2xl border border-amber-400/50 bg-gradient-to-b from-amber-900/40 to-slate-900 shadow-xl">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-2xl font-sport shadow-inner">
                  {gachaResult.player?.overall_rating || gachaResult.player_rating || 88}
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-cyan-300 dir-ltr">{gachaResult.player?.position || 'CF'}</span>
                  <span className="text-[11px] font-bold text-white mt-2">{gachaResult.player?.name || gachaResult.player_name}</span>
                </div>
              </div>

              <button
                onClick={() => setGachaResult(null)}
                className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-2xl shadow-lg cursor-pointer"
              >
                تایید
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                const amount = pkg.reward_amount || pkg.usd_amount || 0;
                return (
                  <div key={pkg.id} className="fc-card p-4 rounded-3xl border border-cyan-500/40 hover:border-cyan-400 text-center space-y-3 bg-gradient-to-b from-cyan-950/40 via-purple-950/30 to-[#05080e] shadow-[0_0_20px_rgba(0,243,255,0.15)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)] transition-all">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-purple-600 border border-cyan-300/40 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,243,255,0.4)]">
                      <Gem size={24} className="text-cyan-200 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-black text-white text-sm block tracking-tight">{pkg.name}</span>
                      <span className="text-[12px] text-cyan-300 font-black font-sport dir-ltr block mt-0.5">+{Number(amount).toLocaleString('fa-IR')} 💎 الماس</span>
                    </div>
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
                const amount = pkg.reward_amount || pkg.usd_amount || 0;
                return (
                  <div key={pkg.id} className="fc-card p-4 rounded-3xl border border-amber-500/40 hover:border-amber-400 text-center space-y-3 bg-gradient-to-b from-amber-950/40 via-slate-900 to-[#05080e] shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] transition-all">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 border border-amber-300/40 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                      <Coins size={24} className="text-slate-950" />
                    </div>
                    <div>
                      <span className="font-black text-white text-sm block tracking-tight">{pkg.name}</span>
                      <span className="text-[12px] text-amber-300 font-black font-sport dir-ltr block mt-0.5">+${Number(amount).toLocaleString('fa-IR')} USD</span>
                    </div>
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

      {/* Subtab 3: Gacha Packs */}
      {activeSub === 'packs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          {gachaPacks.length > 0 ? (
            gachaPacks.map((pack) => (
              <div key={pack.id} className="fut-card p-4 rounded-3xl border border-purple-500/40 text-center space-y-3 bg-gradient-to-b from-purple-950/40 via-slate-900 to-[#05080e] shadow-xl">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                  <Gift size={28} className="text-white animate-bounce" />
                </div>
                <span className="font-black text-white text-sm block tracking-tight">{pack.name}</span>
                <div className="space-y-0.5 text-[10px]">
                  <span className="text-amber-300 font-bold block">Legendary: {pack.rate_legendary}%</span>
                  <span className="text-purple-300 block">Epic: {pack.rate_epic}% | Rare: {pack.rate_rare}%</span>
                </div>
                <button
                  onClick={() => handleOpenGacha(pack.id)}
                  className="fc-btn-magenta text-white px-3.5 py-2 rounded-2xl font-black w-full shadow-lg transition-all font-sport cursor-pointer"
                >
                  باز کردن پک ({pack.cost_usd ? `$${pack.cost_usd}` : `${pack.cost_gems} جم`})
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-slate-400">
              پکی در حال حاضر در دسترس نیست.
            </div>
          )}
        </motion.div>
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
                        setSelectedCoinPkg({ id: req.package, name: req.package_name, price_irr: req.amount_irr, usd_amount: req.usd_amount, reward_amount: req.reward_amount, currency_type: req.currency_type });
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

      {/* Subtab 5: Season Pass (VIP) */}
      {activeSub === 'pass' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-purple-500/40 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <span className="font-bold text-white text-sm">پاس فصلی (Season Pass)</span>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full dir-ltr font-bold">
                سطح {seasonPassData?.current_level || 1} از {seasonPassLevels.length || 50}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, ((seasonPassData?.current_xp || 0) / (seasonPassLevels.find(l => l.level === (seasonPassData?.current_level || 1))?.xp_required || 100)) * 100)}%` }}
              ></div>
            </div>
            
            <p className="text-slate-400 text-center text-[10px]">{seasonPassData?.current_xp || 0} XP دریافت شده</p>
          </div>

          {/* Weekly Tasks List */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
             <h3 className="font-bold text-white mb-2 border-b border-slate-800 pb-2">تسک‌های هفتگی</h3>
             {weeklyTasks.map(task => (
                <div key={task.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                   <div>
                      <span className="font-bold text-slate-200 block">{task.task?.title}</span>
                      <span className="text-[10px] text-slate-400">{task.current_value} / {task.task?.target_value} انجام شده</span>
                   </div>
                   
                   {task.is_claimed ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={14} /> دریافت شد</span>
                   ) : task.is_completed ? (
                      <button 
                         onClick={() => handleClaimTask(task.id)}
                         className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl transition-all text-[10px]"
                      >
                         دریافت +{task.task?.reward_xp} XP
                      </button>
                   ) : (
                      <span className="text-slate-500 font-bold px-3 py-1.5 border border-slate-700 rounded-xl bg-slate-800 text-[10px]">ناتمام</span>
                   )}
                </div>
             ))}
             {weeklyTasks.length === 0 && <p className="text-slate-500 text-xs text-center py-2">تسکی برای این هفته وجود ندارد.</p>}
          </div>

          {/* Levels List */}
          <div className="space-y-2">
             <h3 className="font-bold text-white px-2">جوایز سطوح</h3>
             {seasonPassLevels.map(lvl => (
                <div key={lvl.level} className={`p-3 rounded-xl border ${seasonPassData?.current_level >= lvl.level ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800 bg-slate-900/40'} flex justify-between items-center text-xs`}>
                   <div>
                      <span className="font-bold text-white block">سطح {lvl.level} <span className="text-slate-400 font-normal text-[10px]">({lvl.xp_required} XP)</span></span>
                      <div className="text-[10px] mt-1 space-y-1">
                         <div className="text-cyan-300">رایگان: {lvl.free_reward_gems} جم</div>
                         <div className="text-amber-400">ویژه (VIP): {lvl.vip_reward_player_rarity ? `بازیکن ${lvl.vip_reward_player_rarity}` : `${lvl.vip_reward_gems} جم`}</div>
                      </div>
                   </div>
                   
                   {seasonPassData?.claimed_levels?.includes(lvl.level) ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={14} /> کامل</span>
                   ) : seasonPassData?.current_level >= lvl.level ? (
                      <button 
                         onClick={() => handleClaimLevel(lvl.level)}
                         className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-md"
                      >
                         دریافت
                      </button>
                   ) : (
                      <span className="text-slate-600 font-bold">قفل</span>
                   )}
                </div>
             ))}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          Card-to-Card Payment Modal
      ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCoinPkg && (
          <div className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md glass-panel p-5 rounded-3xl border border-cyan-500/50 space-y-4 text-xs bg-gradient-to-b from-[#0e1626] to-[#070b14] shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard size={18} className="text-cyan-400" /> پرداخت کارت‌به‌کارت
                </span>
                <button
                  onClick={() => { setSelectedCoinPkg(null); setPaymentStep(1); }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Card Info & Confirmation */}
              {paymentStep === 1 && (
                <div className="space-y-4">
                  {/* Selected Package Summary */}
                  <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 text-[11px] block">بسته انتخابی:</span>
                      <strong className="text-white font-bold text-sm block">{selectedCoinPkg.name}</strong>
                      <span className="text-cyan-300 font-bold text-xs dir-ltr font-sport mt-0.5 inline-block">
                        {selectedCoinPkg.currency_type === 'GEMS'
                          ? `+${selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount} 💎 الماس`
                          : `+$${Number(selectedCoinPkg.reward_amount || selectedCoinPkg.usd_amount || 0).toLocaleString('fa-IR')} USD`}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-400 text-[11px] block">مبلغ واریزی:</span>
                      <strong className="text-amber-400 font-bold text-sm dir-ltr font-sport">
                        {(selectedCoinPkg.price_irr || 19000).toLocaleString('fa-IR')} تومان
                      </strong>
                    </div>
                  </div>

                  {/* Bank Card Info Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-cyan-950/80 border border-indigo-500/40 space-y-2.5 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-center text-slate-300 text-[11px]">
                      <span className="font-bold">{cardInfo?.bank_name || 'بانک ملی ایران'}</span>
                      <span className="text-cyan-300">واریز شتابی</span>
                    </div>

                    {/* Card Number with Copy Button */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex items-center justify-between">
                      <span className="font-mono text-base font-black tracking-widest text-cyan-300 dir-ltr">
                        {cardInfo?.card_number || '6037-9975-1234-5678'}
                      </span>
                      <button
                        onClick={() => handleCopyCard(cardInfo?.card_number || '6037-9975-1234-5678')}
                        className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all"
                      >
                        {isCopiedCard ? <Check size={12} /> : <Copy size={12} />}
                        <span>{isCopiedCard ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">به نام:</span>
                      <span className="font-bold text-white">{cardInfo?.card_holder_name || 'مدیریت لیگ مجازی (VML)'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                    <span>پس از واریز، در مرحله بعد عکس رسید واریزی را آپلود کنید.</span>
                  </div>

                  <button
                    onClick={handleCreatePaymentRequest}
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-3 rounded-2xl shadow-lg transition-all text-xs"
                  >
                    انجام دادم، مرحله بعد (ارسال رسید)
                  </button>
                </div>
              )}

              {/* Step 2: Upload Receipt Form */}
              {paymentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300">
                    لطفاً تصویر اسکرین‌شات رسید کارت‌به‌کارت را بارگذاری کنید.
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
                          <span className="font-bold text-white block">انتخاب تصویر رسید</span>
                          <span className="text-[10px] text-slate-400">فرمت‌های JPG, PNG حداکثر ۵ مگابایت</span>
                        </div>
                      </>
                    )}
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentStep(1)}
                      className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold"
                    >
                      بازگشت
                    </button>
                    <button
                      onClick={handleSubmitReceipt}
                      disabled={!receiptFile || isUploadingReceipt}
                      className={`w-2/3 py-2.5 rounded-xl font-black transition-all ${
                        receiptFile && !isUploadingReceipt
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-lg'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isUploadingReceipt ? 'در حال ارسال...' : 'ثبت و ارسال نهایی رسید'}
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
                  <h4 className="text-base font-bold text-white">رسید با موفقیت ثبت شد!</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    اطلاعات واریز شما برای ادمین ارسال شد. پس از بررسی و تایید، مبلغ <strong className="text-cyan-300 dir-ltr">+${selectedCoinPkg?.usd_amount || 100} دلار</strong> به بودجه تیم شما اضافه خواهد شد.
                  </p>

                  <button
                    onClick={() => {
                      setSelectedCoinPkg(null);
                      setPaymentStep(1);
                      setActiveSub('receipts');
                    }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl shadow-lg mt-2"
                  >
                    مشاهده وضعیت در پیگیری واریزها
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Image Preview Modal */}
      <AnimatePresence>
        {viewReceiptImage && (
          <div
            onClick={() => setViewReceiptImage(null)}
            className="fixed top-0 left-0 w-screen h-screen z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-pointer"
          >
            <div className="max-w-lg max-h-[85vh] p-2 glass-panel rounded-2xl border border-slate-700 overflow-hidden">
              <img
                src={viewReceiptImage}
                alt="Full Receipt"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
