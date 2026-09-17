import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  LayoutDashboard,
  FileText,
  Trophy,
  Radio,
  Newspaper,
  DollarSign,
  Package,
  Gift,
  Coins,
  UserCheck,
  Scale,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Sparkles,
  Shield,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

const ADMIN_CATEGORIES = [
  {
    id: 'core_analytics',
    title: 'داشبورد و نظارت کلان',
    icon: LayoutDashboard,
    color: 'from-cyan-500 to-blue-500',
    items: [
      { id: 'overview', label: 'داشبورد جامع لیگ', desc: 'آمار کلی مسابقات، باشگاه‌ها و رده‌بندی', icon: LayoutDashboard },
      { id: 'audit_logs', label: 'گزارش تغییرات سیستم', desc: 'تاریخچه لاگ‌ها و فعالیت‌های مدیریتی', icon: FileText, perm: 'panel_dashboard_audit_logs' },
    ]
  },
  {
    id: 'matches_referee',
    title: 'مسابقات و اتاق داوری',
    icon: Trophy,
    color: 'from-emerald-500 to-teal-500',
    items: [
      { id: 'tournament_hub', label: 'مدیریت لیگ و جام حذفی', desc: 'جدول لیگ، براکت حذفی، نبرد رویال و تعلیق', icon: Trophy, perm: 'panel_dashboard_tournaments' },
      { id: 'live_admin', label: 'اتاق داوری و کنترل مسابقات', desc: 'مدیریت زنده بازی‌ها، کارت‌ها، تعویض‌ها و نمرات', icon: Radio, perm: 'panel_dashboard_live_referee' },
    ]
  },
  {
    id: 'press_media',
    title: 'رسانه و مطبوعات',
    icon: Newspaper,
    color: 'from-cyan-400 to-indigo-500',
    items: [
      { id: 'news_manager', label: 'تحریریه و مدیریت اخبار', desc: 'تولید خودکار و نگارش اخبار، احکام و نقل‌وانتقالات', icon: Newspaper, perm: 'panel_admin_newsroom' },
    ]
  },
  {
    id: 'finance_store',
    title: 'مالی، فروشگاه و بسته‌ها',
    icon: DollarSign,
    color: 'from-amber-400 to-yellow-500',
    items: [
      { id: 'transactions', label: 'مدیریت واریزی‌ها و تراکنش‌ها', desc: 'تایید فیش‌های واریزی و شارژ کیف پول', icon: DollarSign, perm: 'panel_dashboard_transactions', hasBadge: true },
      { id: 'store_packages', label: 'مدیریت بسته‌های فروشگاه', desc: 'تنظیم قیمت بسته‌های جم و سکه', icon: Package, perm: 'panel_dashboard_store_packages' },
      { id: 'packs_season_pass', label: 'مدیریت پک‌ها و سیزن پس', desc: 'پک‌های شانس، آیتم‌ها و بلیت فصل', icon: Gift, perm: 'panel_dashboard_packs' },
      { id: 'mass_reward', label: 'پاداش و ایردراپ همگانی', desc: 'اهدای جم و پاداش گروهی به تیم‌ها', icon: Coins, perm: 'panel_dashboard_airdrop' },
    ]
  },
  {
    id: 'supervision_security',
    title: 'نظارت، مربیان و امنیت',
    icon: ShieldCheck,
    color: 'from-rose-500 to-purple-500',
    items: [
      { id: 'register_coach', label: 'مدیریت و ثبت مربیان', desc: 'احراز هویت و صدور مجوز مربیان جدید', icon: UserCheck, perm: 'panel_dashboard_coach_registration' },
      { id: 'admin_management', label: 'مدیریت ادمین‌ها و دسترسی‌ها', desc: 'سطوح دسترسی RBAC و مجوزهای مدیران', icon: ShieldCheck, perm: 'panel_dashboard_admin_management', isSuperOnly: true },
    ]
  }
];

