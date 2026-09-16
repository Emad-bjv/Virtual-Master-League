import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Tag, Share2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function NewsDetailModal({ isOpen, onClose, newsItem }) {
  const { t, isRtl } = useLanguage();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && newsItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="fixed inset-0" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-10 bg-[#0a0f1d] border border-amber-500/40 rounded-3xl w-full max-w-lg my-auto overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Image */}
            <div className="relative w-full h-52 sm:h-60 bg-slate-900 overflow-hidden">
              <img
                src={newsItem.image}
                alt={newsItem.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/40 to-transparent" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all active:scale-95 cursor-pointer backdrop-blur-sm"
              >
                <X size={18} />
              </button>

              {/* Tag Badge */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-md ${
                  newsItem.category === 'Transfer'
                    ? 'bg-amber-500 text-slate-950 shadow-amber-500/40'
                    : newsItem.category === 'League'
                    ? 'bg-blue-600 text-white shadow-blue-600/40'
                    : 'bg-purple-600 text-white shadow-purple-600/40'
                }`}>
                  {newsItem.categoryLabel || newsItem.category}
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
                  <Clock size={12} className="text-amber-400" />
                  {newsItem.timeAgo}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {newsItem.title}
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {newsItem.content || newsItem.summary}
              </p>

              {/* Action bar */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Tag size={13} className="text-amber-400" />
                  <span>VML Official Newsroom</span>
                </div>
                <button
                  onClick={onClose}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
