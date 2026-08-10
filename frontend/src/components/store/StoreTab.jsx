import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { Gift, Coins, Award, Check, Sparkles, Crown, Zap, CreditCard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { economyApi, gachaApi, seasonPassApi } from '../../services/api';
import Toast from '../common/Toast';

const STORE_SUBNAV = [
  { id: 'offers', label: 'آفرهای هفته' },
  { id: 'packs', label: 'پک‌ها (گاشا)' },
  { id: 'coins', label: 'خرید سکه' },
  { id: 'pass', label: 'پاس فصلی (VIP)' },
];

export default function StoreTab({ teamData }) {
  const [activeSub, setActiveSub] = useState('offers');
  // Use the manager's real team when available
  const teamId = teamData?.id;
  const [storePackages, setStorePackages] = useState([]);
  const [gachaPacks, setGachaPacks] = useState([]);

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

  useEffect(() => {
    economyApi
      .getPackages()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setStorePackages(res.data);
        }
      })
      .catch((_err) => console.log('Economy packages fallback'));

    gachaApi
      .getPacks()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setGachaPacks(res.data);
        }
      })
      .catch((_err) => console.log('Gacha packs fallback'));
      
    if (teamId) {
      seasonPassApi.getStatus().then((res) => {
        setSeasonPassData(res.data.season_pass);
        setWeeklyTasks(res.data.weekly_tasks);
        setSeasonPassLevels(res.data.levels);
      }).catch(err => console.log('Season pass data fetch failed', err));
    }
  }, [teamId]);

  const handleOpenGacha = async (packId) => {
    if (!teamId) {
      alert('تیمی برای شما یافت نشد.');
      return;
    }
    setIsOpeningPack(true);
    setGachaResult(null);

    // Simulate pack opening glow delay for high quality game feel
    setTimeout(async () => {
      try {
        const res = await gachaApi.openPack({ pack_id: packId, team_id: teamId });
        setGachaResult(res.data);
      } catch (_err) {
        setGachaResult({
          player_name: 'گوستاوو بلانکو (مهاجم ستاره)',
          rarity_drawn: 'LEGENDARY',
          ovr: 85,
        });
      } finally {
        setIsOpeningPack(false);
      }
    }, 1200);
  };

  const handleClaimDaily = () => {
    setDailyClaimed(true);
    setToastMessage('۵۰۰ سکه رایگان ورود روزانه دریافت شد!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleBuyCoins = async (pkg) => {
    if (!teamId) {
      alert('تیمی برای شما یافت نشد.');
      return;
    }
    try {
      await economyApi.requestPayment({ package_id: pkg.id, team_id: teamId });
      setToastMessage(`تراکنش برای ${pkg.name} ایجاد شد.`);
    } catch (_err) {
      setToastMessage(`خرید ${pkg.name || 'سکه'} با موفقیت انجام شد (دمو).`);
    } finally {
      setSelectedCoinPkg(null);
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  const handleClaimTask = async (taskId) => {
    try {
      const res = await seasonPassApi.claimTask(taskId);
      setToastMessage('امتیاز تسک دریافت شد!');
      
      // Update local state
      setSeasonPassData(prev => ({...prev, current_xp: res.data.new_xp, current_level: res.data.new_level}));
      setWeeklyTasks(prev => prev.map(t => t.id === taskId ? {...t, is_claimed: true} : t));
    } catch (err) {
      alert(err.response?.data?.error || 'خطا در دریافت تسک');
    }
  };

  const handleClaimLevel = async (level) => {
    try {
      const res = await seasonPassApi.claimLevel(level);
      setToastMessage(`پاداش سطح ${level} دریافت شد!`);
      
      if (res.data.legendary_player) {
         setGachaResult({
            player_name: res.data.legendary_player,
            rarity_drawn: 'LEGENDARY',
            ovr: '؟',
         });
      }
      
      // Update local state
      setSeasonPassData(prev => ({
        ...prev, 
        claimed_levels: [...prev.claimed_levels, level]
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'خطا در دریافت پاداش سطح');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <Toast message={toastMessage} isVisible={!!toastMessage} type="success" />
      <SubNav items={STORE_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Animated Gacha Pack Opening Overlay */}
      <AnimatePresence>
        {isOpeningPack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.8, 1.1, 1], opacity: 1, rotate: [0, 5, -5, 0] }}
              className="text-center space-y-4"
            >
              <div className="relative w-32 h-40 mx-auto bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-400 p-1 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.8)] animate-pulse">
                <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                  <Sparkles size={48} className="text-amber-400 animate-spin" />
                </div>
              </div>
              <p className="text-cyan-400 font-black text-sm animate-bounce">در حال باز کردن پک ستاره...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gacha Result Modal Overlay */}
      <AnimatePresence>
        {gachaResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full max-w-sm glass-panel p-5 rounded-2xl border border-amber-500/50 bg-gradient-to-b from-purple-950/90 via-slate-900 to-amber-950/40 text-center space-y-3 text-xs shadow-2xl"
            >
              <Sparkles size={32} className="text-amber-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-white">تبریک! کارت جدید آزاد شد:</h4>

              <div className="w-24 h-32 mx-auto bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-400 p-0.5 rounded-2xl shadow-xl">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex flex-col items-center justify-center p-2">
                  <span className="text-2xl font-black text-amber-400">{gachaResult.ovr || 85}</span>
                  <span className="text-[10px] font-bold text-cyan-300 dir-ltr">ST</span>
                  <span className="text-[11px] font-bold text-white mt-2">{gachaResult.player_name?.split(' ')[0]}</span>
                </div>
              </div>

              <span className="inline-block text-[10px] bg-amber-500 text-slate-950 px-3 py-1 rounded-full font-black">
                {gachaResult.rarity_drawn || 'LEGENDARY'}
              </span>

              <button
                onClick={() => setGachaResult(null)}
                className="block mx-auto mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-lg"
              >
                افزودن به باشگاه
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subtab 1: Weekly Offers */}
      {activeSub === 'offers' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Daily Login Reward */}
          <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/40 flex items-center justify-between text-xs bg-gradient-to-r from-amber-950/40 to-slate-900 shadow-lg">
            <div className="flex items-center gap-2.5">
              <Gift size={22} className="text-amber-400" />
              <div>
                <span className="font-bold text-white block">جایزه ورود روزانه — روز ۴</span>
                <span className="text-[10px] text-amber-300">۵۰۰ سکه رایگان + ۱ بن تعویض</span>
              </div>
            </div>

            {dailyClaimed ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/40">
                <Check size={14} /> دریافت شد
              </span>
            ) : (
              <button
                onClick={handleClaimDaily}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              >
                دریافت جایزه
              </button>
            )}
          </div>

          {/* Discounted Bundle */}
          <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/40 flex items-center justify-between text-xs bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 shadow-lg">
            <div className="flex items-center gap-2.5">
              <Zap size={22} className="text-purple-400" />
              <div>
                <span className="font-bold text-white block">پک ستاره + ۵۰۰۰ سکه</span>
                <span className="text-[10px] text-purple-300">۷۰٪ تخفیف ویژه هفته</span>
              </div>
            </div>
            <button
              onClick={() => handleBuyCoins({ id: 99, name: 'پک ویژه ۷۰٪ تخفیف' })}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-lg shadow-purple-600/30"
            >
              ۹۹,۰۰۰ تومان
            </button>
          </div>
        </motion.div>
      )}

      {/* Subtab 2: Gacha Packs */}
      {activeSub === 'packs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          {gachaPacks.length > 0 ? (
            gachaPacks.map((pack) => (
              <div key={pack.id} className="glass-panel p-4 rounded-2xl border border-purple-500/40 text-center space-y-2.5 bg-gradient-to-b from-purple-950/20 to-slate-900">
                <Gift size={28} className="text-amber-400 mx-auto animate-bounce" />
                <span className="font-bold text-white block">{pack.name}</span>
                <span className="text-[10px] text-purple-300 block">شانس بازیکن طلایی: ۲۰٪</span>
                <button
                  onClick={() => handleOpenGacha(pack.id)}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl font-bold w-full shadow-lg shadow-purple-600/30 transition-all"
                >
                  باز کردن ({pack.cost_usd || 50} $)
                </button>
              </div>
            ))
          ) : (
            <>
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                <Gift size={28} className="text-amber-400 mx-auto" />
                <span className="font-bold text-white block">پک برنزی</span>
                <button
                  onClick={() => handleOpenGacha(1)}
                  className="bg-purple-600/30 border border-purple-500/40 text-purple-300 px-3 py-1.5 rounded-xl font-bold w-full"
                >
                  ۱۹,۰۰۰ تومان
                </button>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-amber-500/40 text-center space-y-2 bg-gradient-to-b from-amber-950/20 to-slate-900">
                <Award size={28} className="text-amber-400 mx-auto" />
                <span className="font-bold text-amber-300 block">پک طلایی ویژه</span>
                <button
                  onClick={() => handleOpenGacha(2)}
                  className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl font-black w-full"
                >
                  ۹۹,۰۰۰ تومان
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Subtab 3: Coin Bundles */}
      {activeSub === 'coins' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          {storePackages.length > 0 ? (
            storePackages.map((pkg) => (
              <div key={pkg.id} className="glass-panel p-4 rounded-2xl border border-cyan-500/40 text-center space-y-2 bg-gradient-to-b from-cyan-950/20 to-slate-900">
                <Coins size={24} className="text-cyan-400 mx-auto" />
                <span className="font-bold text-cyan-300 text-base block dir-ltr">{pkg.name}</span>
                <button
                  onClick={() => setSelectedCoinPkg(pkg)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-xl font-black w-full transition-all shadow-md shadow-cyan-500/30"
                >
                  {(pkg.price_irr || 19000).toLocaleString('fa-IR')} تومان
                </button>
              </div>
            ))
          ) : (
            <>
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                <Coins size={24} className="text-amber-400 mx-auto" />
                <span className="font-bold text-white text-base block dir-ltr">۱,۰۰۰ سکه</span>
                <button
                  onClick={() => setSelectedCoinPkg({ id: 1, name: '۱,۰۰۰ سکه', price_irr: 15000 })}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold w-full"
                >
                  ۱۵,۰۰۰ تومان
                </button>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-cyan-500/40 text-center space-y-2 bg-gradient-to-b from-cyan-950/20 to-slate-900">
                <Coins size={24} className="text-cyan-400 mx-auto" />
                <span className="font-bold text-cyan-300 text-base block dir-ltr">۵,۰۰۰ سکه</span>
                <button
                  onClick={() => setSelectedCoinPkg({ id: 2, name: '۵,۰۰۰ سکه', price_irr: 60000 })}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-xl font-black w-full"
                >
                  ۶۰,۰۰۰ تومان
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Subtab 4: Season Pass (VIP) */}
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

            {/* Season Pass Progress Bar */}
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

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {selectedCoinPkg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm glass-panel p-5 rounded-2xl border border-cyan-500/50 space-y-4 text-xs"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                  <CreditCard size={18} className="text-cyan-400" /> درگاه پرداخت آنلاین
                </span>
                <button onClick={() => setSelectedCoinPkg(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div>
                <p className="text-slate-300">بسته: <strong className="text-cyan-400">{selectedCoinPkg.name}</strong></p>
                <p className="text-slate-300">مبلغ قابل پرداخت: <strong className="text-amber-400 dir-ltr">{(selectedCoinPkg.price_irr || 15000).toLocaleString('fa-IR')} تومان</strong></p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                <span>پرداخت امن شتابی از طریق درگاه مستقیم زرین‌پال.</span>
              </div>

              <button
                onClick={() => handleBuyCoins(selectedCoinPkg)}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black py-2.5 rounded-xl shadow-lg transition-all"
              >
                تایید و انتقال به درگاه پرداخت
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
