import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { Award, Zap, Building, Dumbbell, Stethoscope, Compass, Waves, Trophy, ArrowUp, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { teamApi } from '../../services/api';
import Toast from '../common/Toast';

const CLUB_SUBNAV = [
  { id: 'budget', label: 'بودجه و درآمد' },
  { id: 'facilities', label: 'تسهیلات اصلی باشگاه' },
  { id: 'stadium', label: 'استادیوم' },
  { id: 'achievements', label: 'تالار افتخارات' },
];

export default function ClubTab({ teamData }) {
  const [activeSub, setActiveSub] = useState('budget');
  const [facilities, setFacilities] = useState({
    stadium_level: 4,
    academy_level: 3,
    medical_level: 2,
    gym_level: 3,
    scouting_level: 2,
    training_camp_level: 3,
    pool_level: 1,
  });
  const [staffLevels, setStaffLevels] = useState({
    assistantCoach: 4,
    fitnessCoach: 2,
    headScout: 3,
  });
  const [upgradingFacility, setUpgradingFacility] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (teamData?.facilities) {
      setFacilities(teamData.facilities);
    }
  }, [teamData]);

  const handleUpgrade = async (facilityKey) => {
    setUpgradingFacility(facilityKey);
    setToastMessage('');
    try {
      const res = await teamApi.upgradeFacility(1, facilityKey);
      if (res.data?.facilities) {
        setFacilities(res.data.facilities);
        setToastMessage(`تسهیلات به سطح ${res.data.new_level} ارتقا یافت!`);
      } else {
        setFacilities((prev) => ({
          ...prev,
          [facilityKey]: Math.min(20, (prev[facilityKey] || 1) + 1),
        }));
        setToastMessage('ارتقا انجام شد.');
      }
    } catch (_err) {
      setFacilities((prev) => ({
        ...prev,
        [facilityKey]: Math.min(20, (prev[facilityKey] || 1) + 1),
      }));
      setToastMessage('ارتقاء با موفقیت انجام شد (حالت دمو).');
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
      <SubNav items={CLUB_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {/* Budget & Revenue Subtab */}
      {activeSub === 'budget' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-sm font-bold text-emerald-400 block dir-ltr">
                {teamData?.budget ? Math.round(parseFloat(teamData.budget)).toLocaleString('fa-IR') : '۸۵۰,۰۰۰,۰۰۰'} دلار
              </span>
              <span className="text-[11px] text-slate-400">موجودی نقدی باشگاه</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-sm font-bold text-cyan-400 block dir-ltr">
                +۴۴,۰۰۰,۰۰۰
              </span>
              <span className="text-[11px] text-slate-400">درآمد هفتگی</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-200">محبوبیت هواداران باشگاه</span>
              <span className="text-emerald-400 font-bold dir-ltr">۷۸٪</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full w-[78%]"></div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 flex justify-between items-center">
              <span>تراکنش‌های اخیر و فرمول مالی</span>
              <span className="text-[10px] text-cyan-400 font-mono">مالیات ۵٪</span>
            </h4>
            <div className="flex justify-between items-center py-1">
              <span>فروش بلیت مسابقه و اسپانسر رسانه</span>
              <span className="text-emerald-400 font-bold">+۱۲,۰۰۰,۰۰۰ دلار</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>پرداخت حقوق بازیکنان و کادر</span>
              <span className="text-rose-400 font-bold">-۳۰,۰۰۰,۰۰۰ دلار</span>
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
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block">کمپ تمرینی (Training Camp)</span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      فرمول: +{(curvePercent(facilities.training_camp_level) * 0.60).toFixed(1)}٪ سرعت رشد کلی
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.training_camp_level || 3} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${(facilities.training_camp_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">منحنی اثر: {curvePercent(facilities.training_camp_level)}٪ از حداکثر پتانسیل</span>
                <button
                  onClick={() => handleUpgrade('training_camp_level')}
                  disabled={upgradingFacility === 'training_camp_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>{upgradingFacility === 'training_camp_level' ? 'در حال ارتقا...' : 'ارتقا به سطح جدید'}</span>
                </button>
              </div>
            </div>

            {/* 2. Gym */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Dumbbell size={18} className="text-purple-400" />
                  <div>
                    <span className="font-bold text-white block">باشگاه بدنسازی (Gym)</span>
                    <span className="text-[10px] text-purple-300 font-mono">
                      فرمول: -{(curvePercent(facilities.gym_level) * 0.32).toFixed(1)}٪ کاهش افت استقامت
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-400 bg-purple-950/80 border border-purple-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.gym_level || 3} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all"
                  style={{ width: `${(facilities.gym_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">منحنی اثر: {curvePercent(facilities.gym_level)}٪ از حداکثر توان</span>
                <button
                  onClick={() => handleUpgrade('gym_level')}
                  disabled={upgradingFacility === 'gym_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>ارتقا به سطح جدید</span>
                </button>
              </div>
            </div>

            {/* 3. Medical Center */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Stethoscope size={18} className="text-emerald-400" />
                  <div>
                    <span className="font-bold text-white block">بخش درمانی و پزشکی (Medical)</span>
                    <span className="text-[10px] text-emerald-300 font-mono">
                      فرمول: +{(curvePercent(facilities.medical_level) * 0.40).toFixed(1)}٪ ریکاوری & -{(curvePercent(facilities.medical_level) * 0.32).toFixed(1)}٪ مصدومیت
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.medical_level || 2} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${(facilities.medical_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">منحنی اثر: {curvePercent(facilities.medical_level)}٪ از حداکثر توان</span>
                <button
                  onClick={() => handleUpgrade('medical_level')}
                  disabled={upgradingFacility === 'medical_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>ارتقا به سطح جدید</span>
                </button>
              </div>
            </div>

            {/* 4. Recovery Pool (Moved to Major Facilities) */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Waves size={18} className="text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block">استخر بازیابی (Recovery Pool)</span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      فرمول: +{(curvePercent(facilities.pool_level) * 0.24).toFixed(1)}٪ بونوس ریکاوری روزانه
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.pool_level || 1} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${(facilities.pool_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">ریکاوری سریع‌تر استقامت</span>
                <button
                  onClick={() => handleUpgrade('pool_level')}
                  disabled={upgradingFacility === 'pool_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>{upgradingFacility === 'pool_level' ? 'در حال ارتقا...' : 'ارتقا به سطح جدید'}</span>
                </button>
              </div>
            </div>

            {/* 5. Youth Academy */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Building size={18} className="text-amber-400" />
                  <div>
                    <span className="font-bold text-white block">آکادمی جوانان (Youth Academy)</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      پتانسیل جوانان: OVR {Math.round(65 + curvePercent(facilities.academy_level) * 0.20)}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.academy_level || 3} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(facilities.academy_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">تعداد خروجی فصل: ۲ بازیکن جدید</span>
                <button
                  onClick={() => handleUpgrade('academy_level')}
                  disabled={upgradingFacility === 'academy_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>ارتقا به سطح جدید</span>
                </button>
              </div>
            </div>

            {/* 6. Scouting Network */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Compass size={18} className="text-rose-400" />
                  <div>
                    <span className="font-bold text-white block">شبکه استعدادیابی بین‌المللی</span>
                    <span className="text-[10px] text-rose-300 font-mono">
                      تخفیف خرید: {(curvePercent(facilities.scouting_level) * 0.12).toFixed(1)}٪ & خطای تخمین: ±۴ OVR
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
                  Lvl {facilities.scouting_level || 2} / 20
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 transition-all"
                  style={{ width: `${(facilities.scouting_level / 20) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] text-slate-400">دقت آنالیز پتانسیل: ±۴ OVR</span>
                <button
                  onClick={() => handleUpgrade('scouting_level')}
                  disabled={upgradingFacility === 'scouting_level'}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
                >
                  <ArrowUp size={13} />
                  <span>ارتقا به سطح جدید</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stadium Subtab */}
      {activeSub === 'stadium' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Building size={18} className="text-amber-400" />
              <div>
                <span className="font-bold text-white block">استادیوم اختصاصی باشگاه</span>
                <span className="text-[10px] text-amber-300">ظرفیت فعلی: {((facilities.stadium_level || 4) * 10000 + 10000).toLocaleString('fa-IR')} صندلی</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full dir-ltr">
              Lvl {facilities.stadium_level || 4} / 20
            </span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${((facilities.stadium_level || 4) / 20) * 100}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-slate-400">بونوس درآمد بلیت‌فروشی: +{(curvePercent(facilities.stadium_level) * 0.40).toFixed(1)}٪</span>
            <button
              onClick={() => handleUpgrade('stadium_level')}
              disabled={upgradingFacility === 'stadium_level'}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-xl flex items-center gap-1 transition-all"
            >
              <ArrowUp size={13} />
              <span>ارتقا به سطح جدید</span>
            </button>
          </div>
        </motion.div>
      )}



      {/* Achievements Room Subtab */}
      {activeSub === 'achievements' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 text-xs">
          <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Trophy size={24} />
              </div>
              <div>
                <span className="font-bold text-white block">جام قهرمانی لیگ برتر فصل ۳</span>
                <span className="text-[10px] text-amber-300 font-mono"> پاداش: +۵۰,۰۰۰ دلار در هفته</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              کسب‌شده
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
                <Award size={24} />
              </div>
              <div>
                <span className="font-bold text-slate-300 block">جام حذفی سوپرکاپ</span>
                <span className="text-[10px] text-slate-400">در حال رقابت در مرحله نیمه‌نهایی</span>
              </div>
            </div>
            <span className="text-[10px] font-medium text-slate-400">قفل شده</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
