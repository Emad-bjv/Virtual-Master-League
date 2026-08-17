import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { Building, Zap, Dumbbell, Stethoscope, Waves, Compass, Trophy, Award, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { teamApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { useTeam } from '../../context/TeamContext';
import Toast from '../common/Toast';
import FacilityCard from './FacilityCard';


const CLUB_SUBNAV = [
  { id: 'budget', label: 'بودجه و درآمد' },
  { id: 'facilities', label: 'تسهیلات اصلی باشگاه' },
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
    scouting_level: 0,
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

  useEffect(() => {
    if (teamData?.facilities) {
      setFacilities(teamData.facilities);
    }
  }, [teamData]);

  const currentGems = team?.gems ?? teamData?.gems ?? 0;

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
        setToastMessage(`تسهیلات با موفقیت به سطح ${res.data.new_level} ارتقا یافت! (${res.data.gem_cost} جم کسر شد)`);
      } else {
        setFacilities((prev) => ({
          ...prev,
          [facilityKey]: Math.min(20, (prev[facilityKey] || 1) + 1),
        }));
        setToastMessage('ارتقا انجام شد.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'خطا در ارتقای تسهیلات';
      setToastMessage(errMsg);
    } finally {
      setUpgradingFacility(null);
      setTimeout(() => setToastMessage(''), 3500);
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
            <p className="text-xs text-cyan-300 font-medium">مدیریت تسهیلات حرفه‌ای، استادیوم و توسعه پایدار باشگاه</p>
          </div>
        </div>
      </div>

      <SubNav items={CLUB_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Budget & Revenue Subtab */}
      {activeSub === 'budget' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-sm sm:text-base font-black text-[#00ff87] block font-sport dir-ltr">
                ${teamData?.budget ? Math.round(parseFloat(teamData.budget)).toLocaleString('fa-IR') : '۸۵۰,۰۰۰,۰۰۰'}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">موجودی نقدی باشگاه</span>
            </div>
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-sm sm:text-base font-black text-cyan-300 block font-sport dir-ltr">
                +$۴۴,۰۰۰,۰۰۰
              </span>
              <span className="text-[11px] text-slate-400 font-bold">درآمد هفتگی پایدار</span>
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

          <div className="fc-card p-4 rounded-3xl border border-slate-700/60 space-y-2 text-xs">
            <h4 className="font-black text-slate-200 border-b border-slate-700/60 pb-2 flex justify-between items-center font-sport">
              <span>تراکنش‌های اخیر و فرمول مالی</span>
              <span className="text-[10px] text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">TAX: 5%</span>
            </h4>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-300">فروش بلیت مسابقه و اسپانسر رسانه</span>
              <span className="text-[#00ff87] font-black font-sport">+$۱۲,۰۰۰,۰۰۰</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-300">پرداخت حقوق بازیکنان و کادر فنی</span>
              <span className="text-rose-400 font-black font-sport">-$۳۰,۰۰۰,۰۰۰</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Major Facilities (1 to 20 levels) */}
      {activeSub === 'facilities' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="text-[11px] text-purple-300 bg-purple-950/40 p-2.5 rounded-xl border border-purple-500/30 flex justify-between items-center md:col-span-2 lg:col-span-3">
            <span>تسهیلات اصلی باشگاه دارای ۲۰ سطح پیشرفت نمایی بوده و پتانسیل کل تیم را افزایش می‌دهند.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Training Camp */}
            <FacilityCard 
              facilityKey="training_camp_level"
              facilityName="کمپ تمرینی (Training Camp)"
              level={facilities.training_camp_level || 0}
              icon={Zap}
              formulaText={`فرمول: +${(curvePercent(facilities.training_camp_level || 0) * 0.60).toFixed(1)}٪ سرعت رشد کلی`}
              curvePercent={curvePercent(facilities.training_camp_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="افزایش سرعت رشد بازیکنان"
              imageFolder="camp"
              currentGems={currentGems}
            />

            {/* 2. Gym */}
            <FacilityCard 
              facilityKey="gym_level"
              facilityName="باشگاه بدنسازی (Gym)"
              level={facilities.gym_level || 0}
              icon={Dumbbell}
              formulaText={`فرمول: -${(curvePercent(facilities.gym_level || 0) * 0.32).toFixed(1)}٪ کاهش افت استقامت`}
              curvePercent={curvePercent(facilities.gym_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="جلوگیری از خستگی زودرس"
              imageFolder="camp"
              currentGems={currentGems}
            />

            {/* 3. Medical Center */}
            <FacilityCard 
              facilityKey="medical_level"
              facilityName="بخش درمانی و پزشکی (Medical)"
              level={facilities.medical_level || 0}
              icon={Stethoscope}
              formulaText={`فرمول: +${(curvePercent(facilities.medical_level || 0) * 0.40).toFixed(1)}٪ ریکاوری & -${(curvePercent(facilities.medical_level || 0) * 0.32).toFixed(1)}٪ مصدومیت`}
              curvePercent={curvePercent(facilities.medical_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="کاهش زمان مصدومیت"
              imageFolder="camp"
              currentGems={currentGems}
            />

            {/* 4. Recovery Pool */}
            <FacilityCard 
              facilityKey="pool_level"
              facilityName="استخر بازیابی (Recovery Pool)"
              level={facilities.pool_level || 0}
              icon={Waves}
              formulaText={`فرمول: +${(curvePercent(facilities.pool_level || 0) * 0.24).toFixed(1)}٪ بونوس ریکاوری روزانه`}
              curvePercent={curvePercent(facilities.pool_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="ریکاوری سریع‌تر استقامت"
              imageFolder="camp"
              currentGems={currentGems}
            />

            {/* 5. Youth Academy */}
            <FacilityCard 
              facilityKey="academy_level"
              facilityName="آکادمی جوانان (Youth Academy)"
              level={facilities.academy_level || 0}
              icon={Building}
              formulaText={`پتانسیل جوانان: OVR ${Math.round(65 + curvePercent(facilities.academy_level || 0) * 0.20)}`}
              curvePercent={curvePercent(facilities.academy_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="خروجی آکادمی: بازیکنان جوان مستعد"
              imageFolder="camp"
              currentGems={currentGems}
            />

            {/* 6. Scouting Network */}
            <FacilityCard 
              facilityKey="scouting_level"
              facilityName="شبکه استعدادیابی بین‌المللی"
              level={facilities.scouting_level || 0}
              icon={Compass}
              formulaText={`تخفیف خرید: ${(curvePercent(facilities.scouting_level || 0) * 0.12).toFixed(1)}٪ & خطای تخمین: ±۴ OVR`}
              curvePercent={curvePercent(facilities.scouting_level || 0)}
              handleUpgrade={handleUpgrade}
              upgradingFacility={upgradingFacility}
              extraDescription="دقت آنالیز پتانسیل: ±۴ OVR"
              imageFolder="camp"
              currentGems={currentGems}
            />
          </div>
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
            formulaText={`بونوس درآمد بلیت‌فروشی: +${(curvePercent(facilities.stadium_level || 0) * 0.40).toFixed(1)}٪`}
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
    </div>
  );
}
