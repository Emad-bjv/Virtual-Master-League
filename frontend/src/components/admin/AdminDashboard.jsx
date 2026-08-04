import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { ShieldAlert, Coins, RefreshCw, HeartPulse, Sliders, CheckCircle2, ArrowLeft, UserPlus, Building, Mail, Lock, Unlock, Info, DollarSign, Tv, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminApi, teamApi } from '../../services/api';
import EFootballGamePlan from '../team/EFootballGamePlan';
import AdminMatchPitchController from './AdminMatchPitchController';
import ErrorBoundary from '../common/ErrorBoundary';
import CustomSelect from '../common/CustomSelect';

const ADMIN_SUBNAV = [
  { id: 'overview', label: 'داشبورد ادمین' },
  { id: 'live_admin', label: 'مدیریت پخش زنده' },
  { id: 'register_coach', label: 'ثبت مربی جدید' },
];

const TODAYS_MATCHES = [
  { id: 'm1', home: 'باشگاه البرز', away: 'سپاهان', time: '۱۸:۳۰', stadium: 'ورزشگاه آزادی' },
  { id: 'm2', home: 'استقلال', away: 'پرسپولیس', time: '۲۰:۴۵', stadium: 'ورزشگاه آزادی' },
  { id: 'm3', home: 'تراکتور', away: 'گل گهر', time: '۲۱:۰۰', stadium: 'ورزشگاه یادگار امام' },
];

const INITIAL_PLAYERS = [
  { id: 1, name: 'آلیسون', team: 'باشگاه البرز', position: 'GK', overall: 87, stamina: 100, is_injured: false, rarity: 'EPIC' },
  { id: 2, name: 'ویرجیل فن دایک', team: 'باشگاه البرز', position: 'CB', overall: 86, stamina: 42, is_injured: false, rarity: 'LEGENDARY' },
  { id: 3, name: 'رایان گراونبرخ', team: 'باشگاه البرز', position: 'DMF', overall: 85, stamina: 25, is_injured: true, rarity: 'RARE' },
  { id: 4, name: 'محمد صلاح', team: 'باشگاه البرز', position: 'RWF', overall: 87, stamina: 86, is_injured: false, rarity: 'LEGENDARY' },
  { id: 5, name: 'سجاد حسینی', team: 'سپاهان', position: 'ST', overall: 79, stamina: 92, is_injured: false, rarity: 'REGULAR' },
  { id: 6, name: 'رضا کریمی', team: 'استقلال', position: 'CMF', overall: 82, stamina: 78, is_injured: false, rarity: 'RARE' },
];

const INITIAL_COACHES = [
  { id: 1, coachName: 'امید رضایی', clubName: 'باشگاه البرز', email: 'omid@masterleague.ir', budget: 850000000 },
  { id: 2, coachName: 'محمدرضا ساکت', clubName: 'سپاهان', email: 'sepahan@masterleague.ir', budget: 750000000 },
  { id: 3, coachName: 'جواد نکونام', clubName: 'استقلال', email: 'esteghlal@masterleague.ir', budget: 680000000 },
];

