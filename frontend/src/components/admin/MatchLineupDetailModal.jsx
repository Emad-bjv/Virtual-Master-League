import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, CheckCircle2, Clock, Users, Sliders,
  Eye, AlertTriangle, RefreshCw, Zap
} from 'lucide-react';
import { teamApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import EFootballGamePlan from '../team/EFootballGamePlan';
import ErrorBoundary from '../common/ErrorBoundary';

const TACTICAL_GUIDES = {
  'بازی مالکانه': 'تمرکز بر پاسکاری‌های متعدد و تسلط کامل بر توپ جهت باز کردن لایه‌های دفاعی حریف.',
  'ضد حمله': 'انتقال فوق‌سریع توپ از خط دفاع به خط حمله در لحظه لو رفتن توپ توسط حریف.',
  'پاس کوتاه': 'حرکت دادن توپ با پاس‌های زمینی و مطمئن بین بازیکنان نزدیک.',
  'پاس بلند': 'ارسال مستقیم توپ‌های بلند به فضاهای خالی پشت مدافعان حریف.',
  'مرکز': 'تمرکز اصلی روی بازیسازی و نفوذ از میانه میدان و عمق خط دفاعی حریف.',
  'کناره': 'توسعه بازی به سمت بال‌ها و استفاده از سانترها و نفوذ وینگرها.',
  'شناور': 'بازیکنان آزادی عمل داشته و در هنگام مالکیت توپ پست خود را تعویض می‌کنند.',
  'حفظ ترکیب': 'بازیکنان نظم ساختاری تیم را حفظ کرده و در پست‌های اصلی خود باقی می‌مانند.',
  'فشار خط مقدم': 'پرس سنگین از یک‌سوم دفاعی حریف به محض از دست رفتن مالکیت توپ.',
  'همه دفاع': 'عقب‌نشینی منظم تمام تیم به زمین خودی و بستن فضاهای نفوذ.',
  'میانه': 'هدایت حریف به مرکز زمین و ایجاد تله‌های پرسینگ متراکم.',
  'کناره‌ها': 'بستن مرکز و هدایت حملات حریف به سمت خطوط طولی.',
  'لنگر انداختن': 'حفظ موقعیت ثابت مهاجم نوک در مرکز بدون متمایل شدن به کناره‌ها.',
  'بال غلط': 'نفوذ وینگرها به داخل محوطه جریمه حریف به عنوان مهاجم دوم.',
  'تدافعی': 'عقب نشستن یکی از هافبک‌ها به عنوان مدافع میانی سوم در فاز دفاع.',
  'نزدیک به خط اطراف زمین': 'حفظ حداکثر عرض بازی توسط بازیکنان کناری.',
  'دفاع کنار‌های تهاجمی': 'نفوذ مدافعین کناری تا خط عرضی حریف جهت اضافه شدن به موج حمله.',
  'دوران بال‌ها': 'جابجایی مداوم موقعیت بین وینگرها و هافبک‌های کناری.',
  'تیکی تاکا': 'پاسکاری‌های سریع تک‌ضرب مثلثی با جابجایی مداوم موقعیت.',
  'شماره ۹ کاذب': 'عقب آمدن مهاجم نوک به خط هافبک برای فضا سازی برای وینگرها.',
  'اهداف مرکز': 'تغذیه هوایی و ارسال سانترهای پیاپی برای مهاجمان سرزن در باکس.',
  'فولبک‌های کاذب': 'ورود مدافعان کناری به مرکز میدان در فاز بازیسازی.',
  'بال عقب': 'عقب‌نشینی وینگرها و مدافعان کناری برای تشکیل خط دفاع ۵ نفره.',
  'خط دفاعی عمیق': 'عقب نشستن خط دفاعی برای جلوگیری از لو رفتن فضاهای پشت مدافعان.',
  'شلوغی در محوطه جریمه': 'تراکم حداکثری مدافعان داخل محوطه ۱۸ قدم در هنگام سانترها.',
  'مقابله با هدف': 'مهار مستقیم مهاجم هدف حریف با مدافع یارگیر تخصصی.',
  'فشار': 'گگن پرسینگ شدید به مدت چند ثانیه پس از لو رفتن توپ.',
  'هیچکدام': 'دستورالعمل تاکتیکی پیشرفته‌ای تعریف نشده است.',
};

export default function MatchLineupDetailModal({
  isOpen,
  onClose,
  match,
  defaultSide = 'home',
}) {
  const [activeSide, setActiveSide] = useState(defaultSide);
  const [activeTab, setActiveTab] = useState('pitch'); // 'pitch' | 'tactics' | 'bench'
  const [loading, setLoading] = useState(false);
  const [gameplanData, setGameplanData] = useState({
    home: null,
    away: null,
  });

  useEffect(() => {
    if (defaultSide) setActiveSide(defaultSide);
  }, [defaultSide, isOpen]);

  useEffect(() => {
    if (!isOpen || !match) return;

    const fetchGameplans = async () => {
      setLoading(true);
      const homeId = match.home_team || match.home_team_id || match.homeId;
      const awayId = match.away_team || match.away_team_id || match.awayId;

      const parseTeamData = (data) => {
        if (!data) return null;
        const gp = data.gameplan || {};
        const teamObj = data.team || {};
        const rawPlayers = teamObj.players || [];
        const gpPlayersData = gp.players_data || [];
        const gpMap = new Map();
        if (Array.isArray(gpPlayersData)) {
          gpPlayersData.forEach((item) => {
            const pid = item.player_id || item.id;
            if (pid) gpMap.set(String(pid), item);
          });
        }

        const formattedPlayers = rawPlayers.map((p, idx) => {
          const custom = gpMap.get(String(p.id));
          return {
            ...p,
            id: String(p.id),
            name: p.name,
            naturalPosition: p.naturalPosition || p.position,
            position: custom?.position || p.tacticalPosition || p.position || p.naturalPosition,
            tacticalPosition: custom?.position || p.tacticalPosition || null,
            shirt_number: p.shirt_number || idx + 1,
            is_starting: custom && custom.is_starting !== undefined ? Boolean(custom.is_starting) : Boolean(p.is_starting),
            x_coord: custom && custom.x_coord != null ? custom.x_coord : p.x_coord,
            y_coord: custom && custom.y_coord != null ? custom.y_coord : p.y_coord,
            rating: p.rating || 7.0,
            overall_rating: p.overall_rating || p.rating || 75,
            photo_url: p.photo_url || p.photo,
          };
        });

        let starters = formattedPlayers.filter((p) => p.is_starting);
        let nonStarting = formattedPlayers.filter((p) => !p.is_starting);

        if (starters.length < 11 && nonStarting.length > 0 && formattedPlayers.length >= 11) {
          const needed = 11 - starters.length;
          const promoted = nonStarting.slice(0, needed);
          starters = [...starters, ...promoted.map((p) => ({ ...p, is_starting: true }))];
          nonStarting = nonStarting.slice(needed);
        }

        return {
          gameplan: gp,
          tactics: gp,
          team: teamObj,
          formation: gp.formation || teamObj.default_formation || '4-3-3',
          starters,
          subs: nonStarting.slice(0, 11),
          reserves: nonStarting.slice(11),
          players: formattedPlayers,
        };
      };

      try {
        const [homeRes, awayRes] = await Promise.allSettled([
          homeId ? teamApi.getGameplan(homeId, match.id) : Promise.resolve({ data: null }),
          awayId ? teamApi.getGameplan(awayId, match.id) : Promise.resolve({ data: null }),
        ]);

        setGameplanData({
          home: homeRes.status === 'fulfilled' && homeRes.value?.data ? parseTeamData(homeRes.value.data) : null,
          away: awayRes.status === 'fulfilled' && awayRes.value?.data ? parseTeamData(awayRes.value.data) : null,
        });
      } catch (err) {
        console.warn('Failed to load match gameplans for modal', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameplans();
  }, [isOpen, match?.id]);

  if (!isOpen || !match) return null;

  const isHome = activeSide === 'home';
  const teamName = isHome ? (match.home_team_name || 'میزبان') : (match.away_team_name || 'میهمان');
  const opponentName = isHome ? (match.away_team_name || 'میهمان') : (match.home_team_name || 'میزبان');
  const teamLogo = getTeamLogoUrl(isHome ? (match.home_team_logo || teamName) : (match.away_team_logo || teamName));
  const opponentLogo = getTeamLogoUrl(isHome ? (match.away_team_logo || opponentName) : (match.home_team_logo || teamName));

  const isLineupReady = isHome ? Boolean(match.home_lineup_ready) : Boolean(match.away_lineup_ready);
  const activeSideData = isHome ? gameplanData.home : gameplanData.away;
  const activeGp = activeSideData?.gameplan || {};
  const activePreset = activeGp.preset_name || (isHome ? match.home_preset_name : match.away_preset_name);
  const formation = activeSideData?.formation || (isHome ? match.home_formation : match.away_formation) || '4-3-3';
  const coachName = isHome ? (match.home_coach_name || 'ثبت نشده') : (match.away_coach_name || 'ثبت نشده');

  return typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="fixed inset-0" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl my-auto p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/40">
                <Users size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sport font-black text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                    بازی #{match.id} • {match.round_name || 'مسابقه'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">بررسی جامع ترکیب و تاکتیک ارسالی مربیان</span>
                </div>
                <h3 className="font-black text-white text-base sm:text-lg mt-0.5">
                  {match.home_team_name} <span className="text-slate-500 text-sm">VS</span> {match.away_team_name}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="بستن"
            >
              <X size={20} />
            </button>
          </div>

          {/* Home / Away Team Toggle Ribbon */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveSide('home')}
              className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                activeSide === 'home'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-xl bg-slate-950 p-1 shrink-0 flex items-center justify-center border border-slate-800">
                  {getTeamLogoUrl(match.home_team_logo || match.home_team_name) ? (
                    <img src={getTeamLogoUrl(match.home_team_logo || match.home_team_name)} alt="Home" className="w-full h-full object-contain" />
                  ) : <Shield size={16} />}
                </div>
                <div className="text-right truncate">
                  <span className="text-xs block font-black truncate">{match.home_team_name} (میزبان)</span>
                  <span className="text-[10px] opacity-80 block truncate">سرمربی: {match.home_coach_name || 'ثبت نشده'}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-sport font-black shrink-0 ${
                match.home_lineup_ready ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {match.home_lineup_ready ? '✓ ثبت‌شده' : '⏳ پیش‌فرض'}
              </span>
            </button>

            <button
              onClick={() => setActiveSide('away')}
              className={`p-2.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                activeSide === 'away'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-xl bg-slate-950 p-1 shrink-0 flex items-center justify-center border border-slate-800">
                  {getTeamLogoUrl(match.away_team_logo || match.away_team_name) ? (
                    <img src={getTeamLogoUrl(match.away_team_logo || match.away_team_name)} alt="Away" className="w-full h-full object-contain" />
                  ) : <Shield size={16} />}
                </div>
                <div className="text-right truncate">
                  <span className="text-xs block font-black truncate">{match.away_team_name} (میهمان)</span>
                  <span className="text-[10px] opacity-80 block truncate">سرمربی: {match.away_coach_name || 'ثبت نشده'}</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-sport font-black shrink-0 ${
                match.away_lineup_ready ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {match.away_lineup_ready ? '✓ ثبت‌شده' : '⏳ پیش‌فرض'}
              </span>
            </button>
          </div>

          {/* Lineup Status & Tactical Preset Badge Banner */}
          <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {isLineupReady ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-[#00ff87]" />
                  <span>ترکیب اختصاصی ارسال شده توسط سرمربی ({coachName})</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 shadow-sm">
                  <Clock size={14} className="text-amber-400" />
                  <span>ترکیب پیش‌فرض باشگاه (هنوز ترکیب اختصاصی ارسال نشده)</span>
                </span>
              )}

              {activePreset ? (
                <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black flex items-center gap-1 shadow-md">
                  <Zap size={13} />
                  <span>سبک آماده: {activePreset}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-purple-950 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                  <Sliders size={13} />
                  <span>تاکتیک دستی اختصاصی</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-sport font-black text-xs px-3 py-1 bg-slate-950 rounded-xl border border-slate-700 text-cyan-300">
                سیستم: {formation}
              </span>
              <span className="font-sport font-black text-xs px-3 py-1 bg-slate-950 rounded-xl border border-slate-700 text-white">
                تعداد بازیکنان: {activeSideData?.players?.length || 0}
              </span>
            </div>
          </div>

          {/* Tab Navigation (Pitch vs Bench vs Tactics) */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('pitch')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pitch' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={14} />
              <span>زمین مسابقه و ۱۱ بازیکن اصلی</span>
            </button>
            <button
              onClick={() => setActiveTab('bench')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'bench' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>نیمکت ذخیره و رزروها ({activeSideData ? (activeSideData.subs.length + activeSideData.reserves.length) : 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('tactics')}
              className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'tactics' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders size={14} />
              <span>تنظیمات و دستورات تاکتیکی</span>
            </button>
          </div>

          {/* Modal Body Content (Scrollable) */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {loading ? (
              <div className="p-16 text-center text-cyan-400 font-bold flex flex-col items-center justify-center gap-3">
                <RefreshCw size={28} className="animate-spin text-cyan-400" />
                <span className="text-xs">در حال بارگذاری اطلاعات ترکیب و پلن مسابقه {teamName}...</span>
              </div>
            ) : !activeSideData ? (
              <div className="glass-panel p-12 text-center rounded-3xl border border-slate-800 space-y-2">
                <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                <p className="text-slate-300 text-sm font-bold">اطلاعات پلن بازی برای این تیم یافت نشد.</p>
                <p className="text-slate-500 text-xs">احتمالاً برای این مسابقه پلن یا بازیکنی تعریف نشده است.</p>
              </div>
            ) : (
              <>
                {/* TAB 1: PITCH & STARTING XI */}
                {activeTab === 'pitch' && (
                  <div className="space-y-4">
                    {/* Interactive Tactical Pitch */}
                    <div className="bg-slate-950 p-2 rounded-3xl border-2 border-slate-800 shadow-2xl relative">
                      <ErrorBoundary>
                        <EFootballGamePlan
                          key={`modal-pitch-${match.id}-${activeSide}-${activeSideData.starters.length}-${formation}`}
                          teamName={teamName}
                          readOnly={true}
                          isAdminMode={false}
                          formation={formation}
                          initialStartingXi={activeSideData.starters}
                          initialSubstitutes={activeSideData.subs}
                          initialReserves={activeSideData.reserves}
                          hideReserves={true}
                        />
                      </ErrorBoundary>
                    </div>

                    {/* Starting XI Player Cards Table / Grid */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Users size={14} className="text-cyan-400" />
                        <span>لیست ۱۱ بازیکن فیکس در ترکیب:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeSideData.starters.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-700 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                                {getPlayerPhotoUrl(p.photo_url || p.photo) ? (
                                  <img src={getPlayerPhotoUrl(p.photo_url || p.photo)} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-bold text-[10px] text-slate-400">{p.shirt_number || idx + 1}</span>
                                )}
                              </div>
                              <div className="truncate">
                                <span className="font-black text-white block truncate">{p.name}</span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <span>شماره {p.shirt_number || idx + 1}</span>
                                  {p.naturalPosition && <span>• پست اصلی: {p.naturalPosition}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-sport font-black text-xs px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                {p.position || p.tacticalPosition || p.naturalPosition || 'CMF'}
                              </span>
                              <span className="font-sport font-black text-xs px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-500/40">
                                {p.overall_rating || p.rating || 75}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: BENCH & RESERVES */}
                {activeTab === 'bench' && (
                  <div className="space-y-4">
                    {/* Substitutes */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users size={14} className="text-emerald-400" />
                          <span>بازیکنان نیمکت ذخیره ({activeSideData.subs.length} بازیکن)</span>
                        </span>
                        <span className="text-[10px] text-slate-500">حداکثر ۱۱ نفر روی نیمکت</span>
                      </h4>
                      {activeSideData.subs.length === 0 ? (
                        <p className="text-xs text-slate-500 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-center">
                          هیچ بازیکن ذخیره‌ای روی نیمکت قرار داده نشده است.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeSideData.subs.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-700 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                                  {getPlayerPhotoUrl(p.photo_url || p.photo) ? (
                                    <img src={getPlayerPhotoUrl(p.photo_url || p.photo)} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-bold text-[10px] text-slate-400">{p.shirt_number || idx + 12}</span>
                                  )}
                                </div>
                                <div className="truncate">
                                  <span className="font-black text-white block truncate">{p.name}</span>
                                  <span className="text-[10px] text-slate-400">شماره {p.shirt_number || idx + 12}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-sport font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                  {p.position || p.naturalPosition || 'SUB'}
                                </span>
                                <span className="font-sport font-black text-xs px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-700">
                                  {p.overall_rating || p.rating || 70}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reserves */}
                    {activeSideData.reserves.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-800/80">
                        <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <Users size={14} className="text-slate-500" />
                          <span>بازیکنان سکونشین و لیست مازاد ({activeSideData.reserves.length} بازیکن)</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {activeSideData.reserves.map((p, idx) => (
                            <div
                              key={p.id || idx}
                              className="p-2 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between gap-2 text-xs opacity-75"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold text-slate-300 truncate">{p.name}</span>
                              </div>
                              <span className="text-[10px] font-sport text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {p.naturalPosition || p.position}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: TACTICAL SETTINGS & INSTRUCTIONS */}
                {activeTab === 'tactics' && (
                  <div className="space-y-4">
                    {/* Attack Tactics */}
                    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                      <h5 className="font-bold text-rose-400 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                        <span>⚔️ دستورالعمل‌های تاکتیکی فاز حمله</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">سبک حمله (Attacking Style):</span>
                          <strong className="text-rose-300 block">{activeGp.attacking_style || 'بازی مالکانه'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.attacking_style || 'بازی مالکانه']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">بازیسازی (Build Up):</span>
                          <strong className="text-amber-300 block">{activeGp.build_up || 'پاس کوتاه'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.build_up || 'پاس کوتاه']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">منطقه حمله (Attacking Area):</span>
                          <strong className="text-emerald-300 block">{activeGp.attacking_area || 'مرکز'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.attacking_area || 'مرکز']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">جای‌گیری (Positioning):</span>
                          <strong className="text-cyan-300 block">{activeGp.positioning || 'شناور'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.positioning || 'شناور']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 block font-bold">محدوده پشتیبانی (Support Range):</span>
                            <span className="font-sport font-black text-rose-400 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-xs">
                              {activeGp.support_range || 5} / ۱۰
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700 mt-1.5">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${((activeGp.support_range || 5) / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Defense Tactics */}
                    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                      <h5 className="font-bold text-cyan-400 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                        <span>🛡️ دستورالعمل‌های تاکتیکی فاز دفاع</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">سبک دفاعی (Defensive Style):</span>
                          <strong className="text-cyan-300 block">{activeGp.defensive_style || 'فشار خط مقدم'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.defensive_style || 'فشار خط مقدم']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">ناحیه مهار (Containment Area):</span>
                          <strong className="text-blue-300 block">{activeGp.containment_area || 'میانه'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.containment_area || 'میانه']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">پرسینگ (Pressing):</span>
                          <strong className="text-teal-300 block">{activeGp.pressing || 'تدافعی'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.pressing || 'تدافعی']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 block font-bold">خط دفاعی (Defensive Line):</span>
                            <span className="font-sport font-black text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-xs">
                              {activeGp.defensive_line || 5} / ۱۰
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700 mt-1.5">
                            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${((activeGp.defensive_line || 5) / 10) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 block font-bold">فشردگی (Compactness):</span>
                            <span className="font-sport font-black text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-xs">
                              {activeGp.compactness || 5} / ۱۰
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700 mt-1.5">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${((activeGp.compactness || 5) / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Advanced Instructions */}
                    <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
                      <h5 className="font-bold text-purple-400 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                        <span>⚡ دستورالعمل‌های تاکتیکی پیشرفته (Advanced Instructions)</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">دستور تهاجمی ۱:</span>
                          <strong className="text-purple-300 block">{activeGp.advanced_instruction_1 || 'هیچکدام'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.advanced_instruction_1 || 'هیچکدام']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">دستور تهاجمی ۲:</span>
                          <strong className="text-purple-300 block">{activeGp.advanced_instruction_2 || 'هیچکدام'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.advanced_instruction_2 || 'هیچکدام']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">دستور دفاعی ۱:</span>
                          <strong className="text-pink-300 block">{activeGp.advanced_instruction_3 || 'هیچکدام'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.advanced_instruction_3 || 'هیچکدام']}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-bold">دستور دفاعی ۲:</span>
                          <strong className="text-pink-300 block">{activeGp.advanced_instruction_4 || 'هیچکدام'}</strong>
                          <span className="text-[10px] text-slate-500 block leading-tight">{TACTICAL_GUIDES[activeGp.advanced_instruction_4 || 'هیچکدام']}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
