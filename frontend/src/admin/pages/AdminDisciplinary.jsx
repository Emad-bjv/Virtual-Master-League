import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Gavel, AlertTriangle, ShieldAlert, DollarSign,
  Gem, Trophy, Ban, CheckCircle2, XCircle, Search, Filter,
  RefreshCw, Calendar, Clock, AlertCircle, Sparkles, Send,
  RotateCcw, ChevronDown, Check, Info, FileText, ChevronLeft,
  Users, ArrowRight, ShieldCheck
} from 'lucide-react';
import { disciplinaryApi } from '../../services/api';
import { useToast } from '../components/Toast';

// Formats USD currency nicely
const formatUSD = (val) => {
  const num = Number(val || 0);
  return `$${num.toLocaleString('en-US')}`;
};

// Formats Jalali/Persian date nicely
const formatDateFa = (isoDate) => {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(isoDate);
  }
};

const SEVERITY_MAP = {
  LOW: { label: 'سبک', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' },
  MEDIUM: { label: 'متوسط', color: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
  HIGH: { label: 'سنگین', color: 'text-orange-400 bg-orange-950/40 border-orange-500/30' },
  CRITICAL: { label: 'بحرانی', color: 'text-rose-400 bg-rose-950/40 border-rose-500/30' },
  INFO: { label: 'سفارشی', color: 'text-purple-400 bg-purple-950/40 border-purple-500/30' },
};

export default function AdminDisciplinary() {
  const { showToast } = useToast();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('RECORDS'); // 'RECORDS' | 'ISSUE' | 'CLUBS'

  // Overview data
  const [overview, setOverview] = useState({
    stats: {
      total_penalties: 0,
      active_penalties: 0,
      total_fines_usd: 0,
      total_fines_gems: 0,
      total_points_deducted: 0,
      active_transfer_bans: 0,
    },
    standard_violations: [],
    teams: [],
    tournaments: [],
  });
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Records data & filters
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'REVOKED'
  const [violationFilter, setViolationFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Issue Penalty Form State
  const initialFormState = {
    team_id: '',
    violation_type: 'MATCH_DELAY',
    title: '',
    reason: '',
    fine_budget_usd: 50000,
    fine_gems: 0,
    tournament_id: '',
    points_deduction: 0,
    has_transfer_ban: false,
    ban_mode: 'DAYS', // 'DAYS' | 'DATE'
    transfer_ban_days: 0,
    transfer_ban_until: '',
    is_warning: false,
    publish_to_newsroom: true,
  };
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  // Revoke Modal State
  const [selectedPenaltyForRevoke, setSelectedPenaltyForRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Detail Modal State
  const [detailPenalty, setDetailPenalty] = useState(null);

  // Load Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      const res = await disciplinaryApi.getOverview();
      setOverview(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در دریافت اطلاعات آماری کمیته انضباطی', 'error');
    } finally {
      setLoadingOverview(false);
    }
  }, [showToast]);

  // Load Penalty Records
  const fetchRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (violationFilter !== 'ALL') params.violation_type = violationFilter;
      if (teamFilter !== 'ALL') params.team_id = teamFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await disciplinaryApi.getRecords(params);
      setRecords(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در بارگذاری احکام انضباطی', 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [statusFilter, violationFilter, teamFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchOverview();
    fetchRecords();
  }, [fetchOverview, fetchRecords]);

  // Handle applying a standard template
  const handleSelectTemplate = (template) => {
    setFormData((prev) => ({
      ...prev,
      violation_type: template.code,
      title: template.title,
      reason: template.description,
      fine_budget_usd: template.default_fine_usd,
      fine_gems: template.default_fine_gems,
      points_deduction: template.default_points,
      has_transfer_ban: template.default_ban_days > 0,
      transfer_ban_days: template.default_ban_days,
      ban_mode: 'DAYS',
      transfer_ban_until: '',
    }));
    showToast(`قالب تخلف «${template.title}» اعمال شد`, 'info');
  };

  // Quick Days Preset for Transfer Ban
  const handleSetBanDays = (days) => {
    setFormData((prev) => ({
      ...prev,
      has_transfer_ban: true,
      ban_mode: 'DAYS',
      transfer_ban_days: days,
      transfer_ban_until: '',
    }));
  };

  // Submit Issue Penalty Form
  const handleSubmitPenalty = async (e) => {
    e.preventDefault();
    if (!formData.team_id) {
      showToast('لطفاً تیم متخلف را انتخاب کنید.', 'warning');
      return;
    }
    if (!formData.title.trim()) {
      showToast('عنوان حکم انضباطی الزامی است.', 'warning');
      return;
    }
    if (!formData.reason.trim()) {
      showToast('شرح و دلایل حکم الزامی است.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        team_id: parseInt(formData.team_id, 10),
        violation_type: formData.violation_type,
        title: formData.title.trim(),
        reason: formData.reason.trim(),
        fine_budget_usd: parseFloat(formData.fine_budget_usd) || 0,
        fine_gems: parseInt(formData.fine_gems, 10) || 0,
        tournament_id: formData.tournament_id ? parseInt(formData.tournament_id, 10) : null,
        points_deduction: parseInt(formData.points_deduction, 10) || 0,
        transfer_ban_days: formData.has_transfer_ban && formData.ban_mode === 'DAYS' ? parseInt(formData.transfer_ban_days, 10) || 0 : 0,
        transfer_ban_until: formData.has_transfer_ban && formData.ban_mode === 'DATE' && formData.transfer_ban_until ? formData.transfer_ban_until : null,
        is_warning: formData.is_warning,
        publish_to_newsroom: formData.publish_to_newsroom,
      };

      await disciplinaryApi.issuePenalty(payload);
      showToast('حکم انضباطی با موفقیت صادر و بر روی باشگاه اعمال شد.', 'success');
      
      // Reset form and switch to records view
      setFormData(initialFormState);
      setActiveTab('RECORDS');
      fetchOverview();
      fetchRecords();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در صدور حکم انضباطی', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Revoke / Pardon
  const handleConfirmRevoke = async () => {
    if (!selectedPenaltyForRevoke) return;
    try {
      setRevoking(true);
      await disciplinaryApi.revokePenalty(selectedPenaltyForRevoke.id, {
        reason: revokeReason.trim(),
      });
      showToast(`حکم #${selectedPenaltyForRevoke.id} بخشیده شد و جرایم مسترد گردیدند.`, 'success');
      setSelectedPenaltyForRevoke(null);
      setRevokeReason('');
      fetchOverview();
      fetchRecords();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در لغو حکم انضباطی', 'error');
    } finally {
      setRevoking(false);
    }
  };

  // Filtered Clubs for Clubs Tab
  const clubsWithStatus = useMemo(() => {
    return (overview?.teams || []).map((team) => {
      const activeClubPenalties = (records || []).filter(
        (r) => (String(r?.team) === String(team?.id) || String(r?.team?.id) === String(team?.id)) && r?.status === 'ACTIVE'
      );
      return {
        ...team,
        active_penalties_count: activeClubPenalties.length,
      };
    });
  }, [overview?.teams, records]);

  return (
    <div className="space-y-6 text-slate-100 font-sans dir-rtl" style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/50 p-6 md:p-8 border border-amber-500/20 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <Scale className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">کمیته انضباطی و جرایم</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  VML DISCIPLINARY
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                نظارت و اعمال انواع جریمه‌های مالی، کسر امتیاز لیگ، تعلیق و محرومیت‌های نقل‌وانتقالاتی باشگاه‌های متخلف
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                fetchOverview();
                fetchRecords();
                showToast('آمار بروزرسانی شد', 'info');
              }}
              disabled={loadingOverview || loadingRecords}
              className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
              title="بروزرسانی داده‌ها"
            >
              <RefreshCw size={18} className={loadingOverview || loadingRecords ? 'animate-spin text-amber-400' : ''} />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ISSUE')}
              className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Gavel size={18} />
              <span>صدور حکم انضباطی</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('RECORDS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'RECORDS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <FileText size={15} />
            <span>سوابق و احکام صادرشده</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {overview.stats?.total_penalties || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ISSUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ISSUE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Gavel size={15} />
            <span>فرم صدور حکم جدید</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CLUBS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CLUBS'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Users size={15} />
            <span>وضعیت انضباطی باشگاه‌ها</span>
            {overview.stats?.active_transfer_bans > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px]">
                {overview.stats.active_transfer_bans} محروم
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">کل احکام صادره</span>
            <Gavel size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {overview.stats?.total_penalties || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">پرونده انضباطی در دیتابیس</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">احکام فعال جاری</span>
            <ShieldAlert size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {overview.stats?.active_penalties || 0}
          </div>
          <div className="text-[11px] text-rose-400/70 mt-1">اعمال‌شده روی تیم‌ها</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">مجموع جریمه‌های دلاری</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {formatUSD(overview.stats?.total_fines_usd || 0)}
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">کسر از بودجه باشگاه‌ها</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">کسر امتیاز جدول</span>
            <Trophy size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-2">
            {overview.stats?.total_points_deducted || 0}{' '}
            <span className="text-xs font-bold text-slate-400">امتیاز</span>
          </div>
          <div className="text-[11px] text-purple-400/70 mt-1">کسر از جدول رده‌بندی</div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">محرومیت نقل‌وانتقالات</span>
            <Ban size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {overview.stats?.active_transfer_bans || 0}{' '}
            <span className="text-xs font-bold text-slate-400">باشگاه</span>
          </div>
          <div className="text-[11px] text-rose-400/70 mt-1">ممنوع‌الفعالیت در مارکت</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RECORDS & SANCTION HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'RECORDS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در عنوان، شرح یا نام تیم..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'ACTIVE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  فعال
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('REVOKED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === 'REVOKED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  بخشیده‌شده
                </button>
              </div>

              {/* Team Filter Dropdown */}
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="ALL">همه باشگاه‌ها</option>
                {(overview.teams || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Records List / Grid */}
          {loadingRecords ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-slate-400 font-bold">در حال فراخوانی سوابق انضباطی...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
              <Scale size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">هیچ حکم انضباطی مطابق با فیلتر یافت نشد</h3>
              <p className="text-xs text-slate-500 mt-1">می‌توانید با دکمه صدور حکم جدید، یک پرونده انضباطی جدید ثبت کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.map((penalty) => {
                const isActive = penalty.status === 'ACTIVE';
                const hasBan = penalty.transfer_ban_until && new Date(penalty.transfer_ban_until) > new Date();

                return (
                  <motion.div
                    key={penalty.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl p-5 border transition-all ${
                      isActive
                        ? 'bg-slate-900/80 border-slate-800 hover:border-amber-500/40 shadow-lg'
                        : 'bg-slate-950/60 border-slate-900 opacity-80'
                    }`}
                  >
                    {/* Top Row: Team + Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {penalty.team_logo ? (
                          <img
                            src={penalty.team_logo}
                            alt={penalty.team_name}
                            className="w-10 h-10 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm text-slate-400 shrink-0">
                            {penalty.team_name?.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-black text-white m-0 flex items-center gap-2">
                            <span>{penalty.team_name}</span>
                            <span className="text-[11px] font-normal text-slate-400">حکم #{penalty.id}</span>
                          </h4>
                          <span className="text-xs text-amber-400 font-bold">
                            {penalty.violation_type_display || penalty.violation_type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive ? (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            فعال
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            بخشیده‌شده
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Penalty Title & Summary */}
                    <div className="mb-3">
                      <div className="text-sm font-bold text-slate-200">{penalty.title}</div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {penalty.reason}
                      </p>
                    </div>

                    {/* Sanction Badges Package */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      {penalty.fine_budget_usd > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                          <DollarSign size={12} />
                          {formatUSD(penalty.fine_budget_usd)} جریمه نقدی
                        </span>
                      )}

                      {penalty.fine_gems > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1">
                          <Gem size={12} />
                          {penalty.fine_gems} جم
                        </span>
                      )}

                      {penalty.points_deduction > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-400 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1">
                          <Trophy size={12} />
                          کسر {penalty.points_deduction} امتیاز
                        </span>
                      )}

                      {penalty.transfer_ban_until && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
                          <Ban size={12} />
                          محرومیت تا {formatDateFa(penalty.transfer_ban_until)}
                        </span>
                      )}

                      {penalty.is_warning && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/50 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                          <AlertTriangle size={12} />
                          اخطار رسمی کتبی
                        </span>
                      )}
                    </div>

                    {/* Revoked Info or Action Buttons */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                      <div className="text-[11px] text-slate-500">
                        تاریخ صدور: {formatDateFa(penalty.created_at)}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailPenalty(penalty)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                        >
                          جزئیات
                        </button>

                        {isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPenaltyForRevoke(penalty);
                              setRevokeReason('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <RotateCcw size={13} />
                            <span>لغو / بخشش حکم</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ISSUE NEW PENALTY FORM */}
      {/* ========================================================================= */}
      {activeTab === 'ISSUE' && (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Gavel size={22} className="text-amber-400" />
              <span>صدور حکم انضباطی جدید</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ثبت جریمه برای باشگاه متخلف. تمامی مبالغ، امتیازات و محرومیت‌ها به صورت آنی در سیستم اعمال خواهند شد.
            </p>
          </div>

          {/* Quick Violation Templates Catalog */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span>کاتالوگ تخلفات استاندارد (انتخاب سریع مقادیر پیشنهادی):</span>
              </label>
              <span className="text-[11px] text-slate-500">برای تنظیم سریع مقادیر روی یکی از گزینه‌ها کلیک کنید</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {(overview.standard_violations || []).map((template) => {
                const sev = SEVERITY_MAP[template.severity] || SEVERITY_MAP.INFO;
                const isSelected = formData.violation_type === template.code;

                return (
                  <button
                    key={template.code}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold ${sev.color}`}>
                          {sev.label}
                        </span>
                        {isSelected && <Check size={14} className="text-amber-400" />}
                      </div>
                      <div className="text-xs font-black text-slate-200 line-clamp-1">{template.title}</div>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-2 space-y-0.5">
                      {template.default_fine_usd > 0 && <div>جریمه: {formatUSD(template.default_fine_usd)}</div>}
                      {template.default_points > 0 && <div>کسر امتیاز: {template.default_points}</div>}
                      {template.default_ban_days > 0 && <div>محرومیت: {template.default_ban_days} روز</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmitPenalty} className="space-y-6 pt-4 border-t border-slate-800">
            {/* Target Club Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  باشگاه متخلف <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">-- انتخاب باشگاه --</option>
                  {(overview.teams || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (بودجه: {formatUSD(t.budget)} {t.is_transfer_banned ? ' | دارای محرومیت' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نوع تخلف <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.violation_type}
                  onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
                >
                  {(overview.standard_violations || []).map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Penalty Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  عنوان حکم انضباطی <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: کسر ۳ امتیاز و جریمه نقدی به دلیل تاخیر در حضور در مسابقه هفته ۵"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  شرح تخلف و مستندات رای کمیته انضباطی <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="دلایل صدور حکم، استناد به بندهای آیین‌نامه و گزارش ناظر مسابقه را درج نمایید..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-amber-500/50 leading-relaxed"
                />
              </div>
            </div>

            {/* Sanctions Controls Section */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <Scale size={16} />
                <span>پکیج تنبیهی و احکام قابل اعمال:</span>
              </h3>

              {/* 1. Financial USD Fine */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span>مبلغ جریمه نقدی ($ دلار):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.fine_budget_usd}
                    onChange={(e) => setFormData({ ...formData, fine_budget_usd: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10000, 50000, 100000, 250000, 500000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormData({ ...formData, fine_budget_usd: amt })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-all cursor-pointer"
                      >
                        {formatUSD(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Gems Fine */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Gem size={14} className="text-cyan-400" />
                    <span>جریمه جم (الماس):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData.fine_gems}
                    onChange={(e) => setFormData({ ...formData, fine_gems: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-cyan-400 font-bold font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0, 50, 100, 200, 500].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, fine_gems: g })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-all cursor-pointer"
                      >
                        {g} جم
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Points Deduction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-3 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Trophy size={14} className="text-purple-400" />
                    <span>تورنمنت مربوطه برای کسر امتیاز:</span>
                  </label>
                  <select
                    value={formData.tournament_id}
                    onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">-- بدون کسر امتیاز از جدول --</option>
                    {(overview.tournaments || []).map((tour) => (
                      <option key={tour.id} value={tour.id}>
                        {tour.name} ({tour.tournament_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    تعداد امتیازات کسر شونده:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.points_deduction}
                    onChange={(e) => setFormData({ ...formData, points_deduction: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-purple-400 font-bold font-mono focus:outline-none focus:border-purple-500/50"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0, 1, 3, 6, 9].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setFormData({ ...formData, points_deduction: pts })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold transition-all cursor-pointer"
                      >
                        {pts} امتیاز
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Transfer Ban (Duration completely customizable by Admin as requested!) */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.has_transfer_ban}
                      onChange={(e) => setFormData({ ...formData, has_transfer_ban: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                    />
                    <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                      <Ban size={15} />
                      <span>اعمال محرومیت از نقل‌وانتقالات (خرید و معامله بازیکن)</span>
                    </span>
                  </label>

                  {formData.has_transfer_ban && (
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ban_mode: 'DAYS' })}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          formData.ban_mode === 'DAYS' ? 'bg-rose-500/30 text-rose-200' : 'text-slate-400'
                        }`}
                      >
                        تنظیم بر اساس روز
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, ban_mode: 'DATE' })}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                          formData.ban_mode === 'DATE' ? 'bg-rose-500/30 text-rose-200' : 'text-slate-400'
                        }`}
                      >
                        انتخاب تاریخ دقیق
                      </button>
                    </div>
                  )}
                </div>

                {formData.has_transfer_ban && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3"
                  >
                    {formData.ban_mode === 'DAYS' ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-rose-200 font-bold">مدت محرومیت به روز:</span>
                          <span className="text-xs text-rose-400 font-mono font-black">{formData.transfer_ban_days} روز</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={formData.transfer_ban_days}
                          onChange={(e) => setFormData({ ...formData, transfer_ban_days: e.target.value })}
                          className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-rose-300 font-bold font-mono focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5 mt-2">
                          {[3, 7, 14, 30, 60, 90].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleSetBanDays(d)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 text-[10px] font-bold border border-rose-500/30 transition-all cursor-pointer"
                            >
                              {d} روز
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs text-rose-200 font-bold mb-1.5">
                          محرومیت تا تاریخ و ساعت مشخص:
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.transfer_ban_until}
                          onChange={(e) => setFormData({ ...formData, transfer_ban_until: e.target.value })}
                          className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-rose-300 font-bold focus:outline-none"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* 5. Warning & Publishing Checkboxes */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.is_warning}
                    onChange={(e) => setFormData({ ...formData, is_warning: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-300">
                    درج اخطار رسمی کتبی در پرونده باشگاه
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.publish_to_newsroom}
                    onChange={(e) => setFormData({ ...formData, publish_to_newsroom: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-500"
                  />
                  <span className="text-xs font-bold text-slate-300">
                    انتشار بیانیه رسمی حکم در اتاق خبر و رسانه لیگ
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFormData(initialFormState)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                بازنشانی فرم
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>در حال ثبت و اعمال حکم...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>ثبت و اجرای فوری حکم انضباطی</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CLUBS SANCTION STATUS */}
      {/* ========================================================================= */}
      {activeTab === 'CLUBS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubsWithStatus.map((team) => {
              const isBanned = team.is_transfer_banned;

              return (
                <div
                  key={team.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isBanned
                      ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-10 h-10 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm text-slate-400 shrink-0">
                          {team.name?.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-black text-white m-0">{team.name}</h4>
                        <span className="text-[11px] text-slate-400">شناسه باشگاه: #{team.id}</span>
                      </div>
                    </div>

                    {isBanned ? (
                      <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black flex items-center gap-1">
                        <Ban size={12} />
                        محروم از نقل‌وانتقالات
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        وضعیت عادی
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">موجودی بودجه:</span>
                      <span className={`font-black font-mono ${team.budget < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatUSD(team.budget)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">جم‌ها:</span>
                      <span className="font-black text-cyan-400 font-mono">{team.gems || 0} 💎</span>
                    </div>
                  </div>

                  {isBanned && team.transfer_ban_until && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300 mb-3 flex items-center gap-2">
                      <Clock size={14} className="text-rose-400 shrink-0" />
                      <span>پایان محرومیت: {formatDateFa(team.transfer_ban_until)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      احکام فعال: <span className="font-bold text-white">{team.active_penalties_count}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, team_id: team.id }));
                        setActiveTab('ISSUE');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Gavel size={13} />
                      <span>ثبت جریمه</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVOKE / PARDON CONFIRMATION MODAL (Using Mandatory React Portal) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedPenaltyForRevoke && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => setSelectedPenaltyForRevoke(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg my-auto p-6 shadow-2xl text-slate-100 dir-rtl"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <RotateCcw size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white m-0">عفو و لغو حکم انضباطی</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      پرونده #{selectedPenaltyForRevoke.id} - باشگاه {selectedPenaltyForRevoke.team_name}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2 mb-4 text-xs">
                  <div className="text-slate-300 font-bold">{selectedPenaltyForRevoke.title}</div>
                  <div className="text-[11px] text-slate-400">
                    با تایید این عملیات، اقدامات زیر به صورت خودکار انجام خواهند شد:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {selectedPenaltyForRevoke.fine_budget_usd > 0 && (
                      <li className="text-emerald-400 font-bold">
                        استرداد {formatUSD(selectedPenaltyForRevoke.fine_budget_usd)} به موجودی تیم
                      </li>
                    )}
                    {selectedPenaltyForRevoke.fine_gems > 0 && (
                      <li className="text-cyan-400 font-bold">
                        استرداد {selectedPenaltyForRevoke.fine_gems} جم
                      </li>
                    )}
                    {selectedPenaltyForRevoke.points_deduction > 0 && (
                      <li className="text-purple-400 font-bold">
                        بازگرداندن {selectedPenaltyForRevoke.points_deduction} امتیاز کسر شده به جدول لیگ
                      </li>
                    )}
                    {selectedPenaltyForRevoke.transfer_ban_until && (
                      <li className="text-rose-400 font-bold">
                        لغو محرومیت نقل‌وانتقالات این حکم
                      </li>
                    )}
                  </ul>
                </div>

                <div className="space-y-1.5 mb-5">
                  <label className="text-xs font-bold text-slate-300">
                    علت لغو یا عفو حکم (اختیاری):
                  </label>
                  <textarea
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="مثال: عفو به مناسبت اعیاد یا پذیرش فرجام‌خواهی باشگاه..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPenaltyForRevoke(null)}
                    disabled={revoking}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    انصراف
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmRevoke}
                    disabled={revoking}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {revoking ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>در حال پردازش استرداد...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} />
                        <span>تایید و استرداد کامل جریمه‌ها</span>
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

      {/* ========================================================================= */}
      {/* PENALTY DETAILS MODAL (Using Mandatory React Portal) */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {detailPenalty && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div className="fixed inset-0" onClick={() => setDetailPenalty(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg my-auto p-6 shadow-2xl text-slate-100 dir-rtl"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {detailPenalty.team_logo && (
                      <img
                        src={detailPenalty.team_logo}
                        alt={detailPenalty.team_name}
                        className="w-12 h-12 object-contain rounded-2xl bg-slate-900 p-1 border border-slate-800"
                      />
                    )}
                    <div>
                      <h3 className="text-base font-black text-white m-0">{detailPenalty.team_name}</h3>
                      <div className="text-xs text-amber-400 font-bold">{detailPenalty.violation_type_display}</div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                    detailPenalty.status === 'ACTIVE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {detailPenalty.status_display}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] mb-1">عنوان حکم:</span>
                    <span className="font-bold text-white text-sm">{detailPenalty.title}</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] mb-1">شرح کامل تخلف و دلایل حکم:</span>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{detailPenalty.reason}</p>
                  </div>

                  {detailPenalty.status === 'REVOKED' && (
                    <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-emerald-400 font-bold block mb-1">اطلاعات بخشش و لغو حکم:</span>
                      <div className="text-emerald-200/80 text-[11px]">
                        تاریخ لغو: {formatDateFa(detailPenalty.revoked_at)}
                      </div>
                      <div className="text-emerald-200/80 text-[11px] mt-0.5">
                        علت لغو: {detailPenalty.revoke_reason || 'عفو مدیریت'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDetailPenalty(null)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    بستن
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
