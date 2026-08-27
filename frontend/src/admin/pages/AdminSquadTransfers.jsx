import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Users, Camera, Edit3, Shield, Star, Search, 
  Filter, CheckCircle2, AlertCircle, RefreshCw, Upload, Trash2, 
  DollarSign, Sparkles, UserCheck, UserX, Info, ExternalLink,
  ChevronRight, ArrowUpRight, Check, X, ShieldAlert, Award, Heart,
  Flame, Lock, Zap
} from 'lucide-react';
import api, { teamApi, playerApi, transferApi } from '../../services/api';
import { useToast } from '../components/Toast';
import { getPlayerPhotoUrl } from '../../utils/playerPhotos';

const ALL_POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF'
];

const POSITION_COLORS = {
  GK: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  CB: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  LB: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  RB: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  DMF: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  CMF: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  LMF: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  RMF: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  AMF: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  LWF: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  RWF: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  SS: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  CF: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return `$${Number(val).toLocaleString()}`;
};

export default function AdminSquadTransfers() {
  const { showToast } = useToast();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('TRANSFERS'); // 'TRANSFERS' | 'SQUADS' | 'PHOTOS'

  // Master Data
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab 1: Manual Transfer State
  const [transferSourceTeamId, setTransferSourceTeamId] = useState('all');
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [selectedPlayerForTransfer, setSelectedPlayerForTransfer] = useState(null);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [transferFee, setTransferFee] = useState(0);
  const [transferType, setTransferType] = useState('PERMANENT'); // 'PERMANENT' | 'LOAN' | 'FREE_RELEASE'
  const [loanMatches, setLoanMatches] = useState(10);
  const [transferReason, setTransferReason] = useState('انتقال دستی توسط مدیریت لیگ');
  const [isExecutingTransfer, setIsExecutingTransfer] = useState(false);
  const [confirmTransferModal, setConfirmTransferModal] = useState(false);

  // Tab 2: Squad Viewer State
  const [selectedSquadTeamId, setSelectedSquadTeamId] = useState(null);
  const [squadSearchQuery, setSquadSearchQuery] = useState('');
  const [squadFilterNewOnly, setSquadFilterNewOnly] = useState(false);
  const [squadViewMode, setSquadViewMode] = useState('CARDS'); // 'CARDS' | 'PITCH'

  // Tab 3: Photo Studio State
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoTeamFilter, setPhotoTeamFilter] = useState('all');
  const [selectedPlayerForPhoto, setSelectedPlayerForPhoto] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isResettingPhoto, setIsResettingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Full Player Edit Modal State
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingPlayerEdit, setIsSavingPlayerEdit] = useState(false);

  // Initial Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setRefreshing(true);
    setLoading(true);

    let loadedTeams = [];
    let loadedPlayers = [];

    // 1. Fetch Teams (try /teams/ then /admin/teams/)
    try {
      const teamsRes = await teamApi.getTeams();
      const raw = teamsRes?.data?.results || teamsRes?.data || [];
      loadedTeams = Array.isArray(raw) ? raw : [];
    } catch (err) {
      try {
        const fallbackTeams = await api.get('/admin/teams/');
        const raw = fallbackTeams?.data?.results || fallbackTeams?.data || [];
        loadedTeams = Array.isArray(raw) ? raw : [];
      } catch (err2) {
        console.warn('Failed to load teams:', err2);
      }
    }

    // 2. Fetch Players (try /players/ then /admin/players/)
    try {
      const playersRes = await playerApi.getPlayers();
      const raw = playersRes?.data?.results || playersRes?.data || [];
      loadedPlayers = Array.isArray(raw) ? raw : [];
    } catch (err) {
      try {
        const fallbackPlayers = await api.get('/admin/players/');
        const raw = fallbackPlayers?.data?.results || fallbackPlayers?.data || [];
        loadedPlayers = Array.isArray(raw) ? raw : [];
      } catch (err2) {
        console.warn('Failed to load players:', err2);
      }
    }

    setTeams(loadedTeams);
    setAllPlayers(loadedPlayers);

    if (loadedTeams.length > 0 && !selectedSquadTeamId) {
      setSelectedSquadTeamId(loadedTeams[0].id);
    }

    if (loadedTeams.length === 0 && loadedPlayers.length === 0) {
      showToast('خطا در دریافت اطلاعات. لطفا دکمه تازه‌سازی را بزنید.', 'error');
    }

    setLoading(false);
    setRefreshing(false);
  };

  // Helper map for quick team lookups
  const teamsMap = useMemo(() => {
    const map = {};
    (teams || []).forEach(t => {
      map[t.id] = t;
    });
    return map;
  }, [teams]);

  // Tab 1: Filtered Players for Transfer Selection
  const transferFilteredPlayers = useMemo(() => {
    return (allPlayers || []).filter(p => {
      // Team filter
      if (transferSourceTeamId === 'free_agents') {
        if (p.team || p.team_id) return false;
      } else if (transferSourceTeamId !== 'all') {
        const teamId = p.team?.id || p.team || p.team_id;
        if (String(teamId) !== String(transferSourceTeamId)) return false;
      }

      // Search Query
      if (transferSearchQuery.trim()) {
        const query = transferSearchQuery.trim().toLowerCase();
        const pName = String(p.name || '').toLowerCase();
        const pPos = String(p.position || '').toLowerCase();
        const pTeam = String(p.team?.name || p.team_name || '').toLowerCase();
        return pName.includes(query) || pPos.includes(query) || pTeam.includes(query);
      }

      return true;
    });
  }, [allPlayers, transferSourceTeamId, transferSearchQuery]);

  // Tab 2: Filtered Squad for Selected Team
  const currentSquad = useMemo(() => {
    if (!selectedSquadTeamId) return [];
    return (allPlayers || []).filter(p => {
      const teamId = p.team?.id || p.team || p.team_id;
      return String(teamId) === String(selectedSquadTeamId);
    });
  }, [allPlayers, selectedSquadTeamId]);

  const starters = useMemo(() => {
    return (currentSquad || []).filter(p => Boolean(p.is_starting));
  }, [currentSquad]);

  const substitutes = useMemo(() => {
    return (currentSquad || []).filter(p => !p.is_starting);
  }, [currentSquad]);

  // Tab 3: Filtered Players for Photo Studio
  const photoFilteredPlayers = useMemo(() => {
    return (allPlayers || []).filter(p => {
      if (photoTeamFilter !== 'all') {
        const teamId = p.team?.id || p.team || p.team_id;
        if (String(teamId) !== String(photoTeamFilter)) return false;
      }
      if (photoSearchQuery.trim()) {
        const query = photoSearchQuery.trim().toLowerCase();
        const pName = String(p.name || '').toLowerCase();
        return pName.includes(query);
      }
      return true;
    });
  }, [allPlayers, photoTeamFilter, photoSearchQuery]);

  // Handle Manual Transfer Execution
  const handleExecuteTransfer = async () => {
    if (!selectedPlayerForPlayerValidation()) return;

    setIsExecutingTransfer(true);
    try {
      const payload = {
        player_id: selectedPlayerForTransfer.id,
        target_team_id: targetTeamId === 'free_agent' ? null : Number(targetTeamId),
        transfer_fee: Number(transferFee) || 0,
        transfer_type: transferType,
        loan_matches: transferType === 'LOAN' ? Number(loanMatches) || 10 : 0,
        reason: transferReason || 'انتقال دستی مدیریت'
      };

      const res = await playerApi.manualTransfer(payload);
      showToast(res.data.status || 'انتقال با موفقیت انجام شد ✨', 'success');

      // Update local state smoothly
      const updatedPlayer = res.data.player;
      setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      
      // Update teams if returned
      if (res.data.old_team) {
        setTeams(prev => prev.map(t => t.id === res.data.old_team.id ? res.data.old_team : t));
      }
      if (res.data.new_team) {
        setTeams(prev => prev.map(t => t.id === res.data.new_team.id ? res.data.new_team : t));
      }

      setConfirmTransferModal(false);
      setSelectedPlayerForTransfer(null);
      setTargetTeamId('');
      setTransferFee(0);
    } catch (err) {
      console.error('Error executing transfer:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.detail || 'خطا در انجام انتقال بازیکن';
      showToast(errMsg, 'error');
    } finally {
      setIsExecutingTransfer(false);
    }
  };

  const selectedPlayerForPlayerValidation = () => {
    if (!selectedPlayerForTransfer) {
      showToast('لطفاً ابتدا بازیکنی را برای انتقال انتخاب کنید.', 'warning');
      return false;
    }
    if (!targetTeamId) {
      showToast('لطفاً تیم مقصد یا وضعیت بازیکن آزاد را مشخص کنید.', 'warning');
      return false;
    }
    const currentTeamId = selectedPlayerForTransfer.team?.id || selectedPlayerForTransfer.team;
    if (String(currentTeamId) === String(targetTeamId)) {
      showToast('تیم مبدا و مقصد بازیکن یکسان است!', 'error');
      return false;
    }
    return true;
  };

  // Handle Photo File Select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم فایل نباید بیش از ۵ مگابایت باشد.', 'error');
      return;
    }

    setUploadedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle Photo Upload Submit
  const handleUploadPhoto = async () => {
    if (!selectedPlayerForPhoto || !uploadedFile) {
      showToast('لطفاً ابتدا بازیکن و فایل تصویر را انتخاب کنید.', 'warning');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', uploadedFile);

      const res = await playerApi.uploadPhoto(selectedPlayerForPhoto.id, formData);
      showToast(res.data.status || 'تصویر با موفقیت آپلود شد!', 'success');

      const updatedPlayer = res.data.player;
      setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      setSelectedPlayerForPhoto(updatedPlayer);
      setUploadedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Error uploading player photo:', err);
      const errMsg = err?.response?.data?.error || 'خطا در آپلود تصویر بازیکن';
      showToast(errMsg, 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle Photo Reset to Default
  const handleResetPhoto = async () => {
    if (!selectedPlayerForPhoto) return;

    setIsResettingPhoto(true);
    try {
      const res = await playerApi.resetPhoto(selectedPlayerForPhoto.id);
      showToast(res.data.status || 'تصویر به حالت پیش‌فرض بازگشت.', 'info');

      const updatedPlayer = res.data.player;
      setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      setSelectedPlayerForPhoto(updatedPlayer);
      setUploadedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Error resetting photo:', err);
      showToast('خطا در بازنشانی تصویر', 'error');
    } finally {
      setIsResettingPhoto(false);
    }
  };

  // Handle Player Full Edit Modal Open
  const handleOpenEditModal = (player) => {
    setEditingPlayer(player);
    setEditFormData({
      name: player.name || '',
      position: player.position || 'CF',
      overall: player.overall || 80,
      potential_ovr: player.potential_ovr || 90,
      market_value: player.market_value || 1000000,
      age: player.age || 24,
      wage: player.wage || 100,
      virtual_stamina: player.virtual_stamina || 100,
      shirt_number: player.shirt_number || '',
      is_starting: Boolean(player.is_starting),
      is_injured: Boolean(player.is_injured),
      suspension_matches: player.suspension_matches || 0,
      reason: 'ویرایش مشخصات توسط ادمین'
    });
  };

  // Handle Player Full Edit Submit
  const handleSavePlayerEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingPlayer) return;

    setIsSavingPlayerEdit(true);
    try {
      const res = await playerApi.fullUpdate(editingPlayer.id, editFormData);
      showToast(res.data.status || 'مشخصات بازیکن با موفقیت ذخیره شد.', 'success');

      const updatedPlayer = res.data.player;
      setAllPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      
      // Update team in list if returned or affected
      if (updatedPlayer.team) {
        teamApi.getTeam(updatedPlayer.team.id || updatedPlayer.team).then(tRes => {
          if (tRes?.data) {
            setTeams(prev => prev.map(t => t.id === tRes.data.id ? tRes.data : t));
          }
        }).catch(() => {});
      }

      setEditingPlayer(null);
    } catch (err) {
      console.error('Error saving player edit:', err);
      const errMsg = err?.response?.data?.error || 'خطا در ذخیره تغییرات بازیکن';
      showToast(errMsg, 'error');
    } finally {
      setIsSavingPlayerEdit(false);
    }
  };

  // Selected Squad Team Object
  const currentTeamObj = teamsMap[selectedSquadTeamId];

  return (
    <div className="space-y-6 pb-12 font-sans dir-rtl">
      
      {/* Top Header Banner */}
      <div className="glass-panel p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <ArrowRightLeft className="text-cyan-400 animate-pulse" size={26} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2 m-0 font-sport tracking-wide">
              مدیریت نقل‌وانتقالات، ترکیب تیم‌ها و تصاویر
            </h1>
            <p className="text-sm text-slate-400 mt-1 mb-0 flex items-center gap-2">
              <span>هاب کنترل ارشد: نقل و انتقال دستی، بازرسی ۱۱ نفره تیم‌ها، آپلود چهره و ویرایش کامل بازیکنان</span>
            </p>
          </div>
        </div>

        {/* Global Action Stats */}
        <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-end">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
            <div className="text-[10px] text-slate-400 font-bold">کل باشگاه‌ها</div>
            <div className="text-base font-black text-cyan-400">{teams.length} تیم</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-center">
            <div className="text-[10px] text-slate-400 font-bold">کل بازیکنان</div>
            <div className="text-base font-black text-purple-400">{allPlayers.length} نفر</div>
          </div>
          <button
            onClick={fetchInitialData}
            disabled={refreshing}
            className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 flex items-center justify-center shadow-lg"
            title="تازه‌سازی اطلاعات"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'TRANSFERS'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border-transparent'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
          }`}
        >
          <ArrowRightLeft size={17} />
          <span>۱. نقل‌وانتقالات دستی و اضطراری</span>
        </button>

        <button
          onClick={() => setActiveTab('SQUADS')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'SQUADS'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border-transparent'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
          }`}
        >
          <Users size={17} />
          <span>۲. ترکیب و لیست تیم‌ها (با برچسب خرید جدید)</span>
        </button>

        <button
          onClick={() => setActiveTab('PHOTOS')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'PHOTOS'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border-transparent'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
          }`}
        >
          <Camera size={17} />
          <span>۳. استودیو و آپلود تصویر بازیکنان</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANUAL TRANSFERS HUB */}
      {/* ========================================================================= */}
      {activeTab === 'TRANSFERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Player Selection Grid */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-white m-0 flex items-center gap-2">
                    <span>انتخاب بازیکن جهت جابجایی</span>
                    <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      {transferFilteredPlayers.length} بازیکن
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 mb-0">از لیست زیر بازیکن مورد نظر را برای انتقال دستی انتخاب نمایید.</p>
                </div>

                {/* Team Filter */}
                <select
                  value={transferSourceTeamId}
                  onChange={(e) => setTransferSourceTeamId(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">همه تیم‌ها</option>
                  <option value="free_agents">بازیکنان آزاد (بدون تیم)</option>
                  {(teams || []).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative mb-4">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام بازیکن، پست یا باشگاه..."
                  value={transferSearchQuery}
                  onChange={(e) => setTransferSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Player Selection Cards */}
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {transferFilteredPlayers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <UserX size={36} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold m-0">هیچ بازیکنی با این مشخصات یافت نشد.</p>
                  </div>
                ) : (
                  transferFilteredPlayers.map((p) => {
                    const isSelected = selectedPlayerForTransfer?.id === p.id;
                    const photo = getPlayerPhotoUrl(p);
                    const posColor = POSITION_COLORS[p.position] || 'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlayerForTransfer(p)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Face Avatar */}
                          <div className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {photo ? (
                              <img
                                src={photo}
                                alt={p.name}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Users size={20} className="text-slate-600" />
                            )}
                            {p.shirt_number && (
                              <span className="absolute bottom-0 right-0 bg-black/80 text-[9px] text-white px-1 font-mono rounded-tl font-bold">
                                #{p.shirt_number}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm tracking-wide">{p.name}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${posColor}`}>
                                {p.position}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className="text-cyan-400 font-bold">{p.team?.name || p.team_name || 'بازیکن آزاد'}</span>
                              <span>•</span>
                              <span>سن: {p.age || '۲۴'}</span>
                              <span>•</span>
                              <span>ارزش: {formatCurrency(p.market_value)}</span>
                            </div>
                          </div>
                        </div>

                        {/* OVR & Select Indicator */}
                        <div className="flex items-center gap-3">
                          <div className="text-center px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
                            <div className="text-[9px] text-slate-400 font-bold">اورال</div>
                            <div className="text-base font-black text-amber-400 font-sport">{p.overall}</div>
                          </div>

                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700 bg-slate-950/50 text-transparent'
                          }`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Transfer Configuration & Target Action */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 sticky top-4">
              <h3 className="text-base font-black text-white m-0 flex items-center gap-2 mb-4">
                <ArrowRightLeft className="text-cyan-400" size={18} />
                <span>تنظیمات انتقال و تایید نهایی</span>
              </h3>

              {/* Selected Player Preview Box */}
              {selectedPlayerForTransfer ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 mb-5 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex-shrink-0">
                      <img
                        src={getPlayerPhotoUrl(selectedPlayerForTransfer)}
                        alt={selectedPlayerForTransfer.name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-cyan-400 font-bold">بازیکن انتخابی:</div>
                      <div className="text-base font-black text-white">{selectedPlayerForTransfer.name}</div>
                      <div className="text-xs text-slate-400">
                        تیم مبدا: <strong className="text-slate-200">{selectedPlayerForTransfer.team?.name || 'بازیکن آزاد'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center mb-5 text-slate-500">
                  <Info size={28} className="mx-auto mb-1.5 opacity-40 text-cyan-400" />
                  <p className="text-xs font-bold m-0">لطفاً از لیست سمت راست، یک بازیکن را انتخاب کنید.</p>
                </div>
              )}

              {/* Form Controls */}
              <div className="space-y-4">
                {/* Destination Team Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    باشگاه مقصد (یا بازیکن آزاد):
                  </label>
                  <select
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- انتخاب تیم مقصد --</option>
                    <option value="free_agent">⚠️ آزادسازی (تبدیل به بازیکن آزاد)</option>
                    {(teams || []).map(t => {
                      const isCurrent = selectedPlayerForTransfer && (selectedPlayerForTransfer.team?.id === t.id || selectedPlayerForTransfer.team === t.id);
                      return (
                        <option key={t.id} value={t.id} disabled={isCurrent}>
                          {t.name} {isCurrent ? '(تیم فعلی)' : `(⭐ ${t.star_rating || '4.0'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Transfer Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نوع انتقال:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferType('PERMANENT')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        transferType === 'PERMANENT'
                          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      دائمی (قطعی)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferType('LOAN')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        transferType === 'LOAN'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      قرضی (Loan)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType('FREE_RELEASE');
                        setTransferFee(0);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        transferType === 'FREE_RELEASE'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      رایگان / آزاد
                    </button>
                  </div>
                </div>

                {/* Transfer Fee */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">مبلغ انتقال (دلار/یورو):</label>
                    {selectedPlayerForTransfer && (
                      <button
                        type="button"
                        onClick={() => setTransferFee(selectedPlayerForTransfer.market_value || 0)}
                        className="text-[11px] text-cyan-400 hover:underline font-bold"
                      >
                        ارزش بازار: {formatCurrency(selectedPlayerForTransfer.market_value)}
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-cyan-500"
                    placeholder="0"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">توضیحات و دلیل انتقال:</label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="مثال: اصلاح باگ سیستم یا توافق خارج از پنجره"
                  />
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlayerForPlayerValidation()) {
                      setConfirmTransferModal(true);
                    }
                  }}
                  disabled={!selectedPlayerForTransfer || !targetTeamId}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  <ArrowRightLeft size={16} />
                  <span>تایید و انتقال فوری بازیکن</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SQUADS & LINEUPS VIEWER (WITH NEW SIGNINGS HIGHLIGHT) */}
      {/* ========================================================================= */}
      {activeTab === 'SQUADS' && (
        <div className="space-y-6">
          
          {/* Team Selector Ribbon */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 className="text-sm font-black text-white m-0 flex items-center gap-2">
                <Shield className="text-cyan-400" size={16} />
                <span>انتخاب باشگاه جهت بررسی ترکیب و لیست بازیکنان:</span>
              </h3>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSquadViewMode('CARDS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    squadViewMode === 'CARDS'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  نمای کارتی
                </button>
                <button
                  onClick={() => setSquadViewMode('PITCH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    squadViewMode === 'PITCH'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  زمین تاکتیکی (۱۱ نفره)
                </button>
              </div>
            </div>

            {/* Teams Horizontal Carousel */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
              {(teams || []).map(t => {
                const isSelected = String(selectedSquadTeamId) === String(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedSquadTeamId(t.id)}
                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 flex-shrink-0 transition-all font-bold text-xs ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-cyan-400 font-bold border border-slate-800">
                      {String(t.name || 'T').slice(0, 1)}
                    </div>
                    <span>{t.name}</span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      ⭐ {t.star_rating || '4.0'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Team Overview Card */}
          {currentTeamObj && (
            <div className="glass-panel p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-4 border-cyan-500/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Shield className="text-cyan-400" size={26} />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white m-0 tracking-wide flex items-center gap-2">
                    <span>باشگاه {currentTeamObj.name}</span>
                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      قدرت ستاره: {currentTeamObj.star_rating || '4.0'} ⭐
                    </span>
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span>مربی: <strong className="text-slate-200">{currentTeamObj.manager?.username || 'تعیین نشده'}</strong></span>
                    <span>•</span>
                    <span>بودجه: <strong className="text-emerald-400">{formatCurrency(currentTeamObj.budget)}</strong></span>
                    <span>•</span>
                    <span>تعداد بازیکنان: <strong className="text-cyan-400">{currentSquad.length} نفر</strong> (از {currentTeamObj.max_squad_size || 25})</span>
                  </div>
                </div>
              </div>

              {/* Quick Filter */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSquadFilterNewOnly(!squadFilterNewOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                    squadFilterNewOnly
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>فقط خریدهای جدید ({currentSquad.filter(p => p.is_new_signing).length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Starting XI */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-white m-0 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ترکیب ۱۱ نفره اصلی (Starting XI)</span>
                <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  {starters.length} بازیکن
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(starters || [])
                .filter(p => !squadFilterNewOnly || p.is_new_signing)
                .map((player) => (
                  <PlayerCardItem
                    key={player.id}
                    player={player}
                    onEdit={() => handleOpenEditModal(player)}
                    onPhoto={() => {
                      setSelectedPlayerForPhoto(player);
                      setActiveTab('PHOTOS');
                    }}
                    onTransfer={() => {
                      setSelectedPlayerForTransfer(player);
                      setActiveTab('TRANSFERS');
                    }}
                  />
                ))}
            </div>
          </div>

          {/* Section 2: Substitutes & Reserves */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-300 m-0 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span>نیمکت‌نشینان و لیست ذخیره (Substitutes & Reserves)</span>
                <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                  {substitutes.length} بازیکن
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(substitutes || [])
                .filter(p => !squadFilterNewOnly || p.is_new_signing)
                .map((player) => (
                  <PlayerCardItem
                    key={player.id}
                    player={player}
                    onEdit={() => handleOpenEditModal(player)}
                    onPhoto={() => {
                      setSelectedPlayerForPhoto(player);
                      setActiveTab('PHOTOS');
                    }}
                    onTransfer={() => {
                      setSelectedPlayerForTransfer(player);
                      setActiveTab('TRANSFERS');
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PLAYER PHOTO STUDIO & UPLOADER */}
      {/* ========================================================================= */}
      {activeTab === 'PHOTOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Player Search & Selector */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-black text-white m-0">انتخاب بازیکن برای ویرایش عکس</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-0">بازیکن مورد نظر خود را جستجو و انتخاب کنید.</p>
                </div>

                <select
                  value={photoTeamFilter}
                  onChange={(e) => setPhotoTeamFilter(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">همه تیم‌ها</option>
                  {(teams || []).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام بازیکن..."
                  value={photoSearchQuery}
                  onChange={(e) => setPhotoSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 text-white placeholder-slate-500 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {/* Player List */}
              <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {photoFilteredPlayers.map((p) => {
                  const isSelected = selectedPlayerForPhoto?.id === p.id;
                  const photo = getPlayerPhotoUrl(p);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPlayerForPhoto(p);
                        setUploadedFile(null);
                        setPreviewUrl(null);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border-purple-500 shadow-md shadow-purple-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {photo ? (
                            <img src={photo} alt={p.name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <Users size={20} className="text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-white text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {p.team?.name || p.team_name || 'آزاد'} • OVR: {p.overall}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.custom_photo_url ? (
                          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                            عکس اختصاصی
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                            پیش‌فرض
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Upload Canvas & Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-6 sticky top-4">
              <h3 className="text-base font-black text-white m-0 flex items-center gap-2 mb-4">
                <Camera className="text-purple-400" size={18} />
                <span>استودیوی بارگذاری تصویر چهره</span>
              </h3>

              {selectedPlayerForPhoto ? (
                <div className="space-y-5">
                  {/* Visual Face Compare Preview */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Current Photo */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                      <div className="text-[11px] text-slate-400 font-bold mb-2">تصویر فعلی در سایت</div>
                      <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg">
                        <img
                          src={getPlayerPhotoUrl(selectedPlayerForPhoto)}
                          alt="Current"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="text-xs font-bold text-white mt-2 truncate">{selectedPlayerForPhoto.name}</div>
                    </div>

                    {/* New Uploaded Preview */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 text-center relative overflow-hidden">
                      <div className="text-[11px] text-purple-400 font-bold mb-2">پیش‌نمایش تصویر جدید</div>
                      <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-900 border border-purple-500/50 overflow-hidden flex items-center justify-center shadow-lg shadow-purple-500/10">
                        {previewUrl ? (
                          <img src={previewUrl} alt="New Preview" className="w-full h-full object-cover object-top" />
                        ) : (
                          <div className="text-slate-600 text-center p-2">
                            <Upload size={24} className="mx-auto mb-1 opacity-50" />
                            <span className="text-[9px] block">هنوز فایلی انتخاب نشده</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-purple-300 mt-2 truncate">
                        {uploadedFile ? uploadedFile.name : 'در انتظار انتخاب'}
                      </div>
                    </div>
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-purple-400 bg-slate-900/50 hover:bg-slate-900 transition-all text-center cursor-pointer"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".png,.jpg,.jpeg,.webp"
                      className="hidden"
                    />
                    <Upload className="mx-auto text-purple-400 mb-2" size={32} />
                    <div className="text-sm font-black text-white">برای انتخاب تصویر کلیک کنید</div>
                    <div className="text-xs text-slate-400 mt-1">فرمت‌های مجاز: PNG, JPG, WEBP (حداکثر ۵ مگابایت)</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={!uploadedFile || isUploadingPhoto}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm transition shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Camera size={16} />
                      <span>{isUploadingPhoto ? 'در حال ذخیره‌سازی...' : 'ذخیره و انتشار تصویر جدید'}</span>
                    </button>

                    {selectedPlayerForPhoto.custom_photo_url && (
                      <button
                        type="button"
                        onClick={handleResetPhoto}
                        disabled={isResettingPhoto}
                        className="py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-xs transition flex items-center gap-1.5"
                        title="حذف عکس اختصاصی و بازگشت به عکس پیش‌فرض"
                      >
                        <Trash2 size={15} />
                        <span>بازنشانی به پیش‌فرض</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500">
                  <Camera size={36} className="mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-sm font-bold m-0">لطفاً از لیست سمت راست، یک بازیکن را برای ویرایش عکس انتخاب کنید.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRM MANUAL TRANSFER MODAL (USING REACT PORTAL) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {confirmTransferModal && selectedPlayerForTransfer && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => setConfirmTransferModal(false)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-cyan-500/30 rounded-3xl w-full max-w-lg my-auto p-6 shadow-2xl shadow-cyan-500/10 text-right dir-rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                  <h3 className="text-lg font-black text-white m-0 flex items-center gap-2">
                    <ArrowRightLeft className="text-cyan-400" size={20} />
                    <span>تایید نهایی انتقال دستی</span>
                  </h3>
                  <button
                    onClick={() => setConfirmTransferModal(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">بازیکن:</span>
                      <strong className="text-white text-sm">{selectedPlayerForTransfer.name} ({selectedPlayerForTransfer.position} - {selectedPlayerForTransfer.overall})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">باشگاه مبدا:</span>
                      <strong className="text-slate-200">{selectedPlayerForTransfer.team?.name || 'بازیکن آزاد'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">باشگاه مقصد:</span>
                      <strong className="text-cyan-400 text-sm">
                        {targetTeamId === 'free_agent' ? 'بازیکن آزاد' : teamsMap[targetTeamId]?.name || 'نامشخص'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">نوع انتقال:</span>
                      <strong className="text-purple-400">
                        {transferType === 'PERMANENT' ? 'دائمی (قطعی)' : transferType === 'LOAN' ? `قرضی (${loanMatches} مسابقه)` : 'آزادسازی رایگان'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">مبلغ ثبت شده:</span>
                      <strong className="text-emerald-400">{formatCurrency(transferFee)}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-400/90 leading-relaxed m-0 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    ⚠️ توجه: با تایید، بازیکن بلافاصله به تیم مقصد منتقل شده، ستاره قدرت هر دو تیم به‌طور خودکار محاسبه و تاریخچه رسمی انتقال در سیستم ثبت می‌گردد.
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleExecuteTransfer}
                    disabled={isExecutingTransfer}
                    className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                  >
                    {isExecutingTransfer ? 'در حال انجام انتقال...' : 'بله، انتقال ثبت و اعمال شود'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmTransferModal(false)}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    انصراف
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* FULL PLAYER ATTRIBUTES EDIT MODAL (USING REACT PORTAL) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {editingPlayer && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => setEditingPlayer(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-cyan-500/30 rounded-3xl w-full max-w-2xl my-auto p-6 shadow-2xl shadow-cyan-500/10 text-right dir-rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white m-0">ویرایش کامل مشخصات بازیکن</h3>
                      <span className="text-xs text-slate-400">شناسه بازیکن: {editingPlayer.id} • تیم: {editingPlayer.team?.name || 'آزاد'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingPlayer(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSavePlayerEdit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Name */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">نام کامل بازیکن:</label>
                      <input
                        type="text"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">پست اصلی (Position):</label>
                      <select
                        value={editFormData.position || 'CF'}
                        onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      >
                        {ALL_POSITIONS.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    {/* Overall OVR */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-slate-300 font-bold">اورال فعلی (Overall):</label>
                        <span className="text-amber-400 font-black font-sport">{editFormData.overall}</span>
                      </div>
                      <input
                        type="number"
                        min="40"
                        max="110"
                        value={editFormData.overall || 80}
                        onChange={(e) => setEditFormData({ ...editFormData, overall: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Potential OVR */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">سقف پتانسیل (Potential):</label>
                      <input
                        type="number"
                        min="40"
                        max="110"
                        value={editFormData.potential_ovr || 90}
                        onChange={(e) => setEditFormData({ ...editFormData, potential_ovr: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Market Value */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">ارزش بازار (Market Value):</label>
                      <input
                        type="number"
                        value={editFormData.market_value || 1000000}
                        onChange={(e) => setEditFormData({ ...editFormData, market_value: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Age */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">سن (Age):</label>
                      <input
                        type="number"
                        min="15"
                        max="50"
                        value={editFormData.age || 24}
                        onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Wage */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">دستمزد هفتگی (Wage):</label>
                      <input
                        type="number"
                        value={editFormData.wage || 100}
                        onChange={(e) => setEditFormData({ ...editFormData, wage: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Stamina */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">استقامت مجازی (%):</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editFormData.virtual_stamina || 100}
                        onChange={(e) => setEditFormData({ ...editFormData, virtual_stamina: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Shirt Number */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">شماره پیراهن (Shirt #):</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={editFormData.shirt_number || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, shirt_number: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                        placeholder="اختیاری (مثال: 10)"
                      />
                    </div>

                    {/* Suspension matches */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">بازی‌های محرومیت:</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={editFormData.suspension_matches || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, suspension_matches: e.target.value })}
                        className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Checkbox toggles */}
                  <div className="flex items-center gap-6 pt-2 pb-1 border-t border-slate-800 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editFormData.is_starting)}
                        onChange={(e) => setEditFormData({ ...editFormData, is_starting: e.target.checked })}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-slate-200 font-bold">فیکس در ترکیب اصلی (Starting XI)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editFormData.is_injured)}
                        onChange={(e) => setEditFormData({ ...editFormData, is_injured: e.target.checked })}
                        className="rounded border-slate-700 text-rose-500 focus:ring-0"
                      />
                      <span className="text-rose-400 font-bold">مصدوم است؟</span>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={isSavingPlayerEdit}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      <span>{isSavingPlayerEdit ? 'در حال ذخیره...' : 'ذخیره تغییرات مشخصات'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPlayer(null)}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                    >
                      انصراف
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

/**
 * Player Card Component used in Squad Viewer Tab
 */
function PlayerCardItem({ player, onEdit, onPhoto, onTransfer }) {
  const photo = getPlayerPhotoUrl(player);
  const posColor = POSITION_COLORS[player.position] || 'bg-slate-800 text-slate-300 border-slate-700';
  const isNew = Boolean(player.is_new_signing);

  return (
    <div className="glass-panel p-4 bg-slate-900/80 hover:bg-slate-850 border-slate-800/80 hover:border-cyan-500/40 transition-all rounded-2xl relative overflow-hidden group shadow-lg">
      
      {/* New Signing Banner / Badge */}
      {isNew && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
          <Sparkles size={11} className="text-amber-400 animate-spin" />
          <span>خرید جدید</span>
        </div>
      )}

      {/* Card Header & Photo */}
      <div className="flex items-start gap-3">
        <div className="relative w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {photo ? (
            <img
              src={photo}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <Users size={24} className="text-slate-600" />
          )}
          {player.shirt_number && (
            <span className="absolute bottom-0 right-0 bg-black/85 text-[9px] text-white px-1 font-mono rounded-tl font-bold">
              #{player.shirt_number}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white text-sm truncate tracking-wide">{player.name}</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${posColor}`}>
              {player.position}
            </span>
            <span className="text-xs text-amber-400 font-black font-sport">
              OVR {player.overall}
            </span>
            {player.is_injured && (
              <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 py-0.5 rounded border border-rose-500/30">
                مصدوم
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 mt-1 truncate">
            ارزش: <strong className="text-slate-200">{formatCurrency(player.market_value)}</strong>
          </div>
        </div>
      </div>

      {/* Transfer info if new signing */}
      {isNew && player.last_transfer && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
          <span>از: <strong className="text-cyan-400">{player.last_transfer.seller_team_name}</strong></span>
          <span>مبلغ: <strong className="text-emerald-400">{formatCurrency(player.last_transfer.fee)}</strong></span>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
        <button
          onClick={onEdit}
          className="py-1.5 px-1 bg-slate-950 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg text-[10px] font-bold border border-slate-800 transition flex items-center justify-center gap-1"
          title="ویرایش مشخصات کامل"
        >
          <Edit3 size={12} />
          <span>مشخصات</span>
        </button>

        <button
          onClick={onPhoto}
          className="py-1.5 px-1 bg-slate-950 hover:bg-purple-500/20 text-slate-300 hover:text-purple-400 rounded-lg text-[10px] font-bold border border-slate-800 transition flex items-center justify-center gap-1"
          title="آپلود تصویر"
        >
          <Camera size={12} />
          <span>عکس</span>
        </button>

        <button
          onClick={onTransfer}
          className="py-1.5 px-1 bg-slate-950 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400 rounded-lg text-[10px] font-bold border border-slate-800 transition flex items-center justify-center gap-1"
          title="انتقال به تیم دیگر"
        >
          <ArrowRightLeft size={12} />
          <span>انتقال</span>
        </button>
      </div>
    </div>
  );
}
