import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Trophy, Award, Medal, LogOut, RefreshCw, Shield, 
  CheckCircle2, Lock, Flame, Target, Users, TrendingUp, Edit3, 
  Calendar, User as UserIcon, X, Check, Sparkles 
} from 'lucide-react';
import SubNav from '../common/SubNav';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../common/Toast';
import { authApi, matchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const PROFILE_SUBNAV = [
  { id: 'stats', label: 'آمار عملکرد مربی' },
  { id: 'achievements', label: 'دستاوردها و افتخارات' },
  { id: 'rank', label: 'رده‌بندی کلی مربیان' },
];

function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

export default function ProfileView({ user: propUser, teamData, onBack, onLogout: propOnLogout }) {
  const { user: contextUser, logout: contextLogout, updateProfile } = useAuth();
  const user = contextUser || propUser;
  const onLogout = propOnLogout || contextLogout;

  const [activeSub, setActiveSub] = useState('stats');
  const [challengeMessage, setChallengeMessage] = useState('');
  
  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(user?.full_name || '');
  const [editBirthDate, setEditBirthDate] = useState(user?.birth_date || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync edit form when user updates
  useEffect(() => {
    if (user) {
      setEditFullName(user.full_name || '');
      setEditBirthDate(user.birth_date || '');
    }
  }, [user]);
  
  // Real Data States
  const [standings, setStandings] = useState([]);
  const [userStanding, setUserStanding] = useState(null);
  const [finishedMatches, setFinishedMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // 1. Fetch Real Team Standing and Match Performance Stats
  useEffect(() => {
    setLoadingStats(true);
    matchApi.getLeagueStandings()
      .then((res) => {
        const rows = res.data || [];
        setStandings(rows);
        if (teamData?.id) {
          const row = rows.find((r) => r.team_id === teamData.id || r.name === teamData.name);
          if (row) {
            setUserStanding(row);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch profile standings:', err);
      })
      .finally(() => {
        setLoadingStats(false);
      });

    if (teamData?.id) {
      matchApi.getTeamSchedule(teamData.id, { status: 'FINISHED' })
        .then((res) => {
          setFinishedMatches(res.data || []);
        })
        .catch((_e) => {});
    }
  }, [teamData?.id, teamData?.name]);

  // 2. Fetch Leaderboard when subtab changes
  useEffect(() => {
    if (activeSub === 'rank') {
      setLoadingLeaderboard(true);
      authApi.getLeaderboard()
        .then((res) => {
          setLeaderboard(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch leaderboard:', err);
          setLeaderboard([]);
        })
        .finally(() => {
          setLoadingLeaderboard(false);
        });
    }
  }, [activeSub]);

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (updateProfile) {
        await updateProfile({
          full_name: editFullName.trim(),
          birth_date: editBirthDate || null,
        });
      } else {
        await authApi.updateProfile({
          full_name: editFullName.trim(),
          birth_date: editBirthDate || null,
        });
      }
      setIsEditModalOpen(false);
      setChallengeMessage('اطلاعات مربی با موفقیت به‌روزرسانی شد! ✨');
      setTimeout(() => setChallengeMessage(''), 3500);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setChallengeMessage(err.response?.data?.error || 'خطا در ذخیره تغییرات پروفایل');
      setTimeout(() => setChallengeMessage(''), 3500);
    } finally {
      setSavingProfile(false);
    }
  };

  // Derived real statistical metrics
  const played = userStanding?.played || 0;
  const won = userStanding?.won || 0;
  const drawn = userStanding?.drawn || 0;
  const lost = userStanding?.lost || 0;
  const gf = userStanding?.gf || 0;
  const ga = userStanding?.ga || 0;
  const gd = (userStanding?.gd != null) ? userStanding.gd : (gf - ga);
  const points = userStanding?.points || user?.points || 0;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
  const rank = userStanding?.rank || user?.rank || '-';
  const coachAge = calculateAge(user?.birth_date);

  // Compute Clean Sheets from finished matches
  const cleanSheetsCount = finishedMatches.filter((m) => {
    const isHome = m.home_team === teamData?.id;
    return isHome ? m.away_score === 0 : m.home_score === 0;
  }).length;

  // Real Dynamic Achievements System
  const achievements = [
    {
      id: 1,
      title: 'مجوز رسمی سرمربی‌گری مستر لیگ',
      desc: 'ثبت‌نام رسمی و هدایت باشگاه اختصاصی در فصل اول',
      icon: Shield,
      isUnlocked: true,
      color: 'text-amber-400',
      badge: 'تکمیل شد',
    },
    {
      id: 2,
      title: 'اولین پیروزی فصل',
      desc: 'کسب اولین پیروزی ۳ امتیازی در مسابقات رسمی لیگ',
      icon: Trophy,
      isUnlocked: won >= 1,
      color: 'text-[#00ff87]',
      badge: won >= 1 ? 'تکمیل شد' : 'قفل (نیازمند ۱ برد)',
    },
    {
      id: 3,
      title: 'دیوار بتنی (کلین‌شیت)',
      desc: 'ثبت حداقل ۳ بازی بدون دریافت گل در طول مسابقات',
      icon: Lock,
      isUnlocked: cleanSheetsCount >= 3,
      color: 'text-cyan-400',
      badge: cleanSheetsCount >= 3 ? 'تکمیل شد' : `قفل (${cleanSheetsCount}/۳)`,
    },
    {
      id: 4,
      title: 'مهاجم آتشین (خط حمله برتر)',
      desc: 'به ثمر رساندن حداقل ۱۰ گل رسمی در طول فصل',
      icon: Flame,
      isUnlocked: gf >= 10,
      color: 'text-rose-400',
      badge: gf >= 10 ? 'تکمیل شد' : `قفل (${gf}/۱۰)`,
    },
    {
      id: 5,
      title: 'مدعی قهرمانی (صدرنشینی)',
      desc: 'قرار گرفتن در میان ۳ تیم برتر جدول رده‌بندی لیگ',
      icon: Award,
      isUnlocked: rank !== '-' && Number(rank) <= 3,
      color: 'text-purple-400',
      badge: rank !== '-' && Number(rank) <= 3 ? 'تکمیل شد' : 'قفل (نیازمند رتبه ۱ تا ۳)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 pb-20 max-w-4xl mx-auto font-sans dir-rtl"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-[#0d162a] border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-md"
            >
              <ArrowRight size={18} />
            </button>
          )}
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <UserIcon size={20} className="text-cyan-400" />
              <span>پروفایل و مشخصات رسمی سرمربی</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">مشخصات هویتی، آمار و افتخارات هدایت باشگاه</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Profile Trigger */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">ویرایش مشخصات</span>
          </button>

          {/* Logout Trigger */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">خروج از حساب</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card (FC 2026 Sports Style) */}
      <div className="fc-card-elevated p-5 sm:p-6 rounded-3xl border border-cyan-500/30 text-center relative overflow-hidden bg-gradient-to-b from-[#080c14] via-[#0d162a] to-[#05080e] shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-purple-500 to-[#00ff87]"></div>

        {/* Club Crest / Avatar Badge */}
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-cyan-400 to-[#00ff87] p-1 shadow-[0_0_30px_rgba(0,243,255,0.35)] mx-auto">
            <div className="w-full h-full rounded-2xl bg-white p-2 flex items-center justify-center overflow-hidden">
              {getTeamLogoUrl(teamData) ? (
                <img src={getTeamLogoUrl(teamData)} alt={teamData?.name} className="w-full h-full object-contain" />
              ) : (
                <Shield className="text-slate-800" size={32} />
              )}
            </div>
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-cyan-300 shadow font-sport">
            {user?.role === 'admin' ? 'ADMIN' : 'HEAD COACH'}
          </span>
        </div>

        {/* Coach Full Name & Identity */}
        <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>{user?.full_name || 'سرمربی باشگاه'}</span>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-slate-400 hover:text-cyan-300 transition-colors p-1"
            title="ویرایش مشخصات مربی"
          >
            <Edit3 size={16} />
          </button>
        </h3>

        {/* Club Name & Username */}
        <div className="text-xs text-cyan-300 font-bold mt-0.5">
          هدایت باشگاه: <strong className="text-white font-black">{teamData?.name || 'باشگاه اختصاصی'}</strong>
        </div>

        {/* Details Pill Strip (Username, Birth Date, Age, Budget) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-2 text-xs">
          <span className="inline-flex items-center gap-1 bg-[#05080e]/80 text-slate-300 px-3 py-1 rounded-xl border border-slate-700/80 font-sport dir-ltr">
            @{user?.username || 'coach'}
          </span>

          <span className="inline-flex items-center gap-1.5 bg-cyan-950/80 text-cyan-300 px-3 py-1 rounded-xl border border-cyan-500/40 font-medium">
            <Calendar size={13} className="text-cyan-400" />
            <span>
              {user?.birth_date ? `متولد: ${user.birth_date}` : 'تاریخ تولد: ثبت نشده'}
            </span>
            {coachAge && (
              <span className="text-[10px] bg-cyan-900/90 text-cyan-200 px-1.5 py-0.2 rounded font-black font-sport">
                ({coachAge} سال)
              </span>
            )}
          </span>

          <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-[#00ff87] px-3 py-1 rounded-xl border border-emerald-500/40 font-sport font-black dir-ltr">
            ${teamData?.budget ? Math.round(parseFloat(teamData.budget)).toLocaleString() : Number(user?.virtual_dollars || 1000000).toLocaleString()}
          </span>
        </div>

        {/* Top 3 Metric Strip */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-700/60 text-xs font-sport">
          <div className="bg-[#05080e]/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">رتبه در لیگ</span>
            <span className="font-black text-cyan-300 text-base sm:text-lg">#{rank}</span>
          </div>
          <div className="bg-[#05080e]/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">امتیازات لیگ</span>
            <span className="font-black text-[#00ff87] text-base sm:text-lg">{points} PTS</span>
          </div>
          <div className="bg-[#05080e]/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">نرخ پیروزی</span>
            <span className="font-black text-amber-300 text-base sm:text-lg">{winRate}٪</span>
          </div>
        </div>
      </div>

      {/* Subnav Navigation */}
      <SubNav items={PROFILE_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      <Toast message={challengeMessage} isVisible={!!challengeMessage} type="success" />

      {/* Subtab 1: Real Performance Stats */}
      {activeSub === 'stats' && (
        <div className="space-y-4">
          {/* Matches & Win Rate Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-2xl font-black text-white block font-sport dir-ltr">{played}</span>
              <span className="text-[11px] text-slate-400 font-bold">کل مسابقات رسمی</span>
            </div>
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-2xl font-black text-[#00ff87] block font-sport dir-ltr">{won}</span>
              <span className="text-[11px] text-slate-400 font-bold">پیروزی (Wins)</span>
            </div>
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-2xl font-black text-cyan-300 block font-sport dir-ltr">{drawn}</span>
              <span className="text-[11px] text-slate-400 font-bold">تساوی (Draws)</span>
            </div>
            <div className="fc-card p-4 rounded-3xl border border-slate-700/60 text-center">
              <span className="text-2xl font-black text-rose-400 block font-sport dir-ltr">{lost}</span>
              <span className="text-[11px] text-slate-400 font-bold">شکست (Losses)</span>
            </div>
          </div>

          {/* Goal Statistics & Telemetry */}
          <div className="fc-card-elevated p-5 rounded-3xl border border-slate-700/60 space-y-4">
            <h4 className="font-bold text-white text-sm flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2">
                <Target size={16} className="text-cyan-400" />
                <span>آمار گلزنی و استحکام خط دفاعی</span>
              </span>
              <span className="text-xs text-[#00ff87] font-sport font-black dir-ltr">
                تفاضل: {gd > 0 ? `+${gd}` : gd}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#05080e]/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                <span className="text-xl font-black text-[#00ff87] block font-sport dir-ltr">{gf}</span>
                <span className="text-[11px] text-slate-400 font-bold">گل‌های زده (GF)</span>
              </div>
              <div className="bg-[#05080e]/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                <span className="text-xl font-black text-rose-400 block font-sport dir-ltr">{ga}</span>
                <span className="text-[11px] text-slate-400 font-bold">گل‌های خورده (GA)</span>
              </div>
              <div className="bg-[#05080e]/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                <span className="text-xl font-black text-cyan-300 block font-sport dir-ltr">{cleanSheetsCount}</span>
                <span className="text-[11px] text-slate-400 font-bold">کلین‌شیت (Clean Sheets)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Achievements */}
      {activeSub === 'achievements' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {achievements.map((ach) => {
              const Icon = ach.icon;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-3xl border transition-all flex items-center justify-between gap-4 ${
                    ach.isUnlocked
                      ? 'bg-[#0a101f] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                      : 'bg-[#060a12]/70 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${
                        ach.isUnlocked
                          ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}
                    >
                      <Icon size={22} className={ach.isUnlocked ? ach.color : 'text-slate-600'} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>{ach.title}</span>
                        {ach.isUnlocked && <CheckCircle2 size={15} className="text-[#00ff87]" />}
                      </h4>
                      <p className="text-xs text-slate-400">{ach.desc}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10.5px] font-black px-3 py-1 rounded-xl border shrink-0 font-sport ${
                      ach.isUnlocked
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {ach.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 3: Global Leaderboard */}
      {activeSub === 'rank' && (
        <div className="space-y-3">
          <div className="fc-card p-4 rounded-3xl border border-slate-700/60 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cyan-400" />
              <span className="font-bold text-white">رتبه مربیگری شما در جدول لیگ:</span>
            </div>
            <span className="text-white font-sport font-black dir-ltr text-lg bg-[#05080e]/80 px-3 py-1 rounded-xl border border-cyan-500/30">
              #{rank}
            </span>
          </div>

          {loadingLeaderboard ? (
            <div className="flex items-center justify-center p-12 text-cyan-400 gap-2 font-bold font-sport">
              <RefreshCw className="animate-spin" size={18} />
              <span>در حال دریافت جدول رده‌بندی مربیان...</span>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-800/80 rounded-2xl bg-slate-900/40">
              <p>در حال حاضر رتبه‌بندی فعالی ثبت نشده است.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((item, index) => {
                const isCurrentUser = item.username === user?.username;
                return (
                  <div
                    key={item.id || index}
                    className={`flex justify-between items-center p-3 rounded-2xl transition-all ${
                      isCurrentUser
                        ? 'bg-purple-950/50 border-2 border-purple-500/70 shadow-lg'
                        : index === 0
                        ? 'bg-amber-950/30 border border-amber-500/40 shadow-sm'
                        : 'bg-[#080c14]/80 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {index === 0 ? (
                        <Trophy size={18} className="text-amber-400 shrink-0" />
                      ) : index === 1 ? (
                        <Medal size={18} className="text-slate-300 shrink-0" />
                      ) : index === 2 ? (
                        <Medal size={18} className="text-amber-600 shrink-0" />
                      ) : (
                        <span className="font-sport font-black text-slate-400 w-5 text-center">{item.rank || index + 1}</span>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white text-xs">
                            {item.full_name || `@${item.username}`}
                          </span>
                          {item.full_name && (
                            <span className="text-[10px] text-slate-400 font-sport dir-ltr">
                              (@{item.username})
                            </span>
                          )}
                        </div>
                        {item.team_name && <span className="text-[11px] text-cyan-300 font-bold block">{item.team_name}</span>}
                        {item.birth_date && (
                          <span className="text-[9.5px] text-slate-400 block font-sport">
                            متولد: {item.birth_date}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-left font-sport">
                      <span className="text-[#00ff87] font-black block dir-ltr text-sm">{item.points || 0} PTS</span>
                      <span className="text-[10px] text-slate-400 dir-ltr font-bold">
                        ${Number(item.virtual_dollars || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-gradient-to-b from-[#0b1220] via-[#0d162a] to-[#070b14] p-5 sm:p-6 rounded-3xl border border-cyan-500/40 shadow-[0_0_35px_rgba(0,243,255,0.2)] relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="mb-4 pr-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <Edit3 size={16} />
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    ویرایش مشخصات سرمربی
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  اطلاعات هویتی و تاریخ تولد خود را در سیستم مستر لیگ ویرایش نمایید.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="مثلاً: پپ گواردیولا / علی دایی"
                      className="w-full bg-[#05080e] border border-slate-700 rounded-2xl py-2.5 pr-10 pl-4 text-white text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                    <UserIcon size={16} className="absolute right-3 top-3 text-cyan-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    تاریخ تولد (میلادی)
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                      className="w-full bg-[#05080e] border border-slate-700 rounded-2xl py-2.5 pr-10 pl-4 text-white text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 dir-ltr font-mono"
                    />
                    <Calendar size={16} className="absolute right-3 top-3 text-cyan-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    مثال: 1980-05-15 (جهت محاسبه خودکار سن مربی)
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-bold text-xs cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-2.5 rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs font-sport"
                  >
                    <Check size={16} />
                    <span>{savingProfile ? 'در حال ذخیره...' : 'ذخیره مشخصات'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
