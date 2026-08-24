import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Trophy, DollarSign, Activity, Radio, Calendar, 
  CheckCircle2, Clock, AlertTriangle, ArrowUpRight, TrendingUp, RefreshCw, Newspaper 
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>بروزرسانی آمار</span>
          </button>

          <Link
            to="/admin/transfer-reports"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95"
          >
            <Newspaper size={14} />
            <span>اتاق خبر و نقل‌وانتقالات 📰</span>
          </Link>
          
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

      {/* Quick Control Center Strip */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/80 bg-slate-950/70 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">مرکز فرماندهی و کنترل بخش‌های سایت</h2>
              <span className="text-[10px] text-cyan-400 font-sport">FEATURE FLAGS & SYSTEM MANAGEMENT</span>
            </div>
          </div>
          <Link 
            to="/admin/settings"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
          >
            <span>ورود به صفحه کامل تنظیمات</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Feature Flags */}
          <Link
            to="/admin/settings"
            className="group p-4 rounded-2xl bg-gradient-to-b from-cyan-950/30 to-slate-900/60 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-110 transition-transform">
                  <Activity size={16} />
                </span>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  ۹ سوئیچ مجزا
                </span>
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                سوئیچ‌های بخش‌های سیستم
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                روشن/خاموش کردن بازار، فروشگاه، گاچا، پخش زنده، سیزن پس و ثبت‌نام.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-bold">
              <span>مدیریت فلگ‌ها</span>
              <ArrowUpRight size={12} className="group-hover:translate-x-[-2px] transition-transform" />
            </div>
          </Link>

          {/* Card 2: Detailed Parameters */}
          <Link
            to="/admin/settings"
            className="group p-4 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-slate-900/60 border border-emerald-500/30 hover:border-emerald-400 transition-all shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  <DollarSign size={16} />
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ۶ حوزه فنی
                </span>
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                تنظیمات اقتصادی و فنی
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                بودجه پیش‌فرض، سقف قیمت بازیکن، شانس گاچا، زمان نیمه و ضرایب امکانات.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-bold">
              <span>ویرایش پارامترها</span>
              <ArrowUpRight size={12} className="group-hover:translate-x-[-2px] transition-transform" />
            </div>
          </Link>

          {/* Card 3: Reset Actions */}
          <Link
            to="/admin/settings"
            className="group p-4 rounded-2xl bg-gradient-to-b from-rose-950/30 to-slate-900/60 border border-rose-500/30 hover:border-rose-400 transition-all shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-110 transition-transform">
                  <AlertTriangle size={16} />
                </span>
                <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  تأییدیه امنیتی
                </span>
              </div>
              <h3 className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                عملیات حساس ریست داده‌ها
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                ریست فصل، بازنشانی بودجه‌ها، صفر کردن کارت‌ها و آمار بازیکنان و امکانات.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-rose-400 font-bold">
              <span>منطقه ریست داده‌ها</span>
              <ArrowUpRight size={12} className="group-hover:translate-x-[-2px] transition-transform" />
            </div>
          </Link>
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
