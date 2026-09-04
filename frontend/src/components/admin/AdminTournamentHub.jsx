import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Clock, RefreshCw, Lock, Unlock, Bell, AlertTriangle,
  Play, CheckCircle2, Shield, Settings, ChevronDown, ChevronRight, ChevronUp,
  Plus, Trash2, ArrowLeftRight, Check, Sparkles, Sliders, Eye, Award,
  Users, Zap, ShieldAlert, X, RotateCcw, SlidersHorizontal, Layers, Flame,
  Edit3, Scale, Gavel, FileEdit, Hash, HelpCircle, CheckSquare, Save
} from 'lucide-react';
import { adminApi, matchApi, teamApi } from '../../services/api';
import { getTeamLogoUrl } from '../../utils/teamLogos';
import axios from 'axios';

const TIME_SLOT_PRESET_TEMPLATES = [
  {
    id: 'evening_standard',
    name: 'شبانه استاندارد (۸ بازی - ۵۰ دقیقه)',
    badge: 'پیش‌فرض مسابقات',
    desc: '۱۸:۰۰ تا ۲۳:۳۰ - فاصله ۵۰ دقیقه مناسب ۱۶ تیم',
    slots: ['18:00', '18:50', '19:40', '20:30', '21:15', '22:00', '22:45', '23:30']
  },
  {
    id: 'hourly_regular',
    name: 'ساعتی منظم (هر ۱ ساعت یک مسابقه)',
    badge: 'فاصله ۶۰ دقیقه',
    desc: '۱۷:۰۰ تا ۰۰:۰۰ - ۸ مسابقه رأس ساعت',
    slots: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00']
  },
  {
    id: 'afternoon_compact',
    name: 'عصرگاهی فشرده (فاصله ۴۵ دقیقه)',
    badge: 'شروع از عصر',
    desc: '۱۶:۰۰ تا ۲۱:۱۵ - ۸ بازی سریع',
    slots: ['16:00', '16:45', '17:30', '18:15', '19:00', '19:45', '20:30', '21:15']
  },
  {
    id: 'night_compact',
    name: 'شبانه فشرده (فاصله ۴۰ دقیقه)',
    badge: 'سریع و بدون وقفه',
    desc: '۱۹:۰۰ تا ۲۳:۴۰ - ۸ بازی پشت سر هم',
    slots: ['19:00', '19:40', '20:20', '21:00', '21:40', '22:20', '23:00', '23:40']
  },
  {
    id: 'marathon_10',
    name: 'ماراتن آخر هفته (۱۰ مسابقه)',
    badge: '۱۰ بازی روزانه',
    desc: '۱۴:۰۰ تا ۲۳:۰۰ - مسابقات گسترده',
    slots: ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
  }
];

const DEFAULT_TIME_SLOTS = TIME_SLOT_PRESET_TEMPLATES[0].slots;