export default function AdminSideDrawer({
  isOpen,
  onClose,
  activeSub,
  onSelectSub,
  pendingPaymentsCount = 0,
  adminCurrentUser,
  onExitAdmin,
  allowedItemsSet
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  if (typeof document === 'undefined') return null;

  // Filter categories and items based on search query and permissions
  const filteredCategories = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();

    return ADMIN_CATEGORIES.map(cat => {
      const validItems = (cat.items || []).filter(item => {
        // Permission check
        if (allowedItemsSet && !allowedItemsSet.has(item.id)) return false;

        // Search match
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          (item.desc && item.desc.toLowerCase().includes(q))
        );
      });

      return {
        ...cat,
        items: validItems
      };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery, allowedItemsSet]);

  const handleItemClick = (id) => {
    onSelectSub(id);
    onClose();
  };

  const handleSwitchToSeniorPortal = () => {
    onClose();
    navigate('/admin');
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex overflow-hidden font-sans dir-rtl select-none">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Sliding Drawer Panel (from Right) */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative z-10 w-84 sm:w-96 max-w-[88vw] h-full bg-[#080d1a] border-l border-cyan-500/30 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden mr-0 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. DRAWER TOP HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl shrink-0 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400">
                      <Shield size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-white text-sm sm:text-base leading-tight flex items-center gap-1.5">
                      <span>پنل مدیریت عملیاتی</span>
                    </h3>
                    <p className="text-[10.5px] text-cyan-400/90 font-bold font-sport uppercase tracking-wider">
                      VML Operational Suite
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                  aria-label="بستن منو"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Admin Profile Mini Card */}
              {adminCurrentUser && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-black text-xs shrink-0">
                      {(adminCurrentUser.username || 'AD').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-white text-xs truncate">
                        {adminCurrentUser.username || 'مدیر سیستم'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {adminCurrentUser.is_superuser ? 'سوپر ادمین (دسترسی نامحدود)' : 'ادمین عملیاتی'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    آنلاین
                  </span>
                </div>
              )}

              {/* TWO-WAY SWITCH BUTTON: Switch to Senior Admin Portal */}
              <button
                type="button"
                onClick={handleSwitchToSeniorPortal}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-cyan-950/80 hover:from-purple-900/90 hover:to-cyan-900/90 border border-purple-500/40 hover:border-cyan-400/60 text-white font-bold text-xs transition-all shadow-md flex items-center justify-between group active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-purple-500/20 text-purple-300 group-hover:text-cyan-300 transition-colors">
                    <Layers size={15} />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
                      سوییچ به پورتال ارشد ادمین
                    </span>
                    <span className="block text-[9.5px] text-slate-400 font-sport">
                      /admin • نقل‌وانتقالات، پک‌ها و سیستم
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-cyan-300 transition-transform group-hover:-translate-x-0.5" />
              </button>

              {/* Quick Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی سریع بخش‌های مدیریت..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <Search size={14} className="absolute right-2.5 top-2.5 text-slate-500" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-slate-500 hover:text-white cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* 2. CATEGORIZED TABS LIST (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-4 space-y-4">
              {filteredCategories.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                  <Search size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-slate-400">بخشی با این عنوان یافت نشد.</p>
                  <p className="text-[11px]">لطفاً عبارت دیگری را جستجو نمایید.</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="space-y-1.5">
                    {/* Category Label */}
                    <div className="px-2.5 py-1 text-[10.5px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${category.color}`} />
                      <span>{category.title}</span>
                    </div>

                    {/* Category Items */}
                    <div className="space-y-1">
                      {category.items.map((item) => {
                        const Icon = item.icon;
                        const isCurrentActive = activeSub === item.id;
                        const hasPendingBadge = item.hasBadge && pendingPaymentsCount > 0;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleItemClick(item.id)}
                            className={`w-full p-2.5 rounded-2xl transition-all flex items-center justify-between text-right cursor-pointer group ${
                              isCurrentActive
                                ? 'bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-900 border border-cyan-500/70 text-white shadow-lg shadow-cyan-950/30'
                                : 'bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 hover:border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isCurrentActive
                                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40'
                                    : 'bg-slate-800/80 text-slate-400 group-hover:text-cyan-300 group-hover:bg-slate-800'
                                }`}
                              >
                                <Icon size={16} />
                              </div>

                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs truncate ${isCurrentActive ? 'font-black text-cyan-300' : 'font-bold'}`}>
                                    {item.label}
                                  </span>
                                  {hasPendingBadge && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-sm shadow-rose-500/50">
                                      {pendingPaymentsCount} جدید
                                    </span>
                                  )}
                                </div>
                                {item.desc && (
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-normal">
                                    {item.desc}
                                  </p>
                                )}
                              </div>
                            </div>

                            <ChevronLeft
                              size={14}
                              className={`shrink-0 transition-transform ${
                                isCurrentActive
                                  ? 'text-cyan-400 translate-x-0'
                                  : 'text-slate-600 group-hover:text-slate-400 group-hover:-translate-x-0.5'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 3. DRAWER FOOTER */}
            <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0 space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExitAdmin?.();
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <ArrowRight size={14} className="text-slate-400" />
                <span>بازگشت به برنامه و داشبورد مربیان</span>
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
