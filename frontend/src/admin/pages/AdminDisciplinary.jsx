import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, Gavel, AlertTriangle, ShieldAlert, DollarSign,
  Gem, Trophy, Ban, CheckCircle2, XCircle, Search, Filter,
  RefreshCw, Calendar, Clock, AlertCircle, Sparkles, Send,
  RotateCcw, ChevronDown, Check, Info, FileText, ChevronLeft,
  Users, ArrowRight, ShieldCheck, Copy, Share2, Eye, ScrollText,
  Bookmark, Edit3
} from 'lucide-react';
import { disciplinaryApi } from '../../services/api';
import { useToast } from '../components/Toast';
import {
  generateDisciplinaryVerdict,
  formatVerdictForTelegram,
  getViolationVariantsCount,
  formatPersianDate,
  getViolationDefaultReason,
  getViolationQuickChips
} from '../../utils/disciplinaryTemplates';

// Bulletproof Clipboard copy utility with fallback for non-secure / LAN contexts
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
  const [activeTab, setActiveTab] = useState('RECORDS'); // 'RECORDS' | 'VERDICTS' | 'ISSUE' | 'CLUBS'

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
    reason: getViolationDefaultReason('MATCH_DELAY', 0),
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
    case_number: '',
    official_verdict_text: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  // Smart Legal Engine Variant & Copy states
  const [variantIndex, setVariantIndex] = useState(0);
  const [copiedTelegramId, setCopiedTelegramId] = useState(null);

  // Full Court Ruling Modal State
  const [fullVerdictModalPenalty, setFullVerdictModalPenalty] = useState(null);

  // Revoke Modal State
  const [selectedPenaltyForRevoke, setSelectedPenaltyForRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // Detail Modal State
  const [detailPenalty, setDetailPenalty] = useState(null);

  // Edit Modal State
  const [selectedPenaltyForEdit, setSelectedPenaltyForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editingPenalty, setEditingPenalty] = useState(false);

  // Selected team & tournament helpers
  const selectedTeam = useMemo(() => {
    return (overview.teams || []).find((t) => String(t.id) === String(formData.team_id));
  }, [overview.teams, formData.team_id]);

  const selectedTournament = useMemo(() => {
    return (overview.tournaments || []).find((t) => String(t.id) === String(formData.tournament_id));
  }, [overview.tournaments, formData.tournament_id]);

  // Live Smart Disciplinary Verdict Generator
  const currentGeneratedVerdict = useMemo(() => {
    return generateDisciplinaryVerdict({
      violationType: formData.violation_type,
      teamName: selectedTeam ? selectedTeam.name : 'باشگاه مربوطه',
      tournamentName: selectedTournament ? selectedTournament.name : null,
      title: formData.title,
      reason: formData.reason,
      fineBudgetUsd: formData.fine_budget_usd,
      fineGems: formData.fine_gems,
      pointsDeduction: formData.points_deduction,
      transferBanDays: formData.has_transfer_ban && formData.ban_mode === 'DAYS' ? formData.transfer_ban_days : 0,
      transferBanUntil: formData.has_transfer_ban && formData.ban_mode === 'DATE' ? formData.transfer_ban_until : null,
      isWarning: formData.is_warning,
      variantIndex,
      caseNumber: formData.case_number,
    });
  }, [
    formData.violation_type,
    selectedTeam,
    selectedTournament,
    formData.title,
    formData.reason,
    formData.fine_budget_usd,
    formData.fine_gems,
    formData.points_deduction,
    formData.has_transfer_ban,
    formData.ban_mode,
    formData.transfer_ban_days,
    formData.transfer_ban_until,
    formData.is_warning,
    variantIndex,
    formData.case_number,
  ]);

  // Handle cycling through non-repetitive judicial drafts
  const handleCycleVariant = () => {
    const totalVariants = getViolationVariantsCount(formData.violation_type);
    const nextIndex = (variantIndex + 1) % totalVariants;
    setVariantIndex(nextIndex);

    const nextReason = getViolationDefaultReason(formData.violation_type, nextIndex) || formData.reason;

    const newVerdict = generateDisciplinaryVerdict({
      violationType: formData.violation_type,
      teamName: selectedTeam ? selectedTeam.name : 'باشگاه مربوطه',
      tournamentName: selectedTournament ? selectedTournament.name : null,
      title: '', // will pick template title
      reason: nextReason,
      fineBudgetUsd: formData.fine_budget_usd,
      fineGems: formData.fine_gems,
      pointsDeduction: formData.points_deduction,
      transferBanDays: formData.has_transfer_ban && formData.ban_mode === 'DAYS' ? formData.transfer_ban_days : 0,
      transferBanUntil: formData.has_transfer_ban && formData.ban_mode === 'DATE' ? formData.transfer_ban_until : null,
      isWarning: formData.is_warning,
      variantIndex: nextIndex,
      caseNumber: formData.case_number,
    });

    setFormData((prev) => ({
      ...prev,
      title: newVerdict.title,
      reason: nextReason,
      official_verdict_text: newVerdict.fullVerdictText,
    }));
    showToast(`نگارش دادنامه تغییر کرد (قالب حقوقی ${nextIndex + 1} از ${totalVariants})`, 'info');
  };

  // Copy Telegram Post for an existing penalty
  const handleCopyTelegramVerdict = async (penalty, e) => {
    if (e) e.stopPropagation();
    const text = formatVerdictForTelegram({
      caseNumber: penalty.case_number || `VML-JD-${penalty.id}`,
      teamName: penalty.team_name,
      title: penalty.title,
      reason: penalty.reason,
      fineBudgetUsd: penalty.fine_budget_usd,
      fineGems: penalty.fine_gems,
      pointsDeduction: penalty.points_deduction,
      transferBanUntil: penalty.transfer_ban_until,
      transferBanDays: penalty.transfer_ban_days,
      isWarning: penalty.is_warning,
      tournamentName: penalty.tournament_name,
      officialVerdictText: penalty.official_verdict_text,
    });

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedTelegramId(penalty.id);
      showToast('متن رسمی دادنامه به فرمت تلگرام کپی شد! 📋', 'success');
      setTimeout(() => setCopiedTelegramId(null), 2500);
    } else {
      showToast('خطا در کپی متن!', 'error');
    }
  };

  // Copy Draft Telegram Post directly from Issue Form
  const handleCopyDraftTelegram = async () => {
    const text = formatVerdictForTelegram({
      caseNumber: formData.case_number || currentGeneratedVerdict.caseNumber,
      teamName: selectedTeam?.name || 'باشگاه مربوطه',
      title: formData.title || currentGeneratedVerdict.title,
      reason: formData.reason,
      fineBudgetUsd: formData.fine_budget_usd,
      fineGems: formData.fine_gems,
      pointsDeduction: formData.points_deduction,
      transferBanUntil: formData.has_transfer_ban && formData.ban_mode === 'DATE' ? formData.transfer_ban_until : null,
      transferBanDays: formData.has_transfer_ban && formData.ban_mode === 'DAYS' ? formData.transfer_ban_days : 0,
      isWarning: formData.is_warning,
      tournamentName: selectedTournament?.name,
      officialVerdictText: formData.official_verdict_text || currentGeneratedVerdict.fullVerdictText,
    });

    const success = await copyToClipboard(text);
    if (success) {
      showToast('پیش‌نویس متن دادنامه برای تلگرام کپی شد! 📋', 'success');
    } else {
      showToast('خطا در کپی متن!', 'error');
    }
  };

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
    const autoReason = getViolationDefaultReason(template.code, 0) || template.description;
    const newVerdict = generateDisciplinaryVerdict({
      violationType: template.code,
      teamName: selectedTeam ? selectedTeam.name : 'باشگاه مربوطه',
      tournamentName: selectedTournament ? selectedTournament.name : null,
      title: template.title,
      reason: autoReason,
      fineBudgetUsd: template.default_fine_usd,
      fineGems: template.default_fine_gems,
      pointsDeduction: template.default_points,
      transferBanDays: template.default_ban_days,
      isWarning: false,
      variantIndex: 0,
    });

    setFormData((prev) => ({
      ...prev,
      violation_type: template.code,
      title: template.title,
      reason: autoReason,
      fine_budget_usd: template.default_fine_usd,
      fine_gems: template.default_fine_gems,
      points_deduction: template.default_points,
      has_transfer_ban: template.default_ban_days > 0,
      transfer_ban_days: template.default_ban_days,
      ban_mode: 'DAYS',
      transfer_ban_until: '',
      official_verdict_text: newVerdict.fullVerdictText,
    }));
    setVariantIndex(0);
    showToast(`قالب تخلف «${template.title}» و دادنامه رسمی اعمال شد`, 'info');
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
      const verdictText = (formData.official_verdict_text || currentGeneratedVerdict.fullVerdictText).trim();
      const caseNum = (formData.case_number || currentGeneratedVerdict.caseNumber).trim();

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
        case_number: caseNum,
        official_verdict_text: verdictText,
      };

      await disciplinaryApi.issuePenalty(payload);
      showToast('حکم و دادنامه انضباطی با موفقیت صادر و ابلاغ شد.', 'success');
      
      // Reset form and switch to verdicts view
      setFormData(initialFormState);
      setActiveTab('VERDICTS');
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

  // Open Edit Modal with populated form
  const handleOpenEditModal = (penalty, e) => {
    if (e) e.stopPropagation();
    setSelectedPenaltyForEdit(penalty);
    setEditFormData({
      title: penalty.title || '',
      reason: penalty.reason || '',
      violation_type: penalty.violation_type || 'CUSTOM',
      fine_budget_usd: penalty.fine_budget_usd || 0,
      fine_gems: penalty.fine_gems || 0,
      points_deduction: penalty.points_deduction || 0,
      has_transfer_ban: Boolean(penalty.transfer_ban_until || penalty.transfer_ban_days > 0),
      ban_mode: penalty.transfer_ban_until ? 'DATE' : 'DAYS',
      transfer_ban_days: penalty.transfer_ban_days || 0,
      transfer_ban_until: penalty.transfer_ban_until ? penalty.transfer_ban_until.slice(0, 16) : '',
      is_warning: Boolean(penalty.is_warning),
      case_number: penalty.case_number || '',
      official_verdict_text: penalty.official_verdict_text || '',
    });
  };

  // Submit Edited Penalty
  const handleConfirmUpdatePenalty = async (e) => {
    if (e) e.preventDefault();
    if (!selectedPenaltyForEdit || !editFormData) return;
    if (!editFormData.title.trim()) {
      showToast('عنوان حکم نمی‌تواند خالی باشد.', 'warning');
      return;
    }
    if (!editFormData.reason.trim()) {
      showToast('شرح تخلف نمی‌تواند خالی باشد.', 'warning');
      return;
    }
    try {
      setEditingPenalty(true);
      const payload = {
        title: editFormData.title.trim(),
        reason: editFormData.reason.trim(),
        violation_type: editFormData.violation_type,
        fine_budget_usd: parseFloat(editFormData.fine_budget_usd) || 0,
        fine_gems: parseInt(editFormData.fine_gems, 10) || 0,
        points_deduction: parseInt(editFormData.points_deduction, 10) || 0,
        has_transfer_ban: editFormData.has_transfer_ban,
        ban_mode: editFormData.ban_mode,
        transfer_ban_days: editFormData.has_transfer_ban && editFormData.ban_mode === 'DAYS' ? parseInt(editFormData.transfer_ban_days, 10) || 0 : 0,
        transfer_ban_until: editFormData.has_transfer_ban && editFormData.ban_mode === 'DATE' && editFormData.transfer_ban_until ? editFormData.transfer_ban_until : null,
        is_warning: editFormData.is_warning,
        case_number: (editFormData.case_number || '').trim(),
        official_verdict_text: (editFormData.official_verdict_text || '').trim(),
      };
      const res = await disciplinaryApi.updatePenalty(selectedPenaltyForEdit.id, payload);
      showToast(res.data?.status || 'حکم انضباطی با موفقیت بازنگری و اصلاح گردید.', 'success');
      setSelectedPenaltyForEdit(null);
      setEditFormData(null);
      fetchOverview();
      fetchRecords();
    } catch (err) {
      showToast(err.response?.data?.error || 'خطا در ویرایش و بازنگری حکم انضباطی', 'error');
    } finally {
      setEditingPenalty(false);
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
            <span>سوابق و پرونده‌ها</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {overview.stats?.total_penalties || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VERDICTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'VERDICTS'
                ? 'bg-gradient-to-r from-amber-500/30 to-red-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <Scale size={15} className="text-amber-400" />
            <span>تالار احکام و دادنامه‌های رسمی</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-black">
              رسمی
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
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(penalty, e)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Edit3 size={13} />
                              <span>ویرایش حکم</span>
                            </button>

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
                          </>
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
      {/* TAB: OFFICIAL VERDICTS & TRIBUNAL PRESS ROOM                              */}
      {/* ========================================================================= */}
      {activeTab === 'VERDICTS' && (
        <div className="space-y-4">
          {/* Banner Info */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-[#150a08] to-slate-950 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Scale size={24} />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>تالار احکام و دادنامه‌های رسمی کمیته انضباطی</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    VML JUDICIAL PRESS
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  مشاهده بیانیه‌های رسمی، دانلود و کپی احکام صادره جهت انتشار عمومی در کانال‌های ارتباطی و تلگرام
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ISSUE')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Gavel size={15} />
                <span>صدور دادنامه جدید</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در متن دادنامه، شماره پرونده یا نام تیم..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
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

          {/* Court Verdicts Cards */}
          {loadingRecords ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs text-slate-400 font-bold">در حال بارگذاری احکام و دادنامه‌ها...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
              <ScrollText size={48} className="mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">هیچ دادنامه انضباطی ثبت نشده است</h3>
              <p className="text-xs text-slate-500 mt-1">با ثبت اولین حکم، دادنامه رسمی در این بخش درج خواهد شد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {records.map((penalty) => {
                const isActive = penalty.status === 'ACTIVE';
                const isTelegramCopied = copiedTelegramId === penalty.id;
                const caseNum = penalty.case_number || `VML-JD-${penalty.id}`;

                return (
                  <motion.div
                    key={penalty.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl p-5 border border-amber-500/30 bg-gradient-to-b from-slate-900/90 via-[#0e0c14] to-slate-950 shadow-xl relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Court Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/90 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <Scale size={14} />
                          </span>
                          <span className="font-mono font-bold text-amber-300 text-[11px]">
                            {caseNum}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {formatDateFa(penalty.created_at)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            isActive
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isActive ? 'لازم‌الاجرا' : 'بخشیده‌شده'}
                          </span>
                        </div>
                      </div>

                      {/* Team Info & Violation Category */}
                      <div className="flex items-center gap-3 my-3">
                        {penalty.team_logo ? (
                          <img
                            src={penalty.team_logo}
                            alt={penalty.team_name}
                            className="w-12 h-12 object-contain rounded-2xl bg-slate-950 p-1 border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-sm text-slate-400 shrink-0">
                            {(penalty.team_name || 'تیم').slice(0, 2)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white truncate m-0">
                              {penalty.team_name}
                            </h4>
                            {penalty.tournament_name && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-500/30">
                                {penalty.tournament_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-amber-400 font-bold mt-0.5">
                            {penalty.violation_type_display || penalty.violation_type}
                          </div>
                        </div>
                      </div>

                      {/* Ruling Title & Excerpt */}
                      <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 mb-3 space-y-2">
                        <div className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                          <Gavel size={13} className="text-amber-400 shrink-0" />
                          <span>{penalty.title}</span>
                        </div>
                        {penalty.reason && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/95 leading-relaxed flex items-start gap-2">
                            <span className="shrink-0 font-bold text-amber-400 flex items-center gap-1">
                              <AlertCircle size={12} />
                              شرح و چرایی تخلف:
                            </span>
                            <span className="line-clamp-2">{penalty.reason}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                          {penalty.official_verdict_text || penalty.reason}
                        </p>
                      </div>

                      {/* Sanction Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {penalty.fine_budget_usd > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-bold flex items-center gap-1">
                            <DollarSign size={11} />
                            {formatUSD(penalty.fine_budget_usd)} جریمه
                          </span>
                        )}
                        {penalty.fine_gems > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 text-[10.5px] font-bold flex items-center gap-1">
                            <Gem size={11} />
                            {penalty.fine_gems} جم
                          </span>
                        )}
                        {penalty.points_deduction > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-500/30 text-[10.5px] font-bold flex items-center gap-1">
                            <Trophy size={11} />
                            کسر {penalty.points_deduction} امتیاز
                          </span>
                        )}
                        {penalty.transfer_ban_until && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold flex items-center gap-1">
                            <Ban size={11} />
                            محرومیت تا {formatDateFa(penalty.transfer_ban_until)}
                          </span>
                        )}
                        {penalty.is_warning && (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10.5px] font-bold flex items-center gap-1">
                            <AlertTriangle size={11} />
                            اخطار رسمی
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setFullVerdictModalPenalty(penalty)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ScrollText size={13} />
                        <span>مشاهده دادنامه کامل 📜</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyTelegramVerdict(penalty, e)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          {isTelegramCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          <span>{isTelegramCopied ? 'کپی شد! ✅' : 'کپی متن تلگرام 📋'}</span>
                        </button>

                        {isActive && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(penalty, e)}
                              className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                              title="ویرایش و بازنگری حکم"
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPenaltyForRevoke(penalty);
                                setRevokeReason('');
                              }}
                              className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                              title="لغو / بخشش حکم"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </>
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
                  onChange={(e) => {
                    const newType = e.target.value;
                    const autoReason = getViolationDefaultReason(newType, 0);
                    setFormData((prev) => ({
                      ...prev,
                      violation_type: newType,
                      reason: autoReason || prev.reason,
                    }));
                    setVariantIndex(0);
                  }}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    شرح تخلف و چرایی صدور حکم (مستندات پرونده) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                    <Sparkles size={12} />
                    تولید هوشمند متناسب با تخلف (قابل ویرایش)
                  </span>
                </div>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="دلایل صدور حکم، استناد به بندهای آیین‌نامه و گزارش ناظر مسابقه را درج نمایید..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-amber-500/50 leading-relaxed"
                />

                {/* Quick Helper Chips */}
                {getViolationQuickChips(formData.violation_type)?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Bookmark size={11} className="text-amber-400" />
                      برچسب‌های کمکی سریع (کلیک برای افزودن به متن):
                    </span>
                    {getViolationQuickChips(formData.violation_type).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => {
                            const current = (prev.reason || '').trim();
                            if (current.includes(chip)) return prev;
                            return {
                              ...prev,
                              reason: current ? `${current} - ${chip}` : chip,
                            };
                          });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10.5px] border border-slate-700/80 hover:border-amber-500/40 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <span className="text-amber-400 font-bold">+</span>
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                )}
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

            {/* Official Court Verdict Generator & Preview Section */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 via-[#120e18] to-slate-950 border border-amber-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <ScrollText size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-300">
                      انشای هوشمند متن دادنامه و بیانیه رسمی (Smart Legal Engine)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      تولید متون قضایی غیرتکراری و رسمی متناسب با تخلف، استناد به آیین‌نامه و آماده‌سازی جهت نشر خبری
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCycleVariant}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="تغییر ادبیات و نگارش دادنامه"
                  >
                    <RotateCcw size={13} />
                    <span>تغییر نگارش دادنامه ({variantIndex + 1} از {getViolationVariantsCount(formData.violation_type)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyDraftTelegram}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Copy size={13} />
                    <span>کپی پیش‌نویس تلگرام</span>
                  </button>
                </div>
              </div>

              {/* Court Case Number & Live Preview Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    شماره رسمی پرونده دادنامه (Case Number):
                  </label>
                  <input
                    type="text"
                    value={formData.case_number}
                    onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                    placeholder={currentGeneratedVerdict.caseNumber}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500/50"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">در صورت خالی بودن، شماره خودکار تخصیص می‌یابد</span>
                </div>

                <div className="md:col-span-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold">پیش‌نمایش ارکان دادنامه:</span>
                    <span className="text-slate-500 font-mono">{formData.case_number || currentGeneratedVerdict.caseNumber}</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <strong>مرجع استناد:</strong> {currentGeneratedVerdict.legalRef}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    <strong>گردش‌کار:</strong> {currentGeneratedVerdict.preamble}
                  </div>
                </div>
              </div>

              {/* Full Verdict Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    متن کامل دادنامه رسمی (قابل ویرایش دستی توسط مدیر یا انتشار مستقیم):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        official_verdict_text: currentGeneratedVerdict.fullVerdictText,
                      }));
                      showToast('متن دادنامه با مقادیر جاری بازسازی شد', 'info');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    بازسازی مجدد از قالب هوشمند
                  </button>
                </div>
                <textarea
                  value={formData.official_verdict_text || currentGeneratedVerdict.fullVerdictText}
                  onChange={(e) => setFormData({ ...formData, official_verdict_text: e.target.value })}
                  rows={8}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/50 select-text"
                  placeholder="متن کامل دادنامه رسمی در اینجا قرار می‌گیرد..."
                />
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

                <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailPenalty(null)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    بستن
                  </button>

                  {detailPenalty.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = detailPenalty;
                        setDetailPenalty(null);
                        handleOpenEditModal(target);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Edit3 size={13} />
                      <span>ویرایش حکم</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* FULL COURT VERDICT MODAL (Mandatory React Portal)                         */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {fullVerdictModalPenalty && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans dir-rtl">
              <div className="fixed inset-0" onClick={() => setFullVerdictModalPenalty(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-gradient-to-b from-slate-950 via-[#0d0a14] to-slate-950 border border-amber-500/40 rounded-3xl w-full max-w-2xl my-auto p-6 md:p-8 shadow-2xl text-slate-100 dir-rtl space-y-5"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
              >
                {/* Court Letterhead */}
                <div className="text-center border-b border-amber-500/30 pb-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 mb-2 shadow-lg shadow-amber-500/10">
                    <Scale size={32} />
                  </div>
                  <div className="text-xs font-black text-amber-400 tracking-wider">
                    سازمان لیگ فوتبال مجازی (VML) • فدراسیون ورزش‌های الکترونیک
                  </div>
                  <h2 className="text-lg font-black text-white mt-1">
                    دادنامه رسمی شعبه اول کمیته انضباطی
                  </h2>
                  <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 mt-2 font-mono">
                    <span>شماره دادنامه: <strong className="text-amber-300">{fullVerdictModalPenalty.case_number || `VML-JD-${fullVerdictModalPenalty.id}`}</strong></span>
                    <span>•</span>
                    <span>تاریخ صدور: <strong className="text-slate-200">{formatDateFa(fullVerdictModalPenalty.created_at)}</strong></span>
                  </div>
                </div>

                {/* Offending Club Banner */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {fullVerdictModalPenalty.team_logo ? (
                      <img
                        src={fullVerdictModalPenalty.team_logo}
                        alt=""
                        className="w-12 h-12 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                        {(fullVerdictModalPenalty.team_name || 'تیم').slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 block">طرف متخلف پرونده:</span>
                      <span className="text-sm font-black text-white">باشگاه {fullVerdictModalPenalty.team_name}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      fullVerdictModalPenalty.status === 'ACTIVE'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {fullVerdictModalPenalty.status_display}
                    </span>
                  </div>
                </div>

                {/* Incident Rationale Callout */}
                {fullVerdictModalPenalty.reason && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/95 leading-relaxed flex items-start gap-2.5">
                    <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-amber-300 block mb-0.5">📌 چرایی صدور حکم و شرح تفصیلی تخلف:</span>
                      <span>{fullVerdictModalPenalty.reason}</span>
                    </div>
                  </div>
                )}

                {/* Full Official Verdict Text / Story */}
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 max-h-80 overflow-y-auto text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-mono select-text custom-scrollbar">
                  {fullVerdictModalPenalty.official_verdict_text || fullVerdictModalPenalty.reason}
                </div>

                {/* Sanction Badges Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 block">
                    خلاصه تنبیهات اجرایی حکم:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {fullVerdictModalPenalty.fine_budget_usd > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold">
                        {formatUSD(fullVerdictModalPenalty.fine_budget_usd)} جریمه نقدی
                      </span>
                    )}
                    {fullVerdictModalPenalty.fine_gems > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 font-bold">
                        {fullVerdictModalPenalty.fine_gems} جم
                      </span>
                    )}
                    {fullVerdictModalPenalty.points_deduction > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-500/30 font-bold">
                        کسر {fullVerdictModalPenalty.points_deduction} امتیاز
                      </span>
                    )}
                    {fullVerdictModalPenalty.transfer_ban_until && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/30 font-bold">
                        محرومیت نقل‌وانتقالات تا {formatDateFa(fullVerdictModalPenalty.transfer_ban_until)}
                      </span>
                    )}
                    {fullVerdictModalPenalty.is_warning && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/30 font-bold">
                        اخطار کتبی رسمی
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-500">
                    دبیرخانه رکن قضایی لیگ مستر لیگ
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFullVerdictModalPenalty(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      بستن
                    </button>

                    {fullVerdictModalPenalty.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => {
                          const p = fullVerdictModalPenalty;
                          setFullVerdictModalPenalty(null);
                          handleOpenEditModal(p);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Edit3 size={14} />
                        <span>ویرایش و بازنگری حکم</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyTelegramVerdict(fullVerdictModalPenalty, e)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Copy size={14} />
                      <span>کپی متن جهت انتشار در تلگرام 📋</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* EDIT PENALTY MODAL (Rendered via React Portal directly to document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedPenaltyForEdit && editFormData && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <div
                className="fixed inset-0"
                onClick={() => {
                  if (!editingPenalty) setSelectedPenaltyForEdit(null);
                }}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 border border-amber-500/40 rounded-3xl w-full max-w-3xl my-auto p-6 text-right space-y-5 shadow-2xl shadow-amber-950/20 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>ویرایش و بازنگری حکم انضباطی</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                          {selectedPenaltyForEdit.case_number || `#${selectedPenaltyForEdit.id}`}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        باشگاه طرف پرونده: <span className="text-amber-300 font-bold">{selectedPenaltyForEdit.team_name || selectedPenaltyForEdit.team?.name || 'باشگاه مربوطه'}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!editingPenalty) setSelectedPenaltyForEdit(null);
                    }}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                {/* Scrollable Form Content */}
                <div className="overflow-y-auto space-y-4 pr-1 pl-1 flex-1">
                  {/* Live Delta Engine Preview */}
                  {(() => {
                    const curUsd = Number(selectedPenaltyForEdit.fine_budget_usd) || 0;
                    const newUsd = Number(editFormData.fine_budget_usd) || 0;
                    const deltaUsd = newUsd - curUsd;

                    const curGems = Number(selectedPenaltyForEdit.fine_gems) || 0;
                    const newGems = Number(editFormData.fine_gems) || 0;
                    const deltaGems = newGems - curGems;

                    const curPts = Number(selectedPenaltyForEdit.points_deduction) || 0;
                    const newPts = Number(editFormData.points_deduction) || 0;
                    const deltaPts = newPts - curPts;

                    return (
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span className="flex items-center gap-1.5 text-amber-300">
                            <Scale size={14} />
                            <span>محاسبه خودکار و تسویه تفاضلی (Delta Engine):</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            تفاضل مبالغ خودکار به حساب باشگاه واریز/کسر می‌گردد
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                          {/* USD Delta */}
                          <div className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                            deltaUsd > 0
                              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                              : deltaUsd < 0
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400'
                          }`}>
                            <span className="text-[10px] text-slate-400">
                              بودجه: {formatUSD(curUsd)} ← {formatUSD(newUsd)}
                            </span>
                            <span className="font-bold font-mono">
                              {deltaUsd > 0 && `+ کسر ${formatUSD(deltaUsd)} مضاعف`}
                              {deltaUsd < 0 && `- استرداد ${formatUSD(Math.abs(deltaUsd))} به باشگاه`}
                              {deltaUsd === 0 && 'بدون تغییر مالی'}
                            </span>
                          </div>

                          {/* Gems Delta */}
                          <div className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                            deltaGems > 0
                              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                              : deltaGems < 0
                              ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400'
                          }`}>
                            <span className="text-[10px] text-slate-400">
                              جم: {curGems} ← {newGems}
                            </span>
                            <span className="font-bold font-mono">
                              {deltaGems > 0 && `+ کسر ${deltaGems} جم مضاعف`}
                              {deltaGems < 0 && `- استرداد ${Math.abs(deltaGems)} جم`}
                              {deltaGems === 0 && 'بدون تغییر جم'}
                            </span>
                          </div>

                          {/* Points Delta */}
                          <div className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                            deltaPts > 0
                              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                              : deltaPts < 0
                              ? 'bg-purple-950/30 border-purple-500/30 text-purple-300'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400'
                          }`}>
                            <span className="text-[10px] text-slate-400">
                              کسر امتیاز: {curPts} ← {newPts}
                            </span>
                            <span className="font-bold font-mono">
                              {deltaPts > 0 && `+ کسر ${deltaPts} امتیاز بیشتر`}
                              {deltaPts < 0 && `- بازگشت ${Math.abs(deltaPts)} امتیاز`}
                              {deltaPts === 0 && 'بدون تغییر جدول'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Title & Violation Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        عنوان حکم / پرونده:
                      </label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        دسته‌بندی تخلف:
                      </label>
                      <select
                        value={editFormData.violation_type}
                        onChange={(e) => setEditFormData({ ...editFormData, violation_type: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="CUSTOM">تخلف سفارشی / عمومی</option>
                        <option value="MATCH_NO_SHOW">عدم حضور در مسابقه رسمی (No-Show)</option>
                        <option value="ILLEGAL_LINEUP">استفاده از ترکیب غیرمجاز / بازیکن محروم</option>
                        <option value="LATE_SUBMISSION">تاخیر مکرر در ثبت نتایج و اسکرین‌شات</option>
                        <option value="BUDGET_VIOLATION">نقض قوانین سقف بودجه و فیرپلی مالی</option>
                        <option value="CODE_OF_CONDUCT">رفتار غیرحرفه‌ای و بی‌احترامی در کامیونیتی</option>
                      </select>
                    </div>
                  </div>

                  {/* Reason Textarea + Helper Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      شرح و مستندات تخلف:
                    </label>
                    <textarea
                      value={editFormData.reason}
                      onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                      rows={3}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 leading-relaxed"
                    />

                    {getViolationQuickChips(editFormData.violation_type)?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Bookmark size={11} className="text-amber-400" />
                          برچسب‌های کمکی:
                        </span>
                        {getViolationQuickChips(editFormData.violation_type).map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setEditFormData((prev) => {
                                const current = (prev.reason || '').trim();
                                if (current.includes(chip)) return prev;
                                return {
                                  ...prev,
                                  reason: current ? `${current} - ${chip}` : chip,
                                };
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10px] border border-slate-700/80 transition-all cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Financial & Sanctions Inputs */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Scale size={14} />
                      <span>تنظیم مقادیر مجازات و تحریم‌ها:</span>
                    </h4>

                    {/* USD & Gems fines */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                          <DollarSign size={13} className="text-emerald-400" />
                          <span>جریمه نقدی بودجه ($ دلار):</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="5000"
                          value={editFormData.fine_budget_usd}
                          onChange={(e) => setEditFormData({ ...editFormData, fine_budget_usd: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                        />
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {[0, 10000, 50000, 100000, 250000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setEditFormData({ ...editFormData, fine_budget_usd: amt })}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              {formatUSD(amt)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                          <Gem size={13} className="text-cyan-400" />
                          <span>جریمه جم (الماس):</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={editFormData.fine_gems}
                          onChange={(e) => setEditFormData({ ...editFormData, fine_gems: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none"
                        />
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {[0, 50, 100, 200, 500].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setEditFormData({ ...editFormData, fine_gems: g })}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer"
                            >
                              {g} جم
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Points Deduction */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                        <Trophy size={13} className="text-purple-400" />
                        <span>کسر امتیاز از جدول لیگ:</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={editFormData.points_deduction}
                        onChange={(e) => setEditFormData({ ...editFormData, points_deduction: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-400 font-mono font-bold focus:outline-none"
                      />
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[0, 1, 3, 6, 9].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setEditFormData({ ...editFormData, points_deduction: pts })}
                            className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            {pts} امتیاز
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transfer Ban */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editFormData.has_transfer_ban}
                            onChange={(e) => setEditFormData({ ...editFormData, has_transfer_ban: e.target.checked })}
                            className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700"
                          />
                          <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                            <Ban size={13} />
                            <span>محرومیت از نقل‌وانتقالات</span>
                          </span>
                        </label>

                        {editFormData.has_transfer_ban && (
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setEditFormData({ ...editFormData, ban_mode: 'DAYS' })}
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                editFormData.ban_mode === 'DAYS' ? 'bg-rose-500/30 text-rose-200' : 'text-slate-400'
                              }`}
                            >
                              بر اساس روز
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditFormData({ ...editFormData, ban_mode: 'DATE' })}
                              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                editFormData.ban_mode === 'DATE' ? 'bg-rose-500/30 text-rose-200' : 'text-slate-400'
                              }`}
                            >
                              تاریخ دقیق
                            </button>
                          </div>
                        )}
                      </div>

                      {editFormData.has_transfer_ban && (
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                          {editFormData.ban_mode === 'DAYS' ? (
                            <div>
                              <div className="flex items-center justify-between mb-1 text-xs">
                                <span className="text-rose-200 font-bold">مدت محرومیت به روز:</span>
                                <span className="text-rose-400 font-mono font-black">{editFormData.transfer_ban_days} روز</span>
                              </div>
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={editFormData.transfer_ban_days}
                                onChange={(e) => setEditFormData({ ...editFormData, transfer_ban_days: e.target.value })}
                                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-1.5 text-xs text-rose-300 font-mono focus:outline-none"
                              />
                              <div className="flex items-center gap-1.5 mt-2">
                                {[3, 7, 14, 30, 60, 90].map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setEditFormData({ ...editFormData, transfer_ban_days: d })}
                                    className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-200 text-[10px] border border-rose-500/30 cursor-pointer"
                                  >
                                    {d} روز
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs text-rose-200 font-bold mb-1">
                                پایان محرومیت تا تاریخ و ساعت:
                              </label>
                              <input
                                type="datetime-local"
                                value={editFormData.transfer_ban_until}
                                onChange={(e) => setEditFormData({ ...editFormData, transfer_ban_until: e.target.value })}
                                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-1.5 text-xs text-rose-300 font-bold focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Warning Checkbox */}
                    <div className="pt-2 border-t border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editFormData.is_warning}
                          onChange={(e) => setEditFormData({ ...editFormData, is_warning: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                        />
                        <span className="text-xs font-bold text-slate-300">
                          ثبت اخطار رسمی کتبی در سوابق انضباطی
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Smart Official Verdict Text */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 via-[#120e18] to-slate-950 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ScrollText size={16} className="text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">
                          متن رسمی دادنامه قضایی:
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const verdict = generateDisciplinaryVerdict({
                            violationType: editFormData.violation_type,
                            teamName: selectedPenaltyForEdit.team_name || selectedPenaltyForEdit.team?.name || 'باشگاه مربوطه',
                            tournamentName: selectedPenaltyForEdit.tournament_name || null,
                            title: editFormData.title || '',
                            reason: editFormData.reason,
                            fineBudgetUsd: editFormData.fine_budget_usd,
                            fineGems: editFormData.fine_gems,
                            pointsDeduction: editFormData.points_deduction,
                            transferBanDays: editFormData.has_transfer_ban && editFormData.ban_mode === 'DAYS' ? editFormData.transfer_ban_days : 0,
                            transferBanUntil: editFormData.has_transfer_ban && editFormData.ban_mode === 'DATE' ? editFormData.transfer_ban_until : null,
                            isWarning: editFormData.is_warning,
                            variantIndex: 0,
                            caseNumber: editFormData.case_number,
                          });
                          setEditFormData((prev) => ({
                            ...prev,
                            title: prev.title || verdict.title,
                            official_verdict_text: verdict.fullVerdictText,
                          }));
                          showToast('متن دادنامه با موفقیت بازنویسی و با مقادیر جدید هماهنگ شد.', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Sparkles size={12} className="text-amber-400" />
                        <span>بازنویسی هوشمند دادنامه با ارقام جدید</span>
                      </button>
                    </div>

                    <textarea
                      value={editFormData.official_verdict_text}
                      onChange={(e) => setEditFormData({ ...editFormData, official_verdict_text: e.target.value })}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-amber-500/50"
                      placeholder="متن کامل دادنامه رسمی..."
                    />
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Info size={13} />
                    <span>تغییرات بلافاصله پس از تایید بر داده‌های مالی، جدول و نقل‌وانتقالات اعمال می‌شوند.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPenaltyForEdit(null)}
                      disabled={editingPenalty}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      انصراف
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmUpdatePenalty}
                      disabled={editingPenalty}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {editingPenalty ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>در حال ثبت و تسویه تفاضلی...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>ذخیره و اعمال بازنگری حکم</span>
                        </>
                      )}
                    </button>
                  </div>
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
