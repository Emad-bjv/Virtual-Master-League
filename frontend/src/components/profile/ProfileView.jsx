import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Award, Medal, LogOut, RefreshCw, Shield, CheckCircle2, Lock, Flame, Target, Users, TrendingUp } from 'lucide-react';
import SubNav from '../common/SubNav';
import { motion } from 'framer-motion';
import Toast from '../common/Toast';
import { authApi, matchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getTeamLogoUrl } from '../../utils/teamLogos';

const PROFILE_SUBNAV = [
  { id: 'stats', label: 'آمار عملکرد مربی' },
  { id: 'achievements', label: 'دستاوردها و افتخارات' },
  { id: 'rank', label: 'رده‌بندی کلی مربیان' },
];

export default function ProfileView({ user: propUser, teamData, onBack, onLogout: propOnLogout }) {
  const { user: contextUser, logout: contextLogout } = useAuth();
  const user = contextUser || propUser;
  const onLogout = propOnLogout || contextLogout;

  const [activeSub, setActiveSub] = useState('stats');
  const [challengeMessage, setChallengeMessage] = useState('');
  
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
      desc: 'حفظ دروازه و پایان مسابقه رسمی بدون دریافت گل',
      icon: Award,
      isUnlocked: cleanSheetsCount >= 1,
      color: 'text-cyan-400',
      badge: cleanSheetsCount >= 1 ? `تکمیل شد (${cleanSheetsCount})` : 'قفل (نیازمند ۱ کلین‌شیت)',
    },
    {
      id: 4,
      title: 'خط آتشین مسابقات',
      desc: 'ثبت حداقل ۵ گل زده در جدول مسابقات لیگ',
      icon: Flame,
      isUnlocked: gf >= 5,
      color: 'text-rose-400',
      badge: gf >= 5 ? 'تکمیل شد' : `در حال پیشرفت (${gf} / ۵ گل)`,
    },
    {
      id: 5,
      title: 'سه‌گانه پیروزی متوالی',
      desc: 'کسب حداقل ۳ پیروزی در مسابقات رسمی',
      icon: Medal,
      isUnlocked: won >= 3,
      color: 'text-purple-400',
      badge: won >= 3 ? 'تکمیل شد' : `در حال پیشرفت (${won} / ۳ برد)`,
    },
    {
      id: 6,
      title: 'حضور در کورس قهرمانی (Top 3)',
      desc: 'قرار گرفتن در رتبه‌های اول تا سوم جدول رده‌بندی لیگ',
      icon: Target,
      isUnlocked: typeof rank === 'number' && rank <= 3 && played > 0,
      color: 'text-amber-400',
      badge: typeof rank === 'number' && rank <= 3 && played > 0 ? 'تکمیل شد' : 'نیازمند حضور در تاپ ۳',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4 pb-20 font-sans dir-rtl"
    >
      {/* Top Bar Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-cyan-400 py-1 transition-colors cursor-pointer"
        >
          <ArrowRight size={16} />
          <span>بازگشت به داشبورد</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-500/50 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer font-sport"
          >
            <LogOut size={15} className="text-rose-400" />
            <span>خروج از حساب</span>
          </button>
        )}
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

        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
          {teamData?.name || 'باشگاه اختصاصی'}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs text-slate-400 font-sport dir-ltr">@{user?.username || 'coach'}</span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-[#00ff87] font-sport font-black dir-ltr">
            ${teamData?.budget ? Math.round(parseFloat(teamData.budget)).toLocaleString() : Number(user?.virtual_dollars || 1000000).toLocaleString()}
          </span>
        </div>

        {/* Top 3 Metric Strip */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-700/60 text-xs font-sport">
          <div className="bg-[#05080e]/60 p-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">رتبه در لیگ</span>
            <span className="font-black text-cyan-300 text-base">#{rank}</span>
          </div>
          <div className="bg-[#05080e]/60 p-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">امتیازات لیگ</span>
            <span className="font-black text-[#00ff87] text-base">{points} PTS</span>
          </div>
          <div className="bg-[#05080e]/60 p-2 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-bold font-sans">نرخ پیروزی</span>
            <span className="font-black text-amber-300 text-base">{winRate}٪</span>
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
          <div className="fc-card-elevated p-5 rounded-3xl border border-slate-700/60 space-y-3">
            <h4 className="text-xs font-black text-white border-b border-slate-700/60 pb-2.5 flex items-center justify-between">
              <span>عملکرد تهاجمی و دفاعی در لیگ (MATCHDAY TELEMETRY)</span>
              <span className="text-[10px] text-cyan-300 font-sport bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                SEASON 1
              </span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300 font-medium">گل‌های زده باشگاه (Goals For):</span>
                <span className="font-sport font-black text-[#00ff87] text-sm">{gf} گل</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300 font-medium">گل‌های خورده باشگاه (Goals Against):</span>
                <span className="font-sport font-black text-rose-400 text-sm">{ga} گل</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                <span className="text-slate-300 font-medium">تفاضل گل رسمی مسابقات (Goal Difference):</span>
                <span className={`font-sport font-black text-sm ${gd > 0 ? 'text-cyan-300' : gd < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {gd > 0 ? `+${gd}` : gd}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-300 font-medium">کلین‌شیت‌ها (Clean Sheets):</span>
                <span className="font-sport font-black text-amber-300 text-sm">{cleanSheetsCount} مسابقه</span>
              </div>
            </div>
          </div>

          {/* Club Roster & Tactics Snapshot */}
          <div className="fc-card p-4 rounded-3xl border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                <Users size={20} />
              </div>
              <div>
                <span className="font-black text-white block">چیدمان پیش‌فرض مربی:</span>
                <span className="text-slate-400 font-sport">{teamData?.default_formation || '4-3-3 (4-2-1-3)'}</span>
              </div>
            </div>
            <span className="text-xs font-black text-cyan-300 font-sport bg-[#05080e] px-3 py-1.5 rounded-xl border border-slate-700">
              {teamData?.players?.length || 23} بازیکـن در لیست
            </span>
          </div>
        </div>
      )}

      {/* Subtab 2: Dynamic Real Achievements */}
      {activeSub === 'achievements' && (
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-slate-300 flex justify-between items-center">
            <span>دستاوردها بر اساس آمار و عملکردهای واقعی باشگاه در طول مسابقات لیگ محاسبه و فعال می‌شوند.</span>
            <span className="font-sport font-black text-amber-300 text-xs shrink-0 mr-2">
              {achievements.filter((a) => a.isUnlocked).length} / {achievements.length} UNLOCKED
            </span>
          </div>

          <div className="space-y-2">
            {achievements.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    item.isUnlocked
                      ? 'fc-card border-slate-700/80 bg-[#080c14]/90 shadow-md'
                      : 'border-slate-800/60 bg-[#05080e]/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        item.isUnlocked
                          ? 'bg-slate-900/90 border-slate-700 ' + item.color
                          : 'bg-slate-950 border-slate-800 text-slate-600'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <span className="font-black text-white block text-xs sm:text-sm">{item.title}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{item.desc}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10.5px] font-sport font-black px-3 py-1 rounded-xl border shrink-0 ${
                      item.isUnlocked
                        ? 'text-[#00ff87] bg-emerald-950/80 border-emerald-500/40'
                        : 'text-slate-500 bg-slate-950 border-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 3: Global Leaderboard */}
      {activeSub === 'rank' && (
        <div className="fc-card-elevated p-4 sm:p-5 rounded-3xl border border-slate-700/60 space-y-3.5 text-xs shadow-xl">
          <div className="flex justify-between items-center p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-[#0d162a] to-cyan-950/80 border border-purple-500/40">
            <div>
              <span className="text-cyan-300 font-bold block text-xs">رتبه باشگاه شما در لیگ:</span>
              <span className="text-[11px] text-slate-400 font-sport">{teamData?.name || 'باشگاه شما'}</span>
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
                        <span className="font-black text-white dir-ltr block font-sport">@{item.username}</span>
                        {item.team_name && <span className="text-[11px] text-cyan-300 font-bold block">{item.team_name}</span>}
                        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60 uppercase font-sport">
                          {item.role || 'coach'}
                        </span>
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
    </motion.div>
  );
}
