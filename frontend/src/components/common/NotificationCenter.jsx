import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Trash2, ChevronLeft, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_NOTIFICATIONS = [];

const CATEGORY_STYLES = {
  MATCH: { color: 'border-emerald-500/50 bg-emerald-950/50 text-emerald-200', icon: '⚽', targetTab: 'live' },
  TRANSFER: { color: 'border-amber-500/50 bg-amber-950/50 text-amber-200', icon: '💼', targetTab: 'market' },
  GACHA: { color: 'border-purple-500/50 bg-purple-950/50 text-purple-200', icon: '🎁', targetTab: 'store' },
  SYSTEM: { color: 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200', icon: '⚡', targetTab: 'home' },
  REWARD: { color: 'border-yellow-400/60 bg-yellow-950/60 text-yellow-200', icon: '🎉', targetTab: 'home' },
};

const formatRelativeTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'لحظاتی پیش';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  return d.toLocaleDateString('fa-IR');
};

// Backend notification categories → UI filter vocabulary
const CATEGORY_TO_FILTER = {
  MATCH: 'live',
  TRANSFER: 'market',
  GACHA: 'gacha',
  SYSTEM: 'system',
  REWARD: 'reward',
};

const mapApiNotification = (n, isAdmin = false) => {
  const style = CATEGORY_STYLES[n.category] || CATEGORY_STYLES.SYSTEM;
  let targetTab = style.targetTab;
  if (n.category === 'MATCH') {
    targetTab = isAdmin ? 'admin' : 'live';
  }
  return {
    id: n.id,
    matchId: n.match_id || n.match,
    category: CATEGORY_TO_FILTER[n.category] || 'system',
    title: n.title || 'اعلامیه جدید',
    message: n.message || '',
    time: formatRelativeTime(n.created_at),
    isUnread: !n.is_read,
    targetTab: targetTab,
    color: style.color,
    icon: style.icon,
  };
};

export default function NotificationCenter({ onNavigateTab }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_superuser;
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'live' | 'market' | 'team' | 'finance'
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  // Load the real inbox from the backend
  const loadInbox = () => {
    notificationApi
      .getInbox({ dismissed: false })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotifications(res.data.map((n) => mapApiNotification(n, isAdmin)));
        } else {
          setNotifications([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
        setNotifications([]);
      });
  };

  useEffect(() => {
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Refresh whenever the dropdown is opened
  useEffect(() => {
    if (isOpen) loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAdmin]);

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
    setNotifications((prev) => {
      const unreadIds = prev.filter((n) => n.isUnread).map((n) => n.id);
      unreadIds.forEach((id) => notificationApi.markAsRead(id).catch(() => {}));
      return prev.map((n) => ({ ...n, isUnread: false }));
    });
  };

  const handleClearAll = () => {
    setNotifications((prev) => {
      prev.forEach((n) => {
        notificationApi.markAsRead(n.id).catch(() => {});
        notificationApi.dismissNotification(n.id).catch(() => {});
      });
      return [];
    });
  };

  const handleRemoveItem = (id, e) => {
    e.stopPropagation();
    notificationApi.markAsRead(id).catch(() => {});
    notificationApi.dismissNotification(id).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleItemClick = (notif) => {
    // Mark as read on the backend + locally (only if still unread)
    if (notif.isUnread) {
      notificationApi.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isUnread: false } : n))
      );
    }

    // Dismiss notification from future popups
    notificationApi.dismissNotification(notif.id).catch(() => {});
    if (notif.matchId) {
      try {
        localStorage.setItem(`vml_dismissed_match_alert_${notif.matchId}_SCHEDULED`, 'true');
        localStorage.setItem(`vml_dismissed_match_alert_${notif.matchId}_LIVE`, 'true');
      } catch {}
    }

    // Navigate to role-appropriate tab
    const destinationTab = notif.targetTab || (isAdmin ? 'admin' : 'live');
    if (destinationTab && onNavigateTab) {
      onNavigateTab(destinationTab);
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
            className="absolute top-full left-0 mt-3 w-[90vw] max-w-sm sm:w-96 z-50 glass-panel bg-slate-950/95 border-2 border-purple-500/50 shadow-2xl rounded-3xl p-4 space-y-3 backdrop-blur-2xl text-xs origin-top-left"
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
                      ? 'bg-emerald-900 text-emerald-200 border border-emerald-500/50 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ⚽ مسابقات
                </button>
                <button
                  onClick={() => setActiveFilter('market')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'market'
                      ? 'bg-amber-900 text-amber-200 border border-amber-500/50 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  💼 نقل‌وانتقالات
                </button>
                <button
                  onClick={() => setActiveFilter('gacha')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'gacha'
                      ? 'bg-purple-900 text-purple-200 border border-purple-500/50 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🎁 استور و پک‌ها
                </button>
                <button
                  onClick={() => setActiveFilter('reward')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'reward'
                      ? 'bg-amber-900 text-amber-200 border border-amber-500/50 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  🎉 پاداش‌ها
                </button>
                <button
                  onClick={() => setActiveFilter('system')}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                    activeFilter === 'system'
                      ? 'bg-cyan-900 text-cyan-200 border border-cyan-500/50 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ⚡ سیستم
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
