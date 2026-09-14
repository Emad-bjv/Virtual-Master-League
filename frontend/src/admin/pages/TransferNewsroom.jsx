import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Newspaper, RefreshCw, Copy, Check, Filter, Search,
  ArrowRightLeft, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  Share2, DollarSign, Users, UserMinus, Flame, ExternalLink, Sparkles,
  Zap, ArrowUpRight, Trophy, Shield, Calendar, Clock, ShieldAlert,
  RotateCcw, TrendingUp, TrendingDown, Eye, UserCheck, Scale, Gavel,
  ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transferApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

/**
 * Bulletproof Clipboard copy utility with fallback for non-secure / LAN contexts
 */
async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback textarea copy:', err);
  }

  // Fallback for older browsers or non-HTTPS contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback execCommand copy failed:', err);
    return false;
  }
}

export default function TransferNewsroom() {
  const { showToast } = useToast();

  // Tab State
  const [activeMainTab, setActiveMainTab] = useState('NEWSROOM'); // 'NEWSROOM' | 'AUDIT'

  // Newsroom Feed States
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNewsModal, setSelectedNewsModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedHeadlineId, setCopiedHeadlineId] = useState(null);

  // Pagination & Live Sync States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summaryCounts, setSummaryCounts] = useState({ finalized: 0, counters: 0, offers: 0, releases: 0 });
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Audit & Anti-Brokerage States (Lazy Loaded)
  const [auditData, setAuditData] = useState(null);
  const [selectedAuditTeamId, setSelectedAuditTeamId] = useState('all');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterFlag, setAuditFilterFlag] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [rollbackModalItem, setRollbackModalItem] = useState(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchLogs = async (page = currentPage, size = pageSize, type = filterType, search = searchQuery, isBackground = false) => {
    try {
      if (!isBackground) setRefreshing(true);
      const params = {
        page,
        page_size: size,
      };
      if (type && type !== 'ALL') {
        params.event_type = type;
      }
      if (search && search.trim()) {
        params.search = search.trim();
      }

      const res = await transferApi.getLogs(params);
      const data = res?.data;

      if (Array.isArray(data)) {
        setLogs(data);
        setTotalCount(data.length);
        setTotalPages(Math.ceil(data.length / size) || 1);
      } else if (data && typeof data === 'object') {
        const results = data.results || [];
        setLogs(results);
        const count = data.count ?? results.length;
        setTotalCount(count);
        setTotalPages((data.total_pages ?? Math.ceil(count / size)) || 1);
        if (data.summary_counts) {
          setSummaryCounts(data.summary_counts);
        }
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to load transfer logs:', err);
      if (!isBackground) {
        showToast('خطا در دریافت لاگ‌ها و گزارشات نقل‌وانتقالات', 'error');
      }
    } finally {
      setLoading(false);
      if (!isBackground) setRefreshing(false);
    }
  };

  const fetchAuditData = async (teamId = selectedAuditTeamId) => {
    try {
      setAuditLoading(true);
      const res = await transferApi.getAudit(teamId === 'all' ? null : teamId);
      setAuditData(res?.data || null);
    } catch (err) {
      console.error('Failed to load transfer audit data:', err);
      showToast('خطا در دریافت گزارش حسابرسی نقل‌وانتقالات', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  // 1. Initial mount: load only logs (do NOT load heavy audit data yet)
  useEffect(() => {
    fetchLogs(1, pageSize, filterType, searchQuery);
  }, []);

  // 2. Lazy load audit data when user switches to AUDIT tab
  useEffect(() => {
    if (activeMainTab === 'AUDIT' && !auditData && !auditLoading) {
      fetchAuditData('all');
    }
  }, [activeMainTab]);

  // 3. Optimized 60s background polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeMainTab === 'NEWSROOM') {
        fetchLogs(currentPage, pageSize, filterType, searchQuery, true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentPage, pageSize, filterType, searchQuery, activeMainTab]);

  // 4. Debounced search trigger (resets to page 1)
  const isSearchMounted = React.useRef(false);
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchLogs(1, pageSize, filterType, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchLogs(newPage, pageSize, filterType, searchQuery);
    const topEl = document.getElementById('newsroom-feed-top');
    if (topEl) {
      topEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchLogs(1, newSize, filterType, searchQuery);
  };

  const handleFilterChange = (newType) => {
    setFilterType(newType);
    setCurrentPage(1);
    fetchLogs(1, pageSize, newType, searchQuery);
  };

  const getPageNumbers = (current, total) => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  };

  const handleSelectAuditTeam = (teamId) => {
    setSelectedAuditTeamId(teamId);
    fetchAuditData(teamId);
  };

  const handleExecuteRollback = async () => {
    if (!rollbackModalItem) return;
    try {
      setIsRollingBack(true);
      const res = await transferApi.rollbackTransfer({
        history_id: rollbackModalItem.history_id,
        reason: rollbackReason.trim() || 'دستور مستقیم مدیریت لیگ مبنی بر لغو معامله مشکوک'
      });
      if (res.data?.success) {
        showToast(res.data.message || 'معامله با موفقیت باطل و وجه مسترد گردید.', 'success');
        setRollbackModalItem(null);
        setRollbackReason('');
        // Refresh both views
        fetchAuditData(selectedAuditTeamId);
        fetchLogs();
      } else {
        showToast(res.data?.error || 'خطا در ابطال معامله', 'error');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'خطا در ابطال معامله';
      showToast(errMsg, 'error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleCopyNews = async (log, e) => {
    if (e) e.stopPropagation();
    const headline = String(log?.news_headline || '');
    const content = String(log?.news_content || log?.description || '');
    const textToCopy = `${headline}\n\n${content}`;

    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopiedId(log.id);
      showToast('متن خبر سبک فابریزیو رومانو با موفقیت کپی شد! 📋', 'success');
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      showToast('خطا در کپی متن! لطفاً دستی انتخاب و کپی کنید.', 'error');
    }
  };

  const handleCopyHeadlineOnly = async (log, e) => {
    if (e) e.stopPropagation();
    const headline = String(log?.news_headline || log?.description || '');
    const success = await copyToClipboard(headline);
    if (success) {
      setCopiedHeadlineId(log.id);
      showToast('تیتر خبر کپی شد! 📢', 'success');
      setTimeout(() => setCopiedHeadlineId(null), 2500);
    } else {
      showToast('خطا در کپی تیتر!', 'error');
    }
  };

  const filteredLogs = logs || [];

  const filteredAuditTransactions = (auditData?.transactions || []).filter(tx => {
    if (!tx) return false;
    if (auditFilterFlag !== 'ALL') {
      const hasFlag = (tx.risk_flags || []).some(f => f.code === auditFilterFlag);
      if (!hasFlag) return false;
    }
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    const pName = String(tx.player_name || '').toLowerCase();
    const sName = String(tx.seller_team_name || '').toLowerCase();
    const bName = String(tx.buyer_team_name || '').toLowerCase();
    return pName.includes(q) || sName.includes(q) || bName.includes(q);
  });

  const countFinalized = summaryCounts?.finalized ?? (logs || []).filter(l => l.event_type === 'TRANSFER_FINALIZED').length;
  const countCounters = summaryCounts?.counters ?? (logs || []).filter(l => l.event_type === 'COUNTER_OFFER').length;
  const countOffers = summaryCounts?.offers ?? (logs || []).filter(l => l.event_type === 'OFFER_MADE').length;
  const countReleases = summaryCounts?.releases ?? (logs || []).filter(l => l.event_type === 'PLAYER_RELEASED' || l.event_type === 'FREE_AGENT_SIGNED').length;

  return (
    <div className="space-y-6 dir-rtl font-sans text-slate-100 pb-28">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#080d1a] via-[#0d162a] to-[#080d1a]">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 text-[11px] font-black font-sport tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span>VML TRANSFER MANAGEMENT & AUDIT SYSTEM</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Newspaper className="text-cyan-400" size={28} />
            مرکز مدیریت، اتاق خبر و حسابرسی نقل‌وانتقالات
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            پوشش زنده رویدادهای بازار نقل‌وانتقالات، پایش ضد دلالی و بررسی پرونده مالی تیم‌های لیگ
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshedAt && (
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] text-slate-400 font-sport">آخرین بروزرسانی</span>
              <span className="text-xs text-cyan-300 font-sport font-bold dir-ltr">
                {lastRefreshedAt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              if (activeMainTab === 'NEWSROOM') fetchLogs(currentPage, pageSize, filterType, searchQuery);
              else fetchAuditData(selectedAuditTeamId);
            }}
            disabled={refreshing || auditLoading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw size={14} className={(refreshing || auditLoading) ? 'animate-spin text-cyan-400' : ''} />
            <span>بروزرسانی زنده</span>
          </button>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveMainTab('NEWSROOM')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${activeMainTab === 'NEWSROOM'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-[1.02]'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
        >
          <Newspaper size={16} />
          <span>اتاق خبر و رویدادهای زنده (Newsroom Feed)</span>
          <span className="bg-slate-950/40 px-2 py-0.5 rounded-lg text-[10px] font-sport">
            {totalCount || logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('AUDIT')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${activeMainTab === 'AUDIT'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 shadow-lg shadow-amber-500/20 scale-[1.02]'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
        >
          <ShieldAlert size={16} className={activeMainTab === 'AUDIT' ? 'text-slate-950' : 'text-amber-400'} />
          <span>حسابرسی و ضد دلالی تیم‌ها (Anti-Brokerage Audit)</span>
          {auditData?.summary?.high_flags_count > 0 && (
            <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-sport font-black animate-pulse">
              {auditData.summary.high_flags_count} هشدار
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NEWSROOM FEED (ROMANO STYLE)                                      */}
      {/* ========================================================================= */}
      {activeMainTab === 'NEWSROOM' && (
        <div className="space-y-6">
          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-300 font-bold block mb-1">انتقالات قطعی (Here We Go)</span>
                <span className="text-2xl font-black text-white font-sport">{countFinalized}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-300 font-bold block mb-1">مذاکرات داغ (پیشنهاد متقابل)</span>
                <span className="text-2xl font-black text-white font-sport">{countCounters}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                <Flame size={20} />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-cyan-300 font-bold block mb-1">پیشنهادات ارسالی جدید</span>
                <span className="text-2xl font-black text-white font-sport">{countOffers}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-inner">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-300 font-bold block mb-1">بازیکنان آزاد و فسخ قرارداد</span>
                <span className="text-2xl font-black text-white font-sport">{countReleases}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
                <Users size={20} />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#080d1a]">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-bold font-sport">
              {[
                { id: 'ALL', label: 'همه اخبار و لاگ‌ها' },
                { id: 'TRANSFER_FINALIZED', label: '🚨 HERE WE GO (قطعی)' },
                { id: 'COUNTER_OFFER', label: '🔥 مذاکرات متقابل' },
                { id: 'OFFER_MADE', label: '📢 پیشنهاد جدید' },
                { id: 'PLAYER_RELEASED', label: '📄 فسخ و آزادسازی' },
                { id: 'FREE_AGENT_SIGNED', label: '🌟 جذب بازیکن آزاد' },
                { id: 'ADMIN_ROLLBACK', label: '⚠️ ابطال ادمین' },
                { id: 'LOAN_EXPIRED', label: '🔄 پایان قرضی' },
                { id: 'OFFER_REJECTED', label: '❌ رد شده‌ها' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${filterType === f.id
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
                placeholder="جستجو بر اساس نام بازیکن، تیم یا کلمات..."
                className="w-full bg-[#05080e] border border-slate-700/80 rounded-xl py-2 pr-9 pl-3 text-white text-xs outline-none focus:border-cyan-400"
              />
              <Search className="absolute right-2.5 top-2.5 text-slate-400" size={15} />
            </div>
          </div>

          {/* Reports and News Feed List */}
          <div id="newsroom-feed-top" className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-sans glass-panel rounded-3xl">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
                <p>در حال فراخوانی اخبار و گزارش‌های رسمی نقل‌وانتقالات...</p>
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
                const isRollback = log.event_type === 'ADMIN_ROLLBACK';
                const isLoanExpired = log.event_type === 'LOAN_EXPIRED';
                const isCopied = copiedId === log.id;
                const isHeadlineCopied = copiedHeadlineId === log.id;

                const details = log.offer_details || {};
                const playerPhoto = details.target_player_photo || (details.target_player_name ? getPlayerPhotoUrl(details.target_player_name, {
                  position: details.target_player_position,
                  overall: details.target_player_overall
                }) : null);

                const isLoan = details.offer_type === 'LOAN';
                const isSwap = details.offer_type === 'SWAP';
                const isDisciplinary = log.event_type === 'DISCIPLINARY_ACTION';
                const penaltyDetails = log.penalty_details || {};

                if (isDisciplinary) {
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel rounded-3xl border border-amber-500/40 bg-gradient-to-b from-[#20100a] via-[#10080f] to-[#050911] transition-all shadow-xl relative overflow-hidden p-4 sm:p-5"
                    >
                      {/* Top Badge & Time Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-500/20 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-3 py-1 rounded-xl tracking-wider font-sport flex items-center gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-red-600 text-slate-950">
                            <Scale size={13} />
                            <span>⚖️ رأی قطعی دادگاه کمیته انضباطی</span>
                          </span>

                          {penaltyDetails.case_number && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {penaltyDetails.case_number}
                            </span>
                          )}

                          <span className="text-xs font-black text-white">
                            {log.news_headline}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-sport dir-ltr flex items-center gap-1.5 self-start sm:self-auto">
                          <Clock size={12} className="text-slate-500" />
                          <span>{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                        </div>
                      </div>

                      {/* Main Card Body */}
                      <div className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* Left Column: Team Crest Frame */}
                        <div className="lg:col-span-4 flex items-center gap-3.5 bg-[#08050e]/90 p-3 rounded-2xl border border-amber-500/20 shadow-inner">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-amber-950/50 to-slate-950 p-1 border border-amber-500/40 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
                            {penaltyDetails.team_logo ? (
                              <img
                                src={penaltyDetails.team_logo}
                                alt={penaltyDetails.team_name || 'تیم'}
                                className="w-full h-full object-contain rounded-xl p-1"
                              />
                            ) : (
                              <Scale size={28} className="text-amber-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-amber-400 font-bold block">
                              باشگاه متخلف پرونده:
                            </span>
                            <h4 className="text-sm font-black text-white truncate mt-0.5">
                              {penaltyDetails.team_name || 'باشگاه تحت پیگرد'}
                            </h4>
                            <div className="text-xs text-rose-400 font-bold mt-1">
                              {penaltyDetails.violation_type || 'تخلف انضباطی'}
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Sanctions Badges & Verdict Story */}
                        <div className="lg:col-span-8 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {Number(penaltyDetails.fine_budget_usd || 0) > 0 && (
                              <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                <DollarSign size={13} className="text-emerald-400" />
                                <span>جریمه نقدی: ${Number(penaltyDetails.fine_budget_usd).toLocaleString()}</span>
                              </span>
                            )}

                            {Number(penaltyDetails.fine_gems || 0) > 0 && (
                              <span className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                <span>💎 {penaltyDetails.fine_gems} جم</span>
                              </span>
                            )}

                            {Number(penaltyDetails.points_deduction || 0) > 0 && (
                              <span className="bg-purple-950/80 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                <Trophy size={13} className="text-purple-400" />
                                <span>کسر {penaltyDetails.points_deduction} امتیاز جدول</span>
                              </span>
                            )}

                            {penaltyDetails.transfer_ban_until && (
                              <span className="bg-rose-950/80 border border-rose-500/40 text-rose-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                <ShieldAlert size={13} className="text-rose-400" />
                                <span>محرومیت از نقل‌وانتقالات</span>
                              </span>
                            )}

                            {penaltyDetails.is_warning && (
                              <span className="bg-amber-950/80 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                                <AlertTriangle size={13} className="text-amber-400" />
                                <span>اخطار کتبی رسمی</span>
                              </span>
                            )}
                          </div>

                          <div className="bg-[#08050e]/70 p-3 rounded-2xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans space-y-2">
                            {penaltyDetails.reason && (
                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/95 leading-relaxed flex items-start gap-2">
                                <span className="shrink-0 font-bold text-amber-400 flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  شرح و چرایی صدور حکم:
                                </span>
                                <span className="line-clamp-2">{penaltyDetails.reason}</span>
                              </div>
                            )}
                            <p className="line-clamp-3 whitespace-pre-line">
                              {log.news_content || log.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                          <Scale size={13} />
                          <span>ابلاغیه رسمی سازمان لیگ مستر لیگ (VML)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleCopyHeadlineOnly(log, e)}
                            title="کپی تیتر دادنامه"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            {isHeadlineCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{isHeadlineCopied ? 'تیتر کپی شد!' : 'کپی تیتر'}</span>
                          </button>

                          <button
                            onClick={() => setSelectedNewsModal(log)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Scale size={13} />
                            <span>مشاهده دادنامه کامل</span>
                          </button>

                          <button
                            onClick={(e) => handleCopyNews(log, e)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 font-sport shadow-lg ${
                              isCopied
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950'
                            }`}
                          >
                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            <span>{isCopied ? 'کپی شد! ✅' : 'کپی متن دادنامه 📋'}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel rounded-3xl border transition-all shadow-xl relative overflow-hidden p-4 sm:p-5 ${isFinalized
                        ? 'border-emerald-500/50 bg-gradient-to-b from-[#091a18] via-[#071118] to-[#050911]'
                        : isRollback
                          ? 'border-rose-500/60 bg-gradient-to-b from-[#24080e] via-[#120709] to-[#050911]'
                          : isCounter
                            ? 'border-purple-500/50 bg-gradient-to-b from-[#170c26] via-[#0d0918] to-[#050911]'
                            : isRelease || isLoanExpired
                              ? 'border-amber-500/50 bg-gradient-to-b from-[#1a1309] via-[#0e0c08] to-[#050911]'
                              : 'border-cyan-500/40 bg-gradient-to-b from-[#0a1326] via-[#070d18] to-[#050911]'
                      }`}
                  >
                    {/* Top Badge & Time Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Tag */}
                        <span className={`text-[10px] font-black px-3 py-1 rounded-xl tracking-wider font-sport flex items-center gap-1.5 shadow-md ${isFinalized
                            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                            : isRollback
                              ? 'bg-rose-600 text-white shadow-rose-600/30'
                              : isCounter
                                ? 'bg-purple-500 text-white shadow-purple-500/20'
                                : isOffer
                                  ? 'bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                                  : 'bg-amber-400 text-slate-950 shadow-amber-500/20'
                          }`}>
                          <Sparkles size={12} className="animate-pulse" />
                          <span>{isRollback ? '🚨 ابطال اضطراری معامله' : (details.romano_tag || (isFinalized ? '🚨 HERE WE GO!' : log.event_type_display))}</span>
                        </span>

                        <span className="text-xs font-black text-slate-200">
                          {log.news_headline}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-sport dir-ltr flex items-center gap-1.5 self-start sm:self-auto">
                        <Clock size={12} className="text-slate-500" />
                        <span>{new Date(log.timestamp).toLocaleString('fa-IR')}</span>
                      </div>
                    </div>

                    {/* Main Card Body */}
                    <div className="py-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                      {/* Left Column: Player Face Frame */}
                      <div className="lg:col-span-4 flex items-center gap-3.5 bg-[#040711]/80 p-3 rounded-2xl border border-slate-800/90 shadow-inner">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 p-1 border border-cyan-500/40 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-lg group">
                          {playerPhoto ? (
                            <img
                              src={playerPhoto}
                              alt={details.target_player_name || 'بازیکن'}
                              className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full items-center justify-center text-cyan-300 font-bold text-lg ${playerPhoto ? 'hidden' : 'flex'}`}
                          >
                            ⚽
                          </div>
                          {details.target_player_overall && (
                            <span className={`absolute bottom-0 right-0 text-[10px] font-black font-sport px-1.5 py-0.5 rounded-tl-lg shadow ${Number(details.target_player_overall) >= 85
                                ? 'bg-emerald-500 text-slate-950'
                                : Number(details.target_player_overall) >= 80
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-cyan-500 text-slate-950'
                              }`}>
                              {details.target_player_overall}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {details.target_player_position && (
                              <span className="text-[10px] font-black bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-lg font-sport">
                                {details.target_player_position}
                              </span>
                            )}
                            {details.target_player_age && (
                              <span className="text-[10px] text-slate-400 font-sport">
                                {details.target_player_age} ساله
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-white truncate mt-1">
                            {details.target_player_name || 'ستاره فوتبال'}
                          </h4>

                          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1 truncate">
                            {details.seller_team_name && (
                              <span className="text-slate-400 truncate max-w-[90px]">{details.seller_team_name}</span>
                            )}
                            {details.seller_team_name && details.buyer_team_name && (
                              <ArrowRightLeft size={11} className="text-cyan-400 flex-shrink-0" />
                            )}
                            {details.buyer_team_name && (
                              <span className="text-emerald-300 font-bold truncate max-w-[90px]">{details.buyer_team_name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Story and Details */}
                      <div className="lg:col-span-8 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-sport">
                          {details.cash_amount > 0 && (
                            <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                              <DollarSign size={13} className="text-emerald-400" />
                              <span>مبلغ قرارداد: ${Number(details.cash_amount).toLocaleString()}</span>
                            </span>
                          )}

                          {isLoan && (
                            <span className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm">
                              <Calendar size={13} className="text-cyan-400" />
                              <span>مدت قرض: {details.loan_duration_matches} مسابقه رسمی</span>
                            </span>
                          )}

                          {details.offer_type_display && (
                            <span className="bg-slate-800/90 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                              نوع: {details.offer_type_display}
                            </span>
                          )}
                        </div>

                        <div className="bg-[#040711]/60 p-3 rounded-2xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans">
                          <p className="line-clamp-3 whitespace-pre-line">
                            {log.news_content || log.description}
                          </p>
                        </div>

                        {isSwap && swapPlayers.length > 0 && (
                          <div className="bg-purple-950/30 border border-purple-500/30 p-2.5 rounded-xl flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-purple-300 font-bold flex items-center gap-1 text-[11px]">
                              <ArrowRightLeft size={12} />
                              <span>مهره‌های معاوضه‌ای:</span>
                            </span>
                            {swapPlayers.map(sp => (
                              <span key={sp.id} className="bg-purple-900/60 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-lg text-[10.5px] font-bold font-sport flex items-center gap-1">
                                <span>{sp.name}</span>
                                <span className="text-cyan-300">({sp.position} - {sp.overall})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-400" />
                        <span>متن آماده انتشار در کانال تلگرام / اینستاگرام مستر لیگ</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleCopyHeadlineOnly(log, e)}
                          title="کپی تیتر خبر"
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          {isHeadlineCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{isHeadlineCopied ? 'تیتر کپی شد!' : 'کپی تیتر'}</span>
                        </button>

                        <button
                          onClick={() => setSelectedNewsModal(log)}
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                        >
                          <Share2 size={13} />
                          <span>کارت اختصاصی رومانو</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyNews(log, e)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 font-sport shadow-lg ${isCopied
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950'
                            }`}
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? 'کپی شد! ✅' : 'کپی متن رومانو 📋'}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Dedicated Modern Pagination Bar */}
          {!loading && totalCount > 0 && (
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#080d1a] shadow-xl">
              {/* Items Range & Total */}
              <div className="flex items-center gap-2 text-xs text-slate-300 font-sport">
                <span className="text-slate-400">نمایش</span>
                <span className="font-bold text-white bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                  {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)}
                </span>
                <span className="text-slate-400">از</span>
                <span className="font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  {totalCount} رویداد
                </span>
              </div>

              {/* Page Number Navigation Buttons */}
              <div className="flex items-center gap-1.5 font-sport text-xs">
                {/* Prev Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || refreshing}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                  title="صفحه قبل"
                >
                  <ChevronRight size={16} />
                  <span className="hidden md:inline text-[11px] font-sans">قبلی</span>
                </button>

                {/* Page Numbers */}
                {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-500 font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === currentPage;
                  return (
                    <button
                      key={`page-${p}`}
                      onClick={() => handlePageChange(p)}
                      disabled={refreshing}
                      className={`min-w-[34px] h-[34px] rounded-xl font-bold transition-all cursor-pointer ${isCurrent
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/30 scale-105'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || refreshing}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                  title="صفحه بعد"
                >
                  <span className="hidden md:inline text-[11px] font-sans">بعدی</span>
                  <ChevronLeft size={16} />
                </button>
              </div>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2 text-xs font-sport">
                <span className="text-slate-400 text-[11px] font-sans">تعداد در صفحه:</span>
                {[10, 15, 25].map(size => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    disabled={refreshing}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${pageSize === size
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANTI-BROKERAGE & TEAM TRANSACTION AUDIT                            */}
      {/* ========================================================================= */}
      {activeMainTab === 'AUDIT' && (
        <div className="space-y-6">
          {/* Team Filter & Selector Bar */}
          <div className="glass-panel p-4 rounded-3xl border border-amber-500/30 bg-[#090e1b] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-amber-400" size={20} />
                <h2 className="text-sm font-black text-white">انتخاب تیم جهت بازرسی جامع و کشف دلالی</h2>
              </div>
              <span className="text-xs text-slate-400 font-sport">
                تعداد کل تیم‌های لیگ: <strong className="text-cyan-300">{(auditData?.teams || []).length}</strong>
              </span>
            </div>

            {/* Teams Chips Horizontal Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar text-xs font-bold font-sport">
              <button
                onClick={() => handleSelectAuditTeam('all')}
                className={`px-4 py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-sm ${selectedAuditTeamId === 'all'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
              >
                <Users size={14} />
                <span>همه تیم‌ها (دید کلی لیگ)</span>
              </button>

              {(auditData?.teams || []).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectAuditTeam(t.id)}
                  className={`px-3.5 py-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border ${selectedAuditTeamId === t.id
                      ? 'bg-cyan-500 text-slate-950 font-black border-cyan-400 shadow-md scale-[1.02]'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                >
                  {t.logo ? (
                    <img src={t.logo} alt="" className="w-5 h-5 object-contain rounded-full" />
                  ) : (
                    <Shield size={14} className="text-slate-500" />
                  )}
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Team Profile & Financial Scorecards */}
          {auditData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Total Spent */}
              <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-900/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-rose-300 font-bold block mb-1">مجموع خریدها (پرداختی)</span>
                  <span className="text-xl font-black text-white font-sport">
                    ${Number(auditData.summary.total_spent || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {auditData.summary.buy_count} بازیکن ورودی
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <TrendingDown size={20} />
                </div>
              </div>

              {/* Card 2: Total Earned */}
              <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-900/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold block mb-1">مجموع فروش‌ها (دریافتی)</span>
                  <span className="text-xl font-black text-white font-sport">
                    ${Number(auditData.summary.total_earned || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {auditData.summary.sell_count} بازیکن خروجی
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>

              {/* Card 3: Net Balance */}
              <div className={`glass-panel p-4 rounded-2xl border flex items-center justify-between ${auditData.summary.net_balance >= 0
                  ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/70'
                  : 'border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-slate-900/70'
                }`}>
                <div>
                  <span className="text-[11px] text-cyan-300 font-bold block mb-1">تراز خالص نقل‌وانتقالات</span>
                  <span className={`text-xl font-black font-sport ${auditData.summary.net_balance >= 0 ? 'text-[#00ff87]' : 'text-amber-400'
                    }`}>
                    {auditData.summary.net_balance >= 0 ? '+' : ''}
                    ${Number(auditData.summary.net_balance || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Net Transfer Balance
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Scale size={20} />
                </div>
              </div>

              {/* Card 4: Total Deals */}
              <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-purple-300 font-bold block mb-1">تعداد کل معاملات</span>
                  <span className="text-xl font-black text-white font-sport">
                    {auditData.summary.total_transactions}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {auditData.summary.loan_count} قرضی | {auditData.summary.swap_count} معاوضه
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
              </div>

              {/* Card 5: Fraud / Brokerage Risk Score */}
              <div className={`glass-panel p-4 rounded-2xl border flex items-center justify-between ${auditData.summary.risk_score === 'HIGH'
                  ? 'border-rose-500 bg-rose-950/40 shadow-rose-900/20 shadow-lg'
                  : auditData.summary.risk_score === 'MEDIUM'
                    ? 'border-amber-500 bg-amber-950/30 shadow-amber-900/20 shadow-lg'
                    : 'border-emerald-500/40 bg-emerald-950/20'
                }`}>
                <div>
                  <span className="text-[11px] text-slate-300 font-bold block mb-1">شاخص ریسک دلالی / تبانی</span>
                  <span className={`text-xs font-black block mt-1 ${auditData.summary.risk_score === 'HIGH'
                      ? 'text-rose-400'
                      : auditData.summary.risk_score === 'MEDIUM'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}>
                    {auditData.summary.risk_label}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 font-sport">
                    {auditData.summary.high_flags_count} پرخطر | {auditData.summary.med_flags_count} متوسط
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${auditData.summary.risk_score === 'HIGH'
                    ? 'bg-rose-600 text-white'
                    : auditData.summary.risk_score === 'MEDIUM'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                  <ShieldAlert size={22} />
                </div>
              </div>
            </div>
          )}

          {/* Collusion Network (Trading Partners) */}
          {auditData?.trading_partners && auditData.trading_partners.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 bg-[#060a14] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="text-purple-400" size={18} />
                  <h3 className="text-xs font-black text-white">
                    شبکه شرکای تجاری {auditData.selected_team ? auditData.selected_team.name : 'تیم‌ها'} (پایش تبانی‌های مکرر)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-sport">
                  معاملات ۳ بار یا بیشتر با برچسب هشدار نمایش داده می‌شوند
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {auditData.trading_partners.map(tp => (
                  <div
                    key={tp.partner_id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${tp.is_suspicious
                        ? 'bg-rose-950/30 border-rose-500/50 shadow-md'
                        : 'bg-slate-900/70 border-slate-800'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {tp.partner_logo ? (
                        <img src={tp.partner_logo} alt="" className="w-8 h-8 object-contain rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                          🛡️
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-black text-white">{tp.partner_name}</h4>
                        <span className="text-[10px] text-slate-400 font-sport block">
                          حجم: ${Number(tp.total_volume || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg font-sport ${tp.is_suspicious ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-cyan-300'
                        }`}>
                        {tp.total_deals} معامله
                      </span>
                      {tp.is_suspicious && (
                        <span className="text-[9.5px] text-rose-400 font-bold block mt-1">
                          ⚠️ تبانی مکرر
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Search and Filter Flags Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#080d1a]">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-bold font-sport">
              {[
                { id: 'ALL', label: 'همه تراکنش‌های ثبت‌شده' },
                { id: 'OVERPRICED', label: '🚨 گران‌فروشی غیرعادی' },
                { id: 'UNDERPRICED', label: '🚨 ارزان‌فروشی مشکوک' },
                { id: 'ZERO_FEE_STAR', label: '🚨 انتقال رایگان ستاره' },
                { id: 'QUICK_FLIP', label: '⚡ چرخش سریع (Quick Flip)' },
                { id: 'COLLUSION_RISK', label: '🤝 معاملات مکرر' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilterFlag(f.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${auditFilterFlag === f.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
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
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="جستجو در لیست تراکنش‌ها..."
                className="w-full bg-[#05080e] border border-slate-700/80 rounded-xl py-2 pr-9 pl-3 text-white text-xs outline-none focus:border-amber-400"
              />
              <Search className="absolute right-2.5 top-2.5 text-slate-400" size={15} />
            </div>
          </div>

          {/* Audit Ledger List */}
          <div className="space-y-3.5">
            {auditLoading ? (
              <div className="p-12 text-center text-slate-400 font-sans glass-panel rounded-3xl">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-400" />
                <p>در حال آنالیز سوابق مالی و ارزیابی شاخص‌های ضد دلالی...</p>
              </div>
            ) : filteredAuditTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 glass-panel rounded-3xl border border-slate-800">
                <Scale size={36} className="mx-auto mb-2 text-slate-600" />
                <p className="font-bold text-sm">تراکنشی مطابق با فیلتر حسابرسی یافت نشد.</p>
              </div>
            ) : (
              filteredAuditTransactions.map((tx) => {
                const hasHighRisk = (tx.risk_flags || []).some(f => f.level === 'HIGH');
                const hasMedRisk = (tx.risk_flags || []).some(f => f.level === 'MEDIUM');
                const playerPhoto = tx.player_photo || (tx.player_name ? getPlayerPhotoUrl(tx.player_name, {
                  position: tx.player_position,
                  overall: tx.player_overall
                }) : null);

                return (
                  <motion.div
                    key={tx.history_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-panel p-4 sm:p-5 rounded-3xl border transition-all shadow-lg relative ${hasHighRisk
                        ? 'border-rose-500/60 bg-gradient-to-b from-[#1c080d] via-[#0d070b] to-[#040711]'
                        : hasMedRisk
                          ? 'border-amber-500/50 bg-gradient-to-b from-[#181106] via-[#0d0b07] to-[#040711]'
                          : 'border-slate-800 bg-[#070b16]'
                      }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Player & Photo Column */}
                      <div className="lg:col-span-4 flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                        <div className="relative w-14 h-14 rounded-xl bg-slate-950 border border-cyan-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {playerPhoto ? (
                            <img src={playerPhoto} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span>⚽</span>
                          )}
                          {tx.player_overall && (
                            <span className="absolute bottom-0 right-0 bg-cyan-500 text-slate-950 font-black text-[9.5px] px-1 rounded-tl font-sport">
                              {tx.player_overall}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {tx.player_position && (
                              <span className="bg-cyan-950 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded font-sport">
                                {tx.player_position}
                              </span>
                            )}
                            <h4 className="text-xs font-black text-white truncate">{tx.player_name}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400 font-sport block mt-1">
                            ارزش بازار (Market Value): <strong className="text-slate-200">${Number(tx.market_value || 0).toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Transaction Deal Info Column */}
                      <div className="lg:col-span-5 space-y-2">
                        {/* Club flow */}
                        <div className="flex items-center gap-2 text-xs font-bold font-sport">
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-slate-300 flex items-center gap-1">
                            {tx.seller_team_logo && <img src={tx.seller_team_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                            <span>{tx.seller_team_name}</span>
                          </span>
                          <ArrowRightLeft size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 text-emerald-300 flex items-center gap-1">
                            {tx.buyer_team_logo && <img src={tx.buyer_team_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
                            <span>{tx.buyer_team_name}</span>
                          </span>
                        </div>

                        {/* Price & Ratio Breakdown */}
                        <div className="flex items-center gap-2 text-xs font-sport flex-wrap">
                          <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-xl font-bold">
                            مبلغ معامله: ${Number(tx.price_usd || 0).toLocaleString()}
                          </span>

                          {tx.price_ratio && tx.market_value > 0 && (
                            <span className={`px-2.5 py-1 rounded-xl border font-bold text-[11px] ${tx.price_ratio > 2.5
                                ? 'bg-rose-950 text-rose-300 border-rose-500'
                                : tx.price_ratio < 0.4
                                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                              نسبت به ارزش بازار: {tx.price_ratio}x
                            </span>
                          )}

                          <span className="text-[10.5px] text-slate-400 font-sport">
                            {new Date(tx.transferred_at).toLocaleString('fa-IR')}
                          </span>
                        </div>

                        {/* Risk Flags Display */}
                        {tx.risk_flags && tx.risk_flags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {tx.risk_flags.map((rf, idx) => (
                              <span
                                key={idx}
                                title={rf.description}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${rf.level === 'HIGH'
                                    ? 'bg-rose-950 text-rose-200 border-rose-500'
                                    : 'bg-amber-950 text-amber-200 border-amber-500'
                                  }`}
                              >
                                <AlertTriangle size={10} />
                                <span>{rf.title}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rollback & Admin Action Column */}
                      <div className="lg:col-span-3 flex flex-col items-end justify-center gap-2">
                        {tx.can_rollback ? (
                          <button
                            onClick={() => {
                              setRollbackModalItem(tx);
                              setRollbackReason(`تشخیص تخلف یا اشتباه در معامله بازیکن ${tx.player_name}`);
                            }}
                            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/50 hover:border-rose-400 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-md font-sport"
                          >
                            <RotateCcw size={13} />
                            <span>فسخ و ابطال اضطراری معامله</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-sport bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                            بازیکن جابجا شده / آزاد
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ROMANO NEWS PREVIEW                                              */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedNewsModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
              <div className="fixed inset-0" onClick={() => setSelectedNewsModal(null)} />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-xl my-auto glass-panel p-6 rounded-3xl border border-cyan-500/40 shadow-2xl bg-gradient-to-b from-[#0b1326] via-[#070c18] to-[#040711] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800/90 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 font-sport text-xs font-bold">
                      HERE WE GO! 🚨
                    </span>
                    <h3 className="font-black text-white text-sm">پیش‌نمایش پست رسانه‌ای فابریزیو رومانو</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNewsModal(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 overflow-hidden bg-gradient-to-b from-[#09152b] via-[#050b18] to-[#02050c] p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded font-sport ${
                        selectedNewsModal.event_type === 'DISCIPLINARY_ACTION'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-red-600 text-white animate-pulse'
                      }`}>
                        {selectedNewsModal.event_type === 'DISCIPLINARY_ACTION' ? 'TRIBUNAL' : 'BREAKING'}
                      </span>
                      <span className={`text-xs font-black font-sport tracking-wider ${
                        selectedNewsModal.event_type === 'DISCIPLINARY_ACTION' ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {selectedNewsModal.event_type === 'DISCIPLINARY_ACTION' ? 'VML DISCIPLINARY TRIBUNAL' : 'VML EXCLUSIVE | FABRIZIO ROMANO'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-sport">
                      {new Date(selectedNewsModal.timestamp).toLocaleDateString('fa-IR')}
                    </span>
                  </div>

                  {selectedNewsModal.event_type === 'DISCIPLINARY_ACTION' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-amber-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-slate-950 border border-amber-500/40 p-1 flex items-center justify-center">
                            {selectedNewsModal.penalty_details?.team_logo ? (
                              <img 
                                src={selectedNewsModal.penalty_details.team_logo} 
                                alt="" 
                                className="w-full h-full object-contain rounded-lg"
                              />
                            ) : (
                              <Scale className="text-amber-400" size={24} />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-amber-400 font-bold block">
                              طرف متخلف پرونده انضباطی:
                            </span>
                            <span className="text-xs font-black text-white">
                              باشگاه {selectedNewsModal.penalty_details?.team_name || 'تیم'}
                            </span>
                            {selectedNewsModal.penalty_details?.case_number && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                کلاسه دادنامه: {selectedNewsModal.penalty_details.case_number}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            رأی قطعی دادگاه
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-black text-amber-300 leading-snug border-b border-slate-800/80 pb-2.5">
                        {selectedNewsModal.news_headline}
                      </div>

                      {selectedNewsModal.penalty_details?.reason && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/95 leading-relaxed flex items-start gap-2.5">
                          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-300 block mb-0.5">📌 شرح وقوع و چرایی صدور حکم (مستندات پرونده):</span>
                            <span>{selectedNewsModal.penalty_details.reason}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-[#03060f]/80 p-3.5 rounded-xl border border-slate-800/70 select-text font-mono max-h-72 overflow-y-auto custom-scrollbar">
                        {selectedNewsModal.penalty_details?.official_verdict_text || selectedNewsModal.news_content || selectedNewsModal.description}
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedNewsModal.offer_details?.target_player_name && (
                        <div className="flex items-center justify-between gap-4 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-slate-950 border border-cyan-500/40 overflow-hidden p-0.5 flex items-center justify-center">
                              {selectedNewsModal.offer_details?.target_player_photo ? (
                                <img
                                  src={selectedNewsModal.offer_details.target_player_photo}
                                  alt=""
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-xl">⚽</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {selectedNewsModal.offer_details.target_player_position && (
                                  <span className="text-[10px] font-black bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded font-sport">
                                    {selectedNewsModal.offer_details.target_player_position}
                                  </span>
                                )}
                                <span className="text-xs font-black text-white">
                                  {selectedNewsModal.offer_details.target_player_name}
                                </span>
                              </div>
                              {selectedNewsModal.offer_details.target_player_overall && (
                                <span className="text-[11px] text-emerald-400 font-sport font-bold block mt-0.5">
                                  RATING: {selectedNewsModal.offer_details.target_player_overall}
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedNewsModal.offer_details.cash_amount > 0 && (
                            <div className="text-left font-sport">
                              <span className="text-[10px] text-slate-400 block">FEE</span>
                              <span className="text-sm font-black text-emerald-400">
                                ${Number(selectedNewsModal.offer_details.cash_amount).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-sm font-black text-cyan-300 leading-snug border-b border-slate-800/80 pb-2.5">
                        {selectedNewsModal.news_headline}
                      </div>

                      <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-[#03060f]/80 p-3.5 rounded-xl border border-slate-800/70 select-text">
                        {selectedNewsModal.news_content || selectedNewsModal.description}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedNewsModal(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    بستن
                  </button>
                  <button
                    onClick={() => handleCopyHeadlineOnly(selectedNewsModal)}
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
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer font-sport"
                  >
                    <Copy size={14} />
                    <span>کپی خبر کامل جهت انتشار</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EMERGENCY TRANSFER ROLLBACK CONFIRMATION                         */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {rollbackModalItem && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
              <div className="fixed inset-0" onClick={() => !isRollingBack && setRollbackModalItem(null)} />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 w-full max-w-lg my-auto glass-panel p-6 rounded-3xl border border-rose-500/50 shadow-2xl bg-gradient-to-b from-[#1c080d] via-[#100609] to-[#040711] space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-sm">ابطال اضطراری معامله (Admin Rollback)</h3>
                      <span className="text-[11px] text-rose-300">اقدام انضباطی و نظارتی مدیریت لیگ</span>
                    </div>
                  </div>
                  <button
                    onClick={() => !isRollingBack && setRollbackModalItem(null)}
                    disabled={isRollingBack}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                {/* Deal Details Box */}
                <div className="bg-[#050810] p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>بازیکن مورد معامله:</span>
                    <strong className="text-cyan-300">{rollbackModalItem.player_name} (OVR {rollbackModalItem.player_overall})</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>باشگاه خریدار (کنونی):</span>
                    <strong className="text-white">{rollbackModalItem.buyer_team_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>باشگاه فروشنده (مالک قبلی):</span>
                    <strong className="text-white">{rollbackModalItem.seller_team_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>مبلغ استرداد نقدینگی:</span>
                    <strong className="text-emerald-400 font-sport">${Number(rollbackModalItem.price_usd || 0).toLocaleString()}</strong>
                  </div>
                </div>

                {/* Warning Alert */}
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-200 flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>توجه مهم:</strong> با تایید این عملیات، بازیکن فوراً به تیم <strong>{rollbackModalItem.seller_team_name}</strong> بازگردانده شده و مبلغ معامله به حساب تیم خریدار مسترد می‌گردد. لاگ رسمی این ابطال در تاریخچه مسابقات ثبت خواهد شد.
                  </span>
                </div>

                {/* Reason Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">دلیل یا شرح ابطال معامله (اختیاری):</label>
                  <input
                    type="text"
                    value={rollbackReason}
                    onChange={(e) => setRollbackReason(e.target.value)}
                    placeholder="مثال: نقض قوانین سقف قیمت / معامله صوری و تبانی"
                    className="w-full bg-[#03060f] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-400"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setRollbackModalItem(null)}
                    disabled={isRollingBack}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleExecuteRollback}
                    disabled={isRollingBack}
                    className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer font-sport"
                  >
                    {isRollingBack ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>در حال ابطال و استرداد...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} />
                        <span>تایید و ابطال قطعی معامله</span>
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
