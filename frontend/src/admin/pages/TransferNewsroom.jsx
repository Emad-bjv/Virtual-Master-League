import React, { useState, useEffect } from 'react';
import { 
  Newspaper, RefreshCw, Copy, Check, Filter, Search, 
  ArrowRightLeft, CheckCircle2, XCircle, AlertCircle, 
  Share2, DollarSign, Users, UserMinus, Flame, ExternalLink, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import { useToast } from '../components/Toast';

export default function TransferNewsroom() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNewsModal, setSelectedNewsModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const res = await transferApi.getLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load transfer logs:', err);
      showToast('خطا در دریافت لاگ‌ها و گزارشات نقل‌وانتقالات', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const handleCopyNews = (log) => {
    const textToCopy = `${log.news_headline}\n\n${log.news_content}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(log.id);
    showToast('متن خبر رسمی در حافظه کپی شد! 📋', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'ALL' && log.event_type !== filterType) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.description && log.description.toLowerCase().includes(q)) ||
      (log.news_headline && log.news_headline.toLowerCase().includes(q)) ||
      (log.news_content && log.news_content.toLowerCase().includes(q))
    );
  });

  const countFinalized = logs.filter(l => l.event_type === 'TRANSFER_FINALIZED').length;
  const countCounters = logs.filter(l => l.event_type === 'COUNTER_OFFER').length;
  const countOffers = logs.filter(l => l.event_type === 'OFFER_MADE').length;
  const countReleases = logs.filter(l => l.event_type === 'PLAYER_RELEASED').length;

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100 pb-20">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#080d1a] via-[#0d162a] to-[#080d1a]">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 text-[11px] font-bold font-sport">
              <Sparkles size={13} className="text-cyan-400 animate-pulse" />
              <span>TRANSFER NEWSROOM & AUDIT</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Newspaper className="text-cyan-400" size={28} />
            اتاق خبر و گزارشات جامع نقل‌وانتقالات
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            پوشش زنده تمامی مذاکرات، پیشنهادات متقابل، انتقالات قطعی و تولید خودکار متون خبری رسمی لیگ
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchLogs}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
            <span>بروزرسانی گزارش‌ها</span>
          </button>
        </div>
      </header>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-emerald-300 font-bold block mb-1">انتقالات قطعی (بمب‌ها)</span>
            <span className="text-2xl font-black text-white font-sport">{countFinalized}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-purple-300 font-bold block mb-1">پیشنهادات متقابل (مذاکرات)</span>
            <span className="text-2xl font-black text-white font-sport">{countCounters}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <ArrowRightLeft size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-cyan-300 font-bold block mb-1">پیشنهادات اولیه</span>
            <span className="text-2xl font-black text-white font-sport">{countOffers}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-rose-300 font-bold block mb-1">فسخ و بازیکنان آزاد</span>
            <span className="text-2xl font-black text-white font-sport">{countReleases}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <UserMinus size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#080d1a]">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-bold font-sport">
          {[
            { id: 'ALL', label: 'همه گزارش‌ها' },
            { id: 'TRANSFER_FINALIZED', label: 'انتقالات قطعی 🚨' },
            { id: 'COUNTER_OFFER', label: 'پیشنهادات متقابل 🔄' },
            { id: 'OFFER_MADE', label: 'پیشنهادات جدید 📢' },
            { id: 'PLAYER_RELEASED', label: 'فسخ و آزادسازی 📄' },
            { id: 'OFFER_REJECTED', label: 'رد شده‌ها ❌' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterType === f.id
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در گزارشات و اخبار..."
            className="w-full bg-[#05080e] border border-slate-700/80 rounded-xl py-2 pr-9 pl-3 text-white text-xs outline-none focus:border-cyan-400"
          />
          <Search className="absolute right-2.5 top-2.5 text-slate-400" size={15} />
        </div>
      </div>

      {/* Reports and News Feed List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-sans glass-panel rounded-3xl">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
            <p>در حال بارگذاری لاگ‌ها و رویدادهای نقل‌وانتقالات...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800">
            <Newspaper size={36} className="mx-auto mb-2 text-slate-600" />
            <p className="font-bold text-sm">هیچ رویداد یا لاگ نقل‌وانتقالاتی مطابق با فیلتر یافت نشد.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isFinalized = log.event_type === 'TRANSFER_FINALIZED';
            const isCounter = log.event_type === 'COUNTER_OFFER';
            const isOffer = log.event_type === 'OFFER_MADE';
            const isRelease = log.event_type === 'PLAYER_RELEASED';
            const isCopied = copiedId === log.id;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-panel p-5 rounded-3xl border transition-all shadow-lg relative overflow-hidden ${
                  isFinalized
                    ? 'border-emerald-500/40 bg-gradient-to-b from-[#091515] to-[#070d14]'
                    : isCounter
                    ? 'border-purple-500/40 bg-gradient-to-b from-[#130b1e] to-[#070d14]'
                    : isRelease
                    ? 'border-rose-500/40 bg-gradient-to-b from-[#18090f] to-[#070d14]'
                    : 'border-slate-700/60 bg-gradient-to-b from-[#0a0f1d] to-[#070d14]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${
                        isFinalized
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : isCounter
                          ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                          : isOffer
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                          : isRelease
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-600 text-slate-300'
                      }`}
                    >
                      {log.event_type_display || log.event_type}
                    </span>

                    <h3 className="text-sm font-black text-white tracking-tight">
                      {log.news_headline}
                    </h3>
                  </div>

                  <div className="text-[11px] text-slate-400 font-sport dir-ltr flex items-center gap-1.5 self-end md:self-auto">
                    <span>{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                {/* Description and Content Preview */}
                <div className="py-3 text-xs text-slate-300 space-y-2">
                  <p className="font-medium text-slate-200 leading-relaxed">
                    {log.description}
                  </p>

                  {log.offer_details && (
                    <div className="space-y-2 pt-1">
                      {/* Standard Badges */}
                      <div className="flex flex-wrap items-center gap-2 font-sport text-[11px]">
                        {log.offer_details.seller_team_name && log.offer_details.buyer_team_name && (
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-slate-200">
                            باشگاه‌ها: <strong className="text-cyan-300">{log.offer_details.seller_team_name}</strong> ➔ <strong className="text-[#00ff87]">{log.offer_details.buyer_team_name}</strong>
                          </span>
                        )}
                        {log.offer_details.target_player_name && (
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-cyan-300">
                            بازیکن: <strong>{log.offer_details.target_player_name}</strong>
                            {log.offer_details.target_player_overall && ` (OVR ${log.offer_details.target_player_overall})`}
                          </span>
                        )}
                        {log.offer_details.cash_amount > 0 && (
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-[#00ff87] font-mono">
                            مبلغ نقدینگی: ${Number(log.offer_details.cash_amount).toLocaleString()}
                          </span>
                        )}
                        {log.offer_details.offer_type_display && (
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-amber-300">
                            ساختار: {log.offer_details.offer_type_display}
                          </span>
                        )}
                      </div>

                      {/* Swap Details Visual Box */}
                      {log.offer_details.offer_type === 'SWAP' && log.offer_details.swap_players_details && log.offer_details.swap_players_details.length > 0 && (
                        <div className="bg-[#05080e]/90 p-3 rounded-2xl border border-purple-500/30 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-purple-300 font-bold border-b border-slate-800 pb-1.5">
                            <span className="flex items-center gap-1.5">
                              <ArrowRightLeft size={13} className="text-purple-400" />
                              <span>جزئیات معاوضه دوطرفه:</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-sport">
                              {log.offer_details.seller_team_name} ⮂ {log.offer_details.buyer_team_name}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sport text-[11px]">
                            {/* Player from Seller */}
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">خروجی از {log.offer_details.seller_team_name}:</span>
                              <span className="text-cyan-300 font-bold">
                                {log.offer_details.target_player_name} (OVR {log.offer_details.target_player_overall})
                              </span>
                            </div>

                            {/* Players from Buyer */}
                            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 space-y-1">
                              <span className="text-slate-400 block">خروجی از {log.offer_details.buyer_team_name}:</span>
                              <div className="flex flex-wrap gap-1">
                                {log.offer_details.swap_players_details.map(sp => (
                                  <span key={sp.id} className="bg-purple-950/80 border border-purple-500/40 text-purple-200 px-2 py-0.5 rounded-lg text-[10.5px] font-bold">
                                    {sp.name} (OVR {sp.overall})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons for News Publishing */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>متن خبر رسمی آماده انتشار در شبکه‌های اجتماعی و اطلاعیه‌ها</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedNewsModal(log)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Share2 size={13} />
                      <span>پیش‌نمایش پست خبری</span>
                    </button>

                    <button
                      onClick={() => handleCopyNews(log)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 font-sport shadow-md ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
                      }`}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{isCopied ? 'کپی شد!' : 'کپی سریع خبر 📋'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* News Post Modal */}
      <AnimatePresence>
        {selectedNewsModal && (
          <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md font-sans dir-rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-cyan-500/40 shadow-2xl bg-[#090e1b] relative space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Newspaper className="text-cyan-400" size={20} />
                  <h3 className="font-black text-white text-sm">پیش‌نمایش پست خبری رسمی</h3>
                </div>
                <button
                  onClick={() => setSelectedNewsModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="bg-[#05080e] p-4 rounded-2xl border border-slate-800 space-y-3 font-sans text-xs">
                <div className="font-black text-sm text-cyan-300 border-b border-slate-800 pb-2">
                  {selectedNewsModal.news_headline}
                </div>
                <div className="text-slate-200 whitespace-pre-line leading-relaxed text-xs">
                  {selectedNewsModal.news_content}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedNewsModal(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  بستن
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedNewsModal.news_headline);
                    showToast('تیتر خبر کپی شد! 📋', 'success');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Copy size={13} />
                  <span>کپی تیتر</span>
                </button>
                <button
                  onClick={() => {
                    handleCopyNews(selectedNewsModal);
                    setSelectedNewsModal(null);
                  }}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer font-sport"
                >
                  <Copy size={14} />
                  <span>کپی کامل خبر جهت انتشار</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
