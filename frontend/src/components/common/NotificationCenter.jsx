import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, ChevronLeft, ShieldAlert, Sparkles, Filter } from 'lucide-react';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'n1',
    category: 'live',
    title: '⚽ شروع مسابقه حساس بعدی',
    message: 'بازی مقابل سپاهان اصفهان تا ۳۰ دقیقه دیگر آغاز می‌شود. ترکیب تیمی و تاکتیک‌ها را نهایی کنید!',
    time: '۱۰ دقیقه پیش',
    isUnread: true,
    targetTab: 'live',
    color: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-200',
    icon: '⚽',
  },
  {
    id: 'n2',
    category: 'market',
    title: '💼 پیشنهاد جدید نقل و انتقالات',
    message: 'باشگاه پرسپولیس پیشنهادی به ارزش ۱۵۰ میلیارد برای خرید «محمد صلاح» ارسال کرده است.',
    time: '۴۵ دقیقه پیش',
    isUnread: true,
    targetTab: 'market',
    color: 'border-amber-500/50 bg-amber-950/50 text-amber-200',
    icon: '💼',
  },
  {
    id: 'n3',
    category: 'team',
    title: '🏥 گزارش مصدومیت کادر پزشکی',
    message: '«رایان گراونبرخ» در تمرین امروز دچار کشیدگی ران شد و ۲ مسابقه بعدی را از دست داد.',
    time: '۲ ساعت پیش',
    isUnread: true,
    targetTab: 'team',
    color: 'border-rose-500/50 bg-rose-950/50 text-rose-200',
    icon: '🚑',
  },
  {
    id: 'n4',
    category: 'finance',
    title: '💰 واریز سود اسپانسر اصلی',
    message: 'مبلغ ۵۰ میلیارد تومان درآمد هفتگی اسپانسر پیروز به حساب بودجه باشگاه واریز شد.',
    time: '۵ ساعت پیش',
    isUnread: true,
    targetTab: 'club',
    color: 'border-purple-500/50 bg-purple-950/50 text-purple-200',
    icon: '💰',
  },
  {
    id: 'n5',
    category: 'admin',
    title: '⚡ بیانیه رسمی سیستم مستر لیگ',
    message: 'قوانین تعویض در مسابقات زنده به ۵ تعویض مجاز در طول ۹۰ دقیقه مسابقه بروزرسانی شد.',
    time: 'دیروز',
    isUnread: false,
    targetTab: 'home',
    color: 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200',
    icon: '⚡',
  },
];

export default function NotificationCenter({ onNavigateTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'live' | 'market' | 'team' | 'finance'
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleRemoveItem = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleItemClick = (notif) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isUnread: false } : n))
    );

    // Navigate to section if requested
    if (notif.targetTab && onNavigateTab) {
      onNavigateTab(notif.targetTab);
      setIsOpen(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  return (
    <div className="relative font-sans dir-rtl" ref={dropdownRef}>
      {/* Bell Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-300 hover:text-white rounded-2xl hover:bg-slate-800/80 transition-all border border-transparent hover:border-purple-500/30 active:scale-95 shadow-md"
        title="اعلامیه‌ها و اخبار مهم مسابقات"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-cyan-400 animate-bounce' : 'text-slate-300'} />

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-rose-500 rounded-full animate-ping"></span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-[9.5px] px-1.5 py-0.2 rounded-full shadow-lg border border-slate-900 font-mono">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 sm:left-auto sm:-left-28 mt-3 w-[88vw] max-w-sm sm:w-96 z-50 glass-panel bg-slate-950/95 border-2 border-purple-500/50 shadow-2xl rounded-3xl p-4 space-y-3 backdrop-blur-2xl text-xs"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <span>اعلامیه‌ها و اخبار مهم</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-950 text-rose-300 border border-rose-500/40 text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {unreadCount} جدید
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-400">آخرین هشدارها و اتفاقات بخش‌های مختلف</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors border border-slate-700/60"
                    title="علامت‌گذاری همه به عنوان خوانده‌شده"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition-colors border border-slate-700/60"
                    title="پاک‌سازی همه"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            {notifications.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar scrollbar-none">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  همه ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveFilter('live')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'live'
                      ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ⚽ مسابقات
                </button>
                <button
                  onClick={() => setActiveFilter('market')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'market'
                      ? 'bg-amber-900 text-amber-200 border border-amber-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  💼 نقل‌وانتقالات
                </button>
                <button
                  onClick={() => setActiveFilter('team')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'team'
                      ? 'bg-rose-900 text-rose-200 border border-rose-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🏥 تیم و مصدومیت
                </button>
                <button
                  onClick={() => setActiveFilter('finance')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'finance'
                      ? 'bg-purple-900 text-purple-200 border border-purple-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  💰 مالی
                </button>
              </div>
            )}

            {/* Notifications List Body */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <Sparkles size={24} className="mx-auto text-purple-400 opacity-60 animate-pulse" />
                  <p className="font-bold text-xs">هیچ اعلامیه جدیدی وجود ندارد!</p>
                  <p className="text-[10px] text-slate-500">تمامی اطلاعیه‌ها و هشدارهای مهم در این بخش نمایش داده می‌شوند.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                      notif.isUnread
                        ? `${notif.color} shadow-lg ring-1 ring-white/10`
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {notif.isUnread && (
                      <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_cyan]"></span>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-center shrink-0 text-sm shadow">
                        {notif.icon}
                      </div>

                      <div className="space-y-1 flex-1 pr-1">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-white text-xs">{notif.title}</h4>
                          <span className="text-[9px] text-slate-400 font-mono">{notif.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">{notif.message}</p>

                        <div className="flex justify-between items-center pt-1 text-[10px] text-cyan-400 font-bold">
                          <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            <span>مشاهده در بخش مربوطه</span>
                            <ChevronLeft size={12} />
                          </span>
                          <button
                            onClick={(e) => handleRemoveItem(notif.id, e)}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                            title="حذف این اعلامیه"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
