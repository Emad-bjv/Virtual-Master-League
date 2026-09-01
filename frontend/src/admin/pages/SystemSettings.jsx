import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Shield, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw, 
  DollarSign, ArrowLeftRight, ShoppingCart, Sparkles, Tv, Trophy, 
  Bell, UserPlus, Building2, ClipboardList, CheckCircle2, XCircle, 
  HelpCircle, Lock, Award, Activity, Check, X, FileText, Zap, Info
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useToast } from '../components/Toast';

export default function SystemSettings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('flags'); // 'flags' | 'settings' | 'resets'
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Feature Flags State
  const [flags, setFlags] = useState({
    site_title: 'Virtual Master League',
    maintenance_mode: false,
    feature_transfer_market: true,
    feature_store: true,
    feature_gacha: true,
    feature_live_broadcast: true,
    feature_season_pass: true,
    feature_notifications: true,
    feature_registration: true,
    feature_club_facilities: true,
    feature_game_plan: true,
  });

  // Detailed Settings State
  const [settings, setSettings] = useState({
    // Economy
    default_team_budget: 30000000,
    max_team_budget: 999000000,
    default_wage_cap: 10000,
    // Market
    max_player_price: 50000000,
    max_bid_count: 10,
    listing_duration_hours: 48,
    // Matches
    half_duration_minutes: 45,
    max_substitutions: 5,
    pre_match_alert_minutes: 15,
    // Gacha
    gacha_rate_rare: 70.0,
    gacha_rate_epic: 25.0,
    gacha_rate_legendary: 5.0,
    gacha_pity_threshold: 12,
    gacha_pack_price_gems: 500,
    // Season Pass
    season_pass_xp_per_level: 100,
    season_pass_premium_price_gems: 1000,
    // Facilities
    facility_max_level: 20,
    facility_upgrade_cost_multiplier: 1.5,
    facility_bonus_multiplier: 1.0,
  });

  // Reset Modal State
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    action: null,
    title: '',
    description: '',
    warning: '',
    severity: 'high', // 'critical' | 'high' | 'medium' | 'low'
    affectedItems: [],
  });
  const [confirmationInput, setConfirmationInput] = useState('');
  const [resetting, setResetting] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [flagsRes, settingsRes] = await Promise.all([
        adminApi.getFeatureFlags(),
        adminApi.getSystemSettings()
      ]);

      if (flagsRes?.data?.flags) {
        setFlags(prev => ({ ...prev, ...flagsRes.data.flags }));
        setCanEdit(flagsRes.data.can_edit ?? true);
      }
      if (settingsRes?.data?.settings) {
        setSettings(prev => ({ ...prev, ...settingsRes.data.settings }));
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
      showToast('خطا در بارگذاری تنظیمات سیستم از سرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save Feature Flags
  const handleSaveFlags = async (overrideFlags = null) => {
    if (!canEdit) {
      showToast('تنها مدیر ارشد سامانه (SuperAdmin) مجاز به اعمال تغییرات است.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = overrideFlags || flags;
      const res = await adminApi.updateFeatureFlags(payload);
      if (res?.data?.flags) {
        setFlags(prev => ({ ...prev, ...res.data.flags }));
      }
      showToast('وضعیت بخش‌های سامانه با موفقیت ذخیره شد.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در ذخیره وضعیت بخش‌ها';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle single flag immediately
  const handleToggleFlag = (key) => {
    if (!canEdit) {
      showToast('تنها مدیر ارشد مجاز به تغییر فلگ‌های سیستم است.', 'error');
      return;
    }
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    handleSaveFlags(updated);
  };

  // Save Detailed Settings
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!canEdit) {
      showToast('تنها مدیر ارشد سامانه (SuperAdmin) مجاز به اعمال تغییرات است.', 'error');
      return;
    }

    // Validate Gacha sum
    const rare = parseFloat(settings.gacha_rate_rare) || 0;
    const epic = parseFloat(settings.gacha_rate_epic) || 0;
    const leg = parseFloat(settings.gacha_rate_legendary) || 0;
    const sum = Math.round((rare + epic + leg) * 100) / 100;
    if (Math.abs(sum - 100.0) > 0.05) {
      showToast(`مجموع درصدهای شانس گاچا باید دقیقاً ۱۰۰٪ باشد. (مجموع فعلی: ${sum}%)`, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await adminApi.updateSystemSettings(settings);
      if (res?.data?.settings) {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
      }
      showToast('تنظیمات کلان سیستم با موفقیت بروزرسانی شد.', 'success');
    } catch (err) {
      const errors = err?.response?.data;
      let msg = 'خطا در ذخیره تنظیمات کلان';
      if (errors?.gacha_rate_rare) {
        msg = Array.isArray(errors.gacha_rate_rare) ? errors.gacha_rate_rare[0] : errors.gacha_rate_rare;
      } else if (errors?.detail) {
        msg = errors.detail;
      }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Reset Modal
  const openResetModal = (actionConfig) => {
    if (!canEdit) {
      showToast('تنها مدیر ارشد سامانه (SuperAdmin) مجاز به اجرای عملیات ریست است.', 'error');
      return;
    }
    setConfirmationInput('');
    setResetModal({
      isOpen: true,
      ...actionConfig
    });
  };

  const closeResetModal = () => {
    setResetModal(prev => ({ ...prev, isOpen: false }));
    setConfirmationInput('');
  };

  // Execute Confirmed Reset
  const handleExecuteReset = async () => {
    if (confirmationInput.trim() !== 'ریست') {
      showToast('لطفاً عبارت «ریست» را به درستی تایپ کنید.', 'error');
      return;
    }

    setResetting(true);
    try {
      const res = await adminApi.executeReset(resetModal.action, 'ریست');
      showToast(res?.data?.message || 'عملیات ریست با موفقیت انجام شد.', 'success');
      closeResetModal();
      fetchData(); // Refresh metrics
    } catch (err) {
      const msg = err?.response?.data?.detail || 'خطا در اجرای عملیات ریست';
      showToast(msg, 'error');
    } finally {
      setResetting(false);
    }
  };

  // Feature Flags definition metadata
  const featureFlagList = useMemo(() => [
    {
      key: 'feature_transfer_market',
      title: 'بازار نقل و انتقالات',
      icon: ArrowLeftRight,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
      description: 'فعال/غیرفعال‌سازی تب بازار نقل و انتقالات و ارسال پیشنهادات.',
      guide: 'در صورت غیرفعال بودن، تب بازار از منو حذف شده و تلاش برای ورود پیام «بازار نقل‌وانتقالات موقتاً بسته است» نمایش می‌دهد.'
    },
    {
      key: 'feature_store',
      title: 'فروشگاه و بسته‌ها',
      icon: ShoppingCart,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      description: 'فعال/غیرفعال‌سازی تب فروشگاه و درگاه‌های خرید مستقیم و کارت به کارت.',
      guide: 'در صورت غیرفعال بودن، کاربران قادر به ثبت سفارش خرید بسته نخواهند بود.'
    },
    {
      key: 'feature_gacha',
      title: 'سیستم گاچا (پک‌های شانس)',
      icon: Sparkles,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
      description: 'فعال/غیرفعال‌سازی امکان باز کردن پک‌های شانس بازیکنان با جم یا خرید مستقیم.',
      guide: 'در صورت غیرفعال بودن، دکمه باز کردن پک قفل و پیام در حال بروزرسانی نمایش داده می‌شود.'
    },
    {
      key: 'feature_live_broadcast',
      title: 'پخش زنده مسابقات',
      icon: Tv,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      description: 'فعال/غیرفعال‌سازی تب پخش زنده، جریان استریم مسابقه و اتاق فرمان.',
      guide: 'در صورت غیرفعال بودن، تب پخش زنده از ناوبری مربیان حذف می‌گردد.'
    },
    {
      key: 'feature_season_pass',
      title: 'سیزن پس (پاس فصلی)',
      icon: Trophy,
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 text-amber-400',
      description: 'فعال/غیرفعال‌سازی کارت سیزن پس، پیشرفت XP و دریافت جوایز سطوح.',
      guide: 'در صورت غیرفعال بودن، بخش پاس فصلی در صفحه اصلی مربیان پنهان می‌شود.'
    },
    {
      key: 'feature_notifications',
      title: 'سیستم اطلاع‌رسانی',
      icon: Bell,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      description: 'فعال/غیرفعال‌سازی ارسال اعلان‌های درون‌برنامه‌ای و صوتی قبل از بازی.',
      guide: 'در صورت غیرفعال بودن، هشدارهای T-15 دقیقه و نوتیفیکیشن‌های رویداد ارسال نمی‌شوند.'
    },
    {
      key: 'feature_registration',
      title: 'ثبت‌نام مربیان جدید',
      icon: UserPlus,
      color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30 text-sky-400',
      description: 'فعال/غیرفعال‌سازی فرم عضویت و ساخت حساب مربی جدید.',
      guide: 'در صورت غیرفعال بودن، صفحه ورود فقط اجازه لاگین حساب‌های موجود را می‌دهد.'
    },
    {
      key: 'feature_club_facilities',
      title: 'تسهیلات و امکانات باشگاه',
      icon: Building2,
      color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400',
      description: 'فعال/غیرفعال‌سازی امکان ارتقای سطوح کمپ، بدنسازی، پزشکی و استادیوم.',
      guide: 'در صورت غیرفعال بودن، دکمه‌های ارتقا غیرفعال و مربیان فقط قادر به مشاهده وضعیت هستند.'
    },
    {
      key: 'feature_game_plan',
      title: 'ارسال ترکیب و تاکتیک',
      icon: ClipboardList,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      description: 'فعال/غیرفعال‌سازی امکان ویرایش و ثبت ترکیب و تاکتیک توسط مربیان.',
      guide: 'هنگام برگزاری بازی‌ها یا تنظیمات داوری می‌توانید ارسال ترکیب را موقتاً قفل کنید.'
    },
  ], []);

  // Reset Actions definition metadata
  const resetActionsList = useMemo(() => [
    {
      action: 'reset-season',
      title: 'ریست کامل فصل (Season Reset)',
      severity: 'critical',
      icon: Trophy,
      btnColor: 'bg-rose-600 hover:bg-rose-500 text-white',
      badge: 'بحرانی • غیرقابل بازگشت',
      description: 'نتایج مسابقات، جدول رده‌بندی، رویدادها و آمار تیمی فصل جاری به حالت اولیه بازمی‌گردد.',
      warning: 'تمام بازی‌های پایان‌یافته، جدول امتیازات و آمار مسابقات حذف و شماره هفته به ۱ بازمی‌گردد.',
      affectedItems: [
        'تمام رکوردهای جدول رده‌بندی (LeagueStanding)',
        'تمام رویدادها، کارت‌ها و گل‌های مسابقات (MatchEvent)',
        'آمار عملکردی ثبت‌شده در مسابقات (PlayerMatchStat, MatchTeamStat)',
        'بازنشانی وضعیت مسابقات به SCHEDULED با نتیجه ۰ - ۰',
        'بازنشانی شماره هفته جاری سیستم به ۱'
      ]
    },
    {
      action: 'reset-budgets',
      title: 'ریست بودجه باشگاه‌ها (Budget Reset)',
      severity: 'high',
      icon: DollarSign,
      btnColor: 'bg-amber-600 hover:bg-amber-500 text-white',
      badge: 'اقتصادی کلان',
      description: 'بودجه و سقف دستمزد تمام باشگاه‌ها دقیقاً به مقدار «بودجه پیش‌فرض» تنظیمات اقتصادی بازنشانی می‌شود.',
      warning: `بودجه تمام باشگاه‌های لیگ به $${Number(settings.default_team_budget || 30000000).toLocaleString()} بازمی‌گردد.`,
      affectedItems: [
        `تنظیم بودجه نقدی تمام تیم‌ها به $${Number(settings.default_team_budget || 30000000).toLocaleString()}`,
        `تنظیم سقف دستمزد تمام تیم‌ها به $${Number(settings.default_wage_cap || 10000).toLocaleString()}`
      ]
    },
    {
      action: 'reset-player-stats',
      title: 'ریست آمار عملکرد بازیکنان (Player Stats Reset)',
      severity: 'medium',
      icon: Activity,
      btnColor: 'bg-amber-600 hover:bg-amber-500 text-white',
      badge: 'آمار فنی',
      description: 'آمار گل‌ها، پاس گل‌ها، کارت‌های زرد تجمیعی، محرومیت‌ها و رکورد بازی‌های متوالی تمام بازیکنان صفر می‌شود.',
      warning: 'اورال (OVR) و لول بازیکنان حفظ شده و فقط سوابق فصلی کارت و محرومیت صفر می‌شود.',
      affectedItems: [
        'پاکسازی کامل جدول آماری مسابقات بازیکنان',
        'صفر کردن کارت‌های زرد تجمیعی همه بازیکنان',
        'پاک کردن محرومیت‌های انضباطی بازیکنان',
        'صفر کردن شمارنده بازی‌های متوالی'
      ]
    },
    {
      action: 'reset-stamina',
      title: 'ریست خستگی و استقامت بازیکنان (Stamina Reset)',
      severity: 'medium',
      icon: Zap,
      btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      badge: 'آمادگی جسمانی',
      description: 'استقامت و سطح انرژی تمامی بازیکنان به ۱۰۰٪ بازگشته، قفل استقامت باز شده و مصدومیت‌ها برطرف می‌شوند.',
      warning: 'خستگی تمام بازیکنان ۱۰۰٪ شده، بازی‌های متوالی صفر و مصدومیت‌ها پاک می‌شود.',
      affectedItems: [
        'تنظیم استقامت مجازی تمام بازیکنان به ۱۰۰٪ (virtual_stamina = 100%)',
        'صفر کردن شمارنده بازی‌های متوالی (consecutive_games = 0)',
        'باز کردن قفل استقامت تمام بازیکنان (is_locked = false)',
        'برطرف کردن وضعیت مصدومیت تمام بازیکنان (is_injured = false)',
        'پاکسازی تاریخ بازگشت از مصدومیت و آخرین مسابقه'
      ]
    },
    {
      action: 'reset-transfers',
      title: 'ریست بازار نقل و انتقالات (Transfer Reset)',
      severity: 'medium',
      icon: ArrowLeftRight,
      btnColor: 'bg-blue-600 hover:bg-blue-500 text-white',
      badge: 'پاکسازی بازار',
      description: 'تمام لیستینگ‌های فعال در بازار لغو شده و کلیه پیشنهادات قیمتی (Bids) حذف می‌گردند.',
      warning: 'بازیکنان در تیم فعلی خود باقی مانده و تاریخچه نقل‌وانتقالات ثبت‌شده پاک نمی‌شود.',
      affectedItems: [
        'تغییر وضعیت تمام لیستینگ‌های ACTIVE به CANCELLED',
        'حذف کلیه رکوردهای پیشنهاد قیمت در مزایدات (TransferBid)'
      ]
    },
    {
      action: 'reset-season-pass',
      title: 'ریست سیزن پس (Season Pass Reset)',
      severity: 'medium',
      icon: Award,
      btnColor: 'bg-purple-600 hover:bg-purple-500 text-white',
      badge: 'پاس فصلی',
      description: 'پیشرفت سطح، امتیاز XP و پاداش‌های دریافت‌شده سیزن پس برای تمامی تیم‌ها صفر می‌شود.',
      warning: 'وضعیت خرید اشتراک VIP تیم‌ها حفظ می‌گردد ولی سطوح به ۱ بازمی‌گردد.',
      affectedItems: [
        'بازنشانی سطح سیزن پس همه تیم‌ها به لول ۱ با ۰ XP',
        'خالی کردن لیست سطوح دریافت شده (claimed_levels)',
        'صفر کردن پیشرفت تسک‌های هفتگی تمام تیم‌ها (TeamTaskProgress)'
      ]
    },
    {
      action: 'reset-facilities',
      title: 'ریست امکانات باشگاه‌ها (Facilities Reset)',
      severity: 'critical',
      icon: Building2,
      btnColor: 'bg-rose-600 hover:bg-rose-500 text-white',
      badge: 'بحرانی • امکانات',
      description: 'سطح تمام ۶ بخش تسهیلات باشگاه‌ها (کمپ، سالن، مرکز پزشکی، استخر، استادیوم و آکادمی) به سطح صفر بازمی‌گردد.',
      warning: 'پیشرفت و ارتقاهای ثبت‌شده همه باشگاه‌ها حذف شده و به سطح پایه ۰ بازمی‌گردند.',
      affectedItems: [
        'سطح کمپ تمرینی = ۰',
        'سطح سالن بدنسازی = ۰',
        'سطح مرکز پزشکی = ۰',
        'سطح استخر بازیابی = ۰',
        'سطح استادیوم = ۰',
        'سطح آکادمی جوانان = ۰'
      ]
    },
    {
      action: 'clear-audit-logs',
      title: 'پاک کردن لاگ‌های حسابرسی (Audit Logs Clear)',
      severity: 'low',
      icon: FileText,
      btnColor: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
      badge: 'پایگاه داده',
      description: 'تمام رکوردهای لاگ حسابرسی فعالیت‌های ادمین‌ها به طور کامل از دیتابیس حذف می‌شوند.',
      warning: 'این عملیات غیرقابل بازگشت است و تاریخچه سوابق ادمین را پاک می‌کند.',
      affectedItems: [
        'حذف تمام رکوردهای جدول AdminAuditLog'
      ]
    },
    {
      action: 'clear-notifications',
      title: 'پاک کردن اعلان‌ها و نوتیفیکیشن‌ها',
      severity: 'low',
      icon: Bell,
      btnColor: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
      badge: 'پاکسازی پیام‌ها',
      description: 'تمام اعلان‌های ارسال‌شده به مربیان و هشدارهای ادمین پاکسازی می‌شوند.',
      warning: 'صندوق ورودی اعلان‌های تمام کاربران خالی خواهد شد.',
      affectedItems: [
        'حذف تمام نوتیفیکیشن‌های عمومی کاربران (Notification)',
        'حذف تمام هشدارهای آنی ادمین (AdminNotification)'
      ]
    },
  ], [settings.default_team_budget, settings.default_wage_cap]);

  // Calculate Gacha sum live
  const gachaSum = useMemo(() => {
    const r = parseFloat(settings.gacha_rate_rare) || 0;
    const e = parseFloat(settings.gacha_rate_epic) || 0;
    const l = parseFloat(settings.gacha_rate_legendary) || 0;
    return Math.round((r + e + l) * 100) / 100;
  }, [settings.gacha_rate_rare, settings.gacha_rate_epic, settings.gacha_rate_legendary]);

  const isGachaSumValid = Math.abs(gachaSum - 100.0) <= 0.05;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-sans dir-rtl">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-cyan-400" />
        <p className="text-sm font-bold">در حال بارگذاری مرکز فرماندهی و تنظیمات کلان...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100 pb-20">
      {/* Header Banner */}
      <header className="glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 text-[11px] font-bold font-sport">
              <Shield size={13} className="text-cyan-400" />
              <span>COMMAND & CONTROL CENTER</span>
            </span>
            {canEdit ? (
              <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[11px] font-bold">
                <CheckCircle2 size={13} />
                <span>دسترسی مدیر ارشد (SuperAdmin)</span>
              </span>
            ) : (
              <span className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 text-[11px] font-bold">
                <Lock size={13} />
                <span>حالت فقط مشاهده (View Only)</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            مرکز فرماندهی و تنظیمات کلان لیگ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            کنترل بلادرنگ فعال‌سازی بخش‌ها، تنظیم پارامترهای فنی و اقتصادی، و اجرای عملیات حساس ریست
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap z-10">
          {activeTab === 'settings' && (
            <button
              onClick={handleSaveSettings}
              disabled={saving || !canEdit}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
            >
              <Check size={14} />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات عددی'}</span>
            </button>
          )}

          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>بروزرسانی داده‌ها</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md overflow-x-auto">
        <button
          onClick={() => setActiveTab('flags')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'flags'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ToggleLeft size={16} />
          <span>سوئیچ‌های سیستم (Feature Flags)</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-sport">9 بخش</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings size={16} />
          <span>تنظیمات جزئی و پارامترها</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-sport">6 حوزه</span>
        </button>

        <button
          onClick={() => setActiveTab('resets')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'resets'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-red-500/25'
              : 'text-rose-400 hover:text-rose-200 hover:bg-rose-950/30'
          }`}
        >
          <AlertTriangle size={16} />
          <span>عملیات حساس ریست (Data Reset)</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px] font-sport">8 عملیات</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FEATURE FLAGS */}
      {/* ========================================================================= */}
      {activeTab === 'flags' && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Global Branding & Maintenance Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Maintenance Switch */}
            <div className={`glass-panel p-5 rounded-3xl border transition-all ${
              flags.maintenance_mode ? 'border-rose-500/50 bg-rose-950/20' : 'border-slate-800 bg-slate-900/40'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-2xl border ${
                    flags.maintenance_mode 
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <AlertTriangle size={22} className={flags.maintenance_mode ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>حالت تعمیرات و نگهداری (Maintenance Mode)</span>
                      {flags.maintenance_mode && (
                        <span className="text-[10px] bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40 font-bold">
                          فعال - دسترسی کاربران مسدود
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      با فعال‌سازی این گزینه، دسترسی تمامی کاربران عادی و مربیان به سامانه مسدود می‌شود.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFlag('maintenance_mode')}
                  disabled={!canEdit}
                  className={`w-14 h-8 rounded-full transition-all flex items-center p-1 cursor-pointer shrink-0 ${
                    flags.maintenance_mode ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start border border-slate-700'
                  }`}
                >
                  <motion.div layout className="w-6 h-6 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* Site Title Branding */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Settings size={14} className="text-cyan-400" />
                  <span>عنوان اصلی سایت (Branding Title)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flags.site_title || ''}
                    onChange={(e) => setFlags(prev => ({ ...prev, site_title: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="Virtual Master League"
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                  <button
                    onClick={() => handleSaveFlags()}
                    disabled={saving || !canEdit}
                    className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    ذخیره نام
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-2 block">
                نام نمایشی در سربرگ، پیام‌ها و اعلان‌های سراسری سامانه.
              </span>
            </div>
          </div>

          {/* 9 Feature Flags Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ToggleRight size={17} className="text-cyan-400" />
                <span>سوئیچ‌های مستقل بخش‌های برنامه ({featureFlagList.length} بخش)</span>
              </h2>
              <span className="text-xs text-slate-400">
                هر تغییر بلافاصله بر دسترس‌پذیری منوها و قابلیت‌های مربیان اثر می‌گذارد.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featureFlagList.map((item) => {
                const Icon = item.icon;
                const isEnabled = flags[item.key] !== false;

                return (
                  <div
                    key={item.key}
                    className={`glass-panel p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      isEnabled 
                        ? 'border-slate-700/80 bg-slate-900/60 shadow-lg' 
                        : 'border-slate-800/80 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${item.color} border flex items-center justify-center`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{item.title}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              isEnabled 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isEnabled ? '🟢 فعال در دسترس' : '🔴 غیرفعال / خاموش'}
                            </span>
                          </div>
                        </div>

                        {/* Switch */}
                        <button
                          onClick={() => handleToggleFlag(item.key)}
                          disabled={!canEdit}
                          className={`w-13 h-7 rounded-full transition-all flex items-center p-1 cursor-pointer shrink-0 ${
                            isEnabled ? 'bg-cyan-500 justify-end shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-slate-800 justify-start border border-slate-700'
                          }`}
                        >
                          <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Guide Footnote */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
                      <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
                      <span>{item.guide}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <motion.form 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveSettings}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Economy Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تنظیمات اقتصادی و نقدینگی باشگاه‌ها</h3>
                  <span className="text-[10px] text-emerald-400 font-sport">ECONOMY & FINANCIAL LIMITS</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    بودجه پیش‌فرض باشگاه‌ها (دلار مجازی $)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.default_team_budget ?? 30000000}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_team_budget: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      min={1000000}
                      max={999000000}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">$ USD</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 مقدار بودجه‌ای که هنگام ریست بودجه یا ثبت باشگاه جدید اعمال می‌شود (محدوده: ۱M تا ۹۹۹M).
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    سقف حداکثر بودجه خزانه تیم (دلار مجازی $)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.max_team_budget ?? 999000000}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_team_budget: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      min={10000000}
                      max={9999000000}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">$ USD</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 حداکثر پولی که تیم می‌تواند نگه‌دارد؛ پاداش‌ها و انتقالات از این رقم فراتر نمی‌رود.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    سقف دستمزد پیش‌فرض هفتگی ($ / هفته)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.default_wage_cap ?? 10000}
                      onChange={(e) => setSettings(prev => ({ ...prev, default_wage_cap: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      min={1000}
                      max={1000000}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">$/هفته</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 سقف پرداخت دستمزد هفتگی تیم برای استخدام بازیکنان ستاره.
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Transfer Market Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                  <ArrowLeftRight size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تنظیمات بازار نقل و انتقالات</h3>
                  <span className="text-[10px] text-cyan-400 font-sport">TRANSFER MARKET POLICY</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    سقف قیمت فروش مستقیم بازیکن (دلار $)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.max_player_price ?? 50000000}
                      onChange={(e) => setSettings(prev => ({ ...prev, max_player_price: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      min={100000}
                      max={500000000}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">$ USD</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 حداکثر قیمتی که مربی می‌تواند بازیکنش را برای فروش در بازار ثبت کند.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    حداکثر تعداد پیشنهاد فعال همزمان (Bid Count)
                  </label>
                  <input
                    type="number"
                    value={settings.max_bid_count ?? 10}
                    onChange={(e) => setSettings(prev => ({ ...prev, max_bid_count: parseInt(e.target.value) || 1 }))}
                    disabled={!canEdit}
                    min={1}
                    max={50}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 هر تیم به طور همزمان روی چند مزایده می‌تواند پیشنهاد فعال داشته باشد.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    مدت زمان انقضای هر لیستینگ در بازار (ساعت)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.listing_duration_hours ?? 48}
                      onChange={(e) => setSettings(prev => ({ ...prev, listing_duration_hours: parseInt(e.target.value) || 1 }))}
                      disabled={!canEdit}
                      min={6}
                      max={168}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ساعت</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 آگهی فروش بازیکن پس از این مدت به طور خودکار منقضی می‌شود (محدوده: ۶ تا ۱۶۸ ساعت).
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Match Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
                  <Tv size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تنظیمات مسابقات و پخش زنده</h3>
                  <span className="text-[10px] text-rose-400 font-sport">MATCH & BROADCAST RULES</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    مدت زمان هر نیمه رسمی بازی (دقیقه)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.half_duration_minutes ?? 45}
                      onChange={(e) => setSettings(prev => ({ ...prev, half_duration_minutes: parseInt(e.target.value) || 45 }))}
                      disabled={!canEdit}
                      min={20}
                      max={90}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">دقیقه</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 زمان پایه هر نیمه در تایمر اسکوربورد زنده مسابقه.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    حداکثر تعویض‌های مجاز هر تیم در بازی
                  </label>
                  <input
                    type="number"
                    value={settings.max_substitutions ?? 5}
                    onChange={(e) => setSettings(prev => ({ ...prev, max_substitutions: parseInt(e.target.value) || 5 }))}
                    disabled={!canEdit}
                    min={3}
                    max={7}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 طبق قوانین جدید فوتبال: ۵ تعویض در ۳ پنجره زمانی.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    هشدار پیش از مسابقه T-Minus (دقیقه قبل از شروع)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={settings.pre_match_alert_minutes ?? 15}
                      onChange={(e) => setSettings(prev => ({ ...prev, pre_match_alert_minutes: parseInt(e.target.value) || 15 }))}
                      disabled={!canEdit}
                      min={5}
                      max={60}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500 pl-16"
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">دقیقه</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 چند دقیقه قبل از شروع بازی نوتیفیکیشن آماده‌باش و ارسال ترکیب به مربیان فرستاده شود.
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Gacha & Pack Opening Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">تنظیمات سیستم شانس و گاچا</h3>
                    <span className="text-[10px] text-purple-400 font-sport">GACHA DROP RATES & PITY</span>
                  </div>
                </div>

                <div className={`text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center gap-1 ${
                  isGachaSumValid 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                }`}>
                  {isGachaSumValid ? <Check size={13} /> : <X size={13} />}
                  <span>مجموع شانس‌ها: {gachaSum}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Rare (70-79)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.gacha_rate_rare ?? 70.0}
                      onChange={(e) => setSettings(prev => ({ ...prev, gacha_rate_rare: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-blue-400 font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                    <span className="absolute left-2 top-2 text-[10px] text-slate-500 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Epic (80-86)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.gacha_rate_epic ?? 25.0}
                      onChange={(e) => setSettings(prev => ({ ...prev, gacha_rate_epic: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                    <span className="absolute left-2 top-2 text-[10px] text-slate-500 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Legendary (87+)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.gacha_rate_legendary ?? 5.0}
                      onChange={(e) => setSettings(prev => ({ ...prev, gacha_rate_legendary: parseFloat(e.target.value) || 0 }))}
                      disabled={!canEdit}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-purple-500"
                    />
                    <span className="absolute left-2 top-2 text-[10px] text-slate-500 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    آستانه Pity (تضمین لجندری)
                  </label>
                  <input
                    type="number"
                    value={settings.gacha_pity_threshold ?? 12}
                    onChange={(e) => setSettings(prev => ({ ...prev, gacha_pity_threshold: parseInt(e.target.value) || 12 }))}
                    disabled={!canEdit}
                    min={3}
                    max={50}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 تعداد پک متوالی بدون لجندری تا پک بعدی تضمینی گردد.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    قیمت پیش‌فرض پک گاچا (💎 جم)
                  </label>
                  <input
                    type="number"
                    value={settings.gacha_pack_price_gems ?? 500}
                    onChange={(e) => setSettings(prev => ({ ...prev, gacha_pack_price_gems: parseInt(e.target.value) || 500 }))}
                    disabled={!canEdit}
                    min={50}
                    max={10000}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 تعداد جمی که برای باز کردن پک‌های عادی مصرف می‌شود.
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Season Pass Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تنظیمات سیزن پس (پاس فصلی)</h3>
                  <span className="text-[10px] text-amber-400 font-sport">SEASON PASS XP & PRICING</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    XP مورد نیاز برای ارتقای هر سطح (XP / Level)
                  </label>
                  <input
                    type="number"
                    value={settings.season_pass_xp_per_level ?? 100}
                    onChange={(e) => setSettings(prev => ({ ...prev, season_pass_xp_per_level: parseInt(e.target.value) || 100 }))}
                    disabled={!canEdit}
                    min={25}
                    max={1000}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 مقدار XP لازم برای عبور از هر سطح به سطح بعدی.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    قیمت خرید نسخه ویژه VIP سیزن پس (💎 جم)
                  </label>
                  <input
                    type="number"
                    value={settings.season_pass_premium_price_gems ?? 1000}
                    onChange={(e) => setSettings(prev => ({ ...prev, season_pass_premium_price_gems: parseInt(e.target.value) || 1000 }))}
                    disabled={!canEdit}
                    min={100}
                    max={50000}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 تعداد جم لازم برای فعال‌سازی لاین جوایز VIP سیزن پس.
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Facilities Settings */}
            <div className="glass-panel p-6 rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-950/10 to-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تنظیمات تسهیلات و امکانات باشگاه</h3>
                  <span className="text-[10px] text-teal-400 font-sport">CLUB FACILITIES & UPGRADES</span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1">
                    حداکثر سقف سطح امکانات (Max Level)
                  </label>
                  <input
                    type="number"
                    value={settings.facility_max_level ?? 20}
                    onChange={(e) => setSettings(prev => ({ ...prev, facility_max_level: parseInt(e.target.value) || 20 }))}
                    disabled={!canEdit}
                    min={5}
                    max={50}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    💡 سقف لول قابل دستیابی در هر یک از ۶ تسهیلات باشگاه.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-200 block mb-1">
                      ضریب هزینه ارتقا
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.facility_upgrade_cost_multiplier ?? 1.5}
                      onChange={(e) => setSettings(prev => ({ ...prev, facility_upgrade_cost_multiplier: parseFloat(e.target.value) || 1.5 }))}
                      disabled={!canEdit}
                      min={0.5}
                      max={5.0}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      💡 ضریب سختی قیمت ارتقا
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-200 block mb-1">
                      ضریب بونوس تسهیلات
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.facility_bonus_multiplier ?? 1.0}
                      onChange={(e) => setSettings(prev => ({ ...prev, facility_bonus_multiplier: parseFloat(e.target.value) || 1.0 }))}
                      disabled={!canEdit}
                      min={0.5}
                      max={3.0}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-teal-300 font-mono font-bold focus:outline-none focus:border-teal-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      💡 ضریب اثرگذاری بونوس‌ها
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving || !canEdit || !isGachaSumValid}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer"
            >
              <Check size={16} />
              <span>{saving ? 'در حال ذخیره‌سازی پارامترها...' : 'ذخیره تمام تنظیمات کلان'}</span>
            </button>
          </div>
        </motion.form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RESET OPERATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'resets' && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Danger Warning Banner */}
          <div className="glass-panel p-5 rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-900/60 shadow-2xl flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-rose-300">منطقه عملیات حساس و ریست داده‌های لیگ</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                عملیات‌های موجود در این بخش غیرقابل بازگشت هستند و مستقیماً ساختار دیتابیس را بازنویسی یا پاکسازی می‌کنند. 
                برای جلوگیری از خطای انسانی، تمامی عملیات‌ها نیازمند تایپ دستی عبارت <strong className="text-rose-400 font-mono font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">«ریست»</strong> در مودال امنیتی می‌باشند.
              </p>
            </div>
          </div>

          {/* Resets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resetActionsList.map((item) => {
              const Icon = item.icon;
              const isCritical = item.severity === 'critical';

              return (
                <div
                  key={item.action}
                  className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                    isCritical 
                      ? 'border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900/80 shadow-xl' 
                      : 'border-slate-800 bg-slate-900/60 shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${
                          isCritical ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{item.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isCritical ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {item.description}
                    </p>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-amber-300/90 space-y-1">
                      <span className="font-bold block text-rose-400">⚠️ دامنه تأثیر:</span>
                      <p>{item.warning}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500">نیاز به تایید امنیتی</span>
                    <button
                      onClick={() => openResetModal(item)}
                      disabled={!canEdit}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${item.btnColor}`}
                    >
                      <RefreshCw size={13} />
                      <span>اجرای {item.title.split('(')[0].trim()}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SECURITY CONFIRMATION MODAL (REACT PORTAL to document.body) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {resetModal.isOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
              <div className="fixed inset-0" onClick={closeResetModal} />
              
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                className="relative z-10 bg-slate-950 border border-rose-500/40 rounded-3xl w-full max-w-xl my-auto p-6 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle size={26} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">تأییدیه امنیتی: {resetModal.title}</h3>
                    <p className="text-xs text-rose-300 mt-1">
                      {resetModal.warning}
                    </p>
                  </div>
                </div>

                {/* Affected Items List */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block mb-1">اقدامات قطعی این عملیات:</span>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    {resetModal.affectedItems?.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Security Verification Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200 block">
                    برای تأیید نهایی و شروع عملیات، کلمه <strong className="text-rose-400 font-mono font-black text-sm bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40">ریست</strong> را در کادر زیر تایپ کنید:
                  </label>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="ریست"
                    className="w-full bg-slate-900 border border-rose-500/40 rounded-2xl px-4 py-3 text-sm text-center text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500 placeholder-slate-600"
                    autoFocus
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    disabled={resetting}
                    className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    انصراف و لغو
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteReset}
                    disabled={resetting || confirmationInput.trim() !== 'ریست'}
                    className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-500/30 flex items-center gap-2 cursor-pointer"
                  >
                    {resetting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>در حال اجرای عملیات...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} />
                        <span>تأیید و اجرای ریست</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
