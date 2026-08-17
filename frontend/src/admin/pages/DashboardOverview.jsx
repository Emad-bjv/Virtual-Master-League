import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Trophy, DollarSign, Activity, Radio, Calendar, 
  CheckCircle2, Clock, AlertTriangle, ArrowUpRight, TrendingUp, RefreshCw 
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { Link } from 'react-router-dom';

export default function DashboardOverview() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await adminApi.getOverviewStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load overview stats:', err);
      showToast('خطا در بارگذاری آمار دیتابیس', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-sans">
        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
        <p>در حال بارگذاری آمار واقعی دیتابیس...</p>
      </div>
    );
  }

  const overview = stats?.overview || {};
  const matches = stats?.matches || {};
  const tournament = stats?.tournament || {};
  const recentAudit = stats?.recent_audit_logs || [];

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100 pb-16">
      {/* Top Banner */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[11px] font-bold font-sport">
              <Activity size={13} className="animate-pulse text-emerald-400" />
              <span>SYSTEM STATUS: ONLINE</span>
            </span>
            <span className="text-xs text-slate-400 font-sport">
              {tournament.name} ({tournament.season_name})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مرکز فرماندهی مدیریت ارشد مستر لیگ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            نظارت بلادرنگ بر وضعیت کاربران، مسابقات، اقتصاد و تنظیمات کلان لیگ
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>بروزرسانی آمار</span>
          </button>
          
          <Link
            to="/admin/live-control"
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95"
          >
            <Radio size={14} className="animate-pulse" />
            <span>اتاق فرمان پخش زنده</span>
          </Link>
        </div>
      </header>

      {/* 4 Core Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Coaches */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-purple-300 font-bold block mb-1">مربیان رسمی لیگ</span>
            <div className="text-3xl font-black text-white font-sport tracking-tight">
              {overview.total_coaches ?? 16}
              <span className="text-xs font-normal text-slate-400 mr-1.5 font-sans">مربی</span>
            </div>
            <span className="text-[10px] text-purple-400/80 mt-1 block">از مجموع {overview.total_users ?? 17} حساب کاربری</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-inner">
            <Users size={24} />
          </div>
        </div>

        {/* Total Registered Players */}
        <div className="glass-panel p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-cyan-300 font-bold block mb-1">کل بازیکنان دیتابیس</span>
            <div className="text-3xl font-black text-white font-sport tracking-tight">
              {overview.total_players ?? 399}
              <span className="text-xs font-normal text-slate-400 mr-1.5 font-sans">بازیکن</span>
            </div>
            <span className="text-[10px] text-cyan-400/80 mt-1 block">میانگین ریتینگ فنی: {overview.avg_player_rating ?? 80.0} OVR</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-inner">
            <Shield size={24} />
          </div>
        </div>

        {/* Total Club Budgets */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-emerald-300 font-bold block mb-1">کل نقدینگی باشگاه‌ها</span>
            <div className="text-2xl sm:text-3xl font-black text-[#00ff87] font-sport tracking-tight">
              ${Math.round((overview.total_budget || 0) / 1000000).toLocaleString()}M
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1 block">سقف دستمزد کل: ${Number(overview.total_wage_cap || 0).toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shadow-inner">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Matches Status */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/60 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs text-amber-300 font-bold block mb-1">وضعیت مسابقات لیگ</span>
            <div className="text-3xl font-black text-amber-400 font-sport tracking-tight">
              {matches.total ?? 240}
              <span className="text-xs font-normal text-slate-400 mr-1.5 font-sans">مسابقه</span>
            </div>
            <span className="text-[10px] text-amber-400/80 mt-1 block">
              {matches.live_count ?? 0} زنده • {matches.scheduled_count ?? 0} آینده • {matches.finished_count ?? 0} پایان یافته
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner">
            <Trophy size={24} />
          </div>
        </div>
      </div>

      {/* Main Grid: League Standings & Live Operations Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 League Standings */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-700/80 bg-slate-950/60 shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <span>جدول برترین‌های لیگ ({tournament.name})</span>
            </h3>
            <Link to="/admin/live-control" className="text-xs text-cyan-400 hover:underline">
              مشاهده کامل مسابقات
            </Link>
          </div>

          <div className="space-y-2">
            {tournament.top_standings && tournament.top_standings.length > 0 ? (
              tournament.top_standings.map((st, idx) => (
                <div 
                  key={st.team_id || idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-xl flex items-center justify-center font-sport font-black text-xs ${
                      idx === 0 ? 'bg-amber-500 text-slate-950 shadow-md' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {st.rank || idx + 1}
                    </span>
                    <span className="font-bold text-white text-sm">{st.team_name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-300 font-sport">
                    <span>{st.played || 0} بازی</span>
                    <span className="text-[#00ff87] font-black text-sm">{st.points || 0} PTS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                در حال حاضر اطلاعات جدولی ثبت نشده است.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-3xl border border-slate-700/80 bg-slate-950/60 shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              <span>آخرین رویدادهای ثبت‌شده در سیستم</span>
            </h3>
            <Link to="/admin/audit" className="text-xs text-cyan-400 hover:underline">
              مشاهده تمام لاگ‌ها
            </Link>
          </div>

          <div className="space-y-2">
            {recentAudit.length > 0 ? (
              recentAudit.map((log) => (
                <div 
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-cyan-300 block">{log.action_type}</span>
                    <span className="text-[11px] text-slate-400">توسط @{log.admin} {log.team_name ? `• ${log.team_name}` : ''}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dir-ltr font-sport">
                    {new Date(log.created_at).toLocaleTimeString('fa-IR')}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                هیچ لاگ اخیری ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
