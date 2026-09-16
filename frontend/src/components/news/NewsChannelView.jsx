import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Search, Filter, Clock, Eye, Share2, Check,
  ChevronLeft, Sparkles, RefreshCw, AlertCircle, ArrowLeft,
  Flame, Heart, ThumbsUp, Trophy, ArrowRight, Zap, Shield, Award
} from 'lucide-react';
import { newsApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import NewsArticleModal from './NewsArticleModal';

const CATEGORIES = [
  { id: 'ALL', label: 'همه اخبار', icon: Megaphone },
  { id: 'TRANSFER', label: 'نقل‌وانتقالات', icon: Zap },
  { id: 'MATCH', label: 'مسابقات و نتایج', icon: Trophy },
  { id: 'DISCIPLINARY', label: 'احکام انضباطی', icon: Shield },
  { id: 'COACH', label: 'مربیان و باشگاه‌ها', icon: Award },
];

const REACTION_OPTIONS = [
  { type: 'fire', emoji: '🔥' },
  { type: 'heart', emoji: '❤️' },
  { type: 'like', emoji: '👍' },
  { type: 'clap', emoji: '👏' },
  { type: 'mindblown', emoji: '🤯' },
];

export default function NewsChannelView({ onBack }) {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {};
      if (activeCategory !== 'ALL') params.category = activeCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await newsApi.getNews(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setNewsList(data);
      } else if (data && Array.isArray(data.results)) {
        setNewsList(data.results);
      } else {
        setNewsList([]);
      }
    } catch (err) {
      console.error('Failed to load news feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Handle emoji reaction with optimistic state update
  const handleReaction = async (newsId, reactionType) => {
    try {
      // Optimistic update
      setNewsList((prev) =>
        (prev || []).map((item) => {
          if (item.id !== newsId) return item;
          const currentType = item.user_reaction;
          const currentCounts = { ...(item.reactions_count || {}) };

          let nextUserReaction = reactionType;

          if (currentType === reactionType) {
            // Remove
            nextUserReaction = null;
            currentCounts[reactionType] = Math.max(0, (currentCounts[reactionType] || 1) - 1);
          } else {
            // Remove previous if existed
            if (currentType && currentCounts[currentType]) {
              currentCounts[currentType] = Math.max(0, currentCounts[currentType] - 1);
            }
            // Add new
            currentCounts[reactionType] = (currentCounts[reactionType] || 0) + 1;
          }

          return {
            ...item,
            user_reaction: nextUserReaction,
            reactions_count: currentCounts,
          };
        })
      );

      // Call API
      const res = await newsApi.reactToNews(newsId, reactionType);
      if (res.data) {
        setNewsList((prev) =>
          (prev || []).map((item) =>
            item.id === newsId
              ? {
                  ...item,
                  user_reaction: res.data.user_reaction,
                  reactions_count: res.data.reactions_count,
                }
              : item
          )
        );

        if (selectedArticle && selectedArticle.id === newsId) {
          setSelectedArticle((prev) => ({
            ...prev,
            user_reaction: res.data.user_reaction,
            reactions_count: res.data.reactions_count,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleCopy = (newsItem) => {
    const text = `${newsItem.title}\n\n${newsItem.summary}\n\n📰 منبع: چنل مطبوعات رسمی لیگ مستر (VML)`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(newsItem.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const breakingNews = useMemo(() => {
    return (newsList || []).find((n) => n.is_pinned) || (newsList || [])[0] || null;
  }, [newsList]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-28 text-right font-sans" dir="rtl">
      {/* 1. TOP HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0d162a] via-[#102038] to-[#0a1220] border border-cyan-500/30 p-4 sm:p-6 shadow-2xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              >
                <ArrowRight size={18} />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20 shrink-0">
              <Megaphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-white text-base sm:text-xl tracking-tight">
                  اتاق خبر و مطبوعات رسمی لیگ (VML Newsroom)
                </h1>
                <span className="text-[10px] font-sport font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                  LIVE FEED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                پوشش زنده نقل‌وانتقالات، نتایج مسابقات، ستاره‌های زمین و بیانیه‌های رسمی فدراسیون
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => fetchNews(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
              <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        {/* Breaking News Ticker Pill */}
        {breakingNews && (
          <div
            onClick={() => setSelectedArticle(breakingNews)}
            className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 animate-pulse font-sport">
              <span>BREAKING</span>
            </span>
            <span className="text-xs font-bold text-slate-300 truncate">
              {breakingNews.title}
            </span>
            <ChevronLeft size={14} className="text-slate-500 shrink-0 mr-auto" />
          </div>
        )}
      </div>

      {/* 2. SEARCH BAR & CATEGORY FILTER PILLS */}
      <div className="space-y-2.5">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در سرتیترها، بازیکنان و باشگاه‌ها..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 rounded-2xl px-4 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />
          <Search size={16} className="absolute right-3.5 top-3 text-slate-500" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              پاک کردن
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
          {(CATEGORIES || []).map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-2xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/50 shadow-md shadow-cyan-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NEWS FEED TIMELINE */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (newsList || []).length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-950/60 border border-slate-800 space-y-3">
          <AlertCircle size={36} className="mx-auto text-slate-500" />
          <h3 className="font-black text-white text-sm">هیچ خبری در این دسته‌بندی یافت نشد</h3>
          <p className="text-xs text-slate-400">
            با وقوع اولین رویداد، نقل‌وانتقال یا مسابقه، اخبار به صورت خودکار در این چنل منتشر می‌شوند.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(newsList || []).map((item) => {
            const isCopied = copiedId === item.id;
            const reactions = item.reactions_count || {};
            const userReaction = item.user_reaction;

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl border transition-all overflow-hidden shadow-xl flex flex-col ${
                  item.is_pinned
                    ? 'bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-amber-500/50 shadow-amber-500/10'
                    : 'bg-slate-900/80 border-slate-800/90 hover:border-cyan-500/40'
                }`}
              >
                {/* Header ribbon */}
                <div className="px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between text-xs bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      {item.category_display}
                    </span>
                    {item.is_pinned && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow">
                        📌 سنجاق‌شده
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} className="text-amber-400" />
                      {item.time_ago}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(item)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="کپی متن خبر"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Media Image Banner */}
                {item.image_url && (
                  <div
                    onClick={() => setSelectedArticle(item)}
                    className="relative w-full h-44 sm:h-52 bg-slate-950 overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={item.image_url.startsWith('http') || item.image_url.startsWith('/') ? item.image_url : getTeamLogoUrl(item.image_url)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = '/images/vml_news_trophy.webp';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/20" />
                    
                    {item.related_team_name && (
                      <div className="absolute top-3 right-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700 text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span>{item.related_team_name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Content */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h2
                      onClick={() => setSelectedArticle(item)}
                      className="font-black text-white text-sm sm:text-base hover:text-cyan-300 transition-colors cursor-pointer leading-snug"
                    >
                      {item.title}
                    </h2>
                    {item.subtitle && (
                      <p className="text-[11.5px] font-bold text-cyan-400">
                        {item.subtitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {item.summary || item.content}
                    </p>
                  </div>

                  {/* Actions & Reactions */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    {/* Reaction buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(REACTION_OPTIONS || []).map((r) => {
                        const count = Number(reactions[r.type] || 0);
                        const isSelected = userReaction === r.type;

                        return (
                          <button
                            key={r.type}
                            onClick={() => handleReaction(item.id, r.type)}
                            className={`px-2 py-1 rounded-xl text-xs flex items-center gap-1 transition-all active:scale-90 border cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black shadow-sm'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            {count > 0 && <span className="font-sport font-black text-[10px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Read more button */}
                    <button
                      onClick={() => setSelectedArticle(item)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors mr-auto"
                    >
                      <span>مشاهده کامل گزارش</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* 4. DETAIL ARTICLE MODAL */}
      <NewsArticleModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
        onReact={handleReaction}
      />
    </div>
  );
}
