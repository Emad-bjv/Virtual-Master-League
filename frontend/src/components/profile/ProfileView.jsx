import React, { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Award, Medal, LogOut, RefreshCw, UserCheck } from 'lucide-react';
import SubNav from '../common/SubNav';
import { motion } from 'framer-motion';
import Toast from '../common/Toast';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PROFILE_SUBNAV = [
  { id: 'stats', label: 'آمار من' },
  { id: 'achievements', label: 'دستاوردها' },
  { id: 'rank', label: 'رده‌بندی جهانی' },
];

export default function ProfileView({ user: propUser, onBack, onLogout: propOnLogout }) {
  const { user: contextUser, updateProfile, logout: contextLogout } = useAuth();
  const user = contextUser || propUser;
  const onLogout = propOnLogout || contextLogout;

  const [activeSub, setActiveSub] = useState('stats');
  const [challengeMessage, setChallengeMessage] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

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
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-400 py-1 transition-colors"
        >
          <ArrowRight size={16} />
          <span>بازگشت به برنامه</span>
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-950/80 hover:bg-rose-900/90 text-rose-300 border border-rose-500/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <LogOut size={16} className="text-rose-400" />
            <span>خروج از حساب</span>
          </button>
        )}
      </div>

      {/* Main Profile Header Card */}
      <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 text-center relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-900 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400"></div>

        <div className="relative inline-block mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-cyan-400 to-emerald-400 p-0.5 shadow-xl shadow-purple-950/60 mx-auto">
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-xl text-white">
              {user?.phone_number ? user.phone_number.slice(-4) : 'مربی'}
            </div>
          </div>
          <span className="absolute bottom-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-900 shadow">
            {user?.role === 'admin' ? 'ادمین' : 'مربی'}
          </span>
        </div>

        <h3 className="text-base font-bold text-white dir-ltr">{user?.phone_number || '۰۹۱۲۳۴۵۶۷۸۹'}</h3>
        <p className="text-xs text-purple-300 mt-0.5">
          موجودی: ${Number(user?.virtual_dollars || 1000000).toLocaleString()}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">رتبه جهانی</span>
            <span className="font-bold text-cyan-400">#{user?.rank || 1}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">امتیاز کل</span>
            <span className="font-bold text-emerald-400">{user?.points || 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">نقش</span>
            <span className="font-bold text-purple-300">{user?.role || 'coach'}</span>
          </div>
        </div>
      </div>

      {/* Subnav Pills */}
      <SubNav items={PROFILE_SUBNAV} activeId={activeSub} onChange={setActiveSub} />

      <Toast message={challengeMessage} isVisible={!!challengeMessage} type="success" />

      {/* Subtab 1: Stats */}
      {activeSub === 'stats' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-xl font-bold text-cyan-400 block dir-ltr">۶۴</span>
              <span className="text-xs text-slate-400">تعداد کل بازی‌ها</span>
            </div>
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800 text-center">
              <span className="text-xl font-bold text-emerald-400 block dir-ltr">۵۸٪</span>
              <span className="text-xs text-slate-400">درصد پیروزی (Win Rate)</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">جزئیات کامل گل‌ها و عملکرد</h4>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">گل‌های زده (Goals For):</span>
              <span className="font-bold text-emerald-400">۱۲۴</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">گل‌های خورده (Goals Against):</span>
              <span className="font-bold text-rose-400">۷۸</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">تفاضل گل کل:</span>
              <span className="font-bold text-cyan-400">+۴۶</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">کلین شیت (Clean Sheets):</span>
              <span className="font-bold text-amber-400">۲۲ مسابقه</span>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Achievements */}
      {activeSub === 'achievements' && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="text-amber-400" size={18} />
              <div>
                <span className="font-bold text-white block">مربی برتر ماه</span>
                <span className="text-[10px] text-slate-400">دستیابی در تیرماه ۱۴۰۳</span>
              </div>
            </div>
            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              تکمیل شد
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="text-purple-400" size={18} />
              <div>
                <span className="font-bold text-white block">۱۰ برد متوالی</span>
                <span className="text-[10px] text-slate-400">پیروزی ۱۰ مسابقه بدون شکست</span>
              </div>
            </div>
            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              تکمیل شد
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Medal className="text-cyan-400" size={18} />
              <div>
                <span className="font-bold text-white block">استاد تاکتیک‌های هوشمند</span>
                <span className="text-[10px] text-slate-400">برد در برابر تیم‌های رنک ۱</span>
              </div>
            </div>
            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              تکمیل شد
            </span>
          </div>
        </div>
      )}

      {/* Subtab 3: Global Leaderboard */}
      {activeSub === 'rank' && (
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center p-2.5 rounded-xl bg-gradient-to-r from-purple-950/80 to-cyan-950/80 border border-purple-500/40">
            <span className="text-cyan-400 font-bold">رتبه جهانی شما:</span>
            <span className="text-white font-black dir-ltr text-sm">#{user?.rank || 1}</span>
          </div>

          {loadingLeaderboard ? (
            <div className="flex items-center justify-center p-8 text-cyan-400 gap-2 font-bold">
              <RefreshCw className="animate-spin" size={18} />
              <span>در حال دریافت جدول رده‌بندی...</span>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-6 text-center text-slate-400 border border-slate-800/80 rounded-xl bg-slate-900/40">
              <p>هیچ رتبه‌بندی موجود نیست.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`flex justify-between items-center p-2.5 rounded-xl transition-all ${
                    item.phone_number === user?.phone_number
                      ? 'bg-purple-950/50 border border-purple-500/50 shadow-md'
                      : index === 0
                      ? 'bg-amber-950/30 border border-amber-500/30'
                      : 'bg-slate-900/60 border border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {index === 0 ? (
                      <Trophy size={16} className="text-amber-400 flex-shrink-0" />
                    ) : (
                      <span className="font-bold text-slate-400 w-4 text-center">{item.rank || index + 1}</span>
                    )}
                    <span className="font-bold text-white dir-ltr">{item.phone_number}</span>
                    <span className="text-[10px] text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
                      {item.role}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-emerald-400 font-bold block dir-ltr">{item.points} PTS</span>
                    <span className="text-[10px] text-slate-400 dir-ltr">${Number(item.virtual_dollars).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
