import React, { useState, useEffect } from 'react';
import SubNav from '../common/SubNav';
import { ShieldAlert, Coins, RefreshCw, HeartPulse, Sliders, CheckCircle2, ArrowLeft, UserPlus, UserCheck, Building, Mail, Lock, Unlock, Info, DollarSign, Tv, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api, { adminApi, teamApi } from '../../services/api';
import EFootballGamePlan from '../team/EFootballGamePlan';
import AdminMatchPitchController from './AdminMatchPitchController';
import ErrorBoundary from '../common/ErrorBoundary';
import CustomSelect from '../common/CustomSelect';
import { useTranslation } from 'react-i18next';

const ADMIN_SUBNAV = [
  { id: 'overview', label: 'داشبورد ادمین' },
  { id: 'live_admin', label: 'مدیریت پخش زنده' },
  { id: 'match_team_stats', label: 'آمار تیمی بازی' },
  { id: 'match_player_ratings', label: 'نمرات بازیکنان' },
  { id: 'register_coach', label: 'ثبت مربی جدید' },
  { id: 'audit_logs', label: 'گزارش تغییرات' },
];

const TODAYS_MATCHES = [];
const INITIAL_PLAYERS = [];
const INITIAL_COACHES = [];

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

export default function AdminDashboard({ onExitAdmin, liveStreamUrl, setLiveStreamUrl, onPushLiveEvent, currentMatchStatus, onMatchStatusChange, teamData }) {
  const { t } = useTranslation();
  const [activeSub, setActiveSub] = useState('overview');
  // The admin panel manages the logged-in manager's team (home side) when available
  const teamId = teamData?.id;
  const [playersList, setPlayersList] = useState(INITIAL_PLAYERS);
  const [coachesList, setCoachesList] = useState(INITIAL_COACHES);
  const [selectedTeam, setSelectedTeam] = useState(teamData?.name || '');
  const [realStats, setRealStats] = useState(null);
  const [realMatches, setRealMatches] = useState([]);

  useEffect(() => {
    adminApi.getOverviewStats().then(res => {
      setRealStats(res.data);
    }).catch(() => {});

    adminApi.getMatches().then(res => {
      const data = res.data.results || res.data || [];
      setRealMatches(data);
      if (data.length > 0 && !selectedLiveMatch) {
        const live = data.find(m => m.status === 'LIVE') || data[0];
        setSelectedLiveMatch({
          id: live.id,
          home: live.home_team_name,
          away: live.away_team_name,
          homeId: live.home_team,
          awayId: live.away_team,
          status: live.status,
          home_score: live.home_score,
          away_score: live.away_score,
        });
      }
    }).catch(() => {});
  }, []);

  // Live Match Admin Stream State
  const [streamInput, setStreamInput] = useState(liveStreamUrl || '');
  const [customEventText, setCustomEventText] = useState('');
  
  // New Match Details State
  const [selectedLiveMatch, setSelectedLiveMatch] = useState(null);
  const [selectedLiveTeamSwitch, setSelectedLiveTeamSwitch] = useState('home');
  
  // Admin Interactive Tactics Control State
  const [adminTacticTab, setAdminTacticTab] = useState('offense');
  const [adminTactics, setAdminTactics] = useState({
    attacking_style: 'بازی مالکانه',
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
      formation: '4-2-1-3',
      attacking_style: 'بازی مالکانه',
      build_up: 'پاس کوتاه',
      attacking_area: 'مرکز',
      positioning: 'حفظ ترکیب',
      support_range: 7,
      defensive_style: 'فشار خط مقدم',
      containment_area: 'میانه',
      pressing: 'تهاجمی',
      defensive_line: 6,
      compactness: 5,
      adv_offense_1: 'تیکی تاکا',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'هیچکدام',
      adv_defense_2: 'هیچکدام',
      is_submitted: true,
    },
    away: {
      formation: '4-3-3',
      attacking_style: 'ضد حمله',
      build_up: 'پاس بلند',
      attacking_area: 'کناره',
      positioning: 'شناور',
      support_range: 5,
      defensive_style: 'دفاع عمیق',
      containment_area: 'کناره',
      pressing: 'محافظه‌کارانه',
      defensive_line: 4,
      compactness: 7,
      adv_offense_1: 'هیچکدام',
      adv_offense_2: 'هیچکدام',
      adv_defense_1: 'خط دفاعی عمیق',
      adv_defense_2: 'هیچکدام',
      is_submitted: true,
    },
  });

  useEffect(() => {
    if (selectedLiveMatch && teamId) {
      teamApi
        .getGameplan(teamId)
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
  }, [selectedLiveMatch, teamId]);

  // New Coach Registration Form State
  const [newCoach, setNewCoach] = useState({
    coachName: '',
    clubName: '',
    email: '',
    password: '',
    phoneNumber: '',
    budget: 850000000,
    wageCap: 10000,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilterTeam, setAuditFilterTeam] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');

  useEffect(() => {
    if (activeSub === 'audit_logs') {
      let url = '/api/audit/logs/';
      const params = new URLSearchParams();
      if (auditFilterTeam) params.append('target_team', auditFilterTeam);
      if (auditFilterAction) params.append('action_type', auditFilterAction);
      if (params.toString()) url += `?${params.toString()}`;
      
      api.get(url).then(res => {
        setAuditLogs(res.data || []);
      }).catch(err => {
        console.error("Failed to fetch audit logs", err);
      });
    }
  }, [activeSub, auditFilterTeam, auditFilterAction]);

  const [facilityOverride, setFacilityOverride] = useState({
    training_camp_level: 0,
    gym_level: 0,
    medical_level: 0,
    pool_level: 0,
    academy_level: 0,
    scouting_level: 0,
    stadium_level: 0,
  });

  const [adminMessage, setAdminMessage] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  const showNotification = (msg) => {
    setAdminMessage(msg);
    setTimeout(() => setAdminMessage(''), 3500);
  };

  // ── TEAM STATS FORM STATE ──────────────────────────────
  const [statsMatchId, setStatsMatchId] = useState('');
  const [statsTeamId, setStatsTeamId] = useState('');
  const [statsForm, setStatsForm] = useState({
    possession_percent: 50,
    shots: 0,
    shots_on_target: 0,
    corners: 0,
    fouls: 0,
    offsides: 0,
  });
  const [statsSubmitting, setStatsSubmitting] = useState(false);

  const handleSubmitTeamStats = async (e) => {
    e.preventDefault();
    if (!statsMatchId || !statsTeamId) {
      showNotification('شناسه بازی و تیم الزامی است.');
      return;
    }
    setStatsSubmitting(true);
    try {
      const { matchApi } = await import('../../services/api');
      await matchApi.submitTeamStats(statsMatchId, {
        team_id: parseInt(statsTeamId),
        ...statsForm,
      });
      showNotification(`آمار تیمی برای بازی #${statsMatchId} با موفقیت ثبت شد.`);
    } catch (err) {
      showNotification(`خطا: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`);
    } finally {
      setStatsSubmitting(false);
    }
  };

  // ── PLAYER RATINGS FORM STATE ─────────────────────────
  const [ratingsMatchId, setRatingsMatchId] = useState('');
  const [ratingsInput, setRatingsInput] = useState(''); // JSON text area
  const [ratingsSubmitting, setRatingsSubmitting] = useState(false);

  const handleSubmitPlayerRatings = async (e) => {
    e.preventDefault();
    if (!ratingsMatchId) {
      showNotification('شناسه بازی الزامی است.');
      return;
    }
    let players;
    try {
      players = JSON.parse(ratingsInput);
      if (!Array.isArray(players)) throw new Error();
    } catch {
      showNotification('فرمت داده‌های بازیکنان نامعتبر است (JSON آرایک).');
      return;
    }
    setRatingsSubmitting(true);
    try {
      const { matchApi } = await import('../../services/api');
      const res = await matchApi.submitPlayerRatings(ratingsMatchId, { players });
      showNotification(`نمرات ${res.data.length} بازیکن برای بازی #${ratingsMatchId} ثبت شد.`);
    } catch (err) {
      showNotification(`خطا: ${err.response?.data?.error || 'مشکل ارتباط با سرور'}`);
    } finally {
      setRatingsSubmitting(false);
    }
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

  const handleRegisterCoachSubmit = async (e) => {
    e.preventDefault();
    if (!newCoach.coachName || !newCoach.clubName || !newCoach.email) {
      showNotification('لطفاً تمام اطلاعات الزامی مربی را وارد کنید.');
      return;
    }

    try {
      await adminApi.registerCoach({
        club_name: newCoach.clubName,
        budget: parseFloat(newCoach.budget) || 850000000,
        wage_cap: parseFloat(newCoach.wageCap) || 10000,
        username: newCoach.username || newCoach.coachName || '',
      });
      showNotification(`مربی ${newCoach.coachName} با موفقیت برای باشگاه «${newCoach.clubName}» در دیتابیس ثبت شد!`);
    } catch (err) {
      showNotification(`خطا در ثبت مربی: ${err.response?.data?.error || 'مشکل ارتباط با بک‌اند'}`);
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

    setNewCoach({
      coachName: '',
      clubName: '',
      email: '',
      password: '',
      phoneNumber: '',
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
    if (!teamId) {
      showNotification('تیمی یافت نشد. لطفاً ابتدا یک تیم انتخاب کنید.');
      return;
    }
    try {
      await adminApi.overrideFacility({ team_id: teamId, facility: facKey, level });
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
              <span className="text-xl font-black text-purple-400 block font-sport">{realStats?.overview?.total_coaches ?? 16}</span>
              <span className="text-[11px] text-slate-400">مربیان ثبت‌شده</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-cyan-500/30 text-center">
              <span className="text-xl font-black text-cyan-400 block font-sport">{realStats?.overview?.total_players ?? 399}</span>
              <span className="text-[11px] text-slate-400">کل بازیکنان دیتابیس</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-emerald-500/30 text-center">
              <span className="text-xl font-black text-emerald-400 block font-sport">
                ${Math.round((realStats?.overview?.total_budget || 8000000000) / 1000000).toLocaleString()}M
              </span>
              <span className="text-[11px] text-slate-400">کل بودجه باشگاه‌ها</span>
            </div>
            <div className="glass-panel p-3.5 rounded-2xl border border-amber-500/30 text-center">
              <span className="text-xl font-black text-amber-400 block font-sport">{realStats?.matches?.total ?? 240}</span>
              <span className="text-[11px] text-slate-400">کل مسابقات لیگ</span>
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
                            value={adminTactics.attacking_style}
                            onChange={(val) => setAdminTactics({ ...adminTactics, attacking_style: val })}
                            colorTheme="rose"
                            disabled={currentMatchStatus !== 'HALF_TIME'}
                            options={[
                              { value: 'بازی مالکانه', label: 'بازی مالکانه (Possession Game)' },
                              { value: 'ضد حمله', label: 'ضد حمله (Counter Attack)' },
                            ]}
                          />
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                            <Info size={15} className="text-rose-400 shrink-0 mt-0.5" />
                            <span>{TACTICAL_GUIDES[adminTactics.attacking_style]}</span>
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
                    const text = `تغییرات تاکتیکی ادمین بین دو نیمه برای ${selectedLiveTeamSwitch === 'home' ? selectedLiveMatch.home : selectedLiveMatch.away} ثبت گردید ⚡ (سبک: ${adminTactics.attacking_style})`;
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

      {/* Subtab 3: Match Team Stats (Task C) */}
      {activeSub === 'match_team_stats' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span className="text-amber-400 text-lg">📊</span>
              <span>ثبت آمار تیمی بازی (Team Stats)</span>
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              آمار تیمی هر بازی (تسلط، ضربات، کرنر و ...) را بعد از پایان بازی وارد کنید.
              هر ثبت جدید داده قبلی را به‌روزرسانی می‌کند.
            </p>
            <form onSubmit={handleSubmitTeamStats} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">شناسه بازی (Match ID) *</label>
                  <input
                    type="number" min="1" required
                    value={statsMatchId}
                    onChange={(e) => setStatsMatchId(e.target.value)}
                    placeholder="مثال: 42"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">شناسه تیم (Team ID) *</label>
                  <input
                    type="number" min="1" required
                    value={statsTeamId}
                    onChange={(e) => setStatsTeamId(e.target.value)}
                    placeholder="مثال: 3"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'possession_percent', label: 'تسلط بر توپ (%)', max: 100 },
                  { key: 'shots', label: 'تعداد ضربات', max: 50 },
                  { key: 'shots_on_target', label: 'ضربات به هدف', max: 30 },
                  { key: 'corners', label: 'کرنر', max: 20 },
                  { key: 'fouls', label: 'خطا', max: 30 },
                  { key: 'offsides', label: 'آفساید', max: 15 },
                ].map(({ key, label, max }) => (
                  <div key={key}>
                    <label className="text-slate-300 font-medium block mb-1">{label}</label>
                    <input
                      type="number" min="0" max={max}
                      value={statsForm[key]}
                      onChange={(e) => setStatsForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={statsSubmitting}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <span>{statsSubmitting ? 'در حال ثبت...' : '📊 ثبت آمار تیمی بازی'}</span>
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Subtab 4: Player Ratings (Task C) */}
      {activeSub === 'match_player_ratings' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-xs">
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 space-y-4">
            <h3 className="font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
              <span className="text-cyan-400 text-lg">⭐</span>
              <span>ثبت نمرات بازیکنان (Player Ratings)</span>
            </h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              نمرات و آمار بازیکنان را بعد از پایان بازی وارد کنید. داده باید به فرمت JSON آرایه باشد.
            </p>
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 font-mono text-[10px] text-slate-400 leading-relaxed">
              <span className="text-cyan-400">// نمونه فرمت ورودی:</span><br/>
              {'[{"player_id":1,"minutes_played":90,"rating":7.5,"was_starter":true},{"player_id":2,"minutes_played":63,"rating":6.0,"was_starter":true}]'}
            </div>
            <form onSubmit={handleSubmitPlayerRatings} className="space-y-4">
              <div>
                <label className="text-slate-300 font-medium block mb-1">شناسه بازی (Match ID) *</label>
                <input
                  type="number" min="1" required
                  value={ratingsMatchId}
                  onChange={(e) => setRatingsMatchId(e.target.value)}
                  placeholder="مثال: 42"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">داده‌های بازیکنان (JSON آرایه) *</label>
                <textarea
                  required
                  rows={8}
                  value={ratingsInput}
                  onChange={(e) => setRatingsInput(e.target.value)}
                  placeholder='[{"player_id":1,"minutes_played":90,"rating":8.5,"was_starter":true}]'
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-[10px] focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={ratingsSubmitting}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <span>{ratingsSubmitting ? 'در حال ثبت...' : '⭐ ثبت نمرات بازیکنان'}</span>
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Subtab 5: Register New Coach & Team */}
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
                    <UserCheck size={14} className="text-cyan-400" />
                    <span>شماره موبایل مربی (اختیاری)</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="09123456789"
                    value={newCoach.phoneNumber}
                    onChange={(e) => setNewCoach({ ...newCoach, phoneNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
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

      {/* 5. AUDIT LOGS */}
      {activeSub === 'audit_logs' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-5xl mx-auto"
        >
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Info className="text-cyan-400" />
              {t('auditLog.title')}
            </h3>
            
            <div className="flex gap-4 mb-4">
              <select 
                value={auditFilterAction} 
                onChange={e => setAuditFilterAction(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white p-2 rounded-xl"
              >
                <option value="">{t('auditLog.filters.selectAction')}</option>
                <option value="BUDGET_ADJUST">{t('auditLog.actions.BUDGET_ADJUST')}</option>
                <option value="FACILITY_OVERRIDE">{t('auditLog.actions.FACILITY_OVERRIDE')}</option>
                <option value="PLAYER_UPDATE">{t('auditLog.actions.PLAYER_UPDATE')}</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t('auditLog.table.timestamp')}</th>
                    <th className="px-4 py-3">{t('auditLog.table.adminPhone')}</th>
                    <th className="px-4 py-3">{t('auditLog.table.action')}</th>
                    <th className="px-4 py-3">{t('auditLog.table.target')}</th>
                    <th className="px-4 py-3">{t('auditLog.table.before')}/{t('auditLog.table.after')}</th>
                    <th className="px-4 py-3">{t('auditLog.table.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length > 0 ? auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-3" dir="ltr">{new Date(log.created_at).toLocaleString('fa-IR')}</td>
                      <td className="px-4 py-3 text-cyan-400 font-bold dir-ltr text-right">@{log.admin_user_details?.username || 'admin'}</td>
                      <td className="px-4 py-3 font-bold text-amber-400">{t(`auditLog.actions.${log.action_type}`) || log.action_type}</td>
                      <td className="px-4 py-3">
                        {log.team_name && <div>{t('auditLog.targetTeam', { id: log.team_name })}</div>}
                        {log.player_name && <div>{t('auditLog.targetPlayer', { id: log.player_name })}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" dir="ltr">
                        <div className="text-rose-400">Before: {JSON.stringify(log.before_value)}</div>
                        <div className="text-emerald-400">After: {JSON.stringify(log.after_value)}</div>
                      </td>
                      <td className="px-4 py-3">{log.reason || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-slate-500">{t('auditLog.noLogs')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
