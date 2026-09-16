import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Edit2, Trash2, Pin, Eye, EyeOff, Sparkles,
  RefreshCw, Search, CheckCircle2, AlertCircle, X, Save, Image, Link2
} from 'lucide-react';
import { newsApi } from '../../services/api';

const CATEGORIES = [
  { id: 'ALL', label: 'همه دسته‌ها' },
  { id: 'TRANSFER', label: 'نقل‌وانتقالات' },
  { id: 'MATCH', label: 'مسابقات و نتایج' },
  { id: 'DISCIPLINARY', label: 'احکام انضباطی' },
  { id: 'COACH', label: 'مربیان و باشگاه‌ها' },
  { id: 'GENERAL', label: 'عمومی و بیانیه‌ها' },
];

const PRESET_IMAGES = [
  { label: 'کاپ قهرمانی VML', url: '/images/vml_news_trophy.webp' },
  { label: 'بمب نقل‌وانتقالات (مسی)', url: '/images/vml_news_messi.webp' },
  { label: 'تاکتیک و استادیوم', url: '/images/vml_news_tactics.webp' },
];

export default function AdminNewsManager({ showToast }) {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category: 'GENERAL',
    summary: '',
    content: '',
    image_url: '/images/vml_news_trophy.webp',
    is_published: true,
    is_pinned: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchAdminNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await newsApi.getAdminNews(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setNewsList(data);
      } else if (data && Array.isArray(data.results)) {
        setNewsList(data.results);
      } else {
        setNewsList([]);
      }
    } catch (err) {
      console.error('Failed to load admin news:', err);
      if (showToast) showToast('خطا در دریافت لیست اخبار ادمین', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchAdminNews();
  }, [fetchAdminNews]);

  // Backfill from database
  const handleBackfill = async () => {
    setIsBackfilling(true);
    try {
      const res = await newsApi.backfillNews(30);
      const count = res.data?.created_count || 0;
      if (showToast) {
        showToast(
          count > 0
            ? `⚡ ${count} خبر واقعی جدید از رویدادهای دیتابیس ساخته و منتشر شد!`
            : 'همه رویدادهای اخیر قبلاً دارای خبر اختصاصی بوده‌اند و خبر تکراری ساخته نشد.'
        );
      }
      fetchAdminNews();
    } catch (err) {
      console.error('Backfill failed:', err);
      if (showToast) showToast('خطا در اجرای اسکن دیتابیس', 'error');
    } finally {
      setIsBackfilling(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (article) => {
    try {
      const nextPub = !article.is_published;
      await newsApi.updateAdminNews(article.id, { is_published: nextPub });
      setNewsList((prev) =>
        (prev || []).map((n) => (n.id === article.id ? { ...n, is_published: nextPub } : n))
      );
      if (showToast) showToast(nextPub ? 'خبر منتشر شد' : 'خبر از دید مربیان مخفی شد');
    } catch (err) {
      if (showToast) showToast('خطا در تغییر وضعیت انتشار', 'error');
    }
  };

  // Toggle pin
  const handleTogglePin = async (article) => {
    try {
      const nextPin = !article.is_pinned;
      await newsApi.updateAdminNews(article.id, { is_pinned: nextPin });
      setNewsList((prev) =>
        (prev || []).map((n) => (n.id === article.id ? { ...n, is_pinned: nextPin } : n))
      );
      if (showToast) showToast(nextPin ? 'خبر به بالای فید سنجاق شد' : 'سنجاق برداشته شد');
    } catch (err) {
      if (showToast) showToast('خطا در سنجاق خبر', 'error');
    }
  };

  // Delete news
  const handleDelete = async (articleId) => {
    if (!window.confirm('آیا از حذف این خبر اطمینان دارید؟')) return;
    try {
      await newsApi.deleteAdminNews(articleId);
      setNewsList((prev) => (prev || []).filter((n) => n.id !== articleId));
      if (showToast) showToast('خبر با موفقیت حذف شد');
    } catch (err) {
      if (showToast) showToast('خطا در حذف خبر', 'error');
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      subtitle: '',
      category: 'GENERAL',
      summary: '',
      content: '',
      image_url: '/images/vml_news_trophy.webp',
      is_published: true,
      is_pinned: false,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title || '',
      subtitle: article.subtitle || '',
      category: article.category || 'GENERAL',
      summary: article.summary || '',
      content: article.content || '',
      image_url: article.image_url || '/images/vml_news_trophy.webp',
      is_published: article.is_published ?? true,
      is_pinned: article.is_pinned ?? false,
    });
    setModalOpen(true);
  };

  // Save Article (Create or Update)
  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      if (showToast) showToast('تیتر و متن کامل خبر الزامی است', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingArticle) {
        const res = await newsApi.updateAdminNews(editingArticle.id, formData);
        setNewsList((prev) =>
          (prev || []).map((n) => (n.id === editingArticle.id ? res.data : n))
        );
        if (showToast) showToast('خبر با موفقیت ویرایش شد');
      } else {
        const res = await newsApi.createAdminNews(formData);
        setNewsList((prev) => [res.data, ...(prev || [])]);
        if (showToast) showToast('خبر جدید با موفقیت ایجاد و منتشر گردید');
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
      if (showToast) showToast('خطا در ذخیره خبر', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans" dir="rtl">
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="glass-panel p-5 rounded-3xl border border-cyan-500/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                <span>تحریریه و مدیریت اخبار رسمی لیگ (VML Newsroom)</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                نظارت، ویرایش و انتشار دستی یا خودکار اخبار مسابقات، نقل‌وانتقالات و بیانیه‌ها
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handleBackfill}
              disabled={isBackfilling}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className={isBackfilling ? 'animate-spin' : ''} />
              <span>{isBackfilling ? 'در حال اسکن دیتابیس...' : '⚡ تولید خودکار از سوابق دیتابیس'}</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>نگارش خبر جدید</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {(CATEGORIES || []).map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  categoryFilter === c.id
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در سرتیترها..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-slate-500" />
          </div>
        </div>
      </div>

      {/* 2. NEWS LIST TABLE */}
      {loading ? (
        <div className="p-8 text-center text-slate-400">در حال دریافت اخبار...</div>
      ) : (newsList || []).length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-slate-950/60 border border-slate-800 text-slate-400 space-y-2">
          <AlertCircle size={30} className="mx-auto text-slate-500" />
          <p className="font-bold text-white">هیچ خبری یافت نشد.</p>
          <p className="text-[11px]">با زدن دکمه «تولید خودکار از سوابق دیتابیس»، اخبار اولیه از بازی‌ها و ترنسفرها ساخته خواهند شد.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {(newsList || []).map((article) => (
            <div
              key={article.id}
              className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md ${
                article.is_pinned
                  ? 'bg-slate-900/90 border-amber-500/60 shadow-amber-500/10'
                  : 'bg-slate-950/80 border-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                  <img
                    src={article.image_url || '/images/vml_news_trophy.webp'}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/images/vml_news_trophy.webp';
                    }}
                  />
                </div>

                <div className="truncate flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                      {article.category_display}
                    </span>
                    {article.is_pinned && (
                      <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">
                        📌 سنجاق
                      </span>
                    )}
                    {!article.is_published && (
                      <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                        مخفی از مربیان
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-sport">
                      {article.time_ago} • بازدید: {article.views_count}
                    </span>
                  </div>

                  <h3 className="font-black text-white text-xs sm:text-sm truncate">
                    {article.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {article.summary || article.content}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <button
                  onClick={() => handleTogglePin(article)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    article.is_pinned
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                  title={article.is_pinned ? 'برداشتن سنجاق' : 'سنجاق به بالای چنل'}
                >
                  <Pin size={13} />
                </button>

                <button
                  onClick={() => handleTogglePublish(article)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    article.is_published
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                      : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title={article.is_published ? 'مخفی کردن از چنل' : 'انتشار در چنل'}
                >
                  {article.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>

                <button
                  onClick={() => handleOpenEdit(article)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition-colors cursor-pointer"
                  title="ویرایش خبر"
                >
                  <Edit2 size={13} />
                </button>

                <button
                  onClick={() => handleDelete(article.id)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                  title="حذف خبر"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. CREATE / EDIT ARTICLE MODAL (Portal to document.body) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {modalOpen && (
              <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                <div className="fixed inset-0" onClick={() => setModalOpen(false)} />

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative z-10 bg-slate-950 border border-cyan-500/40 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 shadow-2xl text-right flex flex-col max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                  dir="rtl"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
                    <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
                      <Megaphone size={16} className="text-cyan-400" />
                      <span>{editingArticle ? 'ویرایش خبر مطبوعاتی' : 'نگارش خبر جدید لیگ'}</span>
                    </h3>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveArticle} className="space-y-3.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {/* Title */}
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">تیتر خبر *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="مثال: 🚨 توافق رسمی | پیوستن ستاره جدید به آرسنال..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Subtitle & Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">دسته‌بندی</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none cursor-pointer"
                        >
                          <option value="TRANSFER">نقل‌وانتقالات (TRANSFER)</option>
                          <option value="MATCH">مسابقات و نتایج (MATCH)</option>
                          <option value="DISCIPLINARY">احکام انضباطی (DISCIPLINARY)</option>
                          <option value="COACH">مربیان و باشگاه‌ها (COACH)</option>
                          <option value="GENERAL">عمومی و بیانیه‌ها (GENERAL)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">روتیتر / تگ فرعی</label>
                        <input
                          type="text"
                          value={formData.subtitle}
                          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                          placeholder="مثال: قرارداد ۳ ساله با دستمزد رسمی"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Image URL & Presets */}
                    <div>
                      <label className="text-slate-300 font-bold block mb-1 flex items-center justify-between">
                        <span>آدرس تصویر شاخص</span>
                        <span className="text-[10px] text-slate-500">لینک یا مسیر تصویر</span>
                      </label>
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="/images/vml_news_trophy.webp"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none dir-ltr"
                      />
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-slate-400">تصاویر پیش‌فرض:</span>
                        {(PRESET_IMAGES || []).map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormData({ ...formData, image_url: p.url })}
                            className="text-[10px] text-cyan-400 hover:underline bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">خلاصه خبر (۲ الی ۳ خط)</label>
                      <textarea
                        rows="2"
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        placeholder="چکیده کوتاه برای نمایش در کارت‌ها..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Full Content */}
                    <div>
                      <label className="text-slate-300 font-bold block mb-1">متن کامل گزارش *</label>
                      <textarea
                        rows="5"
                        required
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="متن مشروح و پاراگراف‌های خبر..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Checkboxes */}
                    <div className="flex items-center gap-5 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.is_published}
                          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                          className="rounded text-cyan-500"
                        />
                        <span>منتشر شده در چنل خبری مربیان</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                        <input
                          type="checkbox"
                          checked={formData.is_pinned}
                          onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                          className="rounded text-amber-500"
                        />
                        <span>سنجاق به بالای چنل (Pin)</span>
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                      >
                        انصراف
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        <Save size={14} />
                        <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره و انتشار'}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