const TACTICAL_GUIDES = {
  'بازی مالکانه': 'بازيكنان به دنبال حفظ مالکیت در فضاهای كوچک هستند. سپس همه هم تیمی های موجود پشتيبانى لازم را انجام مى دهند.',
  'ضد حمله': 'وقتى صاحب توپ هستند، بازيكنان به جلو مى روند تاخود را به مناطق تهديدآميز برسانند.',
  'پاس کوتاه': 'با عبور از كناره هاتا انتهای زمين، حريف را بشكنید. بازيكنان فاصله مشخصى رااز هم حفظ مى كنندتا فضای بیشتری برای پاس ايجاد كنند.',
  'پاس بلند': 'سبک بازى مستقيم شامل ارسال توپهاى بلند به خط حمله. بازیکنان تیم، حریف را براى ايجاد فضادور می کنند و هنگامی که توپ بلند به مقصد رسيد، آنها به حمایت از مهاجمین جلوتر از خود اقدام مى کنند.',
  'مرکز': 'حملات تيم عمدتا از مركز انجام میشه. تبادل توپ وارتباطات برای بازیسازی در نواحی مركزى اتفاق میافته.',
  'کناره': 'حملات تيم عمدتا از كناره هاست. تبادل توپ وارتباطات برای بازیسازی در كناره ها اتفاق میافته.',
  'شناور': 'بازيكنان فوتبال روانى رو انجام ميدن وبراى پوشش هم تيمى ها مدام تغيير موقعیت میدن.',
  'حفظ ترکیب': 'بازيكنان سعى می كنند شكل كلى تيم راحفظ کنند.',
  'support_range': 'هر چه بالاتر باشد، بازيكنان تمايل بيشترى به تحرک جهت دریافت پاس دارند.',
  'فشار خط مقدم': 'وقتی توپ از دست میره، بازيكنان از همون جلو فشار میارند تا توپ رو تصاحب کنند.',
  'همه دفاع': 'وقتی توپ از دست میره، بازیکنان به نیمه خودی برمیگردن و یه دیوار دفاعى تشكيل ميدن.',
  'میانه': 'يك خط دفاعى تشكيل دهید كه تمام راههای ارسال به جلو را قطع کند، سپس بازیکنان حریف را به وسط زمين هل دهيد تا تيم بتواند بانفرات بیشتری دفاع کند.',
  'کناره_دفاع': 'موقع دفاع، وقتی بازیکن صاحب توپ حريف به كناره ها ميره وميخواد پاس رو به جلو بده با تعداد نفرات بالا دفاع كنیم.',
  'تهاجمی': 'وقتی صاحب توپ نیستند، بازيكنان حریف صاحب توپ رو شدیدا زیر فشار قرار میدهند.',
  'محافظه‌کار': 'وقتی صاحب توپ نیستند، بازیکنان عقب نشسته و خطوط دفاعی رو حفظ می‌کنند.',
  'defensive_line': 'هر چه بالاتر باشد، خط دفاعی تیم جلوتر می‌آید (آفسایدگیری ریسکی‌تر).',
  'compactness': 'هر چه بالاتر باشد، بازیکنان در عرض زمین فشرده‌تر دفاع می‌کنند.',
  'هیچکدام': 'هیچ تاکتیک پیشرفته‌ای فعال نیست.',
  'لنگر انداختن': 'بازیکن در موقعیت انتخابی خود ثابت می‌ماند و در عرض زمین جابجا نمی‌شود.',
  'بال غلط': 'وینگرها به داخل محوطه نفوذ کرده و فضا را برای فولبک‌ها باز می‌کنند.',
  'تدافعی': 'مهاجم انتخاب شده در کارهای دفاعی شرکت کرده و عقب می‌آید.',
  'نزدیک به خط اطراف زمین': 'بازیکنان کناری تا حد امکان به خط طولی زمین می‌چسبند.',
  'دفاع کنار‌های تهاجمی': 'مدافعان کنار مدام در حملات شرکت کرده و سانتر می‌کنند.',
  'دوران بال‌ها': 'هنگام هجوم، جایگاه وینگر و هاپفبک کناری تعویض می‌شود.',
  'تیکی تاکا': 'پاسکاری‌های سریع و کوتاه در فضاهای بسیار فشرده.',
  'شماره ۹ کاذب': 'مهاجم نوک عقب آمده و برای هافبک‌ها فضاسازی می‌کند.',
  'اهداف مرکز': 'ارسال‌ها مستقیماً برای مهاجمان مرکزی صورت می‌گیرد.',
  'فولبک‌های کاذب': 'مدافعان کنار به میانه زمین آمده و نقش هافبک دفاعی را ایفا می‌کنند.',
  'بال عقب': 'وینگرها موقع دفاع تا خط دفاعی عقب می‌آیند.',
  'خط دفاعی عمیق': 'مدافعان کاملاً به محوطه جریمه خودی می‌چسبند.',
  'شلوغی در محوطه جریمه': 'تعداد زیادی از بازیکنان در محوطه جریمه جمع می‌شوند.',
  'مقابله با هدف': 'یکی از مهاجمان اصلاً در دفاع شرکت نکرده و برای ضدحمله آماده می‌ماند.',
  'فشار': 'به محض از دست رفتن توپ، کل تیم شدیداً فشار می‌آورد (Gegenpress).',
};