export default function AdminTournamentHub({ onNotification, onOpenRefereeRoom }) {
  const [hubTab, setHubTab] = useState('league'); // 'league' | 'cup' | 'sync'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Teams & Matches State
  const [teams, setTeams] = useState([]);
  const [leagueMatches, setLeagueMatches] = useState([]);
  const [gameweekStatus, setGameweekStatus] = useState(null);
  const [selectedGameweek, setSelectedGameweek] = useState('هفته ۱');
  
  // League Config Form State
  const [leagueName, setLeagueName] = useState('مستر لیگ مجازی');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(1);
  const [isDoubleRoundRobin, setIsDoubleRoundRobin] = useState(true);
  const [reserveCupDays, setReserveCupDays] = useState(true);
  const [cupIntervalGameweeks, setCupIntervalGameweeks] = useState(6);

  // Selected Teams for League & Cup
  const [selectedLeagueTeamIds, setSelectedLeagueTeamIds] = useState([]);
  const [selectedCupTeamIds, setSelectedCupTeamIds] = useState([]);
  const [leagueTeamSearch, setLeagueTeamSearch] = useState('');
  const [cupTeamSearch, setCupTeamSearch] = useState('');

  // Time Slots State & Persistence
  const [timeSlots, setTimeSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('vml_admin_daily_time_slots');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read saved time slots:', e);
    }
    return DEFAULT_TIME_SLOTS;
  });

  const [newSlotInput, setNewSlotInput] = useState('19:00');
  const [autoStartHour, setAutoStartHour] = useState('18:00');
  const [autoMatchDuration, setAutoMatchDuration] = useState(50);
  const [autoSlotsCount, setAutoSlotsCount] = useState(8);
  const [isTimeSlotEditorOpen, setIsTimeSlotEditorOpen] = useState(true);
  const [activeSlotConfigTab, setActiveSlotConfigTab] = useState('auto'); // 'auto' | 'manual' | 'presets'

  // Persist timeSlots to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vml_admin_daily_time_slots', JSON.stringify(timeSlots));
    } catch (e) {
      console.warn('Could not persist time slots:', e);
    }
  }, [timeSlots]);

  // Add individual slot with validation and chronological sorting
  const handleAddSlot = (slotToAdd) => {
    const raw = String(slotToAdd || newSlotInput).trim();
    if (!raw || !/^\d{1,2}:\d{2}$/.test(raw)) {
      notify('فرمت ساعت معتبر نیست (مثال صحیح: 19:30)', 'error');
      return;
    }
    const [hStr, mStr] = raw.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      notify('ساعت باید بین 00:00 تا 23:59 باشد.', 'error');
      return;
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (timeSlots.includes(formatted)) {
      notify(`اسلات زمانی ${formatted} قبلاً در لیست وجود دارد.`, 'warning');
      return;
    }
    const updated = [...timeSlots, formatted].sort((a, b) => {
      const [ah, am] = a.split(':').map(Number);
      const [bh, bm] = b.split(':').map(Number);
      return ah * 60 + am - (bh * 60 + bm);
    });
    setTimeSlots(updated);
    notify(`اسلات زمانی ${formatted} با موفقیت به برنامه اضافه شد.`, 'success');
  };

  // Remove slot
  const handleRemoveSlot = (indexToRemove) => {
    if (timeSlots.length <= 1) {
      notify('حداقل باید یک اسلات زمانی برای برگزاری مسابقات وجود داشته باشد.', 'warning');
      return;
    }
    const removedSlot = timeSlots[indexToRemove];
    const updated = timeSlots.filter((_, i) => i !== indexToRemove);
    setTimeSlots(updated);
    notify(`اسلات ${removedSlot} حذف شد.`, 'info');
  };

  // Generate conflict-free sequential schedule slots
  const handleGenerateSequentialSlots = () => {
    const rawStart = String(autoStartHour || '18:00').trim();
    const parts = rawStart.split(':');
    const startH = parseInt(parts[0] || '18', 10);
    const startM = parseInt(parts[1] || '0', 10);
    const count = Math.max(1, parseInt(autoSlotsCount, 10) || 8);
    const duration = Math.max(10, parseInt(autoMatchDuration, 10) || 50);

    let currentTotalMinutes = startH * 60 + startM;
    const generated = [];

    for (let i = 0; i < count; i++) {
      const h = Math.floor(currentTotalMinutes / 60) % 24;
      const m = currentTotalMinutes % 60;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (!generated.includes(formatted)) {
        generated.push(formatted);
      }
      currentTotalMinutes += duration;
    }

    setTimeSlots(generated);
    notify(`زنجیره ${generated.length} اسلات زمانی بدون تداخل با موفقیت تولید شد.`, 'success');
  };

  // Apply preset
  const handleApplyPreset = (presetSlots, presetName) => {
    setTimeSlots(presetSlots);
    notify(`قالب «${presetName}» با موفقیت اعمال شد.`, 'success');
  };

  // Reset to default
  const handleResetSlots = () => {
    setTimeSlots(DEFAULT_TIME_SLOTS);
    notify('اسلات‌های زمانی به حالت پیش‌فرض بازگردانی شدند.', 'info');
  };

  // Clear all
  const handleClearAllSlots = () => {
    if (window.confirm('آیا از پاک‌سازی تمام اسلات‌های زمانی اطمینان دارید؟')) {
      setTimeSlots(['18:00']);
      notify('اسلات‌ها پاک شدند و به یک اسلات پایه محدود شدند.', 'info');
    }
  };

  // Cup State
  const [cupsList, setCupsList] = useState([]);
  const [selectedCupId, setSelectedCupId] = useState(null);
  const [cupBracketData, setCupBracketData] = useState(null);
  const [newCupName, setNewCupName] = useState('جام حذفی مستر لیگ');
  const [newCupStartDate, setNewCupStartDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [newCupTeamCount, setNewCupTeamCount] = useState(16);
  const [newCupDaysBetween, setNewCupDaysBetween] = useState(3);

  // Sync State
  const [syncInterval, setSyncInterval] = useState(4);

  // Match Editing State
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('SCHEDULED');
  const [editHomeScore, setEditHomeScore] = useState(0);
  const [editAwayScore, setEditAwayScore] = useState(0);
  const [editHomePenalties, setEditHomePenalties] = useState('');
  const [editAwayPenalties, setEditAwayPenalties] = useState('');

  // Cup Stage Navigation State
  const [selectedCupStage, setSelectedCupStage] = useState('');

  // Standings Management State
  const [standingsList, setStandingsList] = useState([]);
  const [editingStandingId, setEditingStandingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [penaltyModal, setPenaltyModal] = useState({
    isOpen: false,
    standing: null,
    points_deduction: 0,
    points_deduction_reason: '',
  });
  const [recalculatingStandings, setRecalculatingStandings] = useState(false);

  const notify = (msg, type = 'success') => {
    if (onNotification) {
      onNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  const fetchStandingsList = async () => {
    try {
      const res = await matchApi.getLeagueStandings();
      setStandingsList(res.data || []);
    } catch (e) {
      console.warn('Failed to load standings', e);
    }
  };

  const handleRecalculateStandings = async () => {
    setRecalculatingStandings(true);
    try {
      const res = await adminApi.recalculateStandings();
      notify(res.data?.message || 'جدول رده‌بندی لیگ با موفقیت محاسبه مجدد شد.', 'success');
      if (res.data?.standings) {
        setStandingsList(res.data.standings);
      } else {
        await fetchStandingsList();
      }
      try {
        window.dispatchEvent(new Event('vml_league_schedule_updated'));
      } catch (_e) {}
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در محاسبه مجدد جدول لیگ', 'error');
    } finally {
      setRecalculatingStandings(false);
    }
  };

  const handleStartEditStanding = (row) => {
    setEditingStandingId(row.id || row.team_id);
    setEditFormData({
      played: row.played ?? 0,
      won: row.won ?? 0,
      drawn: row.drawn ?? 0,
      lost: row.lost ?? 0,
      gf: row.gf ?? 0,
      ga: row.ga ?? 0,
      raw_points: row.raw_points ?? row.points ?? 0,
      points_deduction: row.points_deduction ?? 0,
      points_deduction_reason: row.points_deduction_reason || '',
    });
  };

  const handleSaveEditStanding = async (row) => {
    setActionLoading(true);
    try {
      const res = await adminApi.manualEditStanding({
        standing_id: row.id,
        team_id: row.team_id,
        ...editFormData,
      });
      notify(res.data?.message || `آمار تیم «${row.name}» با موفقیت ذخیره شد.`, 'success');
      setEditingStandingId(null);
      await fetchStandingsList();
      try {
        window.dispatchEvent(new Event('vml_league_schedule_updated'));
      } catch (_e) {}
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ذخیره دستی جدول', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPenaltyModal = (row) => {
    setPenaltyModal({
      isOpen: true,
      standing: row,
      points_deduction: row.points_deduction || 0,
      points_deduction_reason: row.points_deduction_reason || '',
    });
  };

  const handleSavePenalty = async () => {
    if (!penaltyModal.standing) return;
    setActionLoading(true);
    try {
      const res = await adminApi.applyStandingPenalty({
        standing_id: penaltyModal.standing.id,
        team_id: penaltyModal.standing.team_id,
        points_deduction: parseInt(penaltyModal.points_deduction, 10) || 0,
        points_deduction_reason: penaltyModal.points_deduction_reason || '',
      });
      notify(res.data?.message || 'حکم انضباطی کسر امتیاز با موفقیت اعمال شد.', 'success');
      setPenaltyModal({ isOpen: false, standing: null, points_deduction: 0, points_deduction_reason: '' });
      await fetchStandingsList();
      try {
        window.dispatchEvent(new Event('vml_league_schedule_updated'));
      } catch (_e) {}
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در اعمال جریمه', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Initial Fetch
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let loadedTeams = [];
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('vml_token')}` };
        const teamsRes = await axios.get('/api/teams/', { headers });
        const rawTeams = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data?.results || []);
        loadedTeams = Array.isArray(rawTeams) ? rawTeams : [];
      } catch (err) {
        console.error('Failed to load teams:', err);
      }

      const [gwRes, matchesRes, cupsRes, standingsRes] = await Promise.all([
        matchApi.getGameweeksStatus().catch(() => ({ data: { gameweeks: [], active_gameweek: 'هفته ۱' } })),
        adminApi.getMatches().catch(() => ({ data: [] })),
        adminApi.getCups().catch(() => ({ data: [] })),
        matchApi.getLeagueStandings().catch(() => ({ data: [] })),
      ]);

      const activeIds = loadedTeams.filter(t => t.is_active !== false).map(t => t.id);
      setTeams(loadedTeams);
      setSelectedLeagueTeamIds(prev => prev.length === 0 ? activeIds : prev);
      setSelectedCupTeamIds(prev => {
        if (prev.length > 0) return prev;
        if (activeIds.length >= 16) return activeIds.slice(0, 16);
        if (activeIds.length >= 8) return activeIds.slice(0, 8);
        if (activeIds.length >= 4) return activeIds.slice(0, 4);
        return activeIds;
      });

      setGameweekStatus(gwRes.data || null);
      if (gwRes.data?.active_gameweek) {
        setSelectedGameweek(gwRes.data.active_gameweek);
      }
      setLeagueMatches(matchesRes.data || []);
      setStandingsList(standingsRes.data || []);
      
      const cups = cupsRes.data || [];
      setCupsList(cups);
      if (cups.length > 0 && !selectedCupId) {
        setSelectedCupId(cups[0].id);
      }
    } catch (err) {
      console.error('Error loading tournament hub data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCupId]);

  // Filter matches for selected gameweek (sorted chronologically by match date/time)
  const currentGameweekMatches = useMemo(() => {
    return (leagueMatches || [])
      .filter(
        (m) => String(m.round_name || '').trim().toLowerCase() === String(selectedGameweek || '').trim().toLowerCase()
      )
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [leagueMatches, selectedGameweek]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Bracket when selectedCupId changes
  useEffect(() => {
    if (selectedCupId) {
      adminApi.getCupBracket(selectedCupId)
        .then((res) => setCupBracketData(res.data))
        .catch((err) => console.error('Error loading cup bracket:', err));
    } else {
      setCupBracketData(null);
    }
  }, [selectedCupId]);

  // Derived Stages and Matches for Cup Management
  const cupStages = useMemo(() => {
    if (!cupBracketData?.rounds || cupBracketData.rounds.length === 0) {
      return [];
    }
    return (cupBracketData.rounds || []).map((r) => ({
      name: r.name,
      total_matches: (r.matches || []).length,
      finished_matches: (r.matches || []).filter((m) => m.status === 'FINISHED').length,
      live_matches: (r.matches || []).filter((m) => m.status === 'LIVE').length,
      is_finished: (r.matches || []).length > 0 && (r.matches || []).every((m) => m.status === 'FINISHED'),
    }));
  }, [cupBracketData]);

  useEffect(() => {
    if (cupStages.length > 0) {
      const exists = cupStages.some((s) => s.name === selectedCupStage);
      if (!exists) {
        const activeStage = cupStages.find((s) => !s.is_finished && s.total_matches > 0);
        setSelectedCupStage(activeStage ? activeStage.name : cupStages[0].name);
      }
    } else {
      setSelectedCupStage('');
    }
  }, [cupStages, selectedCupStage]);

  const currentCupStageMatches = useMemo(() => {
    if (!cupBracketData?.rounds || !selectedCupStage) return [];
    const foundRound = (cupBracketData.rounds || []).find((r) => r.name === selectedCupStage);
    return foundRound?.matches || [];
  }, [cupBracketData, selectedCupStage]);

  // Quick Team Selection Helpers
  const activeTeams = useMemo(() => (teams || []).filter(t => t.is_active !== false), [teams]);

  const handleToggleLeagueTeam = (teamId) => {
    setSelectedLeagueTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllLeagueTeams = () => {
    setSelectedLeagueTeamIds(activeTeams.map(t => t.id));
  };

  const handleDeselectAllLeagueTeams = () => {
    setSelectedLeagueTeamIds([]);
  };

  const handleSelectTopLeagueTeams = (count) => {
    setSelectedLeagueTeamIds(activeTeams.slice(0, count).map(t => t.id));
  };

  const handleToggleCupTeam = (teamId) => {
    setSelectedCupTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllCupTeams = () => {
    setSelectedCupTeamIds(activeTeams.map(t => t.id));
  };

  const handleDeselectAllCupTeams = () => {
    setSelectedCupTeamIds([]);
  };

  const handleSelectTopCupTeams = (count) => {
    setSelectedCupTeamIds(activeTeams.slice(0, count).map(t => t.id));
  };

  const handleCopyLeagueTeamsToCup = () => {
    setSelectedCupTeamIds([...selectedLeagueTeamIds]);
    notify(`لیست ${selectedLeagueTeamIds.length} تیم منتخب لیگ با موفقیت در جام حذفی کپی شد.`, 'success');
  };

  // Handle Complete League Reset (Purge all fixtures and standings)
  const handleResetLeague = async () => {
    const confirmMsg = `⚠️ هشدار مهم:\nآیا از پاک‌سازی کامل تمام مسابقات لیگ و صفر کردن جدول رده‌بندی اطمینان دارید؟\n\nتمامی بازی‌های ساخته‌شده، نتایج و رکوردهای لیگ حذف خواهند شد و سیستم به صورت کاملاً خام آماده ساخت مجدد تحویل داده می‌شود.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.resetLeague({});
      notify(res.data?.message || 'تمامی مسابقات لیگ با موفقیت پاک‌سازی شدند و سیستم به حالت خام بازگشت.', 'success');
      setSelectedGameweek('هفته ۱');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در پاک‌سازی مسابقات لیگ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Configure / Generate League Fixtures
  const handleGenerateLeague = async () => {
    if (selectedLeagueTeamIds.length < 2) {
      notify('حداقل ۲ تیم برای تولید مسابقات لیگ مورد نیاز است.', 'error');
      return;
    }
    if (!window.confirm(`آیا از بازتولید برنامه مسابقات لیگ با ${selectedLeagueTeamIds.length} تیم منتخب اطمینان دارید؟ تمام مسابقات قبلی لیگ پاک و مجدداً طبق تنظیمات زمان‌بندی می‌شوند.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.configureLeague({
        name: leagueName,
        start_date: startDate,
        days_between_rounds: parseInt(daysBetweenRounds, 10),
        is_double_round_robin: isDoubleRoundRobin,
        reserve_cup_days: reserveCupDays,
        interval_gameweeks: cupIntervalGameweeks,
        time_slots: timeSlots,
        team_ids: selectedLeagueTeamIds,
        clear_existing: true,
      });
      notify(res.data?.message || 'برنامه لیگ با موفقیت تولید شد.', 'success');
      setSelectedGameweek('هفته ۱');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در تولید برنامه مسابقات لیگ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Gameweek Bulk Actions
  const handleGameweekAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await adminApi.gameweekAction({
        action,
        gameweek: selectedGameweek,
      });
      notify(res.data?.message || 'عملیات با موفقیت انجام شد.', 'success');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در انجام عملیات روی هفته', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quick Forfeit (3-0)
  // Handle Start Match Edit
  const handleStartEditMatch = (match) => {
    setEditingMatchId(match.id);
    setEditDate(match.date ? match.date.substring(0, 16) : '');
    setEditStatus(match.status || 'SCHEDULED');
    setEditHomeScore(match.home_score ?? 0);
    setEditAwayScore(match.away_score ?? 0);
    setEditHomePenalties(match.home_penalties !== null && match.home_penalties !== undefined ? match.home_penalties : '');
    setEditAwayPenalties(match.away_penalties !== null && match.away_penalties !== undefined ? match.away_penalties : '');
  };

  // Handle Quick Forfeit (3-0)
  const handleForfeit = async (matchId, forfeitTeam) => {
    const teamLabel = forfeitTeam === 'home' ? 'میزبان' : 'میهمان';
    if (!window.confirm(`ثبت باخت فنی ۳-۰ به ضرر تیم ${teamLabel}؟`)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.forfeitMatch(matchId, { forfeit_team: forfeitTeam });
      notify(res.data?.message || 'باخت فنی ثبت شد.', 'success');
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ثبت باخت فنی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Match Date, Status, Score & Penalties Update
  const handleSaveMatchEdit = async (matchId) => {
    setActionLoading(true);
    try {
      const payload = {
        date: editDate ? new Date(editDate).toISOString() : undefined,
        status: editStatus,
        home_score: parseInt(editHomeScore, 10) || 0,
        away_score: parseInt(editAwayScore, 10) || 0,
      };
      if (editHomePenalties !== '' && editHomePenalties !== null && editHomePenalties !== undefined) {
        payload.home_penalties = parseInt(editHomePenalties, 10);
      }
      if (editAwayPenalties !== '' && editAwayPenalties !== null && editAwayPenalties !== undefined) {
        payload.away_penalties = parseInt(editAwayPenalties, 10);
      }

      const res = await adminApi.updateMatch(matchId, payload);
      if (res.data?.advance_result?.winner) {
        notify(`تغییرات مسابقه ذخیره شد. 🏆 صعود برنده (${res.data.advance_result.winner}) به مرحله بعد ثبت گردید.`, 'success');
      } else {
        notify('تغییرات مسابقه با موفقیت ذخیره شد.', 'success');
      }
      setEditingMatchId(null);
      await loadData();
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ویرایش مسابقه', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Cup Tournament
  const handleCreateCup = async (e) => {
    e.preventDefault();
    if (selectedCupTeamIds.length < 2) {
      notify('حداقل ۲ تیم برای ساخت جام حذفی انتخاب کنید.', 'error');
      return;
    }
    const cupCount = selectedCupTeamIds.length;
    if (!Number.isInteger(Math.log2(cupCount))) {
      notify(`تعداد تیم‌های جام حذفی (${cupCount} تیم) باید توانی از ۲ باشد (مثلاً ۴، ۸، ۱۶ یا ۳۲ تیم).`, 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminApi.createCup({
        name: newCupName,
        start_date: newCupStartDate,
        days_between_rounds: parseInt(newCupDaysBetween, 10),
        interval_gameweeks: cupIntervalGameweeks || 6,
        time_slots: timeSlots,
        team_ids: selectedCupTeamIds,
      });
      notify(res.data?.message || 'تورنمنت جام حذفی ساخته شد.', 'success');
      await loadData();
      if (res.data?.tournament_id) {
        setSelectedCupId(res.data.tournament_id);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در ساخت جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Cup Tournament
  const handleDeleteCup = async (cupId) => {
    if (!window.confirm('آیا از حذف این تورنمنت جام حذفی و تمام مسابقات آن اطمینان دارید؟')) return;
    setActionLoading(true);
    try {
      const res = await adminApi.deleteCup(cupId);
      notify(res.data?.message || 'جام حذفی حذف شد.', 'success');
      setSelectedCupId(null);
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در حذف جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Cup Reset (Purge all cup fixtures and tournaments)
  const handleResetCup = async () => {
    const confirmMsg = `⚠️ هشدار مهم:\nآیا از پاک‌سازی کامل تمام مسابقات جام حذفی و ریست کردن درخت براکت اطمینان دارید؟\n\nتمامی بازی‌های حذفی ساخته‌شده و نتایج حذف خواهند شد و سیستم به صورت کاملاً خام تحویل داده می‌شود.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await adminApi.resetCup({ cup_id: selectedCupId });
      notify(res.data?.message || 'تمامی مسابقات جام حذفی با موفقیت پاک‌سازی شدند و سیستم به حالت خام بازگشت.', 'success');
      setSelectedCupId(null);
      setCupBracketData(null);
      try {
        window.dispatchEvent(new CustomEvent('vml_league_schedule_updated'));
        localStorage.setItem('vml_last_schedule_update', Date.now().toString());
      } catch (_e) {}
      await loadData();
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در پاک‌سازی مسابقات جام حذفی', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Advance Knockout Winner
  const handleAdvanceWinner = async (matchId) => {
    setActionLoading(true);
    try {
      const res = await adminApi.advanceCupWinner(matchId);
      notify(`تیم ${res.data?.winner || ''} با موفقیت به مرحله بعدی صعود کرد!`, 'success');
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در صعود تیم', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Cup with League Calendar
  const handleSyncCalendar = async () => {
    if (!selectedCupId) {
      notify('لطفاً ابتدا یک جام حذفی را انتخاب کنید.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.syncCupWithLeague({
        cup_id: selectedCupId,
        interval_gameweeks: parseInt(syncInterval, 10),
        time_slots: timeSlots,
      });
      notify(
        `سینک هوشمند با موفقیت انجام شد! ${res.data?.updated_matches_count || 0} مسابقه جام حذفی بین هفته‌های لیگ زمان‌بندی شدند.`,
        'success'
      );
      await loadData();
      if (selectedCupId) {
        const bRes = await adminApi.getCupBracket(selectedCupId);
        setCupBracketData(bRes.data);
      }
    } catch (err) {
      notify(err.response?.data?.error || 'خطا در سینک تقویم', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Combined All-Matches Calendar (League + Cup) - Strictly deduplicated by unique match ID
  const combinedCalendar = useMemo(() => {
    const matchMap = new Map();
    (leagueMatches || []).forEach((m) => {
      if (m && m.id) {
        matchMap.set(m.id, {
          ...m,
          is_cup: Boolean(m.is_knockout || m.tournament?.tournament_type === 'CUP')
        });
      }
    });

    if (cupBracketData?.rounds) {
      cupBracketData.rounds.forEach((rnd) => {
        (rnd.matches || []).forEach((m) => {
          if (m && m.id) {
            matchMap.set(m.id, {
              ...m,
              is_cup: true,
              tournament_name: cupBracketData.tournament?.name || 'جام حذفی'
            });
          }
        });
      });
    }

    return Array.from(matchMap.values()).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }, [leagueMatches, cupBracketData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="font-medium text-sm">در حال بارگذاری مرکز مدیریت مسابقات و تورنمنت‌ها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Hub Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/20 p-6 shadow-2xl shadow-indigo-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                <Trophy className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                مرکز برگزاری و مدیریت لیگ و جام حذفی
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  سیستم خودکار داوری و سینک مربیان
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                برنامه‌ریزی مسابقات، کنترل مهلت ارسال ترکیب، درخت براکت حذفی و تقویم یکپارچه
              </p>
            </div>
          </div>

          {/* Action Hub Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setHubTab('league')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'league'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              مدیریت و برنامه‌ریزی لیگ
            </button>

            <button
              onClick={() => setHubTab('cup')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'cup'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              جام حذفی و براکت
            </button>

            <button
              onClick={() => setHubTab('sync')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'sync'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              تقویم تلفیقی و سینک
            </button>

            <button
              onClick={() => {
                setHubTab('standings');
                fetchStandingsList();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hubTab === 'standings'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Award className="w-4 h-4" />
              مدیریت جدول و جریمه‌ها
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: LEAGUE MANAGEMENT */}
      {hubTab === 'league' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">تیم‌های فعال در لیگ</span>
                <span className="text-2xl font-black text-emerald-400">
                  {activeTeams.length} <span className="text-xs font-normal text-gray-400">از {teams.length}</span>
                </span>
              </div>
              <Users className="w-8 h-8 text-blue-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">هفته فعال فعلی</span>
                <span className="text-2xl font-black text-emerald-400">{gameweekStatus?.active_gameweek || 'هفته ۱'}</span>
              </div>
              <Clock className="w-8 h-8 text-emerald-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">مسابقات لیگ</span>
                <span className="text-2xl font-black text-indigo-400">{leagueMatches.length}</span>
              </div>
              <Calendar className="w-8 h-8 text-indigo-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">بازی‌های انجام‌شده</span>
                <span className="text-2xl font-black text-amber-400">
                  {leagueMatches.filter((m) => m.status === 'FINISHED').length}
                </span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-amber-400/50" />
            </div>
          </div>

          {/* League Generator Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Sliders className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">تنظیمات و تولید هوشمند برنامه مسابقات لیگ</h2>
                  <p className="text-xs text-gray-400">تولید خودکار جدول رفت و برگشت با اختصاص اسلات‌های زمانی بدون تداخل</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetLeague}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/30 transition-all disabled:opacity-50"
                  title="حذف کامل تمام مسابقات لیگ و بازگردانی سیستم به حالت اولیه و خام"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  پاک‌سازی و ریست مسابقات لیگ
                </button>

                <button
                  type="button"
                  onClick={handleGenerateLeague}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  تولید و ثبت برنامه مسابقات
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">نام تورنمنت لیگ</label>
                <input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">تاریخ شروع مسابقات (میلادی)</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله بین هر هفته (روز)</label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={daysBetweenRounds}
                  onChange={(e) => setDaysBetweenRounds(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فرمت برگزاری</label>
                <select
                  value={isDoubleRoundRobin ? 'double' : 'single'}
                  onChange={(e) => setIsDoubleRoundRobin(e.target.value === 'double')}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="double">رفت و برگشت (۳۰ هفته - ۲۴۰ مسابقه)</option>
                  <option value="single">تک‌بازی (۱۵ هفته - ۱۲۰ مسابقه)</option>
                </select>
              </div>
            </div>

            {/* Cup Day Reservation Switch & Config */}
            <div className="p-4 bg-slate-950/90 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      رزرو خودکار روز مسابقات جام حذفی پس از هر دوره لیگ
                      <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-sport font-black">
                        پیش‌فرض فعال
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      هر <strong>{cupIntervalGameweeks} هفته</strong> لیگ روزانه برگزار شده، سپس <strong>۱ روز برای مرحله حذفی</strong> خالی می‌ماند و روز بعد هفته بعدی لیگ آغاز می‌شود (از هر روز شروع شود، این الگو منظم تکرار می‌شود).
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-auto">
                  <input
                    type="checkbox"
                    checked={reserveCupDays}
                    onChange={(e) => setReserveCupDays(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {reserveCupDays && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <label className="text-xs text-gray-300 font-semibold shrink-0">
                    فاصله برگزاری مراحل جام حذفی (هر چند هفته لیگ، ۱ روز بازی حذفی؟):
                  </label>
                  <select
                    value={cupIntervalGameweeks}
                    onChange={(e) => setCupIntervalGameweeks(Number(e.target.value))}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="4">هر ۴ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۵)</option>
                    <option value="5">هر ۵ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۶)</option>
                    <option value="6">هر ۶ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۷ - استاندارد)</option>
                    <option value="7">هر ۷ هفته لیگ (۱ روز مسابقه حذفی، سپس شروع هفته ۸)</option>
                  </select>
                </div>
              )}
            </div>

            {/* League Participating Teams Selector Grid */}
            <div className="bg-slate-950/85 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>انتخاب تیم‌های حاضر در لیگ</span>
                      <span className="text-[11px] font-sport font-black bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
                        {selectedLeagueTeamIds.length} تیم از {activeTeams.length} تیم فعال
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {selectedLeagueTeamIds.length >= 2 ? (
                        <>
                          طول دوره لیگ: <strong>{(selectedLeagueTeamIds.length - 1) * (isDoubleRoundRobin ? 2 : 1)} هفته</strong> ({isDoubleRoundRobin ? 'رفت و برگشت' : 'تک‌بازی'}) | کل مسابقات: <strong>{Math.floor(selectedLeagueTeamIds.length / 2) * (selectedLeagueTeamIds.length - 1) * (isDoubleRoundRobin ? 2 : 1)} بازی</strong>
                        </>
                      ) : (
                        <span className="text-rose-400">حداقل ۲ تیم برای ساخت لیگ انتخاب کنید</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllLeagueTeams}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                  >
                    انتخاب همه ({activeTeams.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllLeagueTeams}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                  >
                    لغو همه
                  </button>
                  {activeTeams.length >= 16 && (
                    <button
                      type="button"
                      onClick={() => handleSelectTopLeagueTeams(16)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/30 transition-all cursor-pointer"
                    >
                      ۱۶ تیم برتر
                    </button>
                  )}
                  {activeTeams.length >= 8 && (
                    <button
                      type="button"
                      onClick={() => handleSelectTopLeagueTeams(8)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                    >
                      ۸ تیم برتر
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar for Teams */}
              {activeTeams.length > 8 && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="جستجوی نام تیم یا مربی..."
                    value={leagueTeamSearch}
                    onChange={(e) => setLeagueTeamSearch(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Teams Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                {activeTeams
                  .filter(t => {
                    if (!leagueTeamSearch) return true;
                    const q = leagueTeamSearch.toLowerCase();
                    return (t.name || '').toLowerCase().includes(q) || (t.manager_name || t.manager?.username || '').toLowerCase().includes(q);
                  })
                  .map((t) => {
                    const isSelected = selectedLeagueTeamIds.includes(t.id);
                    const logoUrl = getTeamLogoUrl(t.name) || t.logo;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleToggleLeagueTeam(t.id)}
                        className={`p-2.5 rounded-2xl border-2 cursor-pointer flex flex-col items-center text-center transition-all relative select-none ${
                          isSelected
                            ? 'bg-gradient-to-b from-indigo-950/90 to-slate-950 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] ring-1 ring-indigo-400 scale-[1.02]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="absolute top-1.5 right-1.5">
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-700'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-xl p-1 bg-slate-950/80 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
                          {logoUrl ? (
                            <img src={logoUrl} alt={t.name} className="w-full h-full object-contain" />
                          ) : (
                            <Shield className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <span className="font-bold text-xs text-white truncate w-full" title={t.name}>
                          {t.name}
                        </span>

                        <span className="text-[9.5px] text-gray-400 truncate w-full mt-0.5">
                          {t.manager_name || t.manager?.username || 'بدون مربی'}
                        </span>

                        <div className="flex items-center gap-1 mt-1 font-sport text-[10px] text-amber-300">
                          <span>{t.star_rating || '4.5'}</span>
                          <span>⭐</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Dedicated Interactive Daily Time Slots Configurator */}
            <div className="bg-slate-950/80 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
              {/* Header & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      اسلات‌های زمانی روزانه مسابقات (ساعت‌های برگزاری بدون تداخل)
                      <span className="text-[11px] font-normal text-indigo-300 bg-indigo-950/70 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        {timeSlots.length} اسلات فعال
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      هر مسابقه در روز به ترتیب در یکی از این ساعت‌ها برگزار می‌شود بدون اینکه همپوشانی زمانی رخ دهد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsTimeSlotEditorOpen(!isTimeSlotEditorOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {isTimeSlotEditorOpen ? 'بستن پنل تنظیمات' : 'تنظیم و ویرایش اسلات‌ها'}
                    {isTimeSlotEditorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Active Slots Visual Timeline / Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-medium">ترتیب ساعات مسابقات در طول روز:</span>
                  <span className="text-[11px] text-gray-400">
                    {activeTeams.length > 0
                      ? `نیاز روزانه برای ${activeTeams.length} تیم فعال: ${Math.floor(activeTeams.length / 2)} مسابقه ${
                          timeSlots.length >= Math.floor(activeTeams.length / 2)
                            ? '✅ (پوشش کامل)'
                            : '⚠️ (تکرار اسلات‌ها)'
                        }`
                      : `${timeSlots.length} بازی در روز`}
                  </span>
                </div>

                {timeSlots.length === 0 ? (
                  <div className="p-4 bg-slate-900/60 rounded-xl border border-red-500/20 text-center text-xs text-red-300">
                    هیچ اسلات زمانی تعریف نشده است! لطفاً حداقل یک ساعت برگزاری مسابقه اضافه کنید یا از دکمه بازنشانی استفاده نمایید.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {timeSlots.map((slot, i) => {
                      // Calculate gap to next slot if available
                      let gapText = null;
                      if (i < timeSlots.length - 1) {
                        const [h1, m1] = slot.split(':').map(Number);
                        const [h2, m2] = timeSlots[i + 1].split(':').map(Number);
                        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (diff < 0) diff += 24 * 60;
                        if (diff > 0) gapText = `${diff} دقیقه`;
                      }

                      return (
                        <div
                          key={i}
                          className="group relative flex items-center bg-slate-900 border border-indigo-500/30 hover:border-indigo-400 rounded-xl p-1.5 pl-2.5 transition-all shadow-sm hover:shadow-md hover:shadow-indigo-950/40"
                        >
                          <span className="text-[10px] font-black text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded-md ml-1.5 border border-indigo-500/20">
                            #{i + 1}
                          </span>
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {slot}
                          </span>
                          {gapText && (
                            <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.2 rounded mr-1.5">
                              +{gapText}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(i)}
                            className="mr-2 text-gray-500 hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-red-500/10"
                            title="حذف این اسلات زمانی"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Collapsible Editor Subpanel */}
              <AnimatePresence>
                {isTimeSlotEditorOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4 pt-3 border-t border-white/5"
                  >
                    {/* Sub-tabs */}
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('auto')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'auto'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        تولید خودکار زنجیره بدون تداخل (پیشنهادی)
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('manual')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'manual'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        افزودن دستی ساعت
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSlotConfigTab('presets')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeSlotConfigTab === 'presets'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        قالب‌های آماده مسابقات
                      </button>
                    </div>

                    {/* TAB 1: Auto Sequential Generator */}
                    {activeSlotConfigTab === 'auto' && (
                      <div className="p-4 bg-slate-900/90 border border-indigo-500/20 rounded-2xl space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">ساعت شروع اولین بازی</label>
                            <input
                              type="time"
                              value={autoStartHour}
                              onChange={(e) => setAutoStartHour(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              مدت هر بازی + وقفه (دقیقه)
                            </label>
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="number"
                                min="10"
                                max="180"
                                value={autoMatchDuration}
                                onChange={(e) => setAutoMatchDuration(e.target.value)}
                                className="w-20 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs font-mono text-white text-center focus:outline-none focus:border-indigo-500"
                              />
                              <div className="flex gap-1 flex-1">
                                {[40, 45, 50, 60].map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setAutoMatchDuration(m)}
                                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex-1 transition-all ${
                                      parseInt(autoMatchDuration, 10) === m
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-950 text-gray-400 hover:text-white border border-white/5'
                                    }`}
                                  >
                                    {m}د
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-300 block mb-1">
                              تعداد مسابقات روزانه
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={autoSlotsCount}
                              onChange={(e) => setAutoSlotsCount(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-gray-400">
                            فرمول: بازی اول در {autoStartHour || '18:00'} و هر {autoMatchDuration} دقیقه مسابقه بعدی شروع خواهد شد.
                          </span>

                          <button
                            type="button"
                            onClick={handleGenerateSequentialSlots}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 shadow-md shadow-indigo-600/30 transition-all"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                            محاسبه و تولید خودکار زنجیره بدون تداخل
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: Manual Add */}
                    {activeSlotConfigTab === 'manual' && (
                      <div className="p-4 bg-slate-900/90 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full">
                          <label className="text-xs font-semibold text-gray-300 block mb-1">انتخاب ساعت برگزاری بازی</label>
                          <input
                            type="time"
                            value={newSlotInput}
                            onChange={(e) => setNewSlotInput(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="w-full sm:w-auto self-end">
                          <button
                            type="button"
                            onClick={() => handleAddSlot(newSlotInput)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            افزودن به لیست اسلات‌ها
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Presets */}
                    {activeSlotConfigTab === 'presets' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {TIME_SLOT_PRESET_TEMPLATES.map((preset) => (
                          <div
                            key={preset.id}
                            className="p-3 bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 rounded-2xl space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white">{preset.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                                  {preset.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mb-2">{preset.desc}</p>
                              <div className="flex flex-wrap gap-1">
                                {preset.slots.map((s, idx) => (
                                  <span key={idx} className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-gray-300 border border-white/5">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplyPreset(preset.slots, preset.name)}
                              className="mt-2 w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/30 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              اعمال این قالب
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Quick Tools */}
                    <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
                      <button
                        type="button"
                        onClick={handleResetSlots}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-400 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        بازنشانی به اسلات‌های پیش‌فرض
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllSlots}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        پاک‌سازی اسلات‌ها
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Gameweek Selector & Control Center */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  مدیریت هفته‌ها و کنترل وضعیت بازی‌ها
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  انتخاب هفته، قفل تاکتیک، ارسال نوتیفیکیشن مربیان و ویرایش زمان مسابقات
                </p>
              </div>

              {/* Gameweek Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGameweekAction('LOCK_TACTICS')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300 transition-all"
                  title="قفل کردن ثبت ترکیب توسط مربیان برای مسابقات این هفته"
                >
                  <Lock className="w-3.5 h-3.5" />
                  قفل مهلت ترکیب
                </button>

                <button
                  onClick={() => handleGameweekAction('UNLOCK_TACTICS')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 transition-all"
                  title="باز کردن مجدد ارسال ترکیب"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  باز کردن ترکیب
                </button>

                <button
                  onClick={() => handleGameweekAction('NOTIFY_COACHES')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300 transition-all"
                  title="ارسال اعلان به مربیان تیم‌های این هفته"
                >
                  <Bell className="w-3.5 h-3.5" />
                  ارسال پیامک/اعلان مربیان
                </button>

                <button
                  onClick={() => handleGameweekAction('AUTO_FORFEIT_UNSUBMITTED')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 transition-all"
                  title="اعمال باخت فنی ۳-۰ به تیم‌هایی که تا شروع بازی ترکیب نداده‌اند"
                >
                  <Zap className="w-3.5 h-3.5" />
                  باخت فنی تیم‌های بدون ترکیب
                </button>
              </div>
            </div>

            {/* Gameweek Tabs Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {(gameweekStatus?.gameweeks || []).map((gw) => {
                const isSelected = gw.round_name === selectedGameweek;
                const isFinished = gw.is_finished;
                return (
                  <button
                    key={gw.round_name}
                    onClick={() => setSelectedGameweek(gw.round_name)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-105'
                        : isFinished
                        ? 'bg-slate-950 border-white/5 text-gray-500 hover:text-gray-300'
                        : 'bg-slate-950/80 border-white/10 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <span>{gw.round_name}</span>
                    <span className="text-[10px] opacity-75">
                      {isFinished ? 'پایان‌یافته' : `${gw.finished_matches || 0}/${gw.total_matches || 0}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Gameweek Matches List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-300 flex items-center justify-between">
                <span>مسابقات {selectedGameweek} ({currentGameweekMatches.length} مسابقه):</span>
              </h4>

              {currentGameweekMatches.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-slate-950/50 rounded-2xl border border-white/5">
                  هیچ مسابقه‌ای برای این هفته یافت نشد. لطفاً از دکمه «تولید و ثبت برنامه مسابقات» استفاده کنید.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentGameweekMatches.map((match) => {
                    const isEditing = editingMatchId === match.id;
                    const isFinished = match.status === 'FINISHED';
                    const isLive = match.status === 'LIVE';

                    return (
                      <div
                        key={match.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isLive
                            ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/30'
                            : isFinished
                            ? 'bg-slate-950/60 border-white/5'
                            : 'bg-slate-950/90 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                          <span className="font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {match.date ? new Date(match.date).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' }) : 'زمان نامشخص'}
                            {' - '}
                            {match.date ? new Date(match.date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }) : ''}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isLive
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                : isFinished
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-gray-300'
                            }`}
                          >
                            {isLive ? '🔴 در حال برگزاری' : isFinished ? 'پایان‌یافته' : 'برنامه‌ریزی‌شده'}
                          </span>
                        </div>

                        {/* Match Teams Row */}
                        <div className="flex items-center justify-between py-2 border-y border-white/5">
                          {/* Home Team */}
                          <div className="flex items-center gap-2 flex-1">
                            <img
                              src={getTeamLogoUrl(match.home_team_name, match.home_team_logo)}
                              alt={match.home_team_name}
                              className="w-7 h-7 object-contain"
                            />
                            <span className="text-sm font-bold text-white truncate">{match.home_team_name}</span>
                          </div>

                          {/* Score / VS */}
                          <div className="px-3 py-1 bg-slate-900 rounded-xl font-mono font-black text-sm text-white">
                            {isFinished || isLive ? `${match.home_score} - ${match.away_score}` : 'VS'}
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center justify-end gap-2 flex-1">
                            <span className="text-sm font-bold text-white truncate">{match.away_team_name}</span>
                            <img
                              src={getTeamLogoUrl(match.away_team_name, match.away_team_logo)}
                              alt={match.away_team_name}
                              className="w-7 h-7 object-contain"
                            />
                          </div>
                        </div>

                        {/* Match Actions */}
                        <div className="mt-3 flex items-center justify-between gap-2 pt-1 text-xs">
                          {isEditing ? (
                            <div className="w-full space-y-2 bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="datetime-local"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                />
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value)}
                                  className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                >
                                  <option value="SCHEDULED">برنامه‌ریزی شده</option>
                                  <option value="LIVE">در حال برگزاری</option>
                                  <option value="FINISHED">پایان یافته</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-white/10">
                                  <span className="text-[10px] text-gray-400 shrink-0">گل میزبان:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editHomeScore}
                                    onChange={(e) => setEditHomeScore(e.target.value)}
                                    className="w-full bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-white/10">
                                  <span className="text-[10px] text-gray-400 shrink-0">گل میهمان:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editAwayScore}
                                    onChange={(e) => setEditAwayScore(e.target.value)}
                                    className="w-full bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveMatchEdit(match.id)}
                                  className="flex-1 py-1 bg-emerald-600 rounded-lg text-white font-bold text-[11px] hover:bg-emerald-500 transition-colors"
                                >
                                  ذخیره
                                </button>
                                <button
                                  onClick={() => setEditingMatchId(null)}
                                  className="px-3 py-1 bg-slate-800 rounded-lg text-gray-300 text-[11px] hover:bg-slate-700 transition-colors"
                                >
                                  لغو
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                {onOpenRefereeRoom && (
                                  <button
                                    onClick={() => onOpenRefereeRoom(match)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-[11px] shadow-md shadow-cyan-600/30 transition-all cursor-pointer font-sport active:scale-95"
                                    title="ورود مستقیم به اتاق داوری و کنترل زنده این مسابقه"
                                  >
                                    <span>⚖️</span>
                                    <span>ورود به اتاق داوری</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleStartEditMatch(match)}
                                  className="text-gray-300 hover:text-indigo-300 font-medium text-[11px] px-2 py-1 bg-slate-900/90 rounded-xl border border-white/10 transition-all hover:border-indigo-500/40"
                                >
                                  ✏️ ویرایش ساعت/نتیجه
                                </button>
                              </div>

                              {!isFinished && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleForfeit(match.id, 'away')}
                                    className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold"
                                    title="ثبت باخت فنی ۳-۰ به نفع میزبان"
                                  >
                                    باخت فنی میهمان (۳-۰)
                                  </button>
                                  <button
                                    onClick={() => handleForfeit(match.id, 'home')}
                                    className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold"
                                    title="ثبت باخت فنی ۳-۰ به نفع میهمان"
                                  >
                                    باخت فنی میزبان (۰-۳)
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOCKOUT CUP & BRACKET */}
      {hubTab === 'cup' && (
        <div className="space-y-6">
          {/* Create Cup Form Card */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">برگزاری و ایجاد جام حذفی جدید (Knockout Cup)</h2>
                  <p className="text-xs text-gray-400">قرعه‌کشی خودکار، ساخت درخت براکت و تعیین زمان‌بندی مراحل</p>
                </div>
              </div>

              {/* Reset / Purge Cup Button */}
              <button
                type="button"
                onClick={handleResetCup}
                disabled={actionLoading || cupsList.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 transition-all shadow-md shadow-red-950/50 active:scale-95 disabled:opacity-40"
                title="حذف کامل تمام مسابقات جام حذفی و بازنشانی به سیستم خام"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>پاکسازی و ریست مسابقات جام حذفی</span>
              </button>
            </div>

            <form onSubmit={handleCreateCup} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">نام جام حذفی</label>
                  <input
                    type="text"
                    value={newCupName}
                    onChange={(e) => setNewCupName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">تاریخ شروع مرحله اول</label>
                  <input
                    type="date"
                    value={newCupStartDate}
                    onChange={(e) => setNewCupStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله بین مراحل (روز)</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={newCupDaysBetween}
                    onChange={(e) => setNewCupDaysBetween(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={actionLoading || selectedCupTeamIds.length < 2 || !Number.isInteger(Math.log2(selectedCupTeamIds.length))}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    ایجاد و قرعه‌کشی جام حذفی ({selectedCupTeamIds.length} تیم)
                  </button>
                </div>
              </div>

              {/* Cup Participating Teams Selector Grid */}
              <div className="bg-slate-950/85 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-inner">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>انتخاب تیم‌های حاضر در جام حذفی</span>
                        <span className="text-[11px] font-sport font-black bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
                          {selectedCupTeamIds.length} تیم منتخب
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {Number.isInteger(Math.log2(selectedCupTeamIds.length)) && selectedCupTeamIds.length >= 2 ? (
                          <span className="text-emerald-400 font-bold">
                            ✓ ساختار براکت متقارن: {selectedCupTeamIds.length === 16 ? '۴ مرحله (یک‌هشتم، یک‌چهارم، نیمه‌نهایی، فینال - ۱۵ مسابقه)' : selectedCupTeamIds.length === 8 ? '۳ مرحله (یک‌چهارم، نیمه‌نهایی، فینال - ۷ مسابقه)' : selectedCupTeamIds.length === 4 ? '۲ مرحله (نیمه‌نهایی، فینال - ۳ مسابقه)' : `${Math.log2(selectedCupTeamIds.length)} مرحله`}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">
                            ⚠️ توجه: برای تشکیل براکت متقارن، تعداد تیم‌ها باید توانی از ۲ باشد (مثلاً ۴، ۸، ۱۶ یا ۳۲ تیم).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyLeagueTeamsToCup}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="کپی کردن لیست تیم‌های انتخاب شده در فرم لیگ"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>کپی از تیم‌های لیگ ({selectedLeagueTeamIds.length})</span>
                    </button>
                    {activeTeams.length >= 16 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTopCupTeams(16)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                      >
                        ۱۶ تیم 🏆
                      </button>
                    )}
                    {activeTeams.length >= 8 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTopCupTeams(8)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-500/30 transition-all cursor-pointer"
                      >
                        ۸ تیم ⭐
                      </button>
                    )}
                    {activeTeams.length >= 4 && (
                      <button
                        type="button"
                        onClick={() => handleSelectTopCupTeams(4)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-yellow-950/80 hover:bg-yellow-900 text-yellow-300 border border-yellow-500/30 transition-all cursor-pointer"
                      >
                        ۴ تیم ⚡
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSelectAllCupTeams}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer"
                    >
                      همه ({activeTeams.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCupTeams}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                    >
                      لغو همه
                    </button>
                  </div>
                </div>

                {/* Search Bar for Cup Teams */}
                {activeTeams.length > 8 && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="جستجوی نام تیم یا مربی..."
                      value={cupTeamSearch}
                      onChange={(e) => setCupTeamSearch(e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Cup Teams Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                  {activeTeams
                    .filter(t => {
                      if (!cupTeamSearch) return true;
                      const q = cupTeamSearch.toLowerCase();
                      return (t.name || '').toLowerCase().includes(q) || (t.manager_name || t.manager?.username || '').toLowerCase().includes(q);
                    })
                    .map((t) => {
                      const isSelected = selectedCupTeamIds.includes(t.id);
                      const logoUrl = getTeamLogoUrl(t.name) || t.logo;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleToggleCupTeam(t.id)}
                          className={`p-2.5 rounded-2xl border-2 cursor-pointer flex flex-col items-center text-center transition-all relative select-none ${
                            isSelected
                              ? 'bg-gradient-to-b from-amber-950/90 to-slate-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400 scale-[1.02]'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="absolute top-1.5 right-1.5">
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-950 border-slate-700'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="w-10 h-10 rounded-xl p-1 bg-slate-950/80 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
                            {logoUrl ? (
                              <img src={logoUrl} alt={t.name} className="w-full h-full object-contain" />
                            ) : (
                              <Shield className="w-5 h-5 text-slate-600" />
                            )}
                          </div>

                          <span className="font-bold text-xs text-white truncate w-full" title={t.name}>
                            {t.name}
                          </span>

                          <span className="text-[9.5px] text-gray-400 truncate w-full mt-0.5">
                            {t.manager_name || t.manager?.username || 'بدون مربی'}
                          </span>

                          <div className="flex items-center gap-1 mt-1 font-sport text-[10px] text-amber-300">
                            <span>{t.star_rating || '4.5'}</span>
                            <span>⭐</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </form>
          </div>

          {/* Active Cup Tournaments Picker */}
          {cupsList.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-xs font-bold text-gray-400 flex-shrink-0">جام‌های حذفی موجود:</span>
              {cupsList.map((cup) => (
                <div
                  key={cup.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedCupId === cup.id
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  <button onClick={() => setSelectedCupId(cup.id)} className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    {cup.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCup(cup.id)}
                    className="text-gray-500 hover:text-red-400 ml-1"
                    title="حذف این جام حذفی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Stage-by-Stage Knockout Match Management (identical to League management with knockout features) */}
          {cupBracketData?.rounds && cupBracketData.rounds.length > 0 && (
            <div className="bg-slate-900/90 border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-amber-400" />
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>مدیریت مسابقات جام حذفی به تفکیک مرحله</span>
                      <span className="text-[11px] font-sport font-black bg-amber-950 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                        {selectedCupStage || 'مراحل حذفی'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400">کنترل ساعت برگزاری، ثبت نتایج، ضیافت پنالتی‌ها، باخت فنی و صعود مستقیم به مرحله بعد</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    تعداد مسابقات مرحله: <strong className="text-amber-300 font-sport font-bold">{currentCupStageMatches.length}</strong>
                  </span>
                </div>
              </div>

              {/* Cup Stages Tabs Carousel */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {(cupStages || []).map((stg) => {
                  const isSelected = stg.name === selectedCupStage;
                  const isFinished = stg.is_finished;
                  return (
                    <button
                      key={stg.name}
                      onClick={() => setSelectedCupStage(stg.name)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white shadow-lg shadow-amber-600/30 scale-105'
                          : isFinished
                          ? 'bg-slate-950 border-white/5 text-gray-500 hover:text-gray-300'
                          : 'bg-slate-950/80 border-white/10 text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        {stg.name === 'فینال' && <span>🏆</span>}
                        <span>{stg.name}</span>
                      </span>
                      <span className="text-[10px] opacity-75 font-sport">
                        {isFinished ? '✓ پایان‌یافته' : `${stg.finished_matches || 0}/${stg.total_matches || 0} بازی`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Current Stage Matches List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-300 flex items-center justify-between">
                  <span>مسابقات مرحله «{selectedCupStage}» ({currentCupStageMatches.length} مسابقه):</span>
                </h4>

                {currentCupStageMatches.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 bg-slate-950/50 rounded-2xl border border-white/5">
                    مسابقه‌ای برای این مرحله یافت نشد.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(currentCupStageMatches || []).map((match) => {
                      const isEditing = editingMatchId === match.id;
                      const isFinished = match.status === 'FINISHED';
                      const isLive = match.status === 'LIVE';
                      const isExtraTime = match.half_status === 'EXTRA_TIME';
                      const isPenalties = match.half_status === 'PENALTIES';
                      const hasPenalties = match.home_penalties !== null && match.away_penalties !== null && match.home_penalties !== undefined && match.away_penalties !== undefined;
                      
                      const homeWon = isFinished && (
                        match.home_score > match.away_score || 
                        (match.home_score === match.away_score && hasPenalties && match.home_penalties > match.away_penalties)
                      );
                      const awayWon = isFinished && (
                        match.away_score > match.home_score || 
                        (match.home_score === match.away_score && hasPenalties && match.away_penalties > match.home_penalties)
                      );

                      return (
                        <div
                          key={match.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isLive
                              ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/30'
                              : isFinished
                              ? 'bg-slate-950/60 border-amber-500/20'
                              : 'bg-slate-950/90 border-white/10 hover:border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                            <span className="font-mono flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              {match.date ? new Date(match.date).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' }) : 'زمان نامشخص'}
                              {' - '}
                              {match.date ? new Date(match.date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }) : ''}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isLive
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                                  : isFinished
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-800 text-gray-300'
                              }`}
                            >
                              {isLive
                                ? (isExtraTime ? '⏱️ وقت اضافه' : isPenalties ? '🥅 ضربات پنالتی' : '🔴 در حال برگزاری')
                                : isFinished
                                ? 'پایان‌یافته'
                                : 'برنامه‌ریزی‌شده'}
                            </span>
                          </div>

                          {/* Match Teams Row */}
                          <div className="flex items-center justify-between py-2 border-y border-white/5">
                            {/* Home Team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {match.home_team_logo ? (
                                <img
                                  src={getTeamLogoUrl(match.home_team_name, match.home_team_logo)}
                                  alt={match.home_team_name || ''}
                                  className="w-7 h-7 object-contain shrink-0"
                                />
                              ) : (
                                <Shield className="w-6 h-6 text-slate-600 shrink-0" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm font-bold truncate ${homeWon ? 'text-amber-300 font-black' : 'text-white'}`}>
                                  {match.home_team_name || 'در انتظار برنده...'}
                                </span>
                                {homeWon && (
                                  <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                                    <span>🏆 برنده / صعود</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Score / VS & Penalty Badge */}
                            <div className="flex flex-col items-center px-3 py-1 bg-slate-900 rounded-xl">
                              <span className="font-mono font-black text-sm text-white">
                                {isFinished || isLive ? `${match.home_score} - ${match.away_score}` : 'VS'}
                              </span>
                              {hasPenalties && (
                                <span className="text-[9.5px] font-sport text-amber-300 font-bold mt-0.5">
                                  پنالتی: ({match.home_penalties} - {match.away_penalties})
                                </span>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                              <div className="flex flex-col items-end min-w-0">
                                <span className={`text-sm font-bold truncate ${awayWon ? 'text-amber-300 font-black' : 'text-white'}`}>
                                  {match.away_team_name || 'در انتظار برنده...'}
                                </span>
                                {awayWon && (
                                  <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                                    <span>🏆 برنده / صعود</span>
                                  </span>
                                )}
                              </div>
                              {match.away_team_logo ? (
                                <img
                                  src={getTeamLogoUrl(match.away_team_name, match.away_team_logo)}
                                  alt={match.away_team_name || ''}
                                  className="w-7 h-7 object-contain shrink-0"
                                />
                              ) : (
                                <Shield className="w-6 h-6 text-slate-600 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Match Actions / In-Place Editor */}
                          <div className="mt-3 flex items-center justify-between gap-2 pt-1 text-xs">
                            {isEditing ? (
                              <div className="w-full space-y-2.5 bg-slate-900 p-3 rounded-xl border border-amber-500/40">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-gray-400 block mb-1">تاریخ و ساعت مسابقه:</label>
                                    <input
                                      type="datetime-local"
                                      value={editDate}
                                      onChange={(e) => setEditDate(e.target.value)}
                                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-400 block mb-1">وضعیت مسابقه:</label>
                                    <select
                                      value={editStatus}
                                      onChange={(e) => setEditStatus(e.target.value)}
                                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                                    >
                                      <option value="SCHEDULED">برنامه‌ریزی شده</option>
                                      <option value="LIVE">در حال برگزاری</option>
                                      <option value="FINISHED">پایان یافته</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Goals & Penalties Input Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Goals */}
                                  <div className="p-2 bg-slate-950/80 rounded-xl border border-white/10 space-y-1.5">
                                    <span className="text-[10px] font-bold text-gray-300 block">گل‌های جریان بازی:</span>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-400 shrink-0">میزبان:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editHomeScore}
                                          onChange={(e) => setEditHomeScore(e.target.value)}
                                          className="w-full bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-gray-400 shrink-0">میهمان:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={editAwayScore}
                                          onChange={(e) => setEditAwayScore(e.target.value)}
                                          className="w-full bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono font-bold"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Penalties */}
                                  <div className="p-2 bg-amber-950/40 rounded-xl border border-amber-500/30 space-y-1.5">
                                    <span className="text-[10px] font-bold text-amber-300 block">ضربات پنالتی (در صورت تساوی):</span>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-amber-400 shrink-0">میزبان:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="-"
                                          value={editHomePenalties}
                                          onChange={(e) => setEditHomePenalties(e.target.value)}
                                          className="w-full bg-slate-900 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono font-bold"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1 flex-1">
                                        <span className="text-[10px] text-amber-400 shrink-0">میهمان:</span>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="-"
                                          value={editAwayPenalties}
                                          onChange={(e) => setEditAwayPenalties(e.target.value)}
                                          className="w-full bg-slate-900 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs text-amber-200 font-mono font-bold"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => handleSaveMatchEdit(match.id)}
                                    className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-lg text-white font-bold text-[11px] shadow-md transition-all cursor-pointer"
                                  >
                                    ذخیره تغییرات و صعود هوشمند برنده
                                  </button>
                                  <button
                                    onClick={() => setEditingMatchId(null)}
                                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-300 text-[11px] transition-colors cursor-pointer"
                                  >
                                    لغو
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {onOpenRefereeRoom && (
                                    <button
                                      onClick={() => onOpenRefereeRoom(match)}
                                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold text-[11px] shadow-md shadow-amber-600/30 transition-all cursor-pointer font-sport active:scale-95"
                                      title="ورود مستقیم به اتاق داوری و کنترل زنده این مسابقه حذفی"
                                    >
                                      <span>⚖️</span>
                                      <span>ورود به اتاق داوری</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleStartEditMatch(match)}
                                    className="text-gray-300 hover:text-amber-300 font-medium text-[11px] px-2 py-1 bg-slate-900/90 rounded-xl border border-white/10 transition-all hover:border-amber-500/40"
                                  >
                                    ✏️ ویرایش ساعت/نتیجه
                                  </button>

                                  {isFinished && match.next_match_id && (
                                    <button
                                      onClick={() => handleAdvanceWinner(match.id)}
                                      className="px-2 py-1 rounded-xl text-[10px] font-bold bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1 shadow-sm"
                                      title="صعود دستی برنده به مسابقه مرحله بعدی در صورت عدم پیشروی خودکار"
                                    >
                                      <span>صعود دستی برنده ➔</span>
                                    </button>
                                  )}
                                </div>

                                {!isFinished && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleForfeit(match.id, 'away')}
                                      className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold transition-colors"
                                      title="ثبت باخت فنی ۳-۰ به نفع میزبان و صعود مستقیم میزبان"
                                    >
                                      باخت فنی میهمان (۳-۰)
                                    </button>
                                    <button
                                      onClick={() => handleForfeit(match.id, 'home')}
                                      className="px-2 py-0.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/50 text-[10px] font-bold transition-colors"
                                      title="ثبت باخت فنی ۳-۰ به نفع میهمان و صعود مستقیم میهمان"
                                    >
                                      باخت فنی میزبان (۰-۳)
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Knockout Bracket Display */}
          {cupBracketData?.rounds && cupBracketData.rounds.length > 0 ? (
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    درخت براکت حذفی: {cupBracketData.tournament?.name}
                  </h3>
                  <p className="text-xs text-gray-400">مسیر پیشروی تیم‌ها از مرحله اول تا فینال و کسب جام قهرمانی</p>
                </div>
              </div>

              {/* Bracket Columns */}
              <div className="flex items-start gap-8 min-w-[800px] py-4">
                {cupBracketData.rounds.map((rnd, rIndex) => (
                  <div key={rnd.name} className="flex-1 flex flex-col items-center space-y-4">
                    {/* Round Header */}
                    <div className="w-full text-center py-2 px-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
                      <span className="text-xs font-black text-amber-300 block">{rnd.name}</span>
                      <span className="text-[10px] text-gray-400">{rnd.matches?.length || 0} مسابقه</span>
                    </div>

                    {/* Round Matches */}
                    <div className="w-full space-y-4 flex flex-col justify-around h-full">
                      {(rnd.matches || []).map((m) => {
                        const isFinished = m.status === 'FINISHED';
                        const hasWinner = isFinished && (m.home_score !== m.away_score || m.home_penalties !== m.away_penalties);

                        return (
                          <div
                            key={m.id}
                            className={`w-full p-3 bg-slate-950/90 rounded-2xl border transition-all shadow-md ${
                              isFinished ? 'border-amber-500/30 bg-slate-950/60' : 'border-white/10'
                            }`}
                          >
                            <div className="text-[10px] text-gray-400 mb-1.5 flex items-center justify-between">
                              <span>مسابقه #{m.id}</span>
                              <span className="font-mono">
                                {m.date ? new Date(m.date).toLocaleDateString('fa-IR') : 'زمان تعیین‌نشده'}
                              </span>
                            </div>

                            {/* Home Team */}
                            <div className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-1.5 truncate">
                                {m.home_team_logo && (
                                  <img src={getTeamLogoUrl(m.home_team_name, m.home_team_logo)} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className={`text-xs font-bold truncate ${m.home_score > m.away_score ? 'text-amber-300' : 'text-gray-300'}`}>
                                  {m.home_team_name || 'در انتظار برنده...'}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white px-1.5">{isFinished ? m.home_score : '-'}</span>
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center justify-between py-1 border-t border-white/5">
                              <div className="flex items-center gap-1.5 truncate">
                                {m.away_team_logo && (
                                  <img src={getTeamLogoUrl(m.away_team_name, m.away_team_logo)} alt="" className="w-4 h-4 object-contain" />
                                )}
                                <span className={`text-xs font-bold truncate ${m.away_score > m.home_score ? 'text-amber-300' : 'text-gray-300'}`}>
                                  {m.away_team_name || 'در انتظار برنده...'}
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-white px-1.5">{isFinished ? m.away_score : '-'}</span>
                            </div>

                            {/* Advance Winner Action */}
                            {isFinished && !m.next_match_id && rIndex === cupBracketData.rounds.length - 1 ? (
                              <div className="mt-2 text-center text-[11px] font-black text-amber-400 bg-amber-500/10 py-1 rounded-lg border border-amber-500/20">
                                🏆 قهرمان جام: {m.home_score > m.away_score ? m.home_team_name : m.away_team_name}
                              </div>
                            ) : isFinished && m.next_match_id ? (
                              <button
                                onClick={() => handleAdvanceWinner(m.id)}
                                className="w-full mt-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all"
                              >
                                صعود برنده به مرحله بعد ➔
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 bg-slate-900/60 rounded-3xl border border-white/10">
              هنوز هیچ تورنمنت جام حذفی فعالی ایجاد نشده است. از فرم بالا برای ایجاد اولین جام حذفی استفاده نمایید.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMBINED SYNC CALENDAR */}
      {hubTab === 'sync' && (
        <div className="space-y-6">
          {/* Sync Controller Box */}
          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">موتور سینک و تلفیق هوشمند جام حذفی با لیگ</h2>
                  <p className="text-xs text-gray-400">جاگذاری مراحل جام حذفی در میان هفته‌های لیگ بدون تداخل زمانی</p>
                </div>
              </div>

              <button
                onClick={handleSyncCalendar}
                disabled={actionLoading || !selectedCupId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                اجرای سینک و ادغام تقویم مسابقات
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">انتخاب جام حذفی برای سینک با لیگ</label>
                <select
                  value={selectedCupId || ''}
                  onChange={(e) => setSelectedCupId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- انتخاب جام حذفی --</option>
                  {cupsList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">فاصله زمانی جاگذاری (هر چند هفته لیگ، یک مرحله حذفی؟)</label>
                <select
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="2">هر ۲ هفته لیگ (فشرده)</option>
                  <option value="3">هر ۳ هفته لیگ</option>
                  <option value="4">هر ۴ هفته لیگ (استاندارد)</option>
                  <option value="5">هر ۵ هفته لیگ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Unified Master Timeline Calendar */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              گاه‌شمار یکپارچه فصل (تقویم کلی مسابقات لیگ + جام حذفی)
            </h3>

            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {combinedCalendar.map((m) => {
                const isCup = m.is_cup || m.is_knockout;
                const isFinished = m.status === 'FINISHED';

                return (
                  <div key={`${isCup ? 'cup' : 'league'}-${m.id}`} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                          isCup
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {isCup ? '🏆 جام حذفی' : '⚽ لیگ'}
                      </span>

                      <div>
                        <span className="text-xs font-bold text-white block">
                          {m.home_team_name || 'TBD'} vs {m.away_team_name || 'TBD'}
                        </span>
                        <span className="text-[11px] text-gray-400">{m.round_name}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <span className="text-gray-300 block">
                        {m.date ? new Date(m.date).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'تعیین‌نشده'}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {m.date ? new Date(m.date).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEAGUE STANDINGS & PENALTY MANAGEMENT */}
      {hubTab === 'standings' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">تعداد تیم‌ها در جدول</span>
                <span className="text-2xl font-black text-amber-400">
                  {standingsList.length} <span className="text-xs font-normal text-gray-400">باشگاه</span>
                </span>
              </div>
              <Trophy className="w-8 h-8 text-amber-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">تیم‌های دارای جریمه کسر امتیاز</span>
                <span className="text-2xl font-black text-rose-400">
                  {standingsList.filter(r => (r.points_deduction || 0) > 0).length} <span className="text-xs font-normal text-gray-400">تیم</span>
                </span>
              </div>
              <Scale className="w-8 h-8 text-rose-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">تیم‌های ویرایش‌شده دستی</span>
                <span className="text-2xl font-black text-cyan-400">
                  {standingsList.filter(r => r.is_manually_overridden).length} <span className="text-xs font-normal text-gray-400">تیم</span>
                </span>
              </div>
              <Edit3 className="w-8 h-8 text-cyan-400/50" />
            </div>

            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-1">صدرنشین فعلی لیگ</span>
                <span className="text-base sm:text-lg font-black text-white truncate max-w-[120px] block">
                  {standingsList[0]?.name || '—'}
                </span>
              </div>
              <Award className="w-8 h-8 text-emerald-400/50" />
            </div>
          </div>

          {/* Action Bar & Table Container */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Award className="text-amber-400" size={20} />
                  <span>مدیریت رسمی جدول لیگ و کنترل دستی / جریمه‌ها</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  امکان ویرایش مستقیم مقادیر تمام تیم‌ها (برد، باخت، گل‌ها، امتیاز) و اعمال احکام انضباطی کسر امتیاز
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleRecalculateStandings}
                  disabled={recalculatingStandings || actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                  title="بازسازی و محاسبه مجدد هوشمند جدول از روی نتایج واقعی تمام بازی‌ها (جریمه‌های امتیازی حفظ می‌شوند)"
                >
                  <RefreshCw size={14} className={recalculatingStandings ? 'animate-spin' : ''} />
                  <span>{recalculatingStandings ? 'در حال محاسبه مجدد...' : 'محاسبه مجدد خودکار جدول'}</span>
                </button>

                <button
                  onClick={fetchStandingsList}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-bold rounded-2xl border border-cyan-500/30 transition-all active:scale-95"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>بروزرسانی</span>
                </button>
              </div>
            </div>

            {/* Standings Edit Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-700/60 text-[11px] text-slate-400 font-bold font-sport tracking-wider">
                    <th className="py-3 px-2 text-center w-10">#</th>
                    <th className="py-3 px-3 min-w-[160px]">باشگاه (CLUB)</th>
                    <th className="py-3 px-2 text-center w-16" title="بازی‌های انجام شده">MP</th>
                    <th className="py-3 px-2 text-center w-16 text-emerald-400" title="برد">W</th>
                    <th className="py-3 px-2 text-center w-16 text-slate-400" title="مساوی">D</th>
                    <th className="py-3 px-2 text-center w-16 text-rose-400" title="باخت">L</th>
                    <th className="py-3 px-2 text-center w-16 text-slate-300" title="گل زده">GF</th>
                    <th className="py-3 px-2 text-center w-16 text-slate-400" title="گل خورده">GA</th>
                    <th className="py-3 px-2 text-center w-16" title="تفاضل گل">GD</th>
                    <th className="py-3 px-2 text-center w-20 text-slate-300" title="امتیاز اصلی">امتیاز اصلی</th>
                    <th className="py-3 px-3 text-center w-28 text-rose-400" title="جریمه کسر امتیاز">جریمه</th>
                    <th className="py-3 px-3 text-center w-20 text-amber-300 font-black text-sm" title="امتیاز نهایی">PTS نهایی</th>
                    <th className="py-3 px-3 text-center min-w-[160px]">عملیات ادمین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {standingsList.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="py-10 text-center text-gray-500">
                        جدولی برای نمایش یافت نشد. می‌توانید با زدن دکمه «محاسبه مجدد خودکار جدول» آن را بازسازی کنید.
                      </td>
                    </tr>
                  ) : (
                    standingsList.map((row, idx) => {
                      const isEditing = editingStandingId === (row.id || row.team_id);
                      const rank = row.rank || idx + 1;
                      const rawPts = row.raw_points ?? row.points ?? 0;
                      const gd = isEditing
                        ? (parseInt(editFormData.gf, 10) || 0) - (parseInt(editFormData.ga, 10) || 0)
                        : (row.gf || 0) - (row.ga || 0);

                      return (
                        <tr
                          key={row.id || row.team_id || idx}
                          className={`transition-all ${
                            isEditing
                              ? 'bg-indigo-950/40 border-y-2 border-indigo-500/50'
                              : row.points_deduction > 0
                              ? 'bg-rose-950/10 hover:bg-slate-900/60'
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black bg-slate-800 text-slate-300 font-sport">
                              {rank}
                            </span>
                          </td>

                          {/* Team Name & Logo */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl team-crest-badge flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm relative">
                                {getTeamLogoUrl(row) ? (
                                  <img
                                    src={getTeamLogoUrl(row)}
                                    alt={row.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : null}
                                <span className="text-[10px] font-black text-slate-800 font-sport -z-10 absolute">
                                  {row.name ? row.name.slice(0, 2).toUpperCase() : 'FC'}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-white truncate max-w-[140px]">
                                  {row.name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {row.is_manually_overridden && (
                                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/30">
                                      ★ دستی
                                    </span>
                                  )}
                                  {row.points_deduction > 0 && (
                                    <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 py-0.2 rounded border border-rose-500/30">
                                      جریمه‌دار
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* MP */}
                          <td className="py-3 px-2 text-center font-bold text-slate-300">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.played ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, played: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-white"
                              />
                            ) : (
                              row.played || 0
                            )}
                          </td>

                          {/* W */}
                          <td className="py-3 px-2 text-center text-emerald-400 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.won ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, won: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-emerald-300"
                              />
                            ) : (
                              row.won || 0
                            )}
                          </td>

                          {/* D */}
                          <td className="py-3 px-2 text-center text-slate-400 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.drawn ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, drawn: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-slate-300"
                              />
                            ) : (
                              row.drawn || 0
                            )}
                          </td>

                          {/* L */}
                          <td className="py-3 px-2 text-center text-rose-400 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.lost ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, lost: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-rose-300"
                              />
                            ) : (
                              row.lost || 0
                            )}
                          </td>

                          {/* GF */}
                          <td className="py-3 px-2 text-center text-slate-300 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.gf ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, gf: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-slate-200"
                              />
                            ) : (
                              row.gf || 0
                            )}
                          </td>

                          {/* GA */}
                          <td className="py-3 px-2 text-center text-slate-400 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.ga ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, ga: e.target.value })}
                                className="w-14 bg-slate-950 border border-indigo-500/50 rounded px-1 py-1 text-center text-xs font-mono text-slate-400"
                              />
                            ) : (
                              row.ga || 0
                            )}
                          </td>

                          {/* GD */}
                          <td className={`py-3 px-2 text-center font-black text-xs font-sport ${
                            gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {gd > 0 ? `+${gd}` : gd}
                          </td>

                          {/* Raw Points */}
                          <td className="py-3 px-2 text-center text-slate-300 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                value={editFormData.raw_points ?? 0}
                                onChange={(e) => setEditFormData({ ...editFormData, raw_points: e.target.value })}
                                className="w-16 bg-slate-950 border border-amber-500/50 rounded px-1 py-1 text-center text-xs font-mono text-amber-300 font-bold"
                              />
                            ) : (
                              rawPts
                            )}
                          </td>

                          {/* Deduction Penalty */}
                          <td className="py-3 px-3 text-center">
                            {row.points_deduction > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-help"
                                title={`علت: ${row.points_deduction_reason || 'جریمه انضباطی'}`}
                              >
                                <span className="font-mono">-{row.points_deduction}</span>
                                <span className="text-[10px]">امتیاز</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Final Net Points */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-black text-amber-300 text-sm font-sport">
                              {isEditing
                                ? Math.max(0, (parseInt(editFormData.raw_points, 10) || 0) - (parseInt(editFormData.points_deduction, 10) || 0))
                                : row.points ?? Math.max(0, rawPts - (row.points_deduction || 0))}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleSaveEditStanding(row)}
                                  disabled={actionLoading}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                                >
                                  <Save size={12} />
                                  <span>ذخیره</span>
                                </button>
                                <button
                                  onClick={() => setEditingStandingId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                                >
                                  انصراف
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleStartEditStanding(row)}
                                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                                  title="ویرایش دستی مقادیر و آمار این تیم"
                                >
                                  <Edit3 size={12} />
                                  <span>ویرایش</span>
                                </button>

                                <button
                                  onClick={() => handleOpenPenaltyModal(row)}
                                  className="flex items-center gap-1 px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                                  title="ثبت یا تغییر کسر امتیاز انضباطی"
                                >
                                  <Scale size={12} />
                                  <span>جریمه</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PENALTY MODAL (Mandatory Portal Mounting on document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {penaltyModal.isOpen && penaltyModal.standing && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <div
                className="fixed inset-0"
                onClick={() => setPenaltyModal({ isOpen: false, standing: null, points_deduction: 0, points_deduction_reason: '' })}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative z-10 bg-slate-950 rounded-3xl w-full max-w-md my-auto p-6 border border-rose-500/30 shadow-2xl space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Scale size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">
                        ثبت حکم کسر امتیاز انضباطی
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        تیم «{penaltyModal.standing.name}»
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setPenaltyModal({ isOpen: false, standing: null, points_deduction: 0, points_deduction_reason: '' })}
                    className="p-1.5 rounded-xl hover:bg-slate-800 text-gray-400 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Team Standing Preview */}
                <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-white/5 flex items-center justify-between text-xs font-sans">
                  <div>
                    <span className="text-gray-400 block text-[11px]">امتیاز اصلی فعلی:</span>
                    <span className="text-sm font-bold text-white font-sport">
                      {penaltyModal.standing.raw_points ?? penaltyModal.standing.points ?? 0} امتیاز
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-gray-400 block text-[11px]">امتیاز پس از اعمال جریمه:</span>
                    <span className="text-sm font-black text-amber-300 font-sport">
                      {Math.max(
                        0,
                        (penaltyModal.standing.raw_points ?? penaltyModal.standing.points ?? 0) -
                          (parseInt(penaltyModal.points_deduction, 10) || 0)
                      )} امتیاز
                    </span>
                  </div>
                </div>

                {/* Points Deduction Input & Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 block">
                    تعداد امتیاز کسرشونده (جریمه):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={penaltyModal.points_deduction}
                      onChange={(e) =>
                        setPenaltyModal({ ...penaltyModal, points_deduction: Math.max(0, parseInt(e.target.value, 10) || 0) })
                      }
                      className="flex-1 bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-2 text-sm font-mono text-rose-300 font-bold focus:outline-none focus:border-rose-400"
                      placeholder="0"
                    />
                    <span className="text-xs text-gray-400">امتیاز منفی</span>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[0, 1, 2, 3, 6, 9].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPenaltyModal({ ...penaltyModal, points_deduction: val })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          penaltyModal.points_deduction === val
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-slate-900 text-gray-300 hover:bg-slate-800 border border-white/5'
                        }`}
                      >
                        {val === 0 ? 'بدون جریمه (۰)' : `-${val} امتیاز`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 block">
                    علت کسر امتیاز (جهت نمایش در پایین جدول برای کاربران):
                  </label>
                  <textarea
                    rows={2}
                    value={penaltyModal.points_deduction_reason}
                    onChange={(e) =>
                      setPenaltyModal({ ...penaltyModal, points_deduction_reason: e.target.value })
                    }
                    placeholder="مثال: عدم ارسال ترکیب به موقع در هفته سوم، تخلف در ثبت نتیجه مسابقه..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={handleSavePenalty}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50"
                  >
                    {penaltyModal.points_deduction > 0 ? 'ثبت و اعمال حکم جریمه' : 'پاک کردن جریمه این تیم'}
                  </button>

                  <button
                    onClick={() => setPenaltyModal({ isOpen: false, standing: null, points_deduction: 0, points_deduction_reason: '' })}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-gray-300 rounded-xl text-xs font-bold transition-all border border-white/5"
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
    </div>
  );
}
