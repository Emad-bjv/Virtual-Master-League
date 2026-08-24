import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Gift, Trophy, Star, Sparkles, Plus, Edit2, Trash2,
  CheckCircle, AlertCircle, Users, Upload, FileText,
  Image as ImageIcon, Clock, Check, X, Shield, DollarSign,
  Gem, Coins, Flame, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gachaApi } from '../../services/api';

const formatDateForInput = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  } catch {
    return '';
  }
};

export function PackCountdownBadge({ available_from, available_until, is_active }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const start = available_from ? new Date(available_from).getTime() : null;
      const end = available_until ? new Date(available_until).getTime() : null;

      if (start && now < start) {
        setStatusText('شروع در آینده');
        const diff = start - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d > 0 ? `${d} روز و ` : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        setIsExpired(false);
        return;
      }

      if (end) {
        if (now > end) {
          setStatusText('مهلت پایان یافته');
          setTimeLeft('منقضی شده');
          setIsExpired(true);
          return;
        }
        const diff = end - now;
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d > 0 ? `${d} روز و ` : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        setStatusText('مهلت باقیمانده');
        setIsExpired(false);
        return;
      }

      setTimeLeft('');
      setStatusText('');
      setIsExpired(false);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [available_from, available_until]);

  if (!timeLeft) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black font-sport border backdrop-blur-md shadow-md ${
        isExpired
          ? 'bg-rose-950/90 text-rose-300 border-rose-500/50'
          : statusText === 'شروع در آینده'
          ? 'bg-blue-950/90 text-blue-300 border-blue-500/50'
          : 'bg-amber-950/90 text-amber-300 border-amber-500/60 animate-pulse'
      }`}
    >
      <Clock size={13} className={!isExpired ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
      <span>{statusText}:</span>
      <span className="font-mono tracking-wider font-black dir-ltr">{timeLeft}</span>
    </div>
  );
}

export default function AdminPacks() {
  const [activeTab, setActiveTab] = useState('packs'); // 'packs' | 'sessions'
  const [packs, setPacks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Filter state
  const [tierFilter, setTierFilter] = useState('ALL');

  // Pack Create / Edit Modal state
  const [showPackModal, setShowPackModal] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [packFormData, setPackFormData] = useState({
    name: '',
    tier: 'BRONZE',
    description: '',
    ovr_range_text: '',
    cost_gems: 50,
    cost_usd: 0,
    cost_irr: 0,
    purchase_method: 'BOTH',
    featured_team: '',
    available_from: '',
    available_until: '',
    is_active: true,
    sort_order: 0
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Pool Management Modal state
  const [selectedPackForPool, setSelectedPackForPool] = useState(null);
  const [poolPlayers, setPoolPlayers] = useState([]);
  const [poolStats, setPoolStats] = useState({ total: 0, unclaimed: 0, claimed: 0 });
  const [poolTab, setPoolTab] = useState('list'); // 'list' | 'add_single' | 'bulk_json'
  const [loadingPool, setLoadingPool] = useState(false);

  // Single Player Form state
  const [singlePlayerData, setSinglePlayerData] = useState({
    name: '',
    position: 'CF',
    overall: 80,
    potential_ovr: 90,
    age: 22,
    base_stamina: 80,
    rarity: 'REGULAR',
    wage: 100,
    market_value: 1000000
  });
  const [playerImageFile, setPlayerImageFile] = useState(null);
  const [playerImagePreview, setPlayerImagePreview] = useState(null);

  // Bulk JSON upload state
  const [jsonInput, setJsonInput] = useState('');
  const [jsonResult, setJsonResult] = useState(null);

  const notify = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchPacks = async () => {
    setLoading(true);
    try {
      const res = await gachaApi.adminGetPacks();
      setPacks(res.data.packs || []);
      setSessions(res.data.recent_sessions || []);
    } catch (err) {
      notify('خطا در دریافت لیست پک‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  // Fetch players for pool management
  const fetchPoolPlayers = async (packId) => {
    setLoadingPool(true);
    try {
      const res = await gachaApi.adminGetPackPlayers(packId);
      setPoolPlayers(res.data.players || []);
      setPoolStats({
        total: res.data.total_count || 0,
        unclaimed: res.data.unclaimed_count || 0,
        claimed: res.data.claimed_count || 0
      });
    } catch (err) {
      notify('خطا در دریافت بازیکنان استخر', 'error');
    } finally {
      setLoadingPool(false);
    }
  };

  const handleOpenPoolModal = (pack) => {
    setSelectedPackForPool(pack);
    setPoolTab('list');
    fetchPoolPlayers(pack.id);
  };

  // Open Create/Edit Modal
  const handleOpenPackModal = (pack = null) => {
    if (pack) {
      setEditingPack(pack);
      setPackFormData({
        name: pack.name,
        tier: pack.tier,
        description: pack.description || '',
        ovr_range_text: pack.ovr_range_text || '',
        cost_gems: pack.cost_gems || 0,
        cost_usd: pack.cost_usd || 0,
        cost_irr: pack.cost_irr || 0,
        purchase_method: pack.purchase_method || 'BOTH',
        featured_team: pack.featured_team || '',
        available_from: formatDateForInput(pack.available_from),
        available_until: formatDateForInput(pack.available_until),
        is_active: pack.is_active,
        sort_order: pack.sort_order || 0
      });
      setCoverPreview(pack.cover_image || null);
    } else {
      setEditingPack(null);
      setPackFormData({
        name: '',
        tier: 'BRONZE',
        description: '',
        ovr_range_text: '',
        cost_gems: 50,
        cost_usd: 0,
        cost_irr: 0,
        purchase_method: 'BOTH',
        featured_team: '',
        available_from: '',
        available_until: '',
        is_active: true,
        sort_order: 0
      });
      setCoverPreview(null);
    }
    setCoverImageFile(null);
    setShowPackModal(true);
  };

  const handleSavePack = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(packFormData).forEach((key) => {
      data.append(key, packFormData[key]);
    });
    if (coverImageFile) {
      data.append('cover_image', coverImageFile);
    }

    try {
      if (editingPack) {
        await gachaApi.adminUpdatePack(editingPack.id, data);
        notify(`پک «${packFormData.name}» با موفقیت ویرایش شد.`);
      } else {
        await gachaApi.adminCreatePack(data);
        notify(`پک جدید «${packFormData.name}» با موفقیت ساخته شد.`);
      }
      setShowPackModal(false);
      fetchPacks();
    } catch (err) {
      const errData = err.response?.data;
      let msg = errData?.error || 'خطا در ذخیره اطلاعات پک';
      if (errData?.details) {
        const detailsStr = Object.entries(errData.details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        msg += ` (${detailsStr})`;
      }
      notify(msg, 'error');
    }
  };

  const handleDeletePack = async (packId, packName) => {
    if (!window.confirm(`آیا از حذف پک «${packName}» و تمامی بازیکنان استخر آن اطمینان دارید؟`)) return;
    try {
      await gachaApi.adminDeletePack(packId);
      notify(`پک «${packName}» با موفقیت حذف شد.`);
      fetchPacks();
    } catch (err) {
      notify('خطا در حذف پک', 'error');
    }
  };

  const handleAddSinglePlayer = async (e) => {
    e.preventDefault();
    if (!selectedPackForPool) return;

    const data = new FormData();
    Object.keys(singlePlayerData).forEach((k) => {
      data.append(k, singlePlayerData[k]);
    });
    if (playerImageFile) {
      data.append('card_image', playerImageFile);
    }

    try {
      await gachaApi.adminAddPackPlayer(selectedPackForPool.id, data);
      notify(`بازیکن «${singlePlayerData.name}» به استخر افزوده شد.`);
      setSinglePlayerData({
        name: '',
        position: 'CF',
        overall: 80,
        potential_ovr: 90,
        age: 22,
        base_stamina: 80,
        rarity: 'REGULAR',
        wage: 100,
        market_value: 1000000
      });
      setPlayerImageFile(null);
      setPlayerImagePreview(null);
      fetchPoolPlayers(selectedPackForPool.id);
      fetchPacks();
    } catch (err) {
      const errData = err.response?.data;
      let msg = errData?.error || 'خطا در افزودن بازیکن';
      if (errData?.details) {
        const detailsStr = Object.entries(errData.details)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        msg += ` (${detailsStr})`;
      }
      notify(msg, 'error');
    }
  };

  const handleBulkJsonUpload = async () => {
    if (!selectedPackForPool || !jsonInput.trim()) return;

    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        notify('فرمت JSON باید یک آرایه از اشیاء بازیکن باشد.', 'error');
        return;
      }
    } catch (err) {
      notify('فرمت JSON وارد شده نامعتبر است.', 'error');
      return;
    }

    try {
      const res = await gachaApi.adminBulkUploadPackPlayers(selectedPackForPool.id, { players: parsed });
      setJsonResult(res.data);
      notify(res.data.message || 'بازیکنان افزوده شدند.');
      setJsonInput('');
      fetchPoolPlayers(selectedPackForPool.id);
      fetchPacks();
    } catch (err) {
      notify('خطا در آپلود گروهی', 'error');
    }
  };

  const handleDeletePlayer = async (playerId, playerName) => {
    if (!window.confirm(`آیا از حذف بازیکن «${playerName}» از استخر این پک اطمینان دارید؟`)) return;
    try {
      await gachaApi.adminDeletePackPlayer(selectedPackForPool.id, playerId);
      notify(`بازیکن «${playerName}» از استخر حذف شد.`);
      fetchPoolPlayers(selectedPackForPool.id);
      fetchPacks();
    } catch (err) {
      notify('خطا در حذف بازیکن', 'error');
    }
  };

  const filteredPacks = packs.filter((p) => {
    if (tierFilter !== 'ALL' && p.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6" style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}>
      {/* Top Banner & Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-cyan-950/80 border border-purple-500/30 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg font-black">
              <Gift size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">مدیریت جامع پک‌ها و کارت‌های شانس</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                تعریف پک‌های برنز، نقره و اساطیری، تنظیم قیمت و کاور، و مدیریت دقیق استخر بازیکنان
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPacks}
            disabled={loading}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>بروزرسانی</span>
          </button>

          <button
            onClick={() => handleOpenPackModal()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>ساخت پک جدید</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-xl ${
            toastType === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
          }`}
        >
          {toastType === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('packs')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'packs'
                ? 'bg-purple-950 border border-purple-500 text-white shadow-lg'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Gift size={15} className="text-purple-400" />
            <span>لیست پک‌ها ({packs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'sessions'
                ? 'bg-cyan-950 border border-cyan-500 text-white shadow-lg'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock size={15} className="text-cyan-400" />
            <span>تاریخچه باز شدن پک‌ها ({sessions.length})</span>
          </button>
        </div>

        {activeTab === 'packs' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">فیلتر سطح:</span>
            {['ALL', 'BRONZE', 'SILVER', 'LEGENDARY'].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  tierFilter === t
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {t === 'ALL' ? 'همه' : t === 'BRONZE' ? 'برنز' : t === 'SILVER' ? 'نقره' : 'لجندری'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PACKS LIST TABLE & CARDS */}
      {/* ========================================================================= */}
      {activeTab === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPacks.length > 0 ? (
            filteredPacks.map((pack) => {
              const tierBadge = {
                BRONZE: 'bg-amber-900/80 text-amber-300 border-amber-600',
                SILVER: 'bg-cyan-950/80 text-cyan-300 border-cyan-500',
                LEGENDARY: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black border-yellow-300'
              }[pack.tier || 'BRONZE'];

              return (
                <div
                  key={pack.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-purple-500/40 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-md">
                        <img
                          src={pack.cover_image || (pack.tier === 'LEGENDARY' ? '/assets/cards/legendary_card_bg.jpg' : pack.tier === 'SILVER' ? '/assets/cards/epic_card_bg.jpg' : '/assets/cards/rare_card_bg.jpg')}
                          alt={pack.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${tierBadge}`}>
                          {pack.tier_display || pack.tier}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">{pack.name}</h3>
                        {pack.ovr_range_text && (
                          <span className="text-[11px] text-amber-300 font-bold font-sport block">
                            {pack.ovr_range_text}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                        pack.is_active
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pack.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  {pack.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {pack.description}
                    </p>
                  )}

                  {/* Countdown Timer Badge */}
                  {(pack.available_from || pack.available_until) && (
                    <div className="pt-1">
                      <PackCountdownBadge
                        available_from={pack.available_from}
                        available_until={pack.available_until}
                        is_active={pack.is_active}
                      />
                    </div>
                  )}

                  {/* Pricing and Pool Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-slate-500 block text-[10px]">قیمت:</span>
                      <div className="font-bold text-slate-200 font-sport text-[11px]">
                        {pack.cost_gems > 0 && <span>{pack.cost_gems} 💎 </span>}
                        {pack.cost_usd > 0 && <span>${pack.cost_usd} </span>}
                        {pack.cost_irr > 0 && <span>{pack.cost_irr.toLocaleString('fa-IR')} ت</span>}
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-slate-500 block text-[10px]">استخر بازیکنان:</span>
                      <span className="font-bold text-cyan-300 font-sport text-[12px]">
                        {pack.unclaimed_players_count} / {pack.total_players_count} موجود
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenPoolModal(pack)}
                      className="px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer flex-1 justify-center"
                    >
                      <Users size={14} />
                      <span>مدیریت استخر ({pack.total_players_count})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenPackModal(pack)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="ویرایش پک"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeletePack(pack.id, pack.name)}
                        className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-500/30 transition cursor-pointer"
                        title="حذف پک"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 glass-panel rounded-3xl border border-slate-800 text-slate-400 text-xs space-y-2">
              <Gift size={36} className="mx-auto text-slate-600" />
              <p className="font-bold text-slate-300">هیچ پکی با فیلتر انتخابی یافت نشد.</p>
              <p className="text-[11px] text-slate-500">برای تعریف پک جدید روی دکمه «ساخت پک جدید» کلیک کنید.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PACK OPENING SESSIONS HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 pb-3">
                <th className="p-3"># سشن</th>
                <th className="p-3">تیم</th>
                <th className="p-3">پک</th>
                <th className="p-3">۳ کارت نمایش داده شده</th>
                <th className="p-3">بازیکن انتخاب شده</th>
                <th className="p-3">روش پرداخت</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3">زمان باز شدن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.length > 0 ? (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition">
                    <td className="p-3 font-sport font-bold text-slate-400">#{s.id}</td>
                    <td className="p-3 font-bold text-white">{s.team_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                        {s.pack_name}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {[s.card_1_detail, s.card_2_detail, s.card_3_detail].map((c, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              c?.id === s.picked_card ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c?.name || 'کارت'} ({c?.overall})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      {s.picked_card_detail ? (
                        <span className="font-bold text-emerald-400 font-sport">
                          ⭐ {s.picked_card_detail.name} ({s.picked_card_detail.position} - {s.picked_card_detail.overall})
                        </span>
                      ) : (
                        <span className="text-slate-500">انتخاب نشده</span>
                      )}
                    </td>
                    <td className="p-3 font-sport text-slate-400">
                      {s.payment_method === 'GEMS' ? `${s.cost} 💎` : `$${s.cost}`}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
                            : s.status === 'PENDING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                            : 'bg-rose-950 text-rose-300 border border-rose-600/40'
                        }`}
                      >
                        {s.status_display || s.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(s.created_at).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    هنوز تاریخچه‌ای از باز کردن پک‌ها ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT PACK */}
      {/* ========================================================================= */}
      {showPackModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setShowPackModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl my-auto p-6 shadow-2xl text-white space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-lg font-black text-white">
                  {editingPack ? `ویرایش پک «${editingPack.name}»` : 'ساخت پک جدید'}
                </h3>
                <button
                  onClick={() => setShowPackModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSavePack} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">نام پک:</label>
                    <input
                      type="text"
                      required
                      value={packFormData.name}
                      onChange={(e) => setPackFormData({ ...packFormData, name: e.target.value })}
                      placeholder="مثال: پک اسطوره‌های میلان یا پک نقره لیگ"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">سطح و تم پک (Tier):</label>
                    <select
                      value={packFormData.tier}
                      onChange={(e) => setPackFormData({ ...packFormData, tier: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500 outline-none"
                    >
                      <option value="BRONZE">پک برنز (BRONZE)</option>
                      <option value="SILVER">پک نقره (SILVER)</option>
                      <option value="LEGENDARY">پک لجندری اساطیر (LEGENDARY)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">محدوده نمایشی اورال (OVR Range Badge):</label>
                    <input
                      type="text"
                      value={packFormData.ovr_range_text}
                      onChange={(e) => setPackFormData({ ...packFormData, ovr_range_text: e.target.value })}
                      placeholder="مثال: OVR 85-94 یا بازیکنان منتخب هفته"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تیم منتخب (مخصوص پک‌های تیمی / لجندری):</label>
                    <input
                      type="text"
                      value={packFormData.featured_team}
                      onChange={(e) => setPackFormData({ ...packFormData, featured_team: e.target.value })}
                      placeholder="مثال: AC Milan یا Real Madrid"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">توضیحات پک:</label>
                  <textarea
                    rows={2}
                    value={packFormData.description}
                    onChange={(e) => setPackFormData({ ...packFormData, description: e.target.value })}
                    placeholder="توضیحاتی برای نمایش به کاربران..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:border-cyan-500 outline-none"
                  />
                </div>

                {/* Pricing & Purchase Methods */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-300 block">قیمت‌گذاری و روش خرید</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">قیمت با جم (💎):</label>
                      <input
                        type="number"
                        min="0"
                        value={packFormData.cost_gems}
                        onChange={(e) => setPackFormData({ ...packFormData, cost_gems: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">قیمت با دلار مجازی ($):</label>
                      <input
                        type="number"
                        min="0"
                        value={packFormData.cost_usd}
                        onChange={(e) => setPackFormData({ ...packFormData, cost_usd: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">قیمت به تومان (ت):</label>
                      <input
                        type="number"
                        min="0"
                        value={packFormData.cost_irr}
                        onChange={(e) => setPackFormData({ ...packFormData, cost_irr: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white font-sport"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">روش خرید مجاز:</label>
                    <select
                      value={packFormData.purchase_method}
                      onChange={(e) => setPackFormData({ ...packFormData, purchase_method: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                    >
                      <option value="BOTH">هر دو روش (جم یا دلار)</option>
                      <option value="GEMS">فقط با جم</option>
                      <option value="DIRECT">فقط پرداخت مستقیم / دلار</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling & Countdown Timer */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                      <Clock size={15} className="text-amber-400" />
                      <span>زمان‌بندی و تایمر فعال بودن پک (اختیاری)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">تایمر معکوس زنده روی کارت پک</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">تاریخ و ساعت شروع (از کی در دسترس باشد):</label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={packFormData.available_from}
                          onChange={(e) => setPackFormData({ ...packFormData, available_from: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sport text-xs outline-none focus:border-cyan-500"
                        />
                        {packFormData.available_from && (
                          <button
                            type="button"
                            onClick={() => setPackFormData({ ...packFormData, available_from: '' })}
                            className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white text-[11px]"
                            title="پاک کردن"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">تاریخ و ساعت انقضا (تا کی مهلت دارد):</label>
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={packFormData.available_until}
                          onChange={(e) => setPackFormData({ ...packFormData, available_until: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sport text-xs outline-none focus:border-amber-500"
                        />
                        {packFormData.available_until && (
                          <button
                            type="button"
                            onClick={() => setPackFormData({ ...packFormData, available_until: '' })}
                            className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white text-[11px]"
                            title="پاک کردن"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    <span className="text-slate-500 text-[10.5px]">تنظیم سریع مهلت:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        setPackFormData({ ...packFormData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      +۲۴ ساعت (۱ روز)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        setPackFormData({ ...packFormData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      +۳ روز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        setPackFormData({ ...packFormData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      +۷ روز (۱ هفته)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackFormData({ ...packFormData, available_from: '', available_until: '' })}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 mr-auto cursor-pointer"
                    >
                      بدون محدودیت زمانی
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="block text-slate-400">تصویر کاور پک:</label>
                  <div className="flex items-center gap-4">
                    {coverPreview && (
                      <div className="w-16 h-20 rounded-xl border border-slate-700 overflow-hidden bg-black shrink-0">
                        <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          setCoverPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/60 file:text-purple-300 hover:file:bg-purple-900"
                    />
                  </div>
                </div>

                {/* Active Toggle & Order */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={packFormData.is_active}
                      onChange={(e) => setPackFormData({ ...packFormData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600"
                    />
                    <span className="text-slate-300 font-bold">پک در فروشگاه فعال و در دسترس باشد</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPackModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black"
                    >
                      ذخیره پک
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PLAYER POOL MANAGEMENT (Single / Bulk JSON / Pool List) */}
      {/* ========================================================================= */}
      {selectedPackForPool && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setSelectedPackForPool(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl my-auto p-6 shadow-2xl text-white space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-white">
                    استخر بازیکنان پک «{selectedPackForPool.name}»
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>کل بازیکنان: <strong className="text-white">{poolStats.total}</strong></span>
                    <span>موجود (Unclaimed): <strong className="text-emerald-400">{poolStats.unclaimed}</strong></span>
                    <span>جذب شده: <strong className="text-amber-400">{poolStats.claimed}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPackForPool(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Subtabs for Pool Management */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
                <button
                  onClick={() => setPoolTab('list')}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                    poolTab === 'list' ? 'bg-purple-900 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  لیست بازیکنان موجود ({poolPlayers.length})
                </button>

                <button
                  onClick={() => setPoolTab('add_single')}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    poolTab === 'add_single' ? 'bg-purple-900 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plus size={14} />
                  <span>افزودن بازیکن تکی</span>
                </button>

                <button
                  onClick={() => setPoolTab('bulk_json')}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    poolTab === 'bulk_json' ? 'bg-purple-900 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload size={14} />
                  <span>آپلود گروهی با JSON</span>
                </button>
              </div>

              {/* POOL SUBTAB 1: PLAYERS TABLE */}
              {poolTab === 'list' && (
                <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                  <table className="w-full text-right text-xs text-slate-300">
                    <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-500 z-10">
                      <tr>
                        <th className="p-3">کارت / تصویر</th>
                        <th className="p-3">نام بازیکن</th>
                        <th className="p-3">پست</th>
                        <th className="p-3">اورال</th>
                        <th className="p-3">سن</th>
                        <th className="p-3">استقامت</th>
                        <th className="p-3">وضعیت</th>
                        <th className="p-3">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {poolPlayers.length > 0 ? (
                        poolPlayers.map((player) => (
                          <tr key={player.id} className="hover:bg-white/5 transition">
                            <td className="p-3">
                              <div className="w-9 h-11 rounded-lg bg-black/60 border border-slate-700 overflow-hidden flex items-center justify-center">
                                {player.card_image ? (
                                  <img src={player.card_image} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Star size={14} className="text-slate-500" />
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-bold text-white">{player.name}</td>
                            <td className="p-3 font-sport text-cyan-300 uppercase">{player.position}</td>
                            <td className="p-3 font-sport font-black text-amber-300">{player.overall}</td>
                            <td className="p-3 text-slate-400">{player.age}</td>
                            <td className="p-3 text-emerald-400 font-sport">{player.base_stamina}</td>
                            <td className="p-3">
                              {player.is_claimed ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/40">
                                  جذب توسط: {player.claimed_by_team_name || 'تیم'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                                  آماده در استخر
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleDeletePlayer(player.id, player.name)}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition cursor-pointer"
                                title="حذف از پک"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-slate-500">
                            هنوز بازیکنی در استخر این پک قرار ندارد. با استفاده از تب‌های بالا بازیکن اضافه فرمایید.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* POOL SUBTAB 2: ADD SINGLE PLAYER */}
              {poolTab === 'add_single' && (
                <form onSubmit={handleAddSinglePlayer} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">نام بازیکن:</label>
                      <input
                        type="text"
                        required
                        value={singlePlayerData.name}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, name: e.target.value })}
                        placeholder="مثال: Paolo Maldini"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">پست اصلی:</label>
                      <select
                        value={singlePlayerData.position}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, position: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                      >
                        {['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'].map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">اورال (OVR):</label>
                      <input
                        type="number"
                        min="50"
                        max="99"
                        required
                        value={singlePlayerData.overall}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, overall: parseInt(e.target.value) || 80 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">سن:</label>
                      <input
                        type="number"
                        min="16"
                        max="45"
                        value={singlePlayerData.age}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, age: parseInt(e.target.value) || 22 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">استقامت پایه (PES Stamina):</label>
                      <input
                        type="number"
                        min="40"
                        max="99"
                        value={singlePlayerData.base_stamina}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, base_stamina: parseInt(e.target.value) || 80 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">سقف پتانسیل (Potential):</label>
                      <input
                        type="number"
                        min="70"
                        max="99"
                        value={singlePlayerData.potential_ovr}
                        onChange={(e) => setSinglePlayerData({ ...singlePlayerData, potential_ovr: parseInt(e.target.value) || 90 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تصویر کارت بازیکن (اختیاری):</label>
                    <div className="flex items-center gap-4">
                      {playerImagePreview && (
                        <div className="w-14 h-16 rounded-xl border border-slate-700 overflow-hidden bg-black shrink-0">
                          <img src={playerImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPlayerImageFile(file);
                            setPlayerImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900/60 file:text-purple-300"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      افزودن بازیکن به استخر پک
                    </button>
                  </div>
                </form>
              )}

              {/* POOL SUBTAB 3: BULK JSON UPLOAD */}
              {poolTab === 'bulk_json' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-1">
                    <p className="font-bold text-slate-200">نمونه فرمت ورودی JSON:</p>
                    <pre className="text-[11px] text-cyan-300 font-mono dir-ltr bg-black/60 p-2 rounded-xl overflow-x-auto">
{`[
  { "name": "Paolo Maldini", "position": "CB", "overall": 92, "age": 25, "base_stamina": 90 },
  { "name": "Kaka", "position": "AMF", "overall": 91, "age": 24, "base_stamina": 88 },
  { "name": "Andriy Shevchenko", "position": "CF", "overall": 90, "age": 26, "base_stamina": 86 }
]`}
                    </pre>
                  </div>

                  <textarea
                    rows={7}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="کد JSON آرایه بازیکنان را اینجا Paste کنید..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-cyan-300 font-mono text-xs dir-ltr outline-none focus:border-cyan-500"
                  />

                  {jsonResult && (
                    <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
                      {jsonResult.message}
                    </div>
                  )}

                  <button
                    onClick={handleBulkJsonUpload}
                    disabled={!jsonInput.trim()}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    بارگذاری گروهی و افزودن به استخر پک
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
