import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Trophy, Star, Shield, Zap, CheckCircle2,
  AlertCircle, X, Clock, Flame, ChevronRight, Gem, Coins,
  Plus, Edit2, Trash2, Upload, Search, RotateCcw,
  Sliders, Image as ImageIcon, ArrowLeft, Check, Users,
  Layers, Palette, Eye, DollarSign, Calendar, Globe,
  Dices, Percent
} from 'lucide-react';
import { gachaApi, playerApi } from '../../services/api';
import { getNationalityFlag } from '../../utils/nationalityFlags';
import rareCardBg from '../../assets/cards/rare_card_bg.png';
import epicCardBg from '../../assets/cards/epic_card_bg.png';
import legendaryCardBg from '../../assets/cards/legendary_card_bg.png';
import PackCardFXOverlay from '../../components/common/PackCardFXOverlay';

const POSITION_CHOICES = [
  'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'
];

const TIER_THEMES = {
  BRONZE: {
    label: 'برنز / نادر (Bronze Rare)',
    defaultBg: rareCardBg,
    borderColor: 'border-blue-500/60',
    neonGlow: 'shadow-[0_0_45px_rgba(37,99,235,0.45)]',
    dropGlow: 'drop-shadow-[0_0_25px_rgba(37,99,235,0.5)]',
    badgeBg: 'bg-blue-950/90 text-blue-300 border-blue-500/50',
    accentText: 'text-cyan-300',
    ovrColor: 'text-cyan-300',
    sheenColor: 'rgba(56, 189, 248, 0.25)',
    pillColor: 'from-blue-600 to-cyan-500',
  },
  SILVER: {
    label: 'نقره / حماسی (Silver Epic)',
    defaultBg: epicCardBg,
    borderColor: 'border-purple-500/60',
    neonGlow: 'shadow-[0_0_45px_rgba(168,85,247,0.45)]',
    dropGlow: 'drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]',
    badgeBg: 'bg-purple-950/90 text-purple-300 border-purple-500/50',
    accentText: 'text-purple-300',
    ovrColor: 'text-fuchsia-300',
    sheenColor: 'rgba(216, 70, 239, 0.25)',
    pillColor: 'from-purple-600 to-pink-500',
  },
  LEGENDARY: {
    label: 'طلایی / لجندری (Gold Legendary)',
    defaultBg: legendaryCardBg,
    borderColor: 'border-amber-500/70',
    neonGlow: 'shadow-[0_0_55px_rgba(245,158,11,0.5)]',
    dropGlow: 'drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]',
    badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
    accentText: 'text-yellow-300',
    ovrColor: 'text-amber-300',
    sheenColor: 'rgba(251, 191, 36, 0.3)',
    pillColor: 'from-amber-500 via-yellow-400 to-amber-600',
  }
};

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