export default function AdminDashboard({ onExitAdmin, liveStreamUrl, setLiveStreamUrl, onPushLiveEvent, currentMatchStatus, onMatchStatusChange }) {
  const [activeSub, setActiveSub] = useState('overview');
  const [playersList, setPlayersList] = useState(INITIAL_PLAYERS);
  const [coachesList, setCoachesList] = useState(INITIAL_COACHES);
  const [selectedTeam, setSelectedTeam] = useState('باشگاه البرز');

  // Live Match Admin Stream State
  const [streamInput, setStreamInput] = useState(liveStreamUrl || '');
  const [customEventText, setCustomEventText] = useState('');
  
  // New Match Details State
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [selectedLiveTeamSwitch, setSelectedLiveTeamSwitch] = useState('home');
  
  // Admin Interactive Tactics Control State
  const [adminTacticTab, setAdminTacticTab] = useState('offense');
  const [adminTactics, setAdminTactics] = useState({
    play_style: 'بازی مالکانه',
    build_up: 'پاس کوتاه',
    attacking_area: 'مرکز',
    positioning: 'شناور',
    support_range: 7,
    defensive_style: 'فشار خط مقدم',
    containment_area: 'میانه',
    pressing: 'تهاجمی',
    defensive_line: 8,
    compactness: 7,
    adv_offense_1: 'تیکی تاکا',
    adv_offense_2: 'شماره ۹ کاذب',
    adv_defense_1: 'فشار',
    adv_defense_2: 'خط دفاعی عمیق',
  });
  const [tacticSaveNotice, setTacticSaveNotice] = useState('');
  const [submittedGameplans, setSubmittedGameplans] = useState({
    home: {
      play_style: 'پاسکاری کوتاه (Possession)',
      defensive_press: 'پرس از جلو (High Press)',
      attacking_level: 'کاملاً هجومی +۲',
      offside_trap: true,
      is_submitted: true,
    },
    away: {
      play_style: 'ضد حمله (Counter Attack)',
      defensive_press: 'دفاع عمیق (Deep Block)',
      attacking_level: 'متعادل ۰',
      offside_trap: false,
      is_submitted: true,
    },
  });

  useEffect(() => {
    if (selectedLiveMatch) {
      teamApi
        .getGameplan(1)
        .then((res) => {
          if (res.data && res.data.gameplan) {
            setSubmittedGameplans((prev) => ({
              ...prev,
              home: {
                ...res.data.gameplan,
                is_submitted: res.data.gameplan.is_submitted ?? true,
              },
            }));
          }
        })
        .catch(() => {});
    }
  }, [selectedLiveMatch]);

  // New Coach Registration Form State
  const [newCoach, setNewCoach] = useState({
    coachName: '',
    clubName: '',
    email: '',
    password: '',
    budget: 850000000,
    wageCap: 10000,
  });

  const [facilityOverride, setFacilityOverride] = useState({
    training_camp_level: 3,
    gym_level: 3,
    medical_level: 2,
    pool_level: 1,
    academy_level: 3,
    scouting_level: 2,
    stadium_level: 4,
  });

  const [adminMessage, setAdminMessage] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  const showNotification = (msg) => {
    setAdminMessage(msg);
    setTimeout(() => setAdminMessage(''), 3500);
  };

  const handleUpdateStreamUrl = (e) => {
    e.preventDefault();
    if (setLiveStreamUrl) setLiveStreamUrl(streamInput);
    showNotification('لینک پخش زنده آپارات با موفقیت به‌روزرسانی شد و در پنل مربی اعمال گردید.');
  };

  const handleCustomEventSubmit = (e) => {
    e.preventDefault();
    if (!customEventText) return;

    const newEv = {
      id: Date.now(),
      type: 'INFO',
      text: `${customEventText} 📣`,
      team: 'عمومی',
      icon: '📣',
      color: 'text-purple-300 border-purple-500/40 bg-purple-950/40',
    };

    if (onPushLiveEvent) onPushLiveEvent(newEv);
    showNotification('گزارش سفارشی با موفقیت به تایم‌لاین مربی ارسال شد.');
    setCustomEventText('');
  };

  const handleRegisterCoachSubmit = (e) => {
    e.preventDefault();
    if (!newCoach.coachName || !newCoach.clubName || !newCoach.email) {
      showNotification('لطفاً تمام اطلاعات الزامی مربی را وارد کنید.');
      return;
    }

    const created = {
      id: Date.now(),
      coachName: newCoach.coachName,
      clubName: newCoach.clubName,
      email: newCoach.email,
      budget: parseFloat(newCoach.budget),
    };

    setCoachesList((prev) => [created, ...prev]);
    showNotification(`مربی ${newCoach.coachName} با موفقیت برای باشگاه «${newCoach.clubName}» در سیستم ثبت شد!`);

    setNewCoach({
      coachName: '',
      clubName: '',
      email: '',
      password: '',
      budget: 850000000,
      wageCap: 10000,
    });
  };

  const handleSimulateMatches = () => {
    showNotification('شبیه‌سازی کامل مسابقات هفته با موفقیت توسط ادمین اجرا شد!');
  };

  const handleResetStaminaAll = () => {
    setPlayersList((prev) =>
      prev.map((p) => ({ ...p, stamina: 100, is_injured: false }))
    );
    showNotification('استقامت تمام بازیکنان لیگ به ۱۰۰٪ بازنشانی شد و مصدومیت‌ها برطرف گردید.');
  };

  const handleDistributeSponsorIncome = () => {
    showNotification('درآمد هفتگی اسپانسرها و بلیت‌فروشی به حساب تمام تیم‌ها واریز شد.');
  };

  const handleHealPlayer = async (player) => {
    try {
      await adminApi.updatePlayer({ player_id: player.id, heal_injury: true, virtual_stamina: 100 });
    } catch (_err) {
      // demo fallback
    }
    setPlayersList((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, is_injured: false, stamina: 100 } : p))
    );
    showNotification(`بازیکن ${player.name} درمان شد و استقامت وی به ۱۰۰٪ رسید.`);
  };

  const handleSavePlayerEdit = async () => {
    if (!editingPlayer) return;
    try {
      await adminApi.updatePlayer({
        player_id: editingPlayer.id,
        overall: editingPlayer.overall,
        virtual_stamina: editingPlayer.stamina,
      });
    } catch (_err) {
      // demo fallback
    }
    setPlayersList((prev) =>
      prev.map((p) => (p.id === editingPlayer.id ? editingPlayer : p))
    );
    showNotification(`تغییرات بازیکن ${editingPlayer.name} در دیتابیس ثبت گردید.`);
    setEditingPlayer(null);
  };

  const handleOverrideFacilityLevel = async (facKey, level) => {
    try {
      await adminApi.overrideFacility({ team_id: 1, facility: facKey, level });
    } catch (_err) {
      // demo fallback
    }
    setFacilityOverride((prev) => ({ ...prev, [facKey]: level }));
    showNotification(`سطح تسهیلات ${facKey} به سطح ${level} تغییر یافت.`);
  };

  return (
    <div className="space-y-4 pb-20 font-sans dir-rtl">
      {/* Admin Subnav */}
      <SubNav items={ADMIN_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      {adminMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-emerald-300 font-bold bg-emerald-950/90 p-3 rounded-xl border border-emerald-500/50 text-center shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{adminMessage}</span>
        </motion.div>
      )}

      {/* Subtab 1: Overview & KPI Stats */}
      {activeSub === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* System KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="glass-panel p-3.5 rounded-2xl border border-purple-500/30 text-center">
              <span className="text-xl font-black text-purple-400 block font-mono">{coachesList.length}</span>
              <span className="text-[11px] text-slate-400">مربیان ثبت‌شده</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-cyan-500/30 text-center">
              <span className="text-xl font-black text-cyan-400 block font-mono">۲۵۰</span>
              <span className="text-[11px] text-slate-400">کل بازیکنان دیتابیس</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-emerald-500/30 text-center">
              <span className="text-xl font-black text-emerald-400 block font-mono">$۱.۲M</span>
              <span className="text-[11px] text-slate-400">حجم تراکنش‌های بازار</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/30 text-center">
              <span className="text-xl font-black text-amber-400 block font-mono">۹۹.۸٪</span>
              <span className="text-[11px] text-slate-400">سلامت موتور بک‌اند</span>
            </div>
          </div>

          {/* Quick Admin Action Triggers */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              <span>عملیات‌های فست‌اکشن ادمین</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <button
                onClick={handleSimulateMatches}
                className="flex items-center justify-between p-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={18} className="text-purple-400" />
                  <span>اجرای شبیه‌سازی هفته</span>
                </div>
                <span className="text-[10px] bg-purple-900 px-2 py-0.5 rounded">Trigger</span>
              </button>

              <button
                onClick={handleResetStaminaAll}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <HeartPulse size={18} className="text-emerald-400" />
                  <span>بازنشانی استقامت کل تیم‌ها</span>
                </div>
                <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded">Reset</span>
              </button>

              <button
                onClick={handleDistributeSponsorIncome}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-amber-400" />
                  <span>توزیع درآمد هفتگی بودجه</span>
                </div>
                <span className="text-[10px] bg-amber-900 px-2 py-0.5 rounded">Pay</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subtab 2: Live Match Pitch Controller & Aparat Embed Control */}
      {activeSub === 'live_admin' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          {!selectedLiveMatch ? (
            <div className="space-y-4">
              <h3 className="font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <Tv size={18} className="text-rose-400" />
                <span>بازی‌های امروز (Today's Matches)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TODAYS_MATCHES.map(match => (
                  <div
                    key={match.id}
                    onClick={() => setSelectedLiveMatch(match)}
                    className="glass-panel p-4 rounded-3xl border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:-translate-y-1 shadow-lg hover:shadow-cyan-900/20 text-center"
                  >
                    <div className="flex justify-between items-center mb-4 text-slate-400 text-[10px]">
                      <span>{match.stadium}</span>
                      <span className="font-mono bg-slate-900 px-2 py-1 rounded-lg text-amber-400">{match.time}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <span className="font-black text-lg text-white w-1/3 text-left">{match.home}</span>
                      <span className="text-slate-600 font-bold text-sm">VS</span>
                      <span className="font-black text-lg text-white w-1/3 text-right">{match.away}</span>
                    </div>
                    <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold py-2 rounded-xl text-xs border border-slate-700 transition-colors">
                      ورود به مدیریت مسابقه
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Details */}
              <div className="glass-panel p-4 rounded-3xl border border-cyan-500/40 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedLiveMatch(null)}
                    className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl text-white transition-colors border border-slate-700"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {selectedLiveMatch.home} <span className="text-slate-500 mx-2">vs</span> {selectedLiveMatch.away}
                    </h3>
                    <span className="text-slate-400 text-[10px]">{selectedLiveMatch.time} - {selectedLiveMatch.stadium}</span>
                  </div>
                </div>
                
                {/* Team Switcher */}
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSelectedLiveTeamSwitch('home')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${selectedLiveTeamSwitch === 'home' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ترکیب میزبان ({selectedLiveMatch.home})
                  </button>
                  <button
                    onClick={() => setSelectedLiveTeamSwitch('away')}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-colors ${selectedLiveTeamSwitch === 'away' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ترکیب میهمان ({selectedLiveMatch.away})
                  </button>
                </div>
              </div>

              {/* ADMIN MATCH PERIOD CONTROL PANEL */}
              <div className="glass-panel p-4 rounded-3xl border border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-slate-900 to-purple-950/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                  <div>
                    <h3 className="font-black text-white text-sm">پنل مدیریت زمان و وضعیت مسابقه (داور / ادمین)</h3>
                    <p className="text-[11px] text-slate-300">
                      وضعیت فعلی: <span className="font-bold text-cyan-300">
                        {currentMatchStatus === 'FIRST_HALF' ? 'نیمه اول' : currentMatchStatus === 'HALF_TIME' ? 'استراحت بین دو نیمه (۳۰ ثانیه)' : currentMatchStatus === 'SECOND_HALF' ? 'نیمه دوم' : 'پایان یافته'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      if (onMatchStatusChange) onMatchStatusChange('HALF_TIME');
                      if (onPushLiveEvent) onPushLiveEvent({
                        id: Date.now(),
                        type: 'ADMIN_EVENT',
                        text: 'سوت پایان نیمه اول توسط داور به صدا درآمد! ⏸️ استراحت ۳۰ ثانیه‌ای مربیان شروع شد.',
                        team: 'سیستم داوری',
                        icon: '⏸️',
                        color: 'text-amber-400 border-amber-500/40 bg-amber-950/40'
                      });
                    }}
                    disabled={currentMatchStatus === 'HALF_TIME' || currentMatchStatus === 'FINISHED'}
                    className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                  >
                    <span>⏸️ پایان نیمه اول (استراحت ۳۰s)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onMatchStatusChange) onMatchStatusChange('SECOND_HALF');
                      if (onPushLiveEvent) onPushLiveEvent({
                        id: Date.now(),
                        type: 'ADMIN_EVENT',
                        text: 'نیمه دوم مسابقه با سوت داور آغاز گردید! ▶️ تاکتیک‌ها قفل شدند.',
                        team: 'سیستم داوری',
                        icon: '▶️',
                        color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
                      });
                    }}
                    disabled={currentMatchStatus === 'SECOND_HALF' || currentMatchStatus === 'FINISHED'}
                    className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                  >
                    <span>▶️ شروع نیمه دوم</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onMatchStatusChange) onMatchStatusChange('FINISHED');
                      if (onPushLiveEvent) onPushLiveEvent({
                        id: Date.now(),
                        type: 'ADMIN_EVENT',
                        text: 'سوت پایان کامل بازی توسط داور زده شد! ⏹️ مسابقه پایان یافت.',
                        team: 'سیستم داوری',
                        icon: '⏹️',
                        color: 'text-rose-400 border-rose-500/40 bg-rose-950/40'
                      });
                    }}
                    disabled={currentMatchStatus === 'FINISHED'}
                    className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black px-4 py-2 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs"
                  >
                    <span>⏹️ پایان کامل بازی</span>
                  </button>
                </div>
              </div>

              {/* Pitch Component (Interactive Admin Quick Event Pitch) */}
              <div className="bg-slate-950 p-2 rounded-3xl border-2 border-slate-800 shadow-2xl relative">
                <ErrorBoundary>
                  <EFootballGamePlan
                    key={`${selectedLiveMatch.id}-${selectedLiveTeamSwitch}`} // Force remount on team switch
                    teamName={selectedLiveTeamSwitch === 'home' ? selectedLiveMatch.home : selectedLiveMatch.away}
                    readOnly={false}
                    isAdminMode={true}
                    matchState={currentMatchStatus}
                    onPushLiveEvent={onPushLiveEvent}
                    hideReserves={true}
                  />
                </ErrorBoundary>
                <div className="absolute top-4 left-4 z-40 bg-cyan-400 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black shadow-lg animate-pulse flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-950"></div>
                  حالت ثبت سریع اتفاقات و تعویض‌های ادمین ⚡
                </div>
              </div>



              {/* INTERACTIVE TACTICS GAME PLAN PANEL (COACH TACTICS IN ADMIN PANEL WITH HALF-TIME LOCKING) */}
              <div className="glass-panel p-5 rounded-3xl border border-purple-500/50 mt-4 relative space-y-4">
                {/* Header & Match Period Status Banner */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-black text-white text-sm md:text-base flex items-center gap-2">
                      <Sliders size={20} className="text-purple-400" />
                      <span>تنظیمات تاکتیک تیمی ادمین (Tactical Game Plan)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تیم فعال جهت تنظیم تاکتیک: <span className="font-bold text-cyan-300">{selectedLiveTeamSwitch === 'home' ? selectedLiveMatch.home : selectedLiveMatch.away}</span>
                    </p>
                  </div>

                  {currentMatchStatus !== 'HALF_TIME' ? (
                    <div className="bg-rose-950/90 border border-rose-500/60 text-rose-300 px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-lg">
                      <Lock size={15} className="text-rose-400 animate-pulse" />
                      <span>تاکتیک‌ها قفل است (ویرایش فقط بین دو نیمه)</span>
                      <span className="bg-rose-900 text-rose-100 px-2 py-0.5 rounded font-mono font-black text-[10px]">LOCKED 🔒</span>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 px-3 py-1.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <Unlock size={15} className="text-emerald-400" />
                      <span>امکان ویرایش تاکتیک در استراحت فعال است</span>
                      <span className="bg-emerald-900 text-emerald-100 px-2 py-0.5 rounded font-mono font-black text-[10px]">UNLOCKED 🔓</span>
                    </div>
                  )}
                </div>

                {/* Lock Overlay if NOT HALF_TIME */}
                {currentMatchStatus !== 'HALF_TIME' && (
                  <div className="p-3 bg-rose-950/30 rounded-2xl border border-rose-800/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                    <Info size={18} className="text-rose-400 shrink-0" />
                    <span>طبق قوانین مسابقات مستر لیگ، تنظیمات تاکتیک تیمی در جریان بازی قفل است و تنها در زمان استراحت ۳۰ ثانیه‌ای بین دو نیمه قابل دسترسی و تغییر است.</span>
                  </div>
                )}

                {/* Tactics Subtabs Navigation */}
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 gap-1 text-xs">
                  <button
                    onClick={() => setAdminTacticTab('offense')}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      adminTacticTab === 'offense' ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚔️ تاکتیک‌های حمله (Offense)</span>
                  </button>
                  <button
                    onClick={() => setAdminTacticTab('defense')}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      adminTacticTab === 'defense' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>🛡️ تاکتیک‌های دفاع (Defense)</span>
                  </button>
                  <button
                    onClick={() => setAdminTacticTab('advanced')}
                    className={`flex-1 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                      adminTacticTab === 'advanced' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>⚙️ تاکتیک‌های پیشرفته (Advanced)</span>
                  </button>
                </div>

                {/* Tactics Controls Container (Disabled if locked) */}
                <div className={`space-y-4 transition-all ${currentMatchStatus !== 'HALF_TIME' ? 'opacity-65 pointer-events-none select-none grayscale-[20%]' : ''}`}>
                  {/* TAB 1: OFFENSE */}
                  {adminTacticTab === 'offense' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Attacking Style */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-rose-300 block">۱. سبک‌های حمله (Attacking Style):</label>
                          <CustomSelect
                            value={adminTactics.play_style}
                            onChange={(val) => setAdminTactics({ ...adminTactics, play_style: val })}
                            colorTheme="rose"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'بازی مالکانه', label: 'بازی مالکانه (Possession Game)' },
                              { value: 'ضد حمله', label: 'ضد حمله (Counter Attack)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.play_style]}</span>
                          </div>
                        </div>

                        {/* 2. Build Up */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-amber-300 block">۲. بازی‌سازی (Build Up):</label>
                          <CustomSelect
                            value={adminTactics.build_up}
                            onChange={(val) => setAdminTactics({ ...adminTactics, build_up: val })}
                            colorTheme="rose"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'پاس کوتاه', label: 'پاس کوتاه (Short-pass)' },
                              { value: 'پاس بلند', label: 'پاس بلند (Long-pass)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.build_up]}</span>
                          </div>
                        </div>

                        {/* 3. Attacking Area */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-emerald-300 block">۳. منطقه حمله (Attacking Area):</label>
                          <CustomSelect
                            value={adminTactics.attacking_area}
                            onChange={(val) => setAdminTactics({ ...adminTactics, attacking_area: val })}
                            colorTheme="emerald"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'مرکز', label: 'مرکز (Center)' },
                              { value: 'کناره', label: 'کناره‌ها (Wide)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.attacking_area]}</span>
                          </div>
                        </div>

                        {/* 4. Positioning */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-cyan-300 block">۴. جای‌گیری (Positioning):</label>
                          <CustomSelect
                            value={adminTactics.positioning}
                            onChange={(val) => setAdminTactics({ ...adminTactics, positioning: val })}
                            colorTheme="cyan"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'شناور', label: 'شناور (Flexible)' },
                              { value: 'حفظ ترکیب', label: 'حفظ ترکیب (Maintain Formation)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.positioning]}</span>
                          </div>
                        </div>
                      </div>

                      {/* Support Range Slider */}
                      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="font-bold text-rose-300 block">۵. محدوده پشتیبانی (Support Range):</label>
                          <span className="font-mono font-black text-rose-400 text-sm bg-rose-950 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                            {adminTactics.support_range} / ۱۰
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          disabled={currentMatchStatus !== 'HALF_TIME'}
                          value={adminTactics.support_range}
                          onChange={(e) => setAdminTactics({ ...adminTactics, support_range: parseInt(e.target.value) })}
                          className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                        />
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                          <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                          <span>{TACTICAL_GUIDES['support_range']}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DEFENSE */}
                  {adminTacticTab === 'defense' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Defensive Style */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-cyan-300 block">۱. سبک‌های دفاعی (Defensive Style):</label>
                          <CustomSelect
                            value={adminTactics.defensive_style}
                            onChange={(val) => setAdminTactics({ ...adminTactics, defensive_style: val })}
                            colorTheme="cyan"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'فشار خط مقدم', label: 'فشار خط مقدم (Frontline Pressure)' },
                              { value: 'همه دفاع', label: 'همه دفاع (All-out Defense)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.defensive_style]}</span>
                          </div>
                        </div>

                        {/* 2. Containment Area */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-purple-300 block">۲. ناحیه مهار (Containment Area):</label>
                          <CustomSelect
                            value={adminTactics.containment_area}
                            onChange={(val) => setAdminTactics({ ...adminTactics, containment_area: val })}
                            colorTheme="cyan"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'میانه', label: 'میانه (Middle)' },
                              { value: 'کناره', label: 'کناره‌ها (Side)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-purple-400 shrink-0 mt-0.5" />
                            <span>{adminTactics.containment_area === 'کناره' ? TACTICAL_GUIDES['کناره_دفاع'] : TACTICAL_GUIDES['میانه']}</span>
                          </div>
                        </div>

                        {/* 3. Pressing */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-emerald-300 block">۳. فشار (Pressing):</label>
                          <CustomSelect
                            value={adminTactics.pressing}
                            onChange={(val) => setAdminTactics({ ...adminTactics, pressing: val })}
                            colorTheme="emerald"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'تهاجمی', label: 'تهاجمی (Aggressive)' },
                              { value: 'محافظه‌کار', label: 'محافظه‌کار (Conservative)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.pressing]}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sliders: Defensive Line & Compactness */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Defensive Line */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-cyan-300 block">۴. خط دفاعی (Defensive Line):</label>
                            <span className="font-mono font-black text-cyan-400 text-sm bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/40">
                              {adminTactics.defensive_line} / ۱۰
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            value={adminTactics.defensive_line}
                            onChange={(e) => setAdminTactics({ ...adminTactics, defensive_line: parseInt(e.target.value) })}
                            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES['defensive_line']}</span>
                          </div>
                        </div>

                        {/* Compactness */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-purple-300 block">۵. جمع بودن (Compactness):</label>
                            <span className="font-mono font-black text-purple-400 text-sm bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-500/40">
                              {adminTactics.compactness} / ۱۰
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            value={adminTactics.compactness}
                            onChange={(e) => setAdminTactics({ ...adminTactics, compactness: parseInt(e.target.value) })}
                            className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-purple-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-purple-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES['compactness']}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ADVANCED TACTICS */}
                  {adminTacticTab === 'advanced' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Adv Offense 1 */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-rose-300 block">۱. تاکتیک پیشرفته حمله (اسلات اول):</label>
                          <CustomSelect
                            value={adminTactics.adv_offense_1}
                            onChange={(val) => setAdminTactics({ ...adminTactics, adv_offense_1: val })}
                            colorTheme="rose"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'هیچکدام', label: 'هیچکدام (None)' },
                              { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                              { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                              { value: 'تدافعی', label: 'تدافعی (Deep Attacker)' },
                              { value: 'نزدیک به خط اطراف زمین', label: 'نزدیک به خط اطراف زمین (Hug Touchline)' },
                              { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                              { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                              { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                              { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False 9)' },
                              { value: 'اهداف مرکز', label: 'اهداف مرکز (Centering Targets)' },
                              { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (Inverted Fullbacks)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.adv_offense_1]}</span>
                          </div>
                        </div>

                        {/* Adv Offense 2 */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-amber-300 block">۲. تاکتیک پیشرفته حمله (اسلات دوم):</label>
                          <CustomSelect
                            value={adminTactics.adv_offense_2}
                            onChange={(val) => setAdminTactics({ ...adminTactics, adv_offense_2: val })}
                            colorTheme="rose"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'هیچکدام', label: 'هیچکدام (None)' },
                              { value: 'لنگر انداختن', label: 'لنگر انداختن (Anchoring)' },
                              { value: 'بال غلط', label: 'بال غلط (False Wingers)' },
                              { value: 'تدافعی', label: 'تدافعی (Deep Attacker)' },
                              { value: 'نزدیک به خط اطراف زمین', label: 'نزدیک به خط اطراف زمین (Hug Touchline)' },
                              { value: 'دفاع کنار‌های تهاجمی', label: 'دفاع کنار‌های تهاجمی (Attacking Fullbacks)' },
                              { value: 'دوران بال‌ها', label: 'دوران بال‌ها (Wing Rotation)' },
                              { value: 'تیکی تاکا', label: 'تیکی تاکا (Tiki-Taka)' },
                              { value: 'شماره ۹ کاذب', label: 'شماره ۹ کاذب (False 9)' },
                              { value: 'اهداف مرکز', label: 'اهداف مرکز (Centering Targets)' },
                              { value: 'فولبک‌های کاذب', label: 'فولبک‌های کاذب (Inverted Fullbacks)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.adv_offense_2]}</span>
                          </div>
                        </div>

                        {/* Adv Defense 1 */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-cyan-300 block">۳. تاکتیک پیشرفته دفاع (اسلات اول):</label>
                          <CustomSelect
                            value={adminTactics.adv_defense_1}
                            onChange={(val) => setAdminTactics({ ...adminTactics, adv_defense_1: val })}
                            colorTheme="cyan"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'هیچکدام', label: 'هیچکدام (None)' },
                              { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                              { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                              { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Crowding)' },
                              { value: 'مقابله با هدف', label: 'مقابله با هدف (Target Counter)' },
                              { value: 'فشار', label: 'فشار (Gegenpress)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.adv_defense_1]}</span>
                          </div>
                        </div>

                        {/* Adv Defense 2 */}
                        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                          <label className="font-bold text-emerald-300 block">۴. تاکتیک پیشرفته دفاع (اسلات دوم):</label>
                          <CustomSelect
                            value={adminTactics.adv_defense_2}
                            onChange={(val) => setAdminTactics({ ...adminTactics, adv_defense_2: val })}
                            colorTheme="cyan"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'هیچکدام', label: 'هیچکدام (None)' },
                              { value: 'بال عقب', label: 'بال عقب (Wing Backs)' },
                              { value: 'خط دفاعی عمیق', label: 'خط دفاعی عمیق (Deep Defensive Line)' },
                              { value: 'شلوغی در محوطه جریمه', label: 'شلوغی در محوطه جریمه (Box Crowding)' },
                              { value: 'مقابله با هدف', label: 'مقابله با هدف (Target Counter)' },
                              { value: 'فشار', label: 'فشار (Gegenpress)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.adv_defense_2]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactic Save Action Button */}
                {tacticSaveNotice && (
                  <div className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-200 rounded-2xl text-xs font-bold text-center animate-pulse">
                    {tacticSaveNotice}
                  </div>
                )}

                <button
                  disabled={currentMatchStatus !== 'HALF_TIME'}
                  onClick={() => {
                    const text = `تغییرات تاکتیکی ادمین بین دو نیمه برای ${selectedLiveTeamSwitch === 'home' ? selectedLiveMatch.home : selectedLiveMatch.away} ثبت گردید ⚡ (سبک: ${adminTactics.play_style})`;
                    if (onPushLiveEvent) {
                      onPushLiveEvent({
                        id: Date.now(),
                        type: 'TACTICS',
                        text,
                        team: selectedLiveTeamSwitch === 'home' ? selectedLiveMatch.home : selectedLiveMatch.away,
                        icon: '⚡',
                        color: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
                      });
                    }
                    setTacticSaveNotice('تنظیمات تاکتیک با موفقیت ثبت و به دیتابیس ارسال شد!');
                    setTimeout(() => setTacticSaveNotice(''), 4500);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 text-white font-black py-3 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sliders size={18} />
                  <span>{currentMatchStatus === 'HALF_TIME' ? 'ثبت و اعمال تاکتیک تیمی در استراحت بین دو نیمه ⚡' : 'تاکتیک‌ها قفل است (امکان تغییر در جریان بازی وجود ندارد) 🔒'}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Subtab 3: Register New Coach & Team */}
      {activeSub === 'register_coach' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <UserPlus size={18} className="text-cyan-400" />
              <span>فرم ثبت مربی جدید و تخصیص تیم در لیگ</span>
            </h3>

            <form onSubmit={handleRegisterCoachSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                    <UserPlus size={14} className="text-cyan-400" />
                    <span>نام و نام خانوادگی مربی *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علی دایی"
                    value={newCoach.coachName}
                    onChange={(e) => setNewCoach({ ...newCoach, coachName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                    <Building size={14} className="text-purple-400" />
                    <span>نام جدید باشگاه / تیم *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تراکتور تبریز"
                    value={newCoach.clubName}
                    onChange={(e) => setNewCoach({ ...newCoach, clubName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                    <Mail size={14} className="text-rose-400" />
                    <span>ایمیل ورود مربی *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="coach@masterleague.ir"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                    <Lock size={14} className="text-amber-400" />
                    <span>رمز عبور اولیه</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newCoach.password}
                    onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span>بودجه اولیه تیم ($ دلار)</span>
                  </label>
                  <input
                    type="number"
                    value={newCoach.budget}
                    onChange={(e) => setNewCoach({ ...newCoach, budget: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all"
              >
                ثبت مربی و ایجاد ساختار تیم
              </button>
            </form>
          </div>

          {/* List of Registered Coaches */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white border-b border-slate-800 pb-2">
              لیست مربیان فعال در سیستم ({coachesList.length})
            </h4>

            <div className="space-y-2">
              {coachesList.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div>
                    <span className="font-bold text-white block">{c.coachName}</span>
                    <span className="text-[10px] text-cyan-300">باشگاه: {c.clubName} | ایمیل: {c.email}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono dir-ltr">
                    ${c.budget.toLocaleString('fa-IR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
