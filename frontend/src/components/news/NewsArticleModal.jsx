import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Eye, Share2, Check, Sparkles, Megaphone, Flame, Heart, ThumbsUp, Award } from 'lucide-react';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

const REACTION_OPTIONS = [
  { type: 'fire', emoji: '🔥', label: 'آتیش' },
  { type: 'heart', emoji: '❤️', label: 'عالی' },
  { type: 'like', emoji: '👍', label: 'موافق' },
  { type: 'clap', emoji: '👏', label: 'تشویق' },
  { type: 'mindblown', emoji: '🤯', label: 'شوک' },
];

export default function NewsArticleModal({ isOpen, onClose, article, onReact }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !article) return null;

  const title = String(article.title || '');
  const subtitle = String(article.subtitle || '');
  const summary = String(article.summary || '');
  const content = String(article.content || '');
  const category = String(article.category || 'GENERAL');
  const categoryDisplay = String(article.category_display || 'اخبار لیگ');
  const timeAgo = String(article.time_ago || 'هم‌اکنون');
  const authorName = String(article.author_name || 'اتاق خبر VML');
  const viewsCount = Number(article.views_count || 1);
  const reactions = article.reactions_count || {};
  const userReaction = article.user_reaction || null;

  const handleCopyText = () => {
    const textToCopy = `${title}\n\n${summary}\n\n${content}\n\n📰 منبع: اتاق خبر لیگ مستر مجازی VML`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCategoryTheme = (cat) => {
    switch (cat) {
      case 'TRANSFER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MATCH':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'DISCIPLINARY':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'COACH':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="relative z-10 bg-gradient-to-b from-[#0e1626] to-[#060a12] border border-cyan-500/30 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-7 shadow-[0_0_60px_rgba(0,243,255,0.15)] text-right flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${getCategoryTheme(category)}`}>
                {categoryDisplay}
              </span>
              {article.is_pinned && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 shadow">
                  📌 سنجاق‌شده
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
                title="کپی متن خبر"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                <span className="text-[11px] font-bold">{copied ? 'کپی شد' : 'اشتراک‌گذاری'}</span>
              </button>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Article Body */}
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4">
            {/* Featured Image with 16:9 Smart Framing */}
            {article.image_url && (() => {
              const rawSrc = article.image_url.startsWith('http') || article.image_url.startsWith('/')
                ? article.image_url
                : getTeamLogoUrl(article.image_url);
              const isLogo = rawSrc.includes('/logos/') || rawSrc.includes('logo');
              const isPlayer = rawSrc.includes('player_photos') || rawSrc.includes('messi');

              return (
                <div className="relative w-full aspect-[16/9] max-h-[300px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/90 shadow-2xl flex items-center justify-center">
                  {/* Ambient Blurred Backdrop */}
                  <div
                    className="absolute inset-0 bg-cover bg-center filter blur-xl scale-115 opacity-40"
                    style={{ backgroundImage: `url(${rawSrc})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e1626] via-transparent to-black/30" />

                  {/* Sharp Foreground Image */}
                  <img
                    src={rawSrc}
                    alt={title}
                    className={`relative z-10 ${
                      isLogo
                        ? 'max-h-[75%] max-w-[75%] object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.9)]'
                        : isPlayer
                        ? 'h-full w-full object-cover object-top'
                        : 'h-full w-full object-cover'
                    }`}
                    onError={(e) => {
                      e.target.src = '/images/vml_news_trophy.webp';
                    }}
                  />

                  {/* Related Team Crest or Player Badge */}
                  {article.related_team_name && (
                    <div className="absolute bottom-3 right-3 z-20 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 shadow-lg">
                      <span className="text-xs font-bold text-white">{article.related_team_name}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-xl font-black text-white leading-snug tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm font-bold text-cyan-400">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Metadata Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 py-2 border-y border-slate-800/80">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-amber-400" />
                  <span>{timeAgo}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span>{authorName}</span>
              </div>
              <div className="flex items-center gap-1 font-sport">
                <Eye size={12} className="text-slate-400" />
                <span>{viewsCount}</span>
              </div>
            </div>

            {/* Summary Highlight Box */}
            {summary && (
              <div className="bg-cyan-950/20 border-r-4 border-cyan-400 p-3 rounded-xl text-xs font-medium text-slate-200 leading-relaxed">
                {summary}
              </div>
            )}

            {/* Full Story Content Paragraphs */}
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-3 font-normal">
              {content}
            </div>

            {/* Emoji Reactions Interactive Bar */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>واکنش شما به این خبر:</span>
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(REACTION_OPTIONS || []).map((r) => {
                  const count = Number(reactions[r.type] || 0);
                  const isSelected = userReaction === r.type;

                  return (
                    <button
                      key={r.type}
                      onClick={() => onReact && onReact(article.id, r.type)}
                      className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{r.emoji}</span>
                      <span className="font-bold">{r.label}</span>
                      {count > 0 && (
                        <span className="font-sport font-black text-[11px] bg-slate-950 px-1.5 py-0.5 rounded-md text-white">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Close Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              پوشش لحظه‌ای و رسمی رویدادهای لیگ مستر مجازی (VML)
            </span>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