export default function AdminPackStudio({ pack, onClose, onPackSaved }) {
  // Current active sub-panel in the right column: 'blueprint' | 'designer' | 'roster'
  const [studioTab, setStudioTab] = useState(pack?.id ? 'designer' : 'blueprint');

  // Pack Blueprint Form State
  const [packData, setPackData] = useState({
    id: pack?.id || null,
    name: pack?.name || '',
    tier: pack?.tier || 'LEGENDARY',
    description: pack?.description || '',
    ovr_range_text: pack?.ovr_range_text || '',
    cost_gems: pack?.cost_gems ?? 50,
    cost_usd: pack?.cost_usd ?? 0,
    cost_irr: pack?.cost_irr ?? 0,
    purchase_method: pack?.purchase_method || 'BOTH',
    featured_team: pack?.featured_team || '',
    available_from: formatDateForInput(pack?.available_from),
    available_until: formatDateForInput(pack?.available_until),
    is_active: pack?.is_active ?? true,
    sort_order: pack?.sort_order ?? 0,
    weight_top_tier: pack?.weight_top_tier ?? 3,
    weight_mid_tier: pack?.weight_mid_tier ?? 5,
    weight_base_tier: pack?.weight_base_tier ?? 8,
    guarantee_min_ovr: pack?.guarantee_min_ovr ?? 90,
  });

  const [packCoverFile, setPackCoverFile] = useState(null);
  const [packCoverPreview, setPackCoverPreview] = useState(pack?.cover_image || null);
  const [customCardBgFile, setCustomCardBgFile] = useState(null);
  const [customCardBgPreview, setCustomCardBgPreview] = useState(pack?.custom_card_bg || null);

  // Roster Pool State
  const [roster, setRoster] = useState([]);
  const [rosterStats, setRosterStats] = useState({ total: 0, unclaimed: 0, claimed: 0 });
  const [liveOdds, setLiveOdds] = useState(pack?.odds || null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Active Player Designer State (reflects in real-time on the 3D card)
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerForm, setPlayerForm] = useState({
    name: 'Marcelo',
    position: 'LB',
    compatible_positions: 'LMF,LWF,CMF',
    overall: 95,
    potential_ovr: 96,
    age: 34,
    base_stamina: 88,
    nationality: 'برزیل',
    prime_club: 'Real Madrid',
    rarity: 'LEGENDARY',
    wage: 250,
    market_value: 35000000,
    drop_weight: 0,
  });
  const [playerPhotoFile, setPlayerPhotoFile] = useState(null);
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState(null);
  const [clubLogoFile, setClubLogoFile] = useState(null);
  const [clubLogoPreview, setClubLogoPreview] = useState(null);

  // Playable secondary positions parsed & toggle helper
  const altPositions = (playerForm.compatible_positions || '')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== playerForm.position);

  const toggleCompatiblePosition = (pos) => {
    const current = (playerForm.compatible_positions || '')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && p !== playerForm.position);

    let updated;
    if (current.includes(pos)) {
      updated = current.filter((p) => p !== pos);
    } else {
      updated = [...current, pos];
    }
    setPlayerForm((prev) => ({
      ...prev,
      compatible_positions: updated.join(',')
    }));
  };

  // Live Photo Calibration Controls
  const [photoScale, setPhotoScale] = useState(1.0);
  const [photoY, setPhotoY] = useState(0);
  const [photoX, setPhotoX] = useState(0);

  // 3D Card Interactive Tilt & Holographic Sheen
  const cardRef = useRef(null);
  const [cardTilt, setCardTilt] = useState({ rotateX: 0, rotateY: 0, sheenX: 50, sheenY: 50 });
  const [isFlipped, setIsFlipped] = useState(false);

  // League Database Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Bulk JSON Drawer State
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonMessage, setJsonMessage] = useState('');

  // Status & Feedback
  const [savingPack, setSavingPack] = useState(false);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 4000);
  };

  // Fetch pack players if editing an existing pack
  const fetchPackPlayers = async (packId) => {
    if (!packId) return;
    setLoadingRoster(true);
    try {
      const res = await gachaApi.adminGetPackPlayers(packId);
      const players = res.data?.players || [];
      setRoster(players);
      setRosterStats({
        total: res.data?.total_count || players.length,
        unclaimed: res.data?.unclaimed_count || players.filter(p => !p.is_claimed).length,
        claimed: res.data?.claimed_count || players.filter(p => p.is_claimed).length,
      });
      if (res.data?.pack?.odds) {
        setLiveOdds(res.data.pack.odds);
      }

      // If first load and players exist, select the top player for live preview
      if (players.length > 0 && !editingPlayerId) {
        selectPlayerForPreview(players[0]);
      }
    } catch {
      showToast('خطا در دریافت لیست بازیکنان استخر پک', 'error');
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    const activeId = packData.id || pack?.id;
    if (activeId && String(activeId).toLowerCase() !== 'null') {
      fetchPackPlayers(activeId);
    }
  }, [packData.id, pack?.id]);

  // Load a player into the designer and live 3D preview
  const selectPlayerForPreview = (player) => {
    setEditingPlayerId(player.id || null);
    setPlayerForm({
      name: player.name || '',
      position: player.position || 'CF',
      compatible_positions: player.compatible_positions || '',
      overall: player.overall || 85,
      potential_ovr: player.potential_ovr || 90,
      age: player.age || 25,
      base_stamina: player.base_stamina || 80,
      nationality: player.nationality || '',
      prime_club: player.prime_club || '',
      rarity: player.rarity || 'REGULAR',
      wage: player.wage || 100,
      market_value: player.market_value || 1000000,
      drop_weight: player.drop_weight ?? 0,
    });
    setPlayerPhotoFile(null);
    setPlayerPhotoPreview(player.card_image || player.photo || null);
    setClubLogoFile(null);
    setClubLogoPreview(player.club_logo || null);
    setStudioTab('designer');
  };

  const handleResetPlayerForm = () => {
    setEditingPlayerId(null);
    setPlayerForm({
      name: '',
      position: 'CF',
      compatible_positions: '',
      overall: 85,
      potential_ovr: 92,
      age: 24,
      base_stamina: 82,
      nationality: '',
      prime_club: '',
      rarity: 'REGULAR',
      wage: 150,
      market_value: 5000000,
      drop_weight: 0,
    });
    setPlayerPhotoFile(null);
    setPlayerPhotoPreview(null);
    setClubLogoFile(null);
    setClubLogoPreview(null);
    setPhotoScale(1.0);
    setPhotoY(0);
    setPhotoX(0);
  };

  // Search real players from League Database
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingDb(true);
      try {
        const res = await playerApi.getPlayers({ search: searchQuery.trim(), limit: 12 });
        const list = res.data?.results || res.data || [];
        setSearchResults(Array.isArray(list) ? list : []);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingDb(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDbPlayer = (dbPlayer) => {
    setPlayerForm((prev) => ({
      ...prev,
      name: dbPlayer.name || '',
      position: dbPlayer.position || prev.position,
      compatible_positions: dbPlayer.compatible_positions || '',
      overall: dbPlayer.overall || prev.overall,
      age: dbPlayer.age || prev.age,
      base_stamina: dbPlayer.stamina || dbPlayer.base_stamina || prev.base_stamina,
      potential_ovr: Math.max(dbPlayer.overall || 85, 90),
      market_value: dbPlayer.market_value || prev.market_value,
      nationality: dbPlayer.nationality || prev.nationality || '',
      prime_club: dbPlayer.team_name || prev.prime_club || '',
    }));
    if (dbPlayer.photo) {
      setPlayerPhotoPreview(dbPlayer.photo);
      setPlayerPhotoFile(null);
    }
    setShowSearchResults(false);
    setSearchQuery('');
    showToast(`مشخصات «${dbPlayer.name}» از دیتابیس لیگ فراخوانی شد.`);
  };

  // 3D Card Hover Tilt calculation
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    const sheenX = Math.round((x / rect.width) * 100);
    const sheenY = Math.round((y / rect.height) * 100);

    setCardTilt({ rotateX, rotateY, sheenX, sheenY });
  };

  const handleMouseLeave = () => {
    setCardTilt({ rotateX: 0, rotateY: 0, sheenX: 50, sheenY: 50 });
  };

  // Save Pack Blueprint
  const handleSavePack = async (e) => {
    if (e) e.preventDefault();
    if (!packData.name.trim()) {
      showToast('لطفاً نام پک را وارد کنید.', 'error');
      return;
    }

    setSavingPack(true);
    const formData = new FormData();
    Object.keys(packData).forEach((key) => {
      if (key === 'id') return; // Do not append id to FormData
      const val = packData[key];
      if ((key === 'available_from' || key === 'available_until') && (!val || val === '')) {
        return;
      }
      if (val !== undefined && val !== null && val !== 'null' && val !== 'undefined') {
        formData.append(key, val);
      }
    });

    if (packCoverFile) {
      formData.append('cover_image', packCoverFile);
    }
    if (customCardBgFile) {
      formData.append('custom_card_bg', customCardBgFile);
    }

    try {
      let res;
      const hasValidId = packData.id && String(packData.id).toLowerCase() !== 'null';
      if (hasValidId) {
        res = await gachaApi.adminUpdatePack(packData.id, formData);
        showToast(`پک «${packData.name}» با موفقیت به‌روزرسانی شد.`);
      } else {
        res = await gachaApi.adminCreatePack(formData);
        const newPack = res.data?.pack || res.data;
        if (newPack?.id) {
          setPackData((prev) => ({ ...prev, id: newPack.id }));
          showToast(`پک «${newPack.name}» با موفقیت ایجاد شد. اکنون می‌توانید بازیکنان را به این پک اضافه کنید.`);
          setStudioTab('designer');
          fetchPackPlayers(newPack.id);
        }
      }
      const savedPack = res.data?.pack || res.data;
      if (savedPack?.odds) {
        setLiveOdds(savedPack.odds);
      }
      if (onPackSaved) onPackSaved(savedPack);
    } catch (err) {
      const errData = err.response?.data;
      let msg = errData?.error || 'خطا در ذخیره‌سازی پک.';
      if (errData?.details) {
        const detailsStr = typeof errData.details === 'object'
          ? Object.entries(errData.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : String(errData.details);
        msg += ` (${detailsStr})`;
      }
      showToast(msg, 'error');
    } finally {
      setSavingPack(false);
    }
  };

  // Save or Add Player to Pack Roster
  const handleSavePlayer = async (e) => {
    if (e) e.preventDefault();
    const activePackId = packData.id || pack?.id;
    if (!activePackId || String(activePackId).toLowerCase() === 'null') {
      showToast('لطفاً ابتدا مشخصات پک را در تب «مشخصات اصلی پک» ذخیره کنید تا شناسه پک ایجاد شود.', 'error');
      setStudioTab('blueprint');
      return;
    }
    if (!playerForm.name.trim()) {
      showToast('نام بازیکن نمی‌تواند خالی باشد.', 'error');
      return;
    }

    setSavingPlayer(true);
    const formData = new FormData();
    Object.keys(playerForm).forEach((key) => {
      if (key === 'id') return;
      const val = playerForm[key];
      if (val !== undefined && val !== null && val !== 'null' && val !== 'undefined') {
        formData.append(key, val);
      }
    });
    if (playerPhotoFile) {
      formData.append('card_image', playerPhotoFile);
    }
    if (clubLogoFile) {
      formData.append('club_logo', clubLogoFile);
    }

    try {
      if (editingPlayerId) {
        await gachaApi.adminUpdatePackPlayer(activePackId, editingPlayerId, formData);
        showToast(`کارت «${playerForm.name}» با موفقیت به‌روز شد.`);
      } else {
        await gachaApi.adminAddPackPlayer(activePackId, formData);
        showToast(`کارت «${playerForm.name}» به استخر پک افزوده شد.`);
      }
      await fetchPackPlayers(activePackId);
      handleResetPlayerForm();
      setStudioTab('roster');
    } catch (err) {
      const errData = err.response?.data;
      let msg = errData?.error || 'خطا در ذخیره‌سازی بازیکن.';
      if (errData?.details) {
        const detailsStr = typeof errData.details === 'object'
          ? Object.entries(errData.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : String(errData.details);
        msg += ` (${detailsStr})`;
      }
      showToast(msg, 'error');
    } finally {
      setSavingPlayer(false);
    }
  };

  // Delete Player from Roster
  const handleDeletePlayer = async (playerId, playerName) => {
    if (!window.confirm(`آیا از حذف بازیکن «${playerName}» از استخر این پک اطمینان دارید؟`)) return;
    try {
      await gachaApi.adminDeletePackPlayer(packData.id, playerId);
      showToast(`بازیکن «${playerName}» حذف شد.`);
      await fetchPackPlayers(packData.id);
      if (editingPlayerId === playerId) {
        handleResetPlayerForm();
      }
    } catch {
      showToast('خطا در حذف بازیکن.', 'error');
    }
  };

  // Return Claimed Player to Pack Pool & Remove from Team
  const [returningPlayerId, setReturningPlayerId] = useState(null);
  const [isReturningAll, setIsReturningAll] = useState(false);

  const handleReturnPlayerToPack = async (player) => {
    const teamName = player.claimed_by_team_name || 'تیم خریدار';
    if (!window.confirm(`آیا از بازگرداندن بازیکن «${player.name}» به استخر این پک و حذف کامل او از ترکیب تیم «${teamName}» اطمینان دارید؟\n\nبا تایید، این بازیکن از لیست بازیکنان تیم حذف شده و کارت دوباره در این پک برای جذب در دسترس قرار می‌گیرد.`)) {
      return;
    }

    const activePackId = packData.id || pack?.id;
    setReturningPlayerId(player.id);
    try {
      const res = await gachaApi.adminReturnPackPlayer(activePackId, player.id);
      showToast(res.data?.message || `بازیکن «${player.name}» از تیم حذف شد و به پک بازگشت.`);
      await fetchPackPlayers(activePackId);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در بازگرداندن بازیکن به پک.', 'error');
    } finally {
      setReturningPlayerId(null);
    }
  };

  const handleReturnAllPlayersToPack = async () => {
    const activePackId = packData.id || pack?.id;
    if (!window.confirm(`هشدار: آیا مطمئن هستید که می‌خواهید تمام بازیکنان جذب‌شده این پک (${rosterStats.claimed} بازیکن) را از ترکیب تیم‌ها حذف کرده و به استخر پک بازگردانید؟`)) {
      return;
    }

    setIsReturningAll(true);
    try {
      const res = await gachaApi.adminReturnAllPackPlayers(activePackId);
      showToast(res.data?.message || 'تمامی بازیکنان جذب‌شده با موفقیت به پک بازگردانده شدند.');
      await fetchPackPlayers(activePackId);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در بازگرداندن بازیکنان به پک.', 'error');
    } finally {
      setIsReturningAll(false);
    }
  };

  // Bulk JSON Upload
  const handleBulkUpload = async () => {
    if (!packData.id) {
      showToast('ابتدا پک را ذخیره فرمایید.', 'error');
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setJsonMessage('فرمت ورودی باید یک آرایه [...] از بازیکنان باشد.');
        return;
      }
      const res = await gachaApi.adminBulkUploadPackPlayers(packData.id, { players: parsed });
      showToast(res.data?.message || 'بارگذاری گروهی با موفقیت انجام شد.');
      setShowJsonModal(false);
      setJsonInput('');
      setJsonMessage('');
      await fetchPackPlayers(packData.id);
    } catch {
      setJsonMessage('خطا در پارس کردن کد JSON. لطفاً ساختار آرایه را بازبینی فرمایید.');
    }
  };

  // Current Card Tier Theme
  const currentTheme = TIER_THEMES[packData.tier] || TIER_THEMES.LEGENDARY;
  const activeCardBg = customCardBgPreview || currentTheme.defaultBg;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 space-y-6 dir-rtl font-sans select-none">
      {/* ========================================================================= */}
      {/* STUDIO TOP NAVIGATION & ACTIONS                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>بازگشت به لیست</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-lg flex items-center justify-center">
              <Sparkles size={20} className="text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white m-0">
                  استودیوی ساخت پک و طراحی کارت FC 26
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  STUDIO v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0">
                {packData.id ? `در حال ویرایش: «${packData.name}» (شناسه #${packData.id})` : 'طراحی و پیکربندی پک جدید'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSavePack}
            disabled={savingPack}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs font-sport shadow-[0_0_20px_rgba(245,158,11,0.4)] transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {savingPack ? (
              <span>در حال ذخیره...</span>
            ) : (
              <>
                <Check size={16} />
                <span>{packData.id ? 'ذخیره تغییرات پک' : 'ثبت اولیه پک'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOAST NOTIFICATION                                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {toast.msg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-3.5 rounded-2xl text-xs font-bold border backdrop-blur-xl shadow-xl flex items-center gap-2.5 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MAIN 2-COLUMN STUDIO WORKSPACE                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 1 (5 Cols): LIVE 3D FC 26 CARD STAGE & PHOTO STUDIO              */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
            {/* Ambient Backlight Glow corresponding to tier */}
            <div
              className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ background: currentTheme.sheenColor }}
            />

            {/* Stage Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 text-xs">
              <span className="font-black text-white flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-400" />
                <span>پیش‌نمایش زنده کارت آلتیمیت</span>
              </span>

              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-[11px] font-bold cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>{isFlipped ? 'مشاهده روی کارت' : 'مشاهده پشت کارت'}</span>
              </button>
            </div>

            {/* 3D Interactive Card Stage */}
            <div className="py-6 flex justify-center [perspective:1200px]">
              <div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className={`w-[230px] sm:w-[255px] h-[345px] sm:h-[385px] cursor-pointer transition-transform duration-100 ease-out select-none ${currentTheme.dropGlow}`}
                style={{
                  transform: `rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="w-full h-full relative [transform-style:preserve-3d]"
                >
                  {/* ============================================================= */}
                  {/* CARD FACE: FRONT (LIVE ULTIMATE TEAM PLAYER CARD)             */}
                  {/* ============================================================= */}
                  <div
                    className="absolute inset-0 w-full h-full overflow-visible [backface-visibility:hidden] border-0 bg-transparent"
                    style={{
                      backgroundImage: `url(${activeCardBg})`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Dynamic Rotating Stars, Sparks & Sheen FX */}
                    <PackCardFXOverlay tier={playerForm.rarity || packData.tier} intensity="high" />

                    {/* Top: OVR Badge & Position */}
                    <div className="absolute top-2 inset-x-2 z-30 flex items-start justify-between pointer-events-none">
                      {/* Left Badge: OVR + Position + Secondary Positions */}
                      <div className="flex flex-col items-center bg-black/75 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 shadow-xl min-w-[46px] pointer-events-auto">
                        <span className={`text-2xl sm:text-3xl font-black font-sport leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${currentTheme.ovrColor}`}>
                          {playerForm.overall}
                        </span>
                        <span className="text-[10px] font-black font-sport text-white tracking-wider mt-0.5 dir-ltr uppercase">
                          {playerForm.position}
                        </span>
                        {altPositions.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center max-w-[50px] pt-0.5 border-t border-white/10">
                            {altPositions.slice(0, 3).map((pos) => (
                              <span
                                key={pos}
                                className="px-1 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[7px] font-black font-sport text-cyan-300 uppercase leading-none"
                              >
                                {pos}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right Tag: Featured Team Tag if provided */}
                      {packData.featured_team && (
                        <div className="flex flex-col items-end pointer-events-auto">
                          <span className="px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[9px] font-bold text-amber-300 border border-amber-500/40 shadow-md">
                            {packData.featured_team}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Center: Heroic Player Photo (Layered behind name and footer) */}
                    <div className="absolute inset-x-0 top-8 bottom-12 z-20 flex items-center justify-center overflow-visible pointer-events-none">
                      {/* Radial Backlight */}
                      <div
                        className="absolute inset-0 pointer-events-none rounded-full blur-xl opacity-50"
                        style={{
                          background: packData.tier === 'LEGENDARY'
                            ? 'radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 70%)'
                            : packData.tier === 'SILVER'
                            ? 'radial-gradient(circle, rgba(192,132,252,0.5) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, transparent 70%)'
                        }}
                      />
                      {playerPhotoPreview ? (
                        <div className="w-full h-full flex items-center justify-center overflow-visible">
                          <img
                            src={playerPhotoPreview}
                            alt={playerForm.name}
                            className="max-h-full w-auto object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)] transition-transform duration-75"
                            style={{
                              transform: `scale(${photoScale}) translate(${photoX}px, ${photoY}px)`,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                            <Trophy size={32} className="text-amber-400/80 drop-shadow-lg" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-300">عکس بازیکن آپلود نشده</span>
                        </div>
                      )}
                    </div>

                    {/* Lower-Third: Nameplate Banner (Positioned IN FRONT of player photo) */}
                    <div className="absolute bottom-11 inset-x-2 text-center z-30 pointer-events-auto">
                      <div className="inline-block px-3 py-0.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/20 shadow-xl max-w-[190px]">
                        <h3 className="text-[11px] sm:text-xs font-black text-white font-sport tracking-wide truncate m-0 drop-shadow uppercase">
                          {playerForm.name || 'نام بازیکن'}
                        </h3>
                      </div>
                    </div>

                    {/* Pinned Card Footer: Prime Club & Nationality (Always IN FRONT of player photo) */}
                    <div className="absolute bottom-2 inset-x-2 z-30 bg-black/85 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20 text-white shadow-2xl flex items-center justify-between gap-1.5 text-[9px] pointer-events-auto">
                      {/* Prime Club */}
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-5 h-5 rounded-md bg-white/10 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {clubLogoPreview ? (
                            <img
                              src={clubLogoPreview}
                              alt={playerForm.prime_club || 'لوگوی باشگاه'}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Shield size={12} className="text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 text-right leading-tight">
                          <span className="text-[7.5px] text-slate-400 block font-medium">تیم دوران پرایم</span>
                          <span className="text-[9.5px] font-black text-white truncate block font-sport tracking-wide">
                            {playerForm.prime_club || 'تیم پرایم'}
                          </span>
                        </div>
                      </div>

                      {/* Sleek Vertical Divider */}
                      <div className="h-4 w-px bg-white/20 shrink-0" />

                      {/* Nationality */}
                      <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                        <div className="min-w-0 text-left leading-tight">
                          <span className="text-[7.5px] text-slate-400 block font-medium text-right">ملیت</span>
                          <span className="text-[9.5px] font-black text-amber-300 truncate block font-sport tracking-wide text-right">
                            {playerForm.nationality || 'ملیت بازیکن'}
                          </span>
                        </div>
                        <div className="w-5 h-5 rounded-md bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-xs shadow-inner">
                          {getNationalityFlag(playerForm.nationality)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================= */}
                  {/* CARD FACE: BACK (UNOPENED PACK COVER ARTWORK)                 */}
                  {/* ============================================================= */}
                  <div
                    className="absolute inset-0 w-full h-full overflow-visible flex flex-col justify-between p-3 [backface-visibility:hidden] [transform:rotateY(180deg)] border-0 bg-transparent"
                    style={{
                      backgroundImage: `url(${activeCardBg})`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="relative z-10 flex items-center justify-between text-[10px] font-bold text-white">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/15">
                        {currentTheme.label}
                      </span>
                      <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                    </div>

                    <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-2">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity }}
                        className="w-20 h-20 rounded-2xl bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-xl"
                      >
                        <Trophy size={30} className="text-yellow-400" />
                        <span className="text-[10px] font-black text-amber-200 mt-0.5 uppercase font-sport tracking-widest">
                          VML 26
                        </span>
                      </motion.div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs sm:text-sm font-black text-white font-sport">
                          {packData.name || 'پک اختصاصی لیگ'}
                        </h4>
                        <span className="text-[10px] text-amber-300 font-bold block">
                          {packData.ovr_range_text || 'شامل بهترین بازیکنان'}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 text-center pb-1">
                      <span className="text-[10.5px] font-black text-white block drop-shadow-md">
                        طراحی و کانفیگ اختصاصی
                      </span>
                      <span className="text-[9px] text-amber-300 font-bold">
                        {packData.tier} EDITION
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* PHOTO CALIBRATION & POSITIONING TOOLBAR                             */}
            {/* ------------------------------------------------------------------- */}
            <div className="w-full bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders size={14} className="text-cyan-400" />
                  <span>تنظیم مقیاس و موقعیت عکس بازیکن</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoScale(1.0);
                    setPhotoY(0);
                    setPhotoX(0);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                  title="ریست تراز عکس"
                >
                  <RotateCcw size={12} />
                  <span>ریست</span>
                </button>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>بزرگ‌نمایی (Zoom)</span>
                    <span className="font-mono text-cyan-300">{photoScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="1.8"
                    step="0.05"
                    value={photoScale}
                    onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>موقعیت عمودی (Y)</span>
                    <span className="font-mono text-cyan-300">{photoY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="2"
                    value={photoY}
                    onChange={(e) => setPhotoY(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>موقعیت افقی (X)</span>
                    <span className="font-mono text-cyan-300">{photoX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    step="2"
                    value={photoX}
                    onChange={(e) => setPhotoX(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Instant Photo Upload Input */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/60 cursor-pointer transition text-[11.5px] font-bold">
                  <Upload size={14} className="text-cyan-400" />
                  <span>آپلود عکس این کارت (PNG یا JPG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPlayerPhotoFile(file);
                        setPlayerPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>

                {playerPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerPhotoFile(null);
                      setPlayerPhotoPreview(null);
                    }}
                    className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-[11px] font-bold transition cursor-pointer"
                    title="حذف عکس"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 2 (7 Cols): STUDIO CONTROLS & MANAGEMENT PANELS                   */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-4">
          {/* Subtabs Selector */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setStudioTab('designer')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                studioTab === 'designer'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette size={15} />
              <span>طراحی و ادیت کارت بازیکن</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioTab('roster')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                studioTab === 'roster'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users size={15} />
              <span>استخر بازیکنان پک ({roster.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioTab('blueprint')}
              className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                studioTab === 'blueprint'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={15} />
              <span>تنظیمات و هویت پک</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* SUBTAB 1: PLAYER CARD DESIGNER (طراحی مشخصات و عکس کارت)              */}
          {/* ===================================================================== */}
          {studioTab === 'designer' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-black text-white m-0">
                    {editingPlayerId ? `ویرایش کارت «${playerForm.name}»` : 'طراحی و ثبت کارت جدید برای پک'}
                  </h2>
                  <p className="text-[11px] text-slate-400 m-0">
                    هر تغییری در این بخش، بلافاصله روی پیش‌نمایش زنده کارت سمت چپ منعکس می‌شود.
                  </p>
                </div>

                {editingPlayerId && (
                  <button
                    type="button"
                    onClick={handleResetPlayerForm}
                    className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition cursor-pointer"
                  >
                    + کارت جدید
                  </button>
                )}
              </div>

              {/* League Database Player Search (Quick Import) */}
              <div className="relative">
                <label className="block text-slate-300 font-bold text-xs mb-1.5 flex items-center gap-1.5">
                  <Search size={14} className="text-amber-400" />
                  <span>جستجو و انتخاب سریع از بازیکنان دیتابیس لیگ:</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="نام بازیکن را جستجو کنید (مثلاً: Messi, Mbappe, Haaland...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 pr-10 text-xs text-white outline-none focus:border-amber-400 transition"
                  />
                  <Search size={16} className="absolute right-3.5 top-3.5 text-slate-500 pointer-events-none" />
                  {searchingDb && (
                    <span className="absolute left-3.5 top-3 text-[11px] text-amber-400 animate-pulse">
                      در حال جستجو...
                    </span>
                  )}
                </div>

                {/* Search Dropdown Results */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectDbPlayer(p)}
                        className="p-2 rounded-xl hover:bg-white/10 transition cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-black/60 overflow-hidden flex items-center justify-center border border-slate-700">
                            {p.photo ? (
                              <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Star size={12} className="text-slate-500" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-[10px] text-slate-400">
                              تیم: {p.team_name || 'آزاد'} | پست: {p.position}
                            </span>
                          </div>
                        </div>

                        <div className="text-left font-sport">
                          <span className="font-black text-amber-300 text-sm">{p.overall}</span>
                          <span className="text-[10px] text-slate-500 block">OVR</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Attributes Form */}
              <form onSubmit={handleSavePlayer} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">نام بازیکن:</label>
                    <input
                      type="text"
                      required
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      placeholder="نام کامل بازیکن"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">پست اصلی بازی:</label>
                    <select
                      value={playerForm.position}
                      onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500 font-sport uppercase"
                    >
                      {POSITION_CHOICES.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">اورال کل (OVR):</label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      required
                      value={playerForm.overall}
                      onChange={(e) => setPlayerForm({ ...playerForm, overall: parseInt(e.target.value) || 80 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-sport font-black text-sm outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Secondary / Playable Positions Selector */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-cyan-400" />
                      <span>پست‌های قابل بازی ثانویه (Playable Positions):</span>
                    </label>
                    <span className="text-[11px] text-cyan-300 font-sport font-bold">
                      {altPositions.length > 0 ? `${altPositions.length} پست انتخاب شده` : 'بدون پست ثانویه'}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-slate-400 m-0 leading-relaxed">
                    روی پست‌هایی که بازیکن علاوه بر پست اصلی توانایی بازی در آن‌ها را دارد کلیک کنید:
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {POSITION_CHOICES.filter((pos) => pos !== playerForm.position).map((pos) => {
                      const isSelected = altPositions.includes(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => toggleCompatiblePosition(pos)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-sport font-black transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] border border-cyan-400 scale-105'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{pos}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prime Club & Nationality & Club Logo Section */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <Shield size={15} className="text-amber-400" />
                      <span>مشخصات تیم دوران پرایم و ملیت بازیکن (نمایش در پایین کارت):</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">تیم دوران پرایم (Prime Club):</label>
                      <input
                        type="text"
                        value={playerForm.prime_club}
                        onChange={(e) => setPlayerForm({ ...playerForm, prime_club: e.target.value })}
                        placeholder="مثلاً: Real Madrid, Barcelona, Man United..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 text-xs font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">ملیت بازیکن (Nationality):</label>
                      <input
                        type="text"
                        value={playerForm.nationality}
                        onChange={(e) => setPlayerForm({ ...playerForm, nationality: e.target.value })}
                        placeholder="مثلاً: برزیل، آرژانتین، فرانسه، ایران..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 text-white outline-none focus:border-cyan-400 text-xs"
                      />
                    </div>
                  </div>

                  {/* Club Logo Upload */}
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">لوگوی باشگاه دوران پرایم (Club Logo):</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {clubLogoPreview ? (
                          <img
                            src={clubLogoPreview}
                            alt="Club Logo"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Shield size={22} className="text-slate-600" />
                        )}
                      </div>

                      <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer transition text-xs font-bold">
                        <Upload size={14} className="text-amber-400" />
                        <span>{clubLogoPreview ? 'تغییر لوگوی باشگاه' : 'آپلود لوگوی باشگاه پرایم (PNG یا SVG با کیفیت)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setClubLogoFile(file);
                              setClubLogoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>

                      {clubLogoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setClubLogoFile(null);
                            setClubLogoPreview(null);
                          }}
                          className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-xs font-bold transition cursor-pointer"
                          title="حذف لوگوی باشگاه"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">سن بازیکن:</label>
                    <input
                      type="number"
                      min="15"
                      max="45"
                      value={playerForm.age}
                      onChange={(e) => setPlayerForm({ ...playerForm, age: parseInt(e.target.value) || 24 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sport outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">استقامت پایه (PES Stamina):</label>
                    <input
                      type="number"
                      min="40"
                      max="99"
                      value={playerForm.base_stamina}
                      onChange={(e) => setPlayerForm({ ...playerForm, base_stamina: parseInt(e.target.value) || 80 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-sport font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">سقف پتانسیل (Potential OVR):</label>
                    <input
                      type="number"
                      min="60"
                      max="99"
                      value={playerForm.potential_ovr}
                      onChange={(e) => setPlayerForm({ ...playerForm, potential_ovr: parseInt(e.target.value) || 90 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-sport font-bold outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">دستمزد هفتگی ($):</label>
                    <input
                      type="number"
                      min="0"
                      value={playerForm.wage}
                      onChange={(e) => setPlayerForm({ ...playerForm, wage: parseFloat(e.target.value) || 100 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sport outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">ارزش بازار اولیه (€):</label>
                    <input
                      type="number"
                      min="0"
                      value={playerForm.market_value}
                      onChange={(e) => setPlayerForm({ ...playerForm, market_value: parseFloat(e.target.value) || 1000000 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sport outline-none"
                    />
                  </div>
                </div>

                {/* Individual Drop Weight Override */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
                      <Dices size={14} className="text-amber-400" />
                      <span>ضریب شانس اختصاصی این کارت (Drop Weight Override):</span>
                    </label>
                    <span className="text-[11px] font-sport text-amber-300 font-bold">
                      {playerForm.drop_weight > 0
                        ? `ضریب دستی: ${playerForm.drop_weight}x`
                        : `پیروی خودکار از رده اورال (${playerForm.overall >= 94 ? packData.weight_top_tier : playerForm.overall >= 90 ? packData.weight_mid_tier : packData.weight_base_tier}x)`}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={playerForm.drop_weight}
                      onChange={(e) => setPlayerForm({ ...playerForm, drop_weight: parseInt(e.target.value) || 0 })}
                      placeholder="0 = پیروی خودکار از رده اورال"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-sport font-black text-xs outline-none focus:border-amber-400"
                    />
                    <p className="text-[10.5px] text-slate-400 m-0 leading-relaxed">
                      عدد <strong className="text-white">۰</strong> به معنی محاسبه خودکار بر اساس اورال بازیکن است. اگر می‌خواهید این بازیکن شانس افتادن کمتر یا بیشتری نسبت به هم‌رده‌های خود داشته باشد، عدد دلخواه وارد کنید.
                    </p>
                  </div>
                </div>

                {/* Save Player Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    {packData.id ? 'کارت به استخر این پک اضافه خواهد شد.' : 'ابتدا پک را ثبت کنید.'}
                  </span>

                  <div className="flex items-center gap-2">
                    {editingPlayerId && (
                      <button
                        type="button"
                        onClick={handleResetPlayerForm}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                      >
                        انصراف از ویرایش
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={savingPlayer}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingPlayer ? (
                        <span>در حال ذخیره کارت...</span>
                      ) : (
                        <>
                          <Plus size={15} />
                          <span>{editingPlayerId ? 'به‌روزرسانی کارت بازیکن' : 'افزودن کارت به استخر پک'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUBTAB 2: PACK PLAYER ROOL (لیست بازیکنان داخل این پک)                */}
          {/* ===================================================================== */}
          {studioTab === 'roster' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-sm font-black text-white m-0">
                    استخر بازیکنان پک ({rosterStats.total} بازیکن)
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span>موجود: <strong className="text-emerald-400">{rosterStats.unclaimed}</strong></span>
                    <span>جذب‌شده: <strong className="text-amber-400">{rosterStats.claimed}</strong></span>
                  </div>

                  {liveOdds && (
                    <div className="flex items-center gap-2 text-[10.5px] mt-2.5 flex-wrap">
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Dices size={13} />
                        احتمال دریافت زنده:
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        اورال ۹۴+: <strong>{liveOdds.top_tier?.pct ?? 0}%</strong> ({liveOdds.top_tier?.count ?? 0} نفر)
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        اورال ۹۰-۹۳: <strong>{liveOdds.mid_tier?.pct ?? 0}%</strong> ({liveOdds.mid_tier?.count ?? 0} نفر)
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-cyan-300 border border-blue-500/30">
                        زیر ۹۰: <strong>{liveOdds.base_tier?.pct ?? 0}%</strong> ({liveOdds.base_tier?.count ?? 0} نفر)
                      </span>
                      {(packData.guarantee_min_ovr ?? pack?.guarantee_min_ovr) > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ⭐ تضمین ۱ کارت {packData.guarantee_min_ovr ?? pack?.guarantee_min_ovr}+
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {rosterStats.claimed > 0 && (
                    <button
                      type="button"
                      disabled={isReturningAll}
                      onClick={handleReturnAllPlayersToPack}
                      className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="حذف همه بازیکنان جذب‌شده از تیم‌ها و بازگرداندن به استخر این پک"
                    >
                      <RotateCcw size={14} className={isReturningAll ? 'animate-spin' : ''} />
                      <span>{isReturningAll ? 'در حال بازگردانی...' : `بازگرداندن همه جذب‌شده‌ها (${rosterStats.claimed})`}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleResetPlayerForm();
                      setStudioTab('designer');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>افزودن بازیکن جدید</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowJsonModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>آپلود گروهی با JSON</span>
                  </button>
                </div>
              </div>

              {/* Roster Table */}
              <div className="max-h-[460px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 z-10">
                    <tr>
                      <th className="p-3">کارت / عکس</th>
                      <th className="p-3">نام بازیکن</th>
                      <th className="p-3">تیم دوران پرایم / لوگو</th>
                      <th className="p-3">ملیت</th>
                      <th className="p-3">پست</th>
                      <th className="p-3">اورال</th>
                      <th className="p-3">ضریب شانس</th>
                      <th className="p-3">وضعیت</th>
                      <th className="p-3">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {roster.length > 0 ? (
                      roster.map((player) => {
                        const isSelected = editingPlayerId === player.id;
                        return (
                          <tr
                            key={player.id}
                            onClick={() => selectPlayerForPreview(player)}
                            className={`transition cursor-pointer ${
                              isSelected ? 'bg-amber-500/15 border-l-4 border-amber-400' : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="p-2.5">
                              <div className="w-9 h-11 rounded-lg bg-black/60 border border-slate-700 overflow-hidden flex items-center justify-center">
                                {player.card_image || player.photo ? (
                                  <img
                                    src={player.card_image || player.photo}
                                    alt={player.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Star size={14} className="text-slate-500" />
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 font-bold text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{player.name}</span>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">
                                    روی استیج
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                                  {player.club_logo ? (
                                    <img
                                      src={player.club_logo}
                                      alt={player.prime_club || 'لوگو'}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Shield size={14} className="text-amber-400/80" />
                                  )}
                                </div>
                                <span className="font-bold text-white text-xs font-sport truncate max-w-[110px]">
                                  {player.prime_club || 'ثبت نشده'}
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-300 font-bold text-xs">{player.nationality || '—'}</td>
                            <td className="p-2.5">
                              <span className="font-sport text-cyan-300 uppercase font-black block">{player.position}</span>
                              {player.compatible_positions && (
                                <div className="flex flex-wrap gap-0.5 mt-0.5 max-w-[80px]">
                                  {player.compatible_positions.split(',').map((p) => p.trim()).filter(Boolean).slice(0, 3).map((pos) => (
                                    <span key={pos} className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[8px] font-sport text-slate-300 font-bold">
                                      {pos}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 font-sport font-black text-amber-300">{player.overall}</td>
                            <td className="p-2.5">
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="font-sport font-black text-amber-300 text-xs">
                                  {player.effective_weight ?? (player.overall >= 94 ? packData.weight_top_tier : player.overall >= 90 ? packData.weight_mid_tier : packData.weight_base_tier)}x
                                </span>
                                {player.drop_weight > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8.5px] bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                                    سفارشی ({player.drop_weight})
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-500">خودکار</span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">
                              {player.is_claimed ? (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/40">
                                    جذب توسط: {player.claimed_by_team_name || 'تیم'}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={returningPlayerId === player.id}
                                    onClick={() => handleReturnPlayerToPack(player)}
                                    className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[9.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                    title="حذف بازیکن از ترکیب تیم و بازگرداندن به پک"
                                  >
                                    <RotateCcw size={11} className={returningPlayerId === player.id ? 'animate-spin' : ''} />
                                    <span>{returningPlayerId === player.id ? 'در حال بازگردانی...' : 'بازگرداندن به پک'}</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                                  موجود در پک
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {player.is_claimed && (
                                  <button
                                    type="button"
                                    disabled={returningPlayerId === player.id}
                                    onClick={() => handleReturnPlayerToPack(player)}
                                    className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-100 transition cursor-pointer border border-amber-500/30 flex items-center gap-1 text-[10.5px]"
                                    title="حذف بازیکن از ترکیب تیم و بازگرداندن به پک"
                                  >
                                    <RotateCcw size={13} className={returningPlayerId === player.id ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">بازگردانی</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => selectPlayerForPreview(player)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="ویرایش این کارت در استودیو"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlayer(player.id, player.name)}
                                  className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 transition cursor-pointer"
                                  title="حذف از پک"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="p-8 text-center text-slate-500">
                          {loadingRoster ? 'در حال بارگذاری بازیکنان...' : 'هنوز هیچ بازیکنی در استخر این پک ثبت نشده است.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUBTAB 3: PACK BLUEPRINT & ECONOMY (تنظیمات، هویت و زمان‌بندی پک)     */}
          {/* ===================================================================== */}
          {studioTab === 'blueprint' && (
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-sm font-black text-white m-0">مشخصات، هویت و اقتصاد پک</h2>
                <p className="text-[11px] text-slate-400 m-0">
                  تنظیمات سطح کارت، قیمت‌گذاری سه‌گانه، روش‌های خرید و مهلت انقضای پک.
                </p>
              </div>

              <form onSubmit={handleSavePack} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">نام پک:</label>
                    <input
                      type="text"
                      required
                      value={packData.name}
                      onChange={(e) => setPackData({ ...packData, name: e.target.value })}
                      placeholder="مثال: پک اسطوره‌های میلان یا پک نقره لیگ"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">سطح و پوسته پک (Tier Theme):</label>
                    <select
                      value={packData.tier}
                      onChange={(e) => setPackData({ ...packData, tier: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500 font-bold"
                    >
                      <option value="BRONZE">پک برنز / نادر (Bronze Rare)</option>
                      <option value="SILVER">پک نقره / حماسی (Silver Epic)</option>
                      <option value="LEGENDARY">پک طلایی / لجندری (Gold Legendary)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">محدوده نمایشی اورال (OVR Badge):</label>
                    <input
                      type="text"
                      value={packData.ovr_range_text}
                      onChange={(e) => setPackData({ ...packData, ovr_range_text: e.target.value })}
                      placeholder="مثال: OVR 85-94 یا اسطوره‌های کلاسیک"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">تیم یا رویداد منتخب (اختیاری):</label>
                    <input
                      type="text"
                      value={packData.featured_team}
                      onChange={(e) => setPackData({ ...packData, featured_team: e.target.value })}
                      placeholder="مثال: AC Milan Legends یا TOTW"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">توضیحات پک برای کاربران:</label>
                  <textarea
                    rows={2}
                    value={packData.description}
                    onChange={(e) => setPackData({ ...packData, description: e.target.value })}
                    placeholder="توضیحات کوتاه و جذاب پک..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Pricing & Purchase Methods */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="font-bold text-slate-200 block">قیمت‌گذاری و روش‌های مجاز خرید</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">قیمت با جم (💎):</label>
                      <input
                        type="number"
                        min="0"
                        value={packData.cost_gems}
                        onChange={(e) => setPackData({ ...packData, cost_gems: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-cyan-300 font-sport font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">قیمت با دلار مجازی ($):</label>
                      <input
                        type="number"
                        min="0"
                        value={packData.cost_usd}
                        onChange={(e) => setPackData({ ...packData, cost_usd: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-amber-300 font-sport font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">قیمت به تومان (ت):</label>
                      <input
                        type="number"
                        min="0"
                        value={packData.cost_irr}
                        onChange={(e) => setPackData({ ...packData, cost_irr: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-sport font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">روش خرید مجاز در فروشگاه:</label>
                    <select
                      value={packData.purchase_method}
                      onChange={(e) => setPackData({ ...packData, purchase_method: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-bold"
                    >
                      <option value="BOTH">هر دو روش (جم یا دلار مجازی)</option>
                      <option value="GEMS">فقط پرداخت با جم</option>
                      <option value="DIRECT">فقط پرداخت مستقیم / دلار مجازی</option>
                    </select>
                  </div>
                </div>

                {/* Pack Drop Odds & Guarantee Slot Configuration */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-950 to-purple-950/20 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Dices size={16} className="text-amber-400" />
                      <span>تنظیم ضرایب شانس و قرعه‌کشی پک (EA FC Smart Odds)</span>
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-mono">الگوریتم وزنی EA FC</span>
                  </div>

                  <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
                    با تنظیم ضرایب زیر، بازیکنان برتر و با اورال بالا شانس کمتری برای افتادن خواهند داشت تا تعادل اقتصادی لیگ حفظ شود. همچنین می‌توانید یک حداقل اورال تضمینی برای ۱ کارت از ۳ کارت تعیین کنید.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30">
                      <label className="block text-amber-300 font-bold mb-1 text-[11px]">ضریب اورال ۹۴+ (فوق ستاره):</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={packData.weight_top_tier}
                        onChange={(e) => setPackData({ ...packData, weight_top_tier: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-amber-300 font-sport font-black text-center text-sm outline-none focus:border-amber-400"
                      />
                      <span className="text-[9.5px] text-slate-400 block mt-1 text-center">
                        پیش‌فرض: ۳ (فوق ستاره)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-purple-500/30">
                      <label className="block text-purple-300 font-bold mb-1 text-[11px]">ضریب اورال ۹۰ تا ۹۳ (ستاره):</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={packData.weight_mid_tier}
                        onChange={(e) => setPackData({ ...packData, weight_mid_tier: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-purple-300 font-sport font-black text-center text-sm outline-none focus:border-purple-400"
                      />
                      <span className="text-[9.5px] text-slate-400 block mt-1 text-center">
                        پیش‌فرض: ۵ (ستاره)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-blue-500/30">
                      <label className="block text-cyan-300 font-bold mb-1 text-[11px]">ضریب اورال زیر ۹۰ (معمولی):</label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={packData.weight_base_tier}
                        onChange={(e) => setPackData({ ...packData, weight_base_tier: parseInt(e.target.value) || 1 })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-cyan-300 font-sport font-black text-center text-sm outline-none focus:border-cyan-400"
                      />
                      <span className="text-[9.5px] text-slate-400 block mt-1 text-center">
                        پیش‌فرض: ۸ (معمولی)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 text-[11px]">
                      کارت تضمینی اسلات اول (Guaranteed Slot Min OVR):
                    </label>
                    <select
                      value={packData.guarantee_min_ovr}
                      onChange={(e) => setPackData({ ...packData, guarantee_min_ovr: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold outline-none focus:border-amber-400"
                    >
                      <option value={90}>تضمین حداقل ۱ کارت با اورال ۹۰+ (استاندارد)</option>
                      <option value={92}>تضمین حداقل ۱ کارت با اورال ۹۲+ (ویژه)</option>
                      <option value={94}>تضمین حداقل ۱ کارت با اورال ۹۴+ (سوپر لجندری)</option>
                      <option value={88}>تضمین حداقل ۱ کارت با اورال ۸۸+</option>
                      <option value={0}>بدون کارت تضمینی (قرعه‌کشی کاملاً تصادفی بر اساس ضریب)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      در هر بازگشایی پک، از میان ۳ کارت پیشنهادی حداقل یک کارت دارای اورال انتخابی بالا خواهد بود (تا زمانی که در استخر موجود باشد).
                    </span>
                  </div>
                </div>

                {/* Scheduling & Countdown Timer */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 via-slate-950 to-amber-950/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Clock size={15} className="text-amber-400" />
                      <span>زمان‌بندی و تایمر انقضای پک</span>
                    </span>
                    <span className="text-[10px] text-slate-400">تایمر معکوس زنده</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">تاریخ شروع نمایش:</label>
                      <input
                        type="datetime-local"
                        value={packData.available_from}
                        onChange={(e) => setPackData({ ...packData, available_from: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">تاریخ انقضا:</label>
                      <input
                        type="datetime-local"
                        value={packData.available_until}
                        onChange={(e) => setPackData({ ...packData, available_until: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-sport"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    <span className="text-slate-500">تنظیم سریع مهلت:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        setPackData({ ...packData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      +۲۴ ساعت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        setPackData({ ...packData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
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
                        setPackData({ ...packData, available_until: new Date(d.getTime() - tzOffset).toISOString().slice(0, 16) });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      +۷ روز
                    </button>
                    <button
                      type="button"
                      onClick={() => setPackData({ ...packData, available_from: '', available_until: '' })}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40 mr-auto cursor-pointer"
                    >
                      بدون محدودیت
                    </button>
                  </div>
                </div>

                {/* Pack Artwork Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-slate-400">تصویر کاور پک در فروشگاه:</label>
                    <div className="flex items-center gap-3">
                      {packCoverPreview && (
                        <div className="w-14 h-16 rounded-xl border border-slate-700 overflow-hidden bg-black shrink-0">
                          <img src={packCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPackCoverFile(file);
                            setPackCoverPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-slate-800 file:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-slate-400">پس‌زمینه اختصاصی کارت (اختیاری):</label>
                    <div className="flex items-center gap-3">
                      {customCardBgPreview && (
                        <div className="w-14 h-16 rounded-xl border border-slate-700 overflow-hidden bg-black shrink-0">
                          <img src={customCardBgPreview} alt="Card Bg" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCustomCardBgFile(file);
                            setCustomCardBgPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-slate-800 file:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={packData.is_active}
                      onChange={(e) => setPackData({ ...packData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                    />
                    <span className="text-slate-200 font-bold">پک در فروشگاه عمومی فعال و قابل خرید باشد</span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingPack}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer"
                  >
                    ذخیره تنظیمات پک
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BULK JSON MODAL (MANDATORY CREATEPORTAL)                                  */}
      {/* ========================================================================= */}
      {showJsonModal && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setShowJsonModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl my-auto p-6 shadow-2xl text-white space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h3 className="text-base font-black text-white">آپلود گروهی بازیکنان با فرمت JSON</h3>
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs space-y-1">
                <p className="font-bold">نمونه آرایه استاندارد JSON:</p>
                <pre className="text-[11px] text-cyan-300 font-mono dir-ltr bg-black/70 p-2.5 rounded-xl overflow-x-auto">
{`[
  { "name": "Kylian Mbappe", "position": "CF", "overall": 92, "age": 25, "base_stamina": 88 },
  { "name": "Jude Bellingham", "position": "AMF", "overall": 90, "age": 21, "base_stamina": 89 }
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

              {jsonMessage && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs">
                  {jsonMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleBulkUpload}
                  disabled={!jsonInput.trim()}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs disabled:opacity-50"
                >
                  تایید و افزودن به پک
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
