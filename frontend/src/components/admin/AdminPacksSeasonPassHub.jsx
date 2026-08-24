import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Crown, Gift, Trophy, Star, Sparkles, RefreshCw, Plus, Edit2, Trash2,
  CheckCircle, AlertCircle, ShieldCheck, DollarSign, Gem, ArrowRightLeft,
  Calendar, Check, X, Users, User, Clock, FileText, Zap, Eye, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { seasonPassApi, gachaApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';
import ConfirmModal from '../common/ConfirmModal';

const HUB_TABS = [
  { id: 'pass_levels', label: '🏆 سطوح و پاداش‌های سیزن پس', icon: Crown },
  { id: 'team_legends', label: '⭐ لجندهای اختصاصی تیم‌ها', icon: Star },
  { id: 'gacha_packs', label: '🎁 مدیریت پک‌های گاشا', icon: Gift },
  { id: 'weekly_tasks', label: '📋 تسک‌های هفتگی لیگ', icon: Calendar },
  { id: 'pack_logs', label: '📜 تاریخچه باز کردن پک‌ها', icon: FileText },
];

export default function AdminPacksSeasonPassHub() {
  const [activeTab, setActiveTab] = useState('pass_levels');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Season Pass Data
  const [passLevels, setPassLevels] = useState([]);
  const [teamPasses, setTeamPasses] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [legendPlayersPool, setLegendPlayersPool] = useState([]);
  const [xpRates, setXpRates] = useState(null);

  // Gacha Data
  const [gachaPacks, setGachaPacks] = useState([]);
  const [packLogs, setPackLogs] = useState([]);

  // Modals & Selection States
  const [editingLevel, setEditingLevel] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);

  const [selectedTeamPassForLegend, setSelectedTeamPassForLegend] = useState(null);
  const [selectedLegendPlayerId, setSelectedLegendPlayerId] = useState('');

  const [editingPack, setEditingPack] = useState(null);
  const [showPackModal, setShowPackModal] = useState(false);

  const [taskFilterWeek, setTaskFilterWeek] = useState('ALL');

  const [confirmModalData, setConfirmModalData] = useState(null);

  const notify = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [passRes, gachaRes] = await Promise.all([
        seasonPassApi.getAdminOverview(),
        gachaApi.adminGetPacks()
      ]);

      setPassLevels(passRes.data.levels || []);
      setTeamPasses(passRes.data.team_passes || []);
      setWeeklyTasks(passRes.data.weekly_tasks || []);
      setLegendPlayersPool(passRes.data.legend_players_pool || []);
      setXpRates(passRes.data.xp_rates || null);

      setGachaPacks(gachaRes.data.packs || []);
      setPackLogs(gachaRes.data.recent_logs || []);
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در بارگذاری اطلاعات پنل مدیریت', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS: SEASON PASS LEVELS
  // ─────────────────────────────────────────────────────────────────────────
  const handleSeedLevels = () => {
    setConfirmModalData({
      title: 'تنظیم مجدد سطوح سیزن پس',
      message: 'آیا از تنظیم خودکار ۲۰ سطح مهندسی‌شده با فرمول پایان در هفته ۱۷ اطمینان دارید؟',
      confirmText: 'بله، تنظیم سطوح',
      variant: 'info',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await seasonPassApi.adminSeedLevels();
          notify(res.data.message || 'سطوح سیزن پس تنظیم شدند.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در تنظیم سطوح', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleSaveLevel = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await seasonPassApi.adminSaveLevel(editingLevel);
      notify(res.data.message || 'سطح با موفقیت ذخیره شد.', 'success');
      setShowLevelModal(false);
      setEditingLevel(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ذخیره سطح', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS: TEAM LEGENDS
  // ─────────────────────────────────────────────────────────────────────────
  const handleAutoAssignLegends = () => {
    setConfirmModalData({
      title: 'تخصیص خودکار لجندهای یکتا به همه تیم‌ها',
      message: 'این عملیات به تمام ۱۶ تیم لیگ یک بازیکن لجند افسانه‌ای منحصربه‌فرد و ۱۰۰٪ غیرتکراری اختصاص می‌دهد. آیا ادامه می‌دهید؟',
      confirmText: 'بله، تخصیص هوشمند',
      variant: 'info',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await seasonPassApi.adminAutoAssignLegends();
          notify(res.data.message || 'لجندهای یکتا تخصیص یافتند.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در تخصیص لجندها', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleAssignLegendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamPassForLegend || !selectedLegendPlayerId) return;

    setActionLoading(true);
    try {
      const res = await seasonPassApi.adminAssignLegend({
        team_id: selectedTeamPassForLegend.team,
        player_id: parseInt(selectedLegendPlayerId, 10)
      });
      notify(res.data.message || 'بازیکن لجند با موفقیت اختصاص یافت.', 'success');
      setSelectedTeamPassForLegend(null);
      setSelectedLegendPlayerId('');
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در انتساب بازیکن لجند', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetTeamPass = (tp) => {
    setConfirmModalData({
      title: `ریست سیزن‌پس تیم ${tp.team_name}`,
      message: `آیا از ریست کامل سیزن‌پس تیم «${tp.team_name}» اطمینان دارید؟ تمام امتیازات XP به صفر و سطح به ۱ بازمی‌گردد، وضعیت VIP و پاداش‌های دریافت شده پاک می‌شوند و بازیکن لجند (در صورت تعلق) از ترکیب تیم خارج می‌شود.`,
      confirmText: 'بله، ریست شود',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await seasonPassApi.adminResetTeamPass({ team_id: tp.team || tp.id });
          notify(res.data.message || 'سیزن پس تیم ریست شد.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در ریست سیزن پس تیم', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleResetAllTeamPasses = () => {
    setConfirmModalData({
      title: 'ریست سیزن‌پس تمام تیم‌های لیگ',
      message: 'هشدار: آیا از ریست کامل سیزن‌پس کلیه تیم‌های لیگ اطمینان دارید؟ تمام پیشرفت‌ها و جوایز به سطح ۱ و ۰ XP برمی‌گردند.',
      confirmText: 'بله، ریست همه تیم‌ها',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await seasonPassApi.adminResetAllTeamPasses();
          notify(res.data.message || 'سیزن پس تمام تیم‌ها ریست شدند.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در ریست تمام تیم‌ها', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS: GACHA PACKS
  // ─────────────────────────────────────────────────────────────────────────
  const handleSavePack = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await gachaApi.adminSavePack(editingPack);
      notify(res.data.message || 'پک با موفقیت ذخیره شد.', 'success');
      setShowPackModal(false);
      setEditingPack(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ذخیره پک', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePack = (pack) => {
    setConfirmModalData({
      title: `حذف ${pack.name}`,
      message: `آیا از حذف پک «${pack.name}» اطمینان دارید؟`,
      confirmText: 'بله، حذف پک',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await gachaApi.adminDeletePack(pack.id);
          notify(res.data.message || 'پک حذف شد.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در حذف پک', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS: WEEKLY TASKS
  // ─────────────────────────────────────────────────────────────────────────
  const handleSeedTasks = () => {
    setConfirmModalData({
      title: 'تولید خودکار تسک‌های فصل',
      message: 'آیا از ساخت خودکار ۶۰ تسک استاندارد برای ۳۰ هفته فصل با ارزش هر تسک ۵۶ XP اطمینان دارید؟',
      confirmText: 'بله، تولید تسک‌ها',
      variant: 'info',
      onConfirm: async () => {
        setConfirmModalData(null);
        setActionLoading(true);
        try {
          const res = await seasonPassApi.adminSeedTasks();
          notify(res.data.message || 'تسک‌های فصلی تولید شدند.', 'success');
          loadData();
        } catch (err) {
          notify(err.response?.data?.error || 'خطا در تولید تسک‌ها', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const filteredTasks = taskFilterWeek === 'ALL'
    ? weeklyTasks
    : weeklyTasks.filter(t => String(t.week_number) === String(taskFilterWeek));

  return (
    <div className="space-y-6 font-sans dir-rtl text-slate-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border backdrop-blur-md ${
          toastType === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-950/50'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
        }`}>
          {toastType === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/70 via-purple-950/60 to-slate-900 border border-amber-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Crown size={28} className="text-slate-950" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              مدیریت سیزن پس، بازیکنان لجند و پک‌ها
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-sport font-bold">
                Admin Control Hub
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              مدیریت سطوح صعودی، پاداش‌های نقدی و جم، لجندهای یکتای هر تیم و پک‌های فروشگاه
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>بروزرسانی داده‌ها</span>
        </button>
      </div>

      {/* XP Progression Formula Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">پیروزی مسابقه:</span>
            <span className="text-emerald-400 font-black font-sport dir-ltr">+{xpRates?.win_xp || 165} XP</span>
          </div>
          <span className="text-[10.5px] text-slate-400 block">۱۵ برد = ۲,۴۷۵ XP (۷۰٪ سیزن پس)</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">تساوی مسابقه:</span>
            <span className="text-amber-400 font-black font-sport dir-ltr">+{xpRates?.draw_xp || 70} XP</span>
          </div>
          <span className="text-[10.5px] text-slate-400 block">پاداش امتیازدهی مساوی</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">تکمیل هر تسک:</span>
            <span className="text-cyan-400 font-black font-sport dir-ltr">+{xpRates?.task_xp || 56} XP</span>
          </div>
          <span className="text-[10.5px] text-slate-400 block">۲۵ تسک = ۱,۴۰۰ XP (۴۰٪ سیزن پس)</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">هدف پایان سیزن:</span>
            <span className="text-purple-300 font-black font-sport">هفته ۱۷ لیگ</span>
          </div>
          <span className="text-[10.5px] text-slate-400 block">مجموع کل: ۳,۵۰۰ XP (۲۰ سطح)</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800">
        {HUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-slate-950 font-black shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SEASON PASS LEVELS & REWARDS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pass_levels' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>فهرست سطوح سیزن پس ({passLevels.length} سطح)</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedLevels}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>تنظیم خودکار ۲۰ سطح مهندسی‌شده</span>
              </button>
              <button
                onClick={() => {
                  setEditingLevel({
                    level: (passLevels.length || 0) + 1,
                    xp_required: ((passLevels.length || 0) + 1) * 175,
                    reward_title: `پاداش سطح ${(passLevels.length || 0) + 1}`,
                    free_reward_coins: 50000,
                    free_reward_gems: 30,
                    vip_reward_coins: 150000,
                    vip_reward_gems: 80,
                    is_final_level: false
                  });
                  setShowLevelModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus size={14} />
                <span>افزودن سطح جدید</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {passLevels.map((lvl) => (
              <div
                key={lvl.level}
                className={`p-4 rounded-2xl border transition-all ${
                  lvl.is_final_level
                    ? 'bg-gradient-to-b from-amber-950/60 via-purple-950/40 to-slate-900 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black font-sport text-xs ${
                      lvl.is_final_level ? 'bg-amber-400 text-slate-950' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                    }`}>
                      {lvl.level}
                    </span>
                    <span className="font-bold text-white text-xs">{lvl.reward_title || `سطح ${lvl.level}`}</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold dir-ltr">{lvl.xp_required} XP</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
                    <span className="text-slate-400 text-[10px] block">مسیر رایگان (Free):</span>
                    <div className="flex justify-between font-sport">
                      <span className="text-[#00ff87] font-bold">+${Number(lvl.free_reward_coins || 0).toLocaleString()} USD</span>
                      <span className="text-cyan-300 font-bold">+{lvl.free_reward_gems || 0} 💎</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-0.5">
                    <span className="text-purple-300 text-[10px] block">مسیر VIP:</span>
                    <div className="flex justify-between font-sport">
                      <span className="text-amber-300 font-bold">+${Number(lvl.vip_reward_coins || 0).toLocaleString()} USD</span>
                      <span className="text-amber-400 font-bold">+{lvl.vip_reward_gems || 0} 💎</span>
                    </div>
                  </div>

                  {lvl.is_final_level && (
                    <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-center text-amber-300 font-bold">
                      ⭐ پاداش سطح آخر: بازیکن لجند اختصاصی تیم
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingLevel({ ...lvl });
                      setShowLevelModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>ویرایش پاداش</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: UNIQUE TEAM LEGENDS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'team_legends' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>تخصیص بازیکنان لجند و مدیریت سیزن‌پس تیم‌ها ({teamPasses.length} تیم)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                هر تیم در سطح ۲۰ یک بازیکن لجند منحصربه‌فرد دریافت می‌کند. همچنین امکان ریست پیشرفت سیزن‌پس هر تیم وجود دارد.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetAllTeamPasses}
                disabled={actionLoading}
                className="px-3.5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw size={14} />
                <span>ریست سیزن‌پس تمام تیم‌ها</span>
              </button>
              <button
                onClick={handleAutoAssignLegends}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Sparkles size={16} />
                <span>تخصیص خودکار لجندها به تمام تیم‌ها</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {teamPasses.map((tp) => {
              const leg = tp.assigned_legend_player;
              const progressPct = Math.min(100, Math.round(((tp.current_xp || 0) / 3500) * 100));

              return (
                <div
                  key={tp.id}
                  className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 space-y-3 transition-all relative overflow-hidden"
                >
                  {/* Team Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={getTeamLogoUrl(tp.team_name)}
                          alt={tp.team_name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{tp.team_name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-cyan-400 font-sport font-bold">سطح {tp.current_level}</span>
                          <span className="text-[10px] text-slate-400 font-sport">({tp.current_xp || 0} XP)</span>
                        </div>
                      </div>
                    </div>
                    {tp.is_vip && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1">
                        <Crown size={11} /> VIP
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Claims */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>پیشرفت سیزن پس:</span>
                      <span className="text-cyan-300 font-sport font-bold dir-ltr">{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span>جوایز دریافتی:</span>
                      <span className="text-white font-bold font-sport">
                        {(tp.claimed_levels || []).length} سطح
                      </span>
                    </div>
                  </div>

                  {/* Assigned Legend Player Card */}
                  {leg ? (
                    <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-950/50 via-slate-950 to-slate-900 border border-amber-500/40 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-12 rounded-xl bg-slate-950 border border-amber-400/50 overflow-hidden shrink-0 flex items-center justify-center">
                          {getPlayerPhotoUrl(leg.name) ? (
                            <img src={getPlayerPhotoUrl(leg.name)} alt={leg.name} className="w-full h-full object-cover object-top" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <User size={18} className="text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-white text-xs">{leg.name}</span>
                            <span className="text-amber-300 font-bold bg-amber-950 px-1 rounded text-[10px] font-sport">OVR {leg.overall}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block font-sport">{leg.position} • سن {leg.age}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800">
                        <span className="text-slate-400">وضعیت پاداش:</span>
                        {tp.legend_claimed ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> دریافت شده</span>
                        ) : (
                          <span className="text-amber-400 font-bold">در انتظار تکمیل سیزن پس</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-rose-500/40 text-center space-y-1">
                      <span className="text-rose-400 text-xs font-bold block">لجندی اختصاص نیافته</span>
                      <span className="text-[10px] text-slate-500">از دکمه تغییر لجند انتخاب کنید</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedTeamPassForLegend(tp);
                        setSelectedLegendPlayerId(leg ? String(leg.id) : '');
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      title="تغییر بازیکن لجند تیم"
                    >
                      <ArrowRightLeft size={13} />
                      <span>تغییر لجند</span>
                    </button>
                    <button
                      onClick={() => handleResetTeamPass(tp)}
                      disabled={actionLoading}
                      className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-rose-100 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="ریست کامل سیزن پس این تیم"
                    >
                      <RotateCcw size={13} />
                      <span>ریست</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: PACKS MANAGEMENT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'gacha_packs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>پک‌های شانس و استخر بازیکنان ({gachaPacks.length} پک)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                پک‌های برنز، نقره و لجندری با استخر بازیکنان مستقل و قابلیت انتخاب ۱ از ۳ کارت
              </p>
            </div>
            <a
              href="/admin/packs"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Sparkles size={16} />
              <span>مدیریت کامل و استخر بازیکنان (Admin Suite)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {gachaPacks.map((pack) => (
              <div
                key={pack.id}
                className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 space-y-3.5 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300">
                      <Gift size={20} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-600/40">
                        {pack.tier_display || pack.tier}
                      </span>
                      <h4 className="font-black text-white text-sm mt-1">{pack.name}</h4>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    pack.is_active ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                  }`}>
                    {pack.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>

                {pack.ovr_range_text && (
                  <div className="text-[11px] text-amber-300 font-bold font-sport">
                    {pack.ovr_range_text}
                  </div>
                )}

                {/* Price Matrix */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-[11px] font-sport">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">قیمت به جم:</span>
                    <span className="text-cyan-300 font-bold">{pack.cost_gems || 0} 💎</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">قیمت به دلار مجازی:</span>
                    <span className="text-[#00ff87] font-bold">${Number(pack.cost_usd || 0).toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">موجودی استخر:</span>
                    <span className="text-amber-400 font-bold font-sans">
                      {pack.unclaimed_players_count ?? pack.total_players_count} بازیکن موجود
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href="/admin/packs"
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-bold flex items-center gap-1"
                  >
                    <span>ویرایش و مدیریت بازیکنان استخر</span>
                    <ChevronRight size={14} className="rotate-180" />
                  </a>

                  <button
                    onClick={() => handleDeletePack(pack)}
                    className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-rose-200 cursor-pointer"
                    title="حذف پک"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: WEEKLY TASKS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'weekly_tasks' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white">تسک‌های فصلی ({weeklyTasks.length} تسک)</h3>
              <select
                value={taskFilterWeek}
                onChange={(e) => setTaskFilterWeek(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
              >
                <option value="ALL">همه هفته‌ها (۱ تا ۳۰)</option>
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>هفته {i + 1}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSeedTasks}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles size={14} />
              <span>تولید خودکار ۶۰ تسک استاندارد فصل (+۵۶ XP)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-xs">{task.title}</span>
                  <span className="text-amber-400 font-bold bg-amber-950/70 px-2 py-0.5 rounded-lg border border-amber-500/30 text-[10.5px] font-sport">
                    +{task.reward_xp || 56} XP
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>نوع: <strong className="text-slate-300 font-mono">{task.task_type}</strong></span>
                  <span>هدف: <strong className="text-cyan-300 font-sport">{task.target_value}</strong></span>
                  <span>هفته: <strong className="text-purple-300 font-sport">{task.week_number}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: PACK OPENING LOGS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pack_logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h3 className="text-sm font-bold text-white px-1">آخرین لاگ‌های باز کردن پک توسط مربیان</h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs">
            <div className="grid grid-cols-6 p-3 bg-slate-950 font-bold text-slate-400 border-b border-slate-800 text-[11px]">
              <span>تیم</span>
              <span>پک باز شده</span>
              <span>بازیکن دریافت شده</span>
              <span>درجه نایابی</span>
              <span>سیستم Pity</span>
              <span>زمان</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
              {packLogs.map((log) => (
                <div key={log.id} className="grid grid-cols-6 p-3 items-center hover:bg-slate-800/40 transition-colors">
                  <span className="font-bold text-white">{log.team_name}</span>
                  <span className="text-purple-300">{log.pack_name}</span>
                  <span className="text-cyan-300 font-bold">{log.player_name || '—'}</span>
                  <span className={`font-bold text-[10.5px] ${
                    log.rarity_drawn === 'LEGENDARY' ? 'text-amber-400' : log.rarity_drawn === 'EPIC' ? 'text-purple-400' : 'text-slate-300'
                  }`}>
                    {log.rarity_drawn}
                  </span>
                  <span>{log.pity_applied ? <span className="text-amber-400 font-bold">بله ⭐</span> : <span className="text-slate-500">خیر</span>}</span>
                  <span className="text-slate-400 text-[10.5px] dir-ltr">{new Date(log.opened_at).toLocaleString('fa-IR')}</span>
                </div>
              ))}
              {packLogs.length === 0 && (
                <div className="p-6 text-center text-slate-500">هیچ لاگ بازکردن پکی ثبت نشده است.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: EDIT / CREATE SEASON PASS LEVEL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && showLevelModal && editingLevel && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => setShowLevelModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 bg-slate-950 border border-amber-500/40 rounded-3xl w-full max-w-lg my-auto p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Crown size={18} className="text-amber-400" />
                <span>ویرایش پاداش سطح {editingLevel.level}</span>
              </h3>
              <button onClick={() => setShowLevelModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">شماره سطح:</label>
                  <input
                    type="number"
                    required
                    value={editingLevel.level}
                    onChange={(e) => setEditingLevel({ ...editingLevel, level: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 font-sport"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">XP مورد نیاز:</label>
                  <input
                    type="number"
                    required
                    value={editingLevel.xp_required}
                    onChange={(e) => setEditingLevel({ ...editingLevel, xp_required: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500 font-sport"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان پاداش:</label>
                <input
                  type="text"
                  value={editingLevel.reward_title || ''}
                  onChange={(e) => setEditingLevel({ ...editingLevel, reward_title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  placeholder="مثلاً: پاداش سطح ۱ - بودجه و جم مقدماتی"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">پاداش‌های مسیر رایگان (Free):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-1">دلار مجازی (USD):</label>
                    <input
                      type="number"
                      value={editingLevel.free_reward_coins || 0}
                      onChange={(e) => setEditingLevel({ ...editingLevel, free_reward_coins: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-emerald-500 font-sport"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-1">جم (الماس):</label>
                    <input
                      type="number"
                      value={editingLevel.free_reward_gems || 0}
                      onChange={(e) => setEditingLevel({ ...editingLevel, free_reward_gems: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-500 font-sport"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                <span className="text-purple-300 font-bold block">پاداش‌های مسیر VIP:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-1">دلار مجازی VIP:</label>
                    <input
                      type="number"
                      value={editingLevel.vip_reward_coins || 0}
                      onChange={(e) => setEditingLevel({ ...editingLevel, vip_reward_coins: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-amber-500 font-sport"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-1">جم VIP:</label>
                    <input
                      type="number"
                      value={editingLevel.vip_reward_gems || 0}
                      onChange={(e) => setEditingLevel({ ...editingLevel, vip_reward_gems: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-amber-500 font-sport"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_final_chk"
                  checked={editingLevel.is_final_level || false}
                  onChange={(e) => setEditingLevel({ ...editingLevel, is_final_level: e.target.checked })}
                  className="rounded accent-amber-500"
                />
                <label htmlFor="is_final_chk" className="text-xs text-amber-300 font-bold cursor-pointer">
                  این سطح، سطح نهایی و اعطای بازیکن لجند اختصاصی تیم است
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLevelModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer shadow-lg"
                >
                  {actionLoading ? 'در حال ذخیره...' : 'ذخیره سطح'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ASSIGN UNIQUE LEGEND TO TEAM */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && selectedTeamPassForLegend && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => setSelectedTeamPassForLegend(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 bg-slate-950 border border-amber-500/40 rounded-3xl w-full max-w-md my-auto p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Star size={18} className="text-amber-400" />
                <span>تغییر لجند اختصاصی تیم {selectedTeamPassForLegend.team_name}</span>
              </h3>
              <button onClick={() => setSelectedTeamPassForLegend(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignLegendSubmit} className="space-y-4 text-xs">
              <p className="text-slate-300">
                بازیکن لجند منتخب به عنوان پاداش سطح نهایی برای این تیم منظور خواهد شد:
              </p>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">انتخاب بازیکن لجند:</label>
                <select
                  value={selectedLegendPlayerId}
                  onChange={(e) => setSelectedLegendPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-amber-500 font-sport"
                  required
                >
                  <option value="">-- انتخاب بازیکن لجند --</option>
                  {legendPlayersPool.map((p) => {
                    const isAssignedToOther = p.current_team_id && p.current_team_id !== selectedTeamPassForLegend.team;
                    return (
                      <option key={p.id} value={p.id} disabled={isAssignedToOther}>
                        {p.name} ({p.position} - OVR {p.overall}) {isAssignedToOther ? `[در اختیار: ${p.current_team_name}]` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-200">
                🛡️ سیستم به صورت خودکار از انتخاب بازیکنان دارای تداخل با سایر تیم‌ها جلوگیری می‌کند.
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeamPassForLegend(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedLegendPlayerId}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {actionLoading ? 'در حال ثبت...' : 'ثبت لجند اختصاصی'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: EDIT / CREATE GACHA PACK */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {typeof document !== 'undefined' && showPackModal && editingPack && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
          <div className="fixed inset-0" onClick={() => setShowPackModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 bg-slate-950 border border-purple-500/40 rounded-3xl w-full max-w-lg my-auto p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <Gift size={18} className="text-purple-400" />
                <span>{editingPack.id ? `ویرایش ${editingPack.name}` : 'ساخت پک جدید'}</span>
              </h3>
              <button onClick={() => setShowPackModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePack} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">نام پک:</label>
                <input
                  type="text"
                  required
                  value={editingPack.name || ''}
                  onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-purple-500"
                  placeholder="مثلاً: پک طلایی فصل"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10.5px] text-slate-400 block mb-1">قیمت جم (💎):</label>
                  <input
                    type="number"
                    value={editingPack.cost_gems || 0}
                    onChange={(e) => setEditingPack({ ...editingPack, cost_gems: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-cyan-500 font-sport"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] text-slate-400 block mb-1">دلار مجازی ($):</label>
                  <input
                    type="number"
                    value={editingPack.cost_usd || 0}
                    onChange={(e) => setEditingPack({ ...editingPack, cost_usd: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-emerald-500 font-sport"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] text-slate-400 block mb-1">تومان (خرید مستقیم):</label>
                  <input
                    type="number"
                    value={editingPack.cost_irr || 0}
                    onChange={(e) => setEditingPack({ ...editingPack, cost_irr: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-amber-500 font-sport"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-slate-300 font-bold block">تنظیم درصد شانس‌ها (مجموع = ۱۰۰٪):</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Rare (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPack.rate_rare || 0}
                      onChange={(e) => setEditingPack({ ...editingPack, rate_rare: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-sport"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-purple-300 block mb-1">Epic (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPack.rate_epic || 0}
                      onChange={(e) => setEditingPack({ ...editingPack, rate_epic: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-sport"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-300 block mb-1">Legendary (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPack.rate_legendary || 0}
                      onChange={(e) => setEditingPack({ ...editingPack, rate_legendary: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-sport"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_pack"
                  checked={editingPack.is_active || false}
                  onChange={(e) => setEditingPack({ ...editingPack, is_active: e.target.checked })}
                  className="rounded accent-purple-500"
                />
                <label htmlFor="is_active_pack" className="text-xs text-white font-bold cursor-pointer">
                  پک فعال است و در فروشگاه نمایش داده شود
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPackModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black cursor-pointer shadow-lg"
                >
                  {actionLoading ? 'در حال ذخیره...' : 'ذخیره پک'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={!!confirmModalData}
          title={confirmModalData.title}
          message={confirmModalData.message}
          confirmText={confirmModalData.confirmText}
          variant={confirmModalData.variant || 'info'}
          isLoading={actionLoading}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => setConfirmModalData(null)}
        />
      )}
    </div>
  );
}
