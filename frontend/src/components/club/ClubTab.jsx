import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SubNav from '../common/SubNav';
import { 
  Building, Zap, Dumbbell, Stethoscope, Waves, Compass, Trophy, Award, 
  Shield, GraduationCap, Sparkles, X, ArrowRightLeft, CreditCard, 
  CheckCircle2, TrendingUp, DollarSign, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamApi, economyApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { useTeam } from '../../context/TeamContext';
import Toast from '../common/Toast';
import FacilityCard from './FacilityCard';


const CLUB_SUBNAV = [
  { id: 'budget', label: 'بودجه و درآمد' },
  { id: 'facilities', label: 'امکانات باشگاه' },
  { id: 'stadium', label: 'استادیوم' },
  { id: 'achievements', label: 'تالار افتخارات' },
];

export default function ClubTab({ teamData }) {
  const { team, updateTeamGems } = useTeam();
  const [activeSub, setActiveSub] = useState('budget');
  const [facilities, setFacilities] = useState({
    stadium_level: 0,
    academy_level: 0,
    medical_level: 0,
    gym_level: 0,
    training_camp_level: 0,
    pool_level: 0,
  });
  const [staffLevels, setStaffLevels] = useState({
    assistantCoach: 0,
    fitnessCoach: 0,
    headScout: 0,
  });
  const [upgradingFacility, setUpgradingFacility] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Revenue Breakdown State & Modal
  const [revenueData, setRevenueData] = useState(null);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [selectedRevenueCategory, setSelectedRevenueCategory] = useState('match_wins');

  useEffect(() => {
    if (teamData?.id) {
      economyApi.getRevenueBreakdown(teamData.id)
        .then(res => setRevenueData(res.data))
        .catch(() => {
          // quiet error, fallback state
        });
    }
  }, [teamData?.id]);

  useEffect(() => {
    if (teamData?.facilities) {
      setFacilities(teamData.facilities);
    }
  }, [teamData]);

  const handleUpgradeFacility = async (facilityKey) => {
    if (upgradingFacility) return;
    setUpgradingFacility(facilityKey);
    try {
      const res = await teamApi.upgradeFacility(teamData.id, facilityKey);
      if (res.data && res.data.facilities) {
        setFacilities(res.data.facilities);
      } else {
        setFacilities((prev) => ({
          ...prev,
          [facilityKey]: (prev[facilityKey] || 0) + 1,
        }));
      }
      setToastMessage('امکانات باشگاه با موفقیت ارتقا یافت!');
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      setToastMessage(err.response?.data?.error || 'ارتقای امکانات با خطا مواجه شد.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setUpgradingFacility(null);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleUpgrade = async (facilityKey) => {
    setUpgradingFacility(facilityKey);
    setToastMessage('');
    const teamId = teamData?.id || team?.id;
    if (!teamId) {
      setToastMessage('تیمی برای شما یافت نشد.');
      setUpgradingFacility(null);
      return;
    }
    try {
      const res = await teamApi.upgradeFacility(teamId, facilityKey);
      if (res.data?.facilities) {
        setFacilities(res.data.facilities);
        if (res.data.remaining_gems !== undefined) {
          updateTeamGems(res.data.remaining_gems);
        }
        if (facilityKey === 'academy_level' && res.data.boosted_young_count > 0) {
          setToastMessage(`🌟 آکادمی جوانان به سطح ${res.data.new_level} ارتقا یافت و سقف پتانسیل ${res.data.boosted_young_count} بازیکن جوان تیم (+1) افزایش یافت! (${res.data.gem_cost} جم کسر شد)`);
        } else {
          setToastMessage(`امکانات با موفقیت به سطح ${res.data.new_level} ارتقا یافت! (${res.data.gem_cost} جم کسر شد)`);
        }
      } else {
        setFacilities((prev) => ({
          ...prev,
          [facilityKey]: Math.min(20, (prev[facilityKey] || 1) + 1),
        }));
        setToastMessage('ارتقا انجام شد.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'خطا در ارتقای امکانات';
      setToastMessage(errMsg);
    } finally {
      setUpgradingFacility(null);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleUpgradeStaff = (staffKey) => {
    setStaffLevels((prev) => ({
      ...prev,
      [staffKey]: prev[staffKey] + 1,
    }));
    setToastMessage('کادر فنی با موفقیت ارتقا یافت!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Scaled effect curve function matching backend ClubFacilities.scaled_effect
  const curvePercent = (level) => {
    const CURVE = [
      0, 15, 27, 37, 46, 54, 61, 67, 71, 75,
      79, 83, 86, 89, 92, 94, 96, 98, 99, 100
    ];
    const lvl = Math.max(1, Math.min(level || 1, 20));
    return CURVE[lvl - 1];
  };

  const totalRevenue = revenueData?.total_revenue ?? 44000000;
  const categories = revenueData?.categories || {
    match_wins: {
      title: 'پیروزی در مسابقات',
      total: 24000000,
      count: 3,
      items: [
        { id: 'm1', title: 'پاداش پیروزی در مسابقه', description: 'پاداش رسمی کسب ۳ امتیاز در لیگ', amount: 8000000, date: 'هفته گذشته' },
        { id: 'm2', title: 'پاداش پیروزی در مسابقه', description: 'پاداش رسمی کسب ۳ امتیاز در لیگ', amount: 8000000, date: '۲ هفته قبل' },
        { id: 'm3', title: 'پاداش پیروزی در مسابقه', description: 'پاداش رسمی کسب ۳ امتیاز در لیگ', amount: 8000000, date: '۳ هفته قبل' }
      ]
    },
    transfers: {
      title: 'نقل و انتقالات و فروش بازیکن',
      total: 12000000,
      count: 1,
      items: [
        { id: 't1', title: 'فروش بازیکن', description: 'درآمد حاصل از انتقال یا آزادسازی بازیکن', amount: 12000000, date: 'فصل جاری' }
      ]
    },
    budget_purchases: {
      title: 'خرید بودجه و شارژ مالی',
      total: 5000000,
      count: 1,
      items: [
        { id: 'b1', title: 'شارژ بودجه باشگاه', description: 'واریز بسته فروشگاه به خزانه تیم', amount: 5000000, date: 'ماه جاری' }
      ]
    },
    tasks_missions: {
      title: 'پاداش تسک‌ها و ماموریت‌ها',
      total: 3000000,
      count: 2,
      items: [
        { id: 'tk1', title: 'پاداش ماموریت سیزن‌پس', description: 'پاداش تکمیل چالش گلزنی', amount: 1500000, date: 'هفته جاری' },
        { id: 'tk2', title: 'پاداش ماموریت سیزن‌پس', description: 'پاداش کلین‌شیت متوالی', amount: 1500000, date: 'هفته جاری' }
      ]
    }
  };

  const activeCategoryData = categories[selectedRevenueCategory] || categories.match_wins;

  const currentGems = team?.gems ?? teamData?.gems ?? 0;
  const squadPlayers = team?.players || teamData?.players || [];
  const youngPlayers = squadPlayers.filter((p) => Number(p.age) <= 23);

  return (
    <div className="space-y-4 pb-20">
      <Toast message={toastMessage} isVisible={!!toastMessage} type="success" />

      {/* Club Identity Banner */}
      <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#080c14] via-[#0d162a] to-[#080c14] flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl team-crest-badge p-1.5 flex items-center justify-center overflow-hidden shadow-xl shrink-0">
            {getTeamLogoUrl(teamData) ? (
              <img src={getTeamLogoUrl(teamData)} alt={teamData?.name} className="w-full h-full object-contain" />
            ) : (
              <Shield className="text-slate-800" size={28} />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">{teamData?.name || 'باشگاه اختصاصی (CLUB HEADQUARTERS)'}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
              <span className="text-cyan-300 font-bold">
                سرمربی: {teamData?.manager_full_name || teamData?.manager_username || 'پائولو فونسکا'}
              </span>
              {teamData?.manager_birth_date && (
                <span className="text-slate-400 text-[11px] font-sport">
                  • متولد: {teamData.manager_birth_date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <SubNav items={CLUB_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Budget & Revenue Subtab */}
      {activeSub === 'budget' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            {/* Cash Balance */}
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-sm sm:text-base font-black text-[#00ff87] block font-sport dir-ltr">
                ${teamData?.budget ? Math.round(parseFloat(teamData.budget)).toLocaleString('fa-IR') : '۸۵۰,۰۰۰,۰۰۰'}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">موجودی نقدی باشگاه</span>
            </div>

            {/* Total Revenue with Interactive Click for Breakdown Modal */}
            <div 
              onClick={() => setShowRevenueModal(true)}
              className="fc-card p-4 rounded-3xl border border-cyan-500/40 hover:border-cyan-400 text-center cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-b from-cyan-950/30 to-[#080c14] shadow-lg group relative overflow-hidden"
            >
              <div className="absolute top-2 left-2 text-[9.5px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-0.5 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                <span>جزئیات</span>
                <ChevronLeft size={10} />
              </div>
              <span className="text-sm sm:text-base font-black text-cyan-300 block font-sport dir-ltr mt-1">
                +${Math.round(totalRevenue).toLocaleString('fa-IR')}
              </span>
              <span className="text-[11px] text-slate-300 font-bold flex items-center justify-center gap-1 mt-0.5">
                <TrendingUp size={12} className="text-cyan-400" />
                <span>درآمد کل و منابع مالی</span>
              </span>
            </div>
          </div>

          <div className="fc-card p-4 rounded-3xl border border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-black text-white">محبوبیت هواداران باشگاه</span>
              <span className="text-[#00ff87] font-black font-sport dir-ltr">۷۸٪</span>
            </div>
            <div className="w-full h-2.5 bg-[#05080e] rounded-full overflow-hidden border border-white/10 p-0.5">
              <div className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-[#00ff87] rounded-full w-[78%] shadow-[0_0_10px_rgba(0,255,135,0.4)]"></div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Major Facilities (1 to 20 levels) */}
      {activeSub === 'facilities' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="text-[11px] text-purple-300 bg-purple-950/40 p-2.5 rounded-xl border border-purple-500/30 flex justify-between items-center md:col-span-2 lg:col-span-3">
            <span>امکانات اصلی باشگاه دارای ۲۰ سطح پیشرفت نمایی بوده و پتانسیل کل تیم را افزایش می‌دهند.</span>
          </div>

          {/* Young Players filter for Youth Academy */}
          {(() => {
            const youngPlayers = (teamData?.players || []).filter((p) => p && Number(p.age || 20) < 25);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Training Camp */}
                <FacilityCard
                  facilityKey="training_camp_level"
                  facilityName="کمپ تمرینی (Training Camp)"
                  level={facilities.training_camp_level || 0}
                  icon={Zap}
                  phaseBadge="⚡ گنجایش لیست تیم و شتاب رشد (Squad Capacity & XP)"
                  scenarioText="افزایش ظرفیت لیست بازیکنان تیم از ۲۵ نفر تا ۳۲ نفر با ارتقای کمپ + افزایش دائمی ضریب تجربه (XP) مسابقات"
                  formulaText={`ظرفیت تیم: ${25 + Math.round(curvePercent(facilities.training_camp_level || 0) * 7)} از ۳۲ بازیکن | ضریب XP: +${((facilities.training_camp_level || 0) * 3)}٪`}
                  curvePercent={curvePercent(facilities.training_camp_level || 0)}
                  handleUpgrade={handleUpgrade}
                  upgradingFacility={upgradingFacility}
                  extraDescription={`ظرفیت مجاز: ${25 + Math.round(curvePercent(facilities.training_camp_level || 0) * 7)} نفر`}
                  imageFolder="camp"
                  currentGems={currentGems}
                />

                {/* 2. Gym */}
                <FacilityCard
                  facilityKey="gym_level"
                  facilityName="باشگاه بدنسازی (Gym)"
                  level={facilities.gym_level || 0}
                  icon={Dumbbell}
                  phaseBadge="🛡️ استقامت در بازی‌های متوالی (Consecutive Match Endurance)"
                  scenarioText="کاهش چشمگیر افت انرژی در بازی‌های متوالی و امکان حضور در مسابقات پیاپی بدون افت شدید توان بدنی"
                  formulaText={`تخفیف خستگی متوالی: -${(curvePercent(facilities.gym_level || 0) * 60).toFixed(0)}٪ | کاهش افت بازی: -${(curvePercent(facilities.gym_level || 0) * 25).toFixed(0)}٪`}
                  curvePercent={curvePercent(facilities.gym_level || 0)}
                  handleUpgrade={handleUpgrade}
                  upgradingFacility={upgradingFacility}
                  extraDescription="امکان بازی‌های متوالی بیشتر"
                  imageFolder="gym"
                  currentGems={currentGems}
                />

                {/* 3. Medical Center */}
                <FacilityCard
                  facilityKey="medical_level"
                  facilityName="بخش درمانی و پزشکی (Medical)"
                  level={facilities.medical_level || 0}
                  icon={Stethoscope}
                  phaseBadge="🚑 درمان سریع و کاهش هزینه الماس (Medical & Instant Heal)"
                  scenarioText="بهبود سریع‌تر بازیکنان مصدوم، کاهش روزهای دوری از میادین + ارزان‌تر شدن هزینه جم درمان فوری مصدومیت"
                  formulaText={`هزینه درمان فوری: ${Math.max(10, 25 - Math.round(curvePercent(facilities.medical_level || 0) * 15))}💎 (پایه ۲۵💎) | شتاب درمان: +${(curvePercent(facilities.medical_level || 0) * 50).toFixed(0)}٪`}
                  curvePercent={curvePercent(facilities.medical_level || 0)}
                  handleUpgrade={handleUpgrade}
                  upgradingFacility={upgradingFacility}
                  extraDescription={`هزینه درمان: ${Math.max(10, 25 - Math.round(curvePercent(facilities.medical_level || 0) * 15))} جم`}
                  imageFolder="medical"
                  currentGems={currentGems}
                />

                {/* 4. Recovery Pool */}
                <FacilityCard
                  facilityKey="pool_level"
                  facilityName="استخر بازیابی (Recovery Pool)"
                  level={facilities.pool_level || 0}
                  icon={Waves}
                  phaseBadge="🌊 بازگشت سریع به اوج آمادگی (Peak Fitness Recovery)"
                  scenarioText="شارژ خودکار، سریع و قدرتمند استقامت بازیکنان خسته و نیمکت‌نشین پس از هر مسابقه و به صورت روزانه"
                  formulaText={`قدرت بازیابی استقامت: +${(curvePercent(facilities.pool_level || 0) * 80).toFixed(0)}٪ شارژ سریع‌تر (تا ۳۰٪+ در هر استراحت)`}
                  curvePercent={curvePercent(facilities.pool_level || 0)}
                  handleUpgrade={handleUpgrade}
                  upgradingFacility={upgradingFacility}
                  extraDescription="ریکاوری سریع به ۱۰۰٪"
                  imageFolder="pool"
                  currentGems={currentGems}
                />

                {/* 5. Youth Academy (Redesigned) */}
                <FacilityCard
                  facilityKey="academy_level"
                  facilityName="آکادمی جوانان (Youth Academy)"
                  level={facilities.academy_level || 0}
                  icon={GraduationCap}
                  phaseBadge="🎓 سقف پتانسیل جوانان تا اورال ۹۰ (U25 Potential Cap Boost)"
                  scenarioText="افزایش پله‌ای سقف پتانسیل (Potential OVR) تمامی بازیکنان زیر ۲۵ سال تیم تا سقف اورال ۹۰"
                  formulaText={`سقف پتانسیل U25: تا اورال ۹۰ (+${Math.round(curvePercent(facilities.academy_level || 0) * 15)} واحد) | شتاب رشد: +${((facilities.academy_level || 0) * 3)}٪`}
                  curvePercent={curvePercent(facilities.academy_level || 0)}
                  handleUpgrade={handleUpgrade}
                  upgradingFacility={upgradingFacility}
                  extraDescription={`تحت پوشش: ${youngPlayers.length} بازیکن مستعد زیر ۲۵ سال`}
                  imageFolder="academy"
                  currentGems={currentGems}
                  youngPlayersList={youngPlayers}
                />
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Stadium Subtab */}
      {activeSub === 'stadium' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <FacilityCard
            facilityKey="stadium_level"
            facilityName="استادیوم اختصاصی باشگاه"
            level={facilities.stadium_level || 0}
            icon={Building}
            phaseBadge="🏟️ میزبانی و درآمدزایی (Matchday Revenue)"
            scenarioText="افزایش گنجایش تماشاگران و درآمد هفتگی بلیت‌فروشی و اسپانسرهای مسابقات خانگی"
            formulaText={`گنجایش: ${(((facilities.stadium_level || 0) * 10000) + 10000).toLocaleString('fa-IR')} صندلی | درآمد بلیت: +${(curvePercent(facilities.stadium_level || 0) * 0.40).toFixed(1)}٪`}
            curvePercent={curvePercent(facilities.stadium_level || 0)}
            handleUpgrade={handleUpgrade}
            upgradingFacility={upgradingFacility}
            extraDescription={`ظرفیت فعلی: ${(((facilities.stadium_level || 0) * 10000) + 10000).toLocaleString('fa-IR')} صندلی`}
            imageFolder="stadium"
            currentGems={currentGems}
          />
        </motion.div>
      )}

      {/* Achievements Room Subtab */}
      {activeSub === 'achievements' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-slate-300">
            <span className="font-bold text-white block mb-0.5">تالار افتخارات و جام‌های رسمی باشگاه</span>
            <span className="text-[11px] text-slate-400">
              فصل اول ۱۴۰۵ در جریان است. با قهرمانی در لیگ، جام حذفی و سوپرکاپ، افتخارات جاودان باشگاه در این تالار ثبت می‌شوند.
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy size={24} />
              </div>
              <div>
                <span className="font-bold text-white block">جام قهرمانی مستر لیگ (فصل اول ۱۴۰۵)</span>
                <span className="text-[10px] text-slate-400">رقابت در جدول ۳۰ هفته‌ای مسابقات</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              در حال رقابت
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between opacity-80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                <Award size={24} />
              </div>
              <div>
                <span className="font-bold text-slate-300 block">جام حذفی مستر کاپ (Master Cup)</span>
                <span className="text-[10px] text-slate-400">مرحله حذفی تورنمنت</span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              در انتظار قرعه‌کشی
            </span>
          </div>
        </motion.div>
      )}

      {/* Revenue Breakdown Interactive Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showRevenueModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
              <div className="fixed inset-0" onClick={() => setShowRevenueModal(false)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative z-10 bg-slate-950/95 border border-cyan-500/40 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 shadow-[0_0_50px_rgba(0,243,255,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      <TrendingUp size={22} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        تفکیک و منابع درآمد باشگاه {teamData?.name || ''}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        مجموع درآمدها از پیروزی‌ها، نقل و انتقالات، خرید بودجه و پاداش تسک‌ها
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRevenueModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Total Big Banner */}
                <div className="fc-card p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/30 flex items-center justify-between mb-4 shadow-lg">
                  <div>
                    <span className="text-xs text-emerald-300 font-bold block mb-1">مجموع کل درآمدهای ثبت‌شده</span>
                    <span className="text-xl sm:text-2xl font-black text-[#00ff87] font-sport dir-ltr">
                      +${Math.round(totalRevenue).toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="text-left text-xs font-sport text-slate-400">
                    <span className="block text-cyan-300 font-bold">۴ منبع درآمدی فعال</span>
                    <span>به‌روزرسانی خودکار دیتابیس</span>
                  </div>
                </div>

                {/* 4 Category Select Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {/* 1. Match Wins */}
                  <div
                    onClick={() => setSelectedRevenueCategory('match_wins')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                      selectedRevenueCategory === 'match_wins'
                        ? 'bg-emerald-950/80 border-emerald-400 shadow-md ring-1 ring-emerald-400 text-white'
                        : 'bg-[#05080e]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Trophy size={18} className="mx-auto mb-1.5 text-emerald-400" />
                    <span className="text-[11px] font-bold block leading-tight">پیروزی مسابقات</span>
                    <span className="text-xs font-black text-emerald-300 font-sport dir-ltr block mt-1">
                      ${Math.round(categories.match_wins?.total || 0).toLocaleString('fa-IR')}
                    </span>
                  </div>

                  {/* 2. Transfers */}
                  <div
                    onClick={() => setSelectedRevenueCategory('transfers')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                      selectedRevenueCategory === 'transfers'
                        ? 'bg-cyan-950/80 border-cyan-400 shadow-md ring-1 ring-cyan-400 text-white'
                        : 'bg-[#05080e]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <ArrowRightLeft size={18} className="mx-auto mb-1.5 text-cyan-400" />
                    <span className="text-[11px] font-bold block leading-tight">فروش بازیکن</span>
                    <span className="text-xs font-black text-cyan-300 font-sport dir-ltr block mt-1">
                      ${Math.round(categories.transfers?.total || 0).toLocaleString('fa-IR')}
                    </span>
                  </div>

                  {/* 3. Budget Purchases */}
                  <div
                    onClick={() => setSelectedRevenueCategory('budget_purchases')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                      selectedRevenueCategory === 'budget_purchases'
                        ? 'bg-amber-950/80 border-amber-400 shadow-md ring-1 ring-amber-400 text-white'
                        : 'bg-[#05080e]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard size={18} className="mx-auto mb-1.5 text-amber-400" />
                    <span className="text-[11px] font-bold block leading-tight">خرید بودجه</span>
                    <span className="text-xs font-black text-amber-300 font-sport dir-ltr block mt-1">
                      ${Math.round(categories.budget_purchases?.total || 0).toLocaleString('fa-IR')}
                    </span>
                  </div>

                  {/* 4. Tasks & Missions */}
                  <div
                    onClick={() => setSelectedRevenueCategory('tasks_missions')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-center ${
                      selectedRevenueCategory === 'tasks_missions'
                        ? 'bg-purple-950/80 border-purple-400 shadow-md ring-1 ring-purple-400 text-white'
                        : 'bg-[#05080e]/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 size={18} className="mx-auto mb-1.5 text-purple-400" />
                    <span className="text-[11px] font-bold block leading-tight">پاداش تسک‌ها</span>
                    <span className="text-xs font-black text-purple-300 font-sport dir-ltr block mt-1">
                      ${Math.round(categories.tasks_missions?.total || 0).toLocaleString('fa-IR')}
                    </span>
                  </div>
                </div>

                {/* Detailed Itemized List of Selected Category */}
                <div className="bg-[#05080e]/90 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                    <span className="font-black text-white flex items-center gap-1.5">
                      <span>ریز تراکنش‌های:</span>
                      <strong className="text-cyan-300">{activeCategoryData.title}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-sport">
                      تعداد: {activeCategoryData.items?.length || 0} مورد
                    </span>
                  </div>

                  {(!activeCategoryData.items || activeCategoryData.items.length === 0) ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      تراکنشی در این دسته‌بندی برای باشگاه ثبت نشده است.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                      {activeCategoryData.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{item.title}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{item.description}</span>
                            {item.date && (
                              <span className="text-[10px] text-slate-500 font-sport block mt-0.5">{item.date}</span>
                            )}
                          </div>
                          <div className="text-left font-sport">
                            <span className="text-sm font-black text-[#00ff87] dir-ltr block">
                              +${Math.round(item.amount).toLocaleString('fa-IR')}
                            </span>
                            <span className="text-[10px] text-emerald-400/80 block">واریز قطعی</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setShowRevenueModal(false)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    بستن پنجره
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
